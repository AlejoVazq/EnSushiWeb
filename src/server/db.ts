import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { MIGRATIONS } from './schema';

/**
 * The database. Production: the server's PostgreSQL (`DATABASE_URL`). Development without it: PGlite, a real
 * PostgreSQL running inside Node, saved in `.data/pglite` (nothing to install). Same SQL on both.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  /** Several statements, no parameters (migrations) */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  /** Runs `work` in one transaction (rolled back if it throws) */
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
}

const connect = async (): Promise<Db> => {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url, max: 10 });
    return {
      query: async <T,>(sql: string, params: readonly unknown[] = []) => (await pool.query(sql, [...params])).rows as T[],
      // Without a values array pg uses the simple protocol, which accepts several statements
      exec: async (sql) => {
        await pool.query(sql);
      },
      transaction: async (work) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await work({
            query: async <T,>(sql: string, params: readonly unknown[] = []) => (await client.query(sql, [...params])).rows as T[],
            exec: async (sql) => {
              await client.query(sql);
            },
          });
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
    };
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Falta DATABASE_URL');

  const { PGlite } = await import('@electric-sql/pglite');
  const dir = join(process.cwd(), '.data', 'pglite');
  mkdirSync(dir, { recursive: true });
  const lite = await PGlite.create(dir);
  return {
    query: async <T,>(sql: string, params: readonly unknown[] = []) => (await lite.query<T>(sql, [...params])).rows,
    exec: async (sql) => {
      await lite.exec(sql);
    },
    transaction: (work) =>
      lite.transaction((tx) =>
        work({
          query: async <T,>(sql: string, params: readonly unknown[] = []) => (await tx.query<T>(sql, [...params])).rows,
          exec: async (sql) => {
            await tx.exec(sql);
          },
        }),
      ),
  };
};

/** Applies the migrations not run yet, in order */
const migrate = async (db: Db): Promise<void> => {
  await db.query('CREATE TABLE IF NOT EXISTS schema_version (version integer PRIMARY KEY)');
  const done = new Set((await db.query<{ version: number }>('SELECT version FROM schema_version')).map((row) => row.version));
  for (const [index, sql] of MIGRATIONS.entries()) {
    const version = index + 1;
    if (done.has(version)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_version (version) VALUES ($1)', [version]);
    });
  }
};

// One connection per server process; kept on globalThis so dev hot reloads don't open another
const globalForDb = globalThis as typeof globalThis & { ensushiDb?: Promise<Db> };

export const getDb = (): Promise<Db> => {
  globalForDb.ensushiDb ??= connect().then(async (db) => {
    await migrate(db);
    return db;
  });
  return globalForDb.ensushiDb;
};
