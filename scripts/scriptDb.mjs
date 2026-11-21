// The database for the command-line scripts (local-usuario, pin-ventas): DATABASE_URL if set; otherwise the
// development PGlite in .data/pglite (stop `npm run dev` first: only one process can open it at a time).
// Runs the pending migrations, like migrate() in src/server/db.ts, so it works on a fresh database too.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { MIGRATIONS } from '../src/server/schema.ts';

export const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/** Reads a line without echoing it */
export const askHidden = (question) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (text) => write(text.startsWith(question) ? text : '');
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });

/** { query(sql, params), close() } */
export const openDb = async () => {
  let query;
  let exec;
  let close;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    query = async (sql, params) => (await client.query(sql, params)).rows;
    exec = async (sql) => void (await client.query(sql));
    close = () => client.end();
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = join(process.cwd(), '.data', 'pglite');
    mkdirSync(dir, { recursive: true });
    const lite = await PGlite.create(dir);
    query = async (sql, params) => (await lite.query(sql, params)).rows;
    exec = async (sql) => void (await lite.exec(sql));
    close = () => lite.close();
  }

  await exec('CREATE TABLE IF NOT EXISTS schema_version (version integer PRIMARY KEY)');
  const done = new Set((await query('SELECT version FROM schema_version', [])).map((row) => row.version));
  for (const [index, sql] of MIGRATIONS.entries()) {
    if (done.has(index + 1)) continue;
    await exec(`BEGIN; ${sql}; INSERT INTO schema_version (version) VALUES (${index + 1}); COMMIT;`);
  }
  return { query, close };
};
