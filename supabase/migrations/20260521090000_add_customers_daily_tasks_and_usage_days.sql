-- Product usage duration powers customer reorder reminders.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS usage_days integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_usage_days_nonnegative'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_usage_days_nonnegative
    CHECK (usage_days >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_journey_stage_enum') THEN
    CREATE TYPE customer_journey_stage_enum AS ENUM (
      'new_leads',
      'intro',
      'pre_consultation',
      'why_meta',
      'trial_closing',
      'fu_h1',
      'fu_h3',
      'closing',
      'guidelines',
      'shipment_complete',
      'cs_h7',
      'cs_h14',
      'reorder_reminder'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  username text,
  whatsapp_phone text,
  email text,
  domicile text,
  lead_source text NOT NULL DEFAULT 'manual',
  current_journey customer_journey_stage_enum NOT NULL DEFAULT 'new_leads',
  first_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  last_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  closing_at timestamptz,
  journey_updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_contact_required
    CHECK (username IS NOT NULL OR whatsapp_phone IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_username_unique_idx
ON customers (LOWER(username))
WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_whatsapp_phone_unique_idx
ON customers (whatsapp_phone)
WHERE whatsapp_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_current_journey
ON customers (current_journey);

CREATE INDEX IF NOT EXISTS idx_customers_journey_updated_at
ON customers (journey_updated_at);

CREATE INDEX IF NOT EXISTS idx_customers_closing_at
ON customers (closing_at);

CREATE TABLE IF NOT EXISTS customer_journey_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  from_journey customer_journey_stage_enum,
  to_journey customer_journey_stage_enum NOT NULL,
  task_type text,
  evidence_url text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  notes text,
  performed_by_role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_journey_logs_customer_id
ON customer_journey_logs (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_journey_logs_created_at
ON customer_journey_logs (created_at DESC);
