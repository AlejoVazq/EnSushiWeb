// Creates (or resets the password of) a user of the shop's desktop app.
// Usage: npm run local-usuario -- cocina          → asks for the password twice (hidden)
//        CLAVE=... npm run local-usuario -- cocina → takes it from CLAVE (for scripts)
// Uses DATABASE_URL if set; otherwise the development PGlite in .data/pglite (stop `npm run dev` first:
// only one process can open it at a time).
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

import { askHidden, fail, openDb } from './scriptDb.mjs';

const scryptAsync = promisify(scrypt);

const username = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail('Uso: npm run local-usuario -- NOMBRE (3 a 30 letras, números, . _ -)');

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

const { query, close } = await openDb();

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
