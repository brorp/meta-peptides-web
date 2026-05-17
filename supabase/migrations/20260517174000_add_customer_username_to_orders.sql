ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_username text;

CREATE INDEX IF NOT EXISTS idx_orders_customer_username
ON orders (customer_username);
