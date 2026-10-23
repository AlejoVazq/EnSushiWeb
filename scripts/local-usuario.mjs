// Creates (or resets the password of) a user of the shop's desktop app.
// Usage: npm run local-usuario -- cocina          → asks for the password twice (hidden)
//        CLAVE=... npm run local-usuario -- cocina → takes it from CLAVE (for scripts)
// Uses DATABASE_URL if set; otherwise the development PGlite in .data/pglite (stop `npm run dev` first:
// only one process can open it at a time).
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import { MIGRATIONS } from '../src/server/schema.ts';

const scryptAsync = promisify(scrypt);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const username = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail('Uso: npm run local-usuario -- NOMBRE (3 a 30 letras, números, . _ -)');

/** Reads a line without echoing it */
const askHidden = (question) =>
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

let password = process.env.CLAVE;
if (!password) {
  password = await askHidden('Contraseña: ');
  if ((await askHidden('Repetila: ')) !== password) fail('No coinciden.');
}
if (password.length < 8) fail('La contraseña tiene que tener al menos 8 caracteres.');

// Same format as hashPassword() in src/server/auth.ts
const salt = randomBytes(16);
const hash = await scryptAsync(password, salt, 64);
const passwordHash = `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;

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

// Same as migrate() in src/server/db.ts, so this works on a fresh database too
await exec('CREATE TABLE IF NOT EXISTS schema_version (version integer PRIMARY KEY)');
const done = new Set((await query('SELECT version FROM schema_version', [])).map((row) => row.version));
for (const [index, sql] of MIGRATIONS.entries()) {
  if (done.has(index + 1)) continue;
  await exec(`BEGIN; ${sql}; INSERT INTO schema_version (version) VALUES (${index + 1}); COMMIT;`);
}

const [row] = await query(
  `INSERT INTO staff (id, username, password_hash) VALUES ($1, $2, $3)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
   RETURNING (xmax = 0) AS created`,
  [randomUUID(), username, passwordHash],
);
// A new password logs out the app everywhere it was open with the old one
if (!row.created) {
  await query(
    "DELETE FROM sessions WHERE kind = 'staff' AND subject_id = (SELECT id FROM staff WHERE username = $1)",
    [username],
  );
}
await close();
console.log(row.created ? `Listo: creé el usuario ${username}.` : `Listo: cambié la contraseña de ${username}.`);
