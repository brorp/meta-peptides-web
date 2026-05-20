-- Track product COGS and operating expenses for precise financial reporting.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_of_goods numeric(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_cost_of_goods_nonnegative'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_cost_of_goods_nonnegative
    CHECK (cost_of_goods >= 0);
  END IF;
END $$;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS cogs_at_purchase numeric(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_cogs_at_purchase_nonnegative'
  ) THEN
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_cogs_at_purchase_nonnegative
    CHECK (cogs_at_purchase >= 0);
  END IF;
END $$;

-- Best-effort backfill for old order rows. New orders snapshot COGS at insert time.
UPDATE order_items oi
SET cogs_at_purchase = COALESCE(p.cost_of_goods, 0)
FROM products p
WHERE oi.product_id = p.id
  AND oi.cogs_at_purchase = 0
  AND COALESCE(p.cost_of_goods, 0) > 0;

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor text,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_amount_nonnegative CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
ON expenses (expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category
ON expenses (category);
