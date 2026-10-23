// Prints the line to paste into DISCOUNT_CODES (src/config/discounts.ts) for a new code.
// Usage: npm run codigo -- VERANO10 10%            → 10% off
//        npm run codigo -- BIENVENIDA 2000         → $ 2.000 off
//        npm run codigo -- VERANO10 10% 2026-12-31 → works until that day (included)
import { createHash } from 'node:crypto';

const [rawCode, rawValue, validUntil] = process.argv.slice(2);
const fail = (message) => {
  console.error(`${message}\nUso: npm run codigo -- CODIGO 10% [AAAA-MM-DD]  ó  npm run codigo -- CODIGO 2000 [AAAA-MM-DD]`);
  process.exit(1);
};

// Same normalization as normalizeCode() in src/lib/discounts.ts
const code = (rawCode ?? '').trim().toUpperCase();
if (!code) fail('Falta el código.');
const match = /^(\d+)(%?)$/.exec(rawValue ?? '');
if (!match) fail('Falta el descuento: un porcentaje (10%) o un monto en pesos (2000).');
const value = Number(match[1]);
const kind = match[2] ? 'percent' : 'amount';
if (kind === 'percent' && (value < 1 || value > 100)) fail('El porcentaje va de 1% a 100%.');
if (validUntil !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) fail('La fecha va como AAAA-MM-DD.');

const hash = createHash('sha256').update(code, 'utf8').digest('hex');
const until = validUntil ? `, validUntil: '${validUntil}'` : '';
console.log(`  // ${code}: ${kind === 'percent' ? `${value}%` : `$ ${value}`}${validUntil ? ` hasta el ${validUntil}` : ''}`);
console.log(`  { hash: '${hash}', kind: '${kind}', value: ${value}${until} },`);
