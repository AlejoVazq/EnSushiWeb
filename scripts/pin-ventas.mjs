// Sets (or changes) the PIN that opens the Ventas screen of the shop's desktop app, for every app user.
// Usage: npm run pin-ventas               → asks for the PIN twice (hidden)
//        PIN=... npm run pin-ventas       → takes it from PIN (for scripts)
//        npm run pin-ventas -- --borrar   → removes it (Ventas opens without asking)
// Uses DATABASE_URL if set; otherwise the development PGlite (stop `npm run dev` first).
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

import { askHidden, fail, openDb } from './scriptDb.mjs';

const scryptAsync = promisify(scrypt);
// Same key as src/server/salesPin.ts
const KEY = 'sales_pin';

if (process.argv[2] === '--borrar') {
  const { query, close } = await openDb();
  const rows = await query('DELETE FROM shop_settings WHERE key = $1 RETURNING key', [KEY]);
  await close();
  console.log(rows.length > 0 ? 'Listo: Ventas ya no pide PIN.' : 'No había PIN.');
  process.exit(0);
}
if (process.argv[2]) fail('Uso: npm run pin-ventas   (o npm run pin-ventas -- --borrar)');

let pin = process.env.PIN;
if (!pin) {
  pin = await askHidden('PIN de Ventas (4 a 8 números): ');
  if ((await askHidden('Repetilo: ')) !== pin) fail('No coinciden.');
}
if (!/^\d{4,8}$/.test(pin)) fail('El PIN va con 4 a 8 números.');

// Same format as hashPassword() in src/server/auth.ts
const salt = randomBytes(16);
const hash = await scryptAsync(pin, salt, 64);
const value = `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;

const { query, close } = await openDb();
const [row] = await query(
  `INSERT INTO shop_settings (key, value) VALUES ($1, $2)
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
   RETURNING (xmax = 0) AS created`,
  [KEY, value],
);
await close();
console.log(row.created ? 'Listo: Ventas ahora pide el PIN.' : 'Listo: cambié el PIN de Ventas.');
