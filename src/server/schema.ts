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

  // 2 — discount codes managed from the shop's app; each order keeps the code it used
  `
  CREATE TABLE discount_codes (
    -- Upper case, as customers type it
    code text PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('percent', 'amount')),
    value integer NOT NULL CHECK (value > 0),
    -- "YYYY-MM-DD" in the shop's time zone, both included
    valid_from text,
    valid_until text,
    max_uses integer CHECK (max_uses > 0),
    once_per_customer boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  ALTER TABLE orders ADD COLUMN discount_code text;
  CREATE INDEX orders_discount_code ON orders (discount_code, customer_id) WHERE discount_code IS NOT NULL;
  `,

  // 3 — what the shop changes from its app for one day only: sold-out items and pausing orders
  `
  -- "day" is "YYYY-MM-DD" in the shop's time zone: the mark is gone the next day, nobody has to undo it
  CREATE TABLE sold_out (
    item_id text NOT NULL,
    day text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (item_id, day)
  );

  CREATE TABLE orders_paused (
    day text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
];
