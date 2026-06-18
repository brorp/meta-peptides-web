-- Shipment handling for WhatsApp manual orders.
-- shipping_fee is an operational cost here and is intentionally not part of
-- invoice totals.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipment_type text;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_fee numeric(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_shipping_fee_nonnegative'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_shipping_fee_nonnegative
    CHECK (shipping_fee >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_shipment_type
ON orders (shipment_type);

CREATE INDEX IF NOT EXISTS idx_orders_shipping_fee
ON orders (shipping_fee);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS source_type text;

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS source_order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_source_order_id
ON expenses (source_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS expenses_shipment_order_unique_idx
ON expenses (source_order_id)
WHERE source_type = 'shipment_fee' AND source_order_id IS NOT NULL;
