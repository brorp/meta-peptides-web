-- Keep production-safe if an older enum migration was skipped.
-- Customers/Daily Tasks no longer compare against this enum value in queries,
-- but order updates and Shopee imports still need the status to exist.
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'cancelled';
