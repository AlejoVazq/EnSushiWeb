import { normalizeCode } from '@/lib/discounts';
import { sha256 } from '@/lib/sha256';
import type { DiscountCode } from '@/types';
import type { StaffDiscountCode, StaffDiscountCodeInput } from '@/types/pedidos';

import { getDb } from './db';

/**
 * Discount codes managed from the shop's app. They live in the database (unlike `src/config/discounts.ts`, which
 * ships in the site's JS), so they can have use limits: in total, and once per customer.
 */

interface CodeRow {
  code: string;
  kind: 'percent' | 'amount';
  value: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  once_per_customer: boolean;
  active: boolean;
  created_at: Date | string;
  uses?: number;
}

/** Orders that count as a use: everything but the rejected ones */
const USES = "SELECT count(*)::int FROM orders o WHERE o.discount_code = c.code AND o.status <> 'rechazado'";

const toStaffCode = (row: CodeRow): StaffDiscountCode => ({
  code: row.code,
  kind: row.kind,
  value: row.value,
  validFrom: row.valid_from,
  validUntil: row.valid_until,
  maxUses: row.max_uses,
  oncePerCustomer: row.once_per_customer,
  active: row.active,
  uses: row.uses ?? 0,
  createdAt: new Date(row.created_at).toISOString(),
});

/** The same shape as the codes in src/config/discounts.ts, so the discount is computed the same way */
const toDefinition = (row: CodeRow): DiscountCode => ({
  hash: sha256(row.code),
  kind: row.kind,
  value: row.value,
  ...(row.valid_from && { validFrom: row.valid_from }),
  ...(row.valid_until && { validUntil: row.valid_until }),
});

export type ServerCodeCheck = { ok: true; definition: DiscountCode } | { ok: false; error: string };

/**
 * A typed code against the database: null if it isn't there (it may still be one of the site's own codes).
 * Dates are checked later by lookUpCode, like any other code; here, paused codes and use limits.
 */
export const checkServerCode = async (input: string, customerId: string | null): Promise<ServerCodeCheck | null> => {
  const code = normalizeCode(input);
  if (!code) return null;
  const db = await getDb();
  const [row] = await db.query<CodeRow>(`SELECT c.*, (${USES}) AS uses FROM discount_codes c WHERE c.code = $1`, [code]);
  if (!row) return null;
  if (!row.active) return { ok: false, error: 'Ese código ya no está activo.' };
  if (row.max_uses !== null && (row.uses ?? 0) >= row.max_uses) {
    return { ok: false, error: 'Ese código ya se usó todas las veces que se podía.' };
  }
  if (row.once_per_customer && customerId) {
    const [mine] = await db.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM orders WHERE discount_code = $1 AND customer_id = $2 AND status <> 'rechazado'",
      [code, customerId],
    );
    if ((mine?.count ?? 0) > 0) return { ok: false, error: 'Ya usaste este código.' };
  }
  return { ok: true, definition: toDefinition(row) };
};

// ─── The shop's app ─────────────────────────────────────────────────────────

