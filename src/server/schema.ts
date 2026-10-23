/**
 * Database migrations, applied in order on start (`schema_version` keeps track). Never edit one that already
 * ran on the server: add a new one at the end.
 */
export const MIGRATIONS: readonly string[] = [
  // 1 — customers, login codes, staff, sessions and orders
  `
  CREATE TABLE customers (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- One pending code per email; only its hash is stored
  CREATE TABLE login_codes (
    email text PRIMARY KEY,
    code_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    sent_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE staff (
    id text PRIMARY KEY,
    username text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Customer cookies and the shop app's tokens; only their hash is stored
  CREATE TABLE sessions (
    token_hash text PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('customer', 'staff')),
    subject_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE orders (
    id text PRIMARY KEY,
    number serial UNIQUE,
    customer_id text NOT NULL REFERENCES customers (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    customer_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    delivery_method text NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
    address text,
    payment_method text NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    -- What was ordered, as text and prices at that moment (the menu can change later)
    lines jsonb NOT NULL,
    subtotal integer NOT NULL,
    discount_label text,
    discount_amount integer NOT NULL DEFAULT 0,
    delivery_fee integer NOT NULL,
    total integer NOT NULL,
    status text NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'confirmado', 'rechazado')),
    -- Approximate time set by the shop ("21:15"), only when confirmed
    eta text,
    reject_reason text,
    decided_at timestamptz,
    printed_at timestamptz
  );

  CREATE INDEX orders_created_at ON orders (created_at DESC);
  CREATE INDEX orders_customer ON orders (customer_id, created_at DESC);
  `,
];
