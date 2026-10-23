import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { getDb } from './db';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

// ─── Sessions (customer cookie, shop app token) ─────────────────────────────

export type SessionKind = 'customer' | 'staff';

export const CUSTOMER_COOKIE = 'ensushi_sesion';
const SESSION_DAYS: Record<SessionKind, number> = { customer: 60, staff: 14 };
export const CUSTOMER_SESSION_SECONDS = SESSION_DAYS.customer * 24 * 60 * 60;

/** A new random token; only its hash is stored, so a copy of the database can't be used to log in */
export const createSession = async (kind: SessionKind, subjectId: string): Promise<string> => {
  const token = randomBytes(32).toString('base64url');
  const db = await getDb();
  await db.query(
    `INSERT INTO sessions (token_hash, kind, subject_id, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
    [sha256(token), kind, subjectId, SESSION_DAYS[kind]],
  );
  return token;
};

/** The subject (customer or staff id) of a valid token of that kind, or null */
export const readSession = async (kind: SessionKind, token: string | undefined): Promise<string | null> => {
  if (!token) return null;
  const db = await getDb();
  const [row] = await db.query<{ subject_id: string }>(
    'SELECT subject_id FROM sessions WHERE token_hash = $1 AND kind = $2 AND expires_at > now()',
    [sha256(token), kind],
  );
  return row?.subject_id ?? null;
};

export const deleteSession = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  const db = await getDb();
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
};

// ─── Customer login by email code ───────────────────────────────────────────

const CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
/** A new code for the same email waits this long, so nobody floods someone's inbox */
export const RESEND_SECONDS = 60;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;

const codeHash = (email: string, code: string): string => sha256(`${email}:${code}`);

/** A new 6-digit code for `email`, replacing any pending one; null if one was sent less than a minute ago */
export const createLoginCode = async (email: string): Promise<string | null> => {
  const db = await getDb();
  const [recent] = await db.query(
    `SELECT 1 FROM login_codes WHERE email = $1 AND sent_at > now() - make_interval(secs => $2)`,
    [email, RESEND_SECONDS],
  );
  if (recent) return null;

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  await db.query(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_at)
     VALUES ($1, $2, now() + make_interval(mins => $3), 0, now())
     ON CONFLICT (email) DO UPDATE
       SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = now()`,
    [email, codeHash(email, code), CODE_MINUTES],
  );
  return code;
};

export type CodeCheck = { ok: true; customerId: string } | { ok: false; error: string };

/** Checks the code and, if right, returns the customer (created on their first login) */
export const verifyLoginCode = async (email: string, code: string): Promise<CodeCheck> => {
  const db = await getDb();
  const [pending] = await db.query<{ code_hash: string; attempts: number; expired: boolean }>(
    'SELECT code_hash, attempts, expires_at < now() AS expired FROM login_codes WHERE email = $1',
    [email],
  );
  if (!pending || pending.expired) return { ok: false, error: 'El código venció. Pedí uno nuevo.' };
  if (pending.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, error: 'Demasiados intentos. Pedí un código nuevo.' };

  const expected = Buffer.from(pending.code_hash);
  const given = Buffer.from(codeHash(email, code.trim()));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await db.query('UPDATE login_codes SET attempts = attempts + 1 WHERE email = $1', [email]);
    return { ok: false, error: 'El código no es correcto.' };
  }

  await db.query('DELETE FROM login_codes WHERE email = $1', [email]);
  const [customer] = await db.query<{ id: string }>(
    `INSERT INTO customers (id, email) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [randomUUID(), email],
  );
  if (!customer) throw new Error('No se pudo guardar el cliente');
  return { ok: true, customerId: customer.id };
};

export const getCustomerEmail = async (customerId: string): Promise<string | null> => {
  const db = await getDb();
  const [row] = await db.query<{ email: string }>('SELECT email FROM customers WHERE id = $1', [customerId]);
  return row?.email ?? null;
};

// ─── Staff passwords ────────────────────────────────────────────────────────

/** "scrypt$<salt>$<hash>", both base64 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export const checkPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const given = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(expected, given);
};

/** The staff id if the username and password match, or null */
export const loginStaff = async (username: string, password: string): Promise<string | null> => {
  const db = await getDb();
  const [row] = await db.query<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM staff WHERE username = $1',
    [username.trim().toLowerCase()],
  );
  // Same work whether the user exists or not, so the response time doesn't tell
  const ok = await checkPassword(password, row?.password_hash ?? 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
  return row && ok ? row.id : null;
};
