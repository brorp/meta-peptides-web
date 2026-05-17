-- Production rejected cancelled orders because the enum was missing this value.
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'cancelled';

-- Shopee imports are keyed by Shopee order number (No. Pesanan).
CREATE UNIQUE INDEX IF NOT EXISTS orders_shopee_manual_reference_unique_idx
ON orders (manual_reference)
WHERE order_source = 'shopee' AND manual_reference IS NOT NULL;
