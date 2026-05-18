-- Add marketplace_fee column to orders for tracking Shopee / marketplace platform fees.
-- This replaces the misuse of shipping_fee for Shopee orders.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS marketplace_fee numeric(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_marketplace_fee
ON orders (marketplace_fee);

-- Ensure created_at has a default but can also be overridden manually.
-- (created_at already exists; we just document that it is safe to UPDATE.)
-- No schema change needed for created_at; Supabase/Postgres allows UPDATE on timestamptz columns.
