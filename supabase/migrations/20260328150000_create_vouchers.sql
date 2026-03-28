-- Create vouchers table for discount code management
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_nominal NUMERIC NOT NULL DEFAULT 0,
  max_discount_cap NUMERIC NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_claim_qty INTEGER NOT NULL DEFAULT 0,
  total_claimed INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index on uppercased code for case-insensitive lookup
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_code_upper_idx ON vouchers (UPPER(code));
