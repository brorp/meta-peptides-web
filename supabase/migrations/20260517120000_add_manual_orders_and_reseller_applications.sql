-- Add metadata for orders created manually from admin/WhatsApp.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'checkout';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS manual_channel text;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS manual_reference text;

CREATE INDEX IF NOT EXISTS idx_orders_order_source
ON orders (order_source);

CREATE INDEX IF NOT EXISTS idx_orders_manual_reference
ON orders (manual_reference);

-- Store public reseller registrations for the admin CMS.
CREATE TABLE IF NOT EXISTS reseller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  whatsapp_number text NOT NULL,
  business_name text NOT NULL,
  business_type text,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'Indonesia',
  social_link text,
  estimated_monthly_orders integer,
  notes text,
  admin_notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reseller_applications_status_check
    CHECK (status IN ('new', 'contacted', 'approved', 'rejected')),
  CONSTRAINT reseller_applications_estimated_monthly_orders_check
    CHECK (estimated_monthly_orders IS NULL OR estimated_monthly_orders >= 0)
);

CREATE INDEX IF NOT EXISTS idx_reseller_applications_status
ON reseller_applications (status);

CREATE INDEX IF NOT EXISTS idx_reseller_applications_created_at
ON reseller_applications (created_at DESC);

ALTER TABLE reseller_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to reseller_applications"
ON reseller_applications
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Allow admin all operations on reseller_applications"
ON reseller_applications
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
