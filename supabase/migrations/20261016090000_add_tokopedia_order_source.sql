-- Add Tokopedia as a first-class marketplace order source.
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments
ADD CONSTRAINT payments_payment_type_check
CHECK (payment_type IN ('Shopee', 'Tokopedia', 'QRIS', 'Bank Transfer'));

-- Marketplace order numbers only need to be unique within their own source.
CREATE UNIQUE INDEX IF NOT EXISTS orders_tokopedia_manual_reference_unique_idx
ON orders (manual_reference)
WHERE order_source = 'tokopedia' AND manual_reference IS NOT NULL;