export const listCodes = async (): Promise<StaffDiscountCode[]> => {
  const db = await getDb();
  const rows = await db.query<CodeRow>(
    `SELECT c.*, (${USES}) AS uses FROM discount_codes c ORDER BY c.active DESC, c.created_at DESC`,
  );
  return rows.map(toStaffCode);
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Letters, numbers and dashes, like the ones printed on a flyer */
const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;
const MAX_AMOUNT = 1_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export type CodeInputCheck = { ok: true; input: StaffDiscountCodeInput } | { ok: false; error: string };

/** Validates what the app sends; `base` fills in what a PATCH leaves out */
export const parseCodeInput = (body: unknown, base?: StaffDiscountCodeInput): CodeInputCheck => {
  if (!isRecord(body)) return { ok: false, error: 'Datos inválidos.' };
  const pick = <K extends keyof StaffDiscountCodeInput>(key: K): unknown => (key in body ? body[key] : base?.[key]);

  const code = base?.code ?? (typeof body.code === 'string' ? normalizeCode(body.code) : '');
  if (!CODE_PATTERN.test(code)) return { ok: false, error: 'El código va con letras, números o guiones (de 3 a 20).' };

  const kind = pick('kind');
  if (kind !== 'percent' && kind !== 'amount') return { ok: false, error: 'Elegí si es porcentaje o monto.' };

  const value = pick('value');
  if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, error: 'El descuento va en números enteros.' };
  if (kind === 'percent' && (value < 1 || value > 100)) return { ok: false, error: 'El porcentaje va de 1% a 100%.' };
  if (kind === 'amount' && (value < 1 || value > MAX_AMOUNT)) return { ok: false, error: 'El monto tiene que ser mayor a $ 0.' };

  const date = (raw: unknown): string | null | undefined =>
    raw === null || raw === undefined || raw === '' ? null : typeof raw === 'string' && DATE_PATTERN.test(raw) ? raw : undefined;
  const validFrom = date(pick('validFrom'));
  const validUntil = date(pick('validUntil'));
  if (validFrom === undefined || validUntil === undefined) return { ok: false, error: 'Las fechas van como AAAA-MM-DD.' };
  if (validFrom && validUntil && validFrom > validUntil) return { ok: false, error: 'La fecha de inicio es después del final.' };

  const rawMax = pick('maxUses');
  const maxUses = rawMax === null || rawMax === undefined || rawMax === '' ? null : rawMax;
  if (maxUses !== null && (typeof maxUses !== 'number' || !Number.isInteger(maxUses) || maxUses < 1)) {
    return { ok: false, error: 'El límite de usos va en números enteros, desde 1.' };
  }

  const oncePerCustomer = pick('oncePerCustomer') === true;
  const active = pick('active') !== false;

  return { ok: true, input: { code, kind, value, validFrom, validUntil, maxUses, oncePerCustomer, active } };
};

export type CodeWriteResult = { ok: true; code: StaffDiscountCode } | { ok: false; status: number; error: string };

const readCode = async (code: string): Promise<StaffDiscountCode | null> => {
  const db = await getDb();
  const [row] = await db.query<CodeRow>(`SELECT c.*, (${USES}) AS uses FROM discount_codes c WHERE c.code = $1`, [code]);
  return row ? toStaffCode(row) : null;
};

/** POST /api/local/codigos */
export const createCode = async (body: unknown): Promise<CodeWriteResult> => {
  const parsed = parseCodeInput(body);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const { code, kind, value, validFrom, validUntil, maxUses, oncePerCustomer, active } = parsed.input;
  const db = await getDb();
  const inserted = await db.query<{ code: string }>(
    `INSERT INTO discount_codes (code, kind, value, valid_from, valid_until, max_uses, once_per_customer, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (code) DO NOTHING RETURNING code`,
    [code, kind, value, validFrom, validUntil, maxUses, oncePerCustomer, active],
  );
  if (inserted.length === 0) return { ok: false, status: 409, error: `Ya existe el código ${code}.` };
  const created = await readCode(code);
  return created ? { ok: true, code: created } : { ok: false, status: 500, error: 'No se pudo guardar.' };
};

/** PATCH /api/local/codigos/[code]: any field but the code itself (pausing is `{ active: false }`) */
export const updateCode = async (rawCode: string, body: unknown): Promise<CodeWriteResult> => {
  const current = await readCode(normalizeCode(rawCode));
  if (!current) return { ok: false, status: 404, error: 'No existe ese código.' };
  const parsed = parseCodeInput(body, current);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const { code, kind, value, validFrom, validUntil, maxUses, oncePerCustomer, active } = parsed.input;
  const db = await getDb();
  await db.query(
    `UPDATE discount_codes SET kind = $2, value = $3, valid_from = $4, valid_until = $5, max_uses = $6,
       once_per_customer = $7, active = $8
     WHERE code = $1`,
    [code, kind, value, validFrom, validUntil, maxUses, oncePerCustomer, active],
  );
  const updated = await readCode(code);
  return updated ? { ok: true, code: updated } : { ok: false, status: 404, error: 'No existe ese código.' };
};

/** DELETE /api/local/codigos/[code]. Orders that used it keep its name in their discount line. */
export const deleteCode = async (rawCode: string): Promise<boolean> => {
  const db = await getDb();
  const deleted = await db.query('DELETE FROM discount_codes WHERE code = $1 RETURNING code', [normalizeCode(rawCode)]);
  return deleted.length > 0;
};
