// Adds (or updates) a discount code in DISCOUNT_CODES, src/config/discounts.ts.
// Usage: npm run codigo -- VERANO10 10%            → 10% off
//        npm run codigo -- BIENVENIDA 2000         → $ 2.000 off
//        npm run codigo -- VERANO10 10% 2026-12-31 → works until that day (included)
//        npm run codigo -- --borrar VERANO10       → removes it
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/config/discounts.ts', import.meta.url));
const LIST = /(export const DISCOUNT_CODES: readonly DiscountCode\[\] = \[)([\s\S]*?)(\];)/;

const fail = (message) => {
  console.error(
    `${message}\nUso: npm run codigo -- CODIGO 10% [AAAA-MM-DD]  ·  npm run codigo -- CODIGO 2000 [AAAA-MM-DD]  ·  npm run codigo -- --borrar CODIGO`,
  );
  process.exit(1);
};

const args = process.argv.slice(2);
const remove = args[0] === '--borrar';
const [rawCode, rawValue, validUntil] = remove ? args.slice(1) : args;

// Same normalization as normalizeCode() in src/lib/discounts.ts
const code = (rawCode ?? '').trim().toUpperCase();
if (!code) fail('Falta el código.');
const hash = createHash('sha256').update(code, 'utf8').digest('hex');

const source = readFileSync(FILE, 'utf8');
const match = LIST.exec(source);
if (!match) fail(`No encontré DISCOUNT_CODES en ${FILE}.`);
const [, head, body, tail] = match;

// One entry per code: its comment line and its object line
const allEntries = body
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .reduce((list, line) => {
    if (line.startsWith('//')) list.push({ comment: line, line: '' });
    else if (list.length > 0 && list[list.length - 1].line === '') list[list.length - 1].line = line;
    else list.push({ comment: '', line });
    return list;
  }, []);
const entries = allEntries.filter((entry) => !entry.line.includes(hash));

let message;
if (remove) {
  if (entries.length === allEntries.length) fail(`${code} no estaba cargado.`);
  message = `Listo: borré ${code}.`;
} else {
  const valueMatch = /^(\d+)(%?)$/.exec(rawValue ?? '');
  if (!valueMatch) fail('Falta el descuento: un porcentaje (10%) o un monto en pesos (2000).');
  const value = Number(valueMatch[1]);
  const kind = valueMatch[2] ? 'percent' : 'amount';
  if (kind === 'percent' && (value < 1 || value > 100)) fail('El porcentaje va de 1% a 100%.');
  if (kind === 'amount' && value < 1) fail('El monto tiene que ser mayor a 0.');
  if (validUntil !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) fail('La fecha va como AAAA-MM-DD.');

  const what = kind === 'percent' ? `${value}%` : `$ ${value}`;
  const until = validUntil ? ` hasta el ${validUntil}` : '';
  entries.push({
    comment: `// ${code}: ${what}${until}`,
    line: `{ hash: '${hash}', kind: '${kind}', value: ${value}${validUntil ? `, validUntil: '${validUntil}'` : ''} },`,
  });
  message = `Listo: ${code} (${what}${until}) quedó cargado en src/config/discounts.ts.`;
}

const newBody = entries.length
  ? `\n${entries.map(({ comment, line }) => [comment, line].filter(Boolean).map((l) => `  ${l}`).join('\n')).join('\n')}\n`
  : '';
writeFileSync(FILE, source.replace(LIST, `${head}${newBody}${tail}`));
console.log(message);
console.log('En desarrollo se ve al recargar la página; para la web publicada, commiteá y deployá el cambio.');
