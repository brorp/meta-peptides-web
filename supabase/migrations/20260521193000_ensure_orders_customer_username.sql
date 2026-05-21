-- Some production databases may have skipped the earlier Shopee username migration.
-- Keep this idempotent so the Customers/Daily Tasks sync can safely read buyer usernames.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_username text;

CREATE INDEX IF NOT EXISTS idx_orders_customer_username
ON orders (customer_username);
