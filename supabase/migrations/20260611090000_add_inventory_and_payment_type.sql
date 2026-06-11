-- Inventory rows live in products so finished products and packaging share
-- the same stock and COGS editing flow.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS inventory_type text NOT NULL DEFAULT 'product';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_inventory_type_check'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_inventory_type_check
    CHECK (inventory_type IN ('product', 'packaging', 'supply'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_inventory_type
ON products (inventory_type);

CREATE TABLE IF NOT EXISTS product_inventory_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_per_unit integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_inventory_components_positive_quantity
    CHECK (quantity_per_unit > 0),
  CONSTRAINT product_inventory_components_not_self
    CHECK (product_id <> component_product_id),
  CONSTRAINT product_inventory_components_unique_pair
    UNIQUE (product_id, component_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_components_product_id
ON product_inventory_components (product_id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_components_component_product_id
ON product_inventory_components (component_product_id);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS inventory_deducted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_inventory_deducted_at
ON orders (inventory_deducted_at);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  next_stock integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_quantity_nonzero CHECK (quantity <> 0),
  CONSTRAINT inventory_movements_type_check
    CHECK (movement_type IN ('order_deduction', 'manual_adjustment'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id
ON inventory_movements (product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id
ON inventory_movements (order_id);

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'Bank Transfer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_payment_type_check'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_payment_type_check
    CHECK (payment_type IN ('Shopee', 'QRIS', 'Bank Transfer'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_payment_type
ON payments (payment_type);

CREATE OR REPLACE FUNCTION public.deduct_order_inventory(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_row record;
BEGIN
  SELECT id, status, inventory_deducted_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.inventory_deducted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_inventory_deductions (
    product_id uuid PRIMARY KEY,
    quantity integer NOT NULL
  ) ON COMMIT DROP;

  TRUNCATE tmp_inventory_deductions;

  INSERT INTO tmp_inventory_deductions (product_id, quantity)
  SELECT oi.product_id, SUM(oi.quantity)::integer
  FROM order_items oi
  WHERE oi.order_id = p_order_id
  GROUP BY oi.product_id
  ON CONFLICT (product_id) DO UPDATE
  SET quantity = tmp_inventory_deductions.quantity + EXCLUDED.quantity;

  INSERT INTO tmp_inventory_deductions (product_id, quantity)
  SELECT pic.component_product_id,
         SUM(oi.quantity * pic.quantity_per_unit)::integer
  FROM order_items oi
  JOIN product_inventory_components pic ON pic.product_id = oi.product_id
  WHERE oi.order_id = p_order_id
  GROUP BY pic.component_product_id
  ON CONFLICT (product_id) DO UPDATE
  SET quantity = tmp_inventory_deductions.quantity + EXCLUDED.quantity;

  FOR v_row IN
    SELECT d.product_id,
           d.quantity,
           COALESCE(p.stock, 0) AS stock,
           p.name
    FROM tmp_inventory_deductions d
    JOIN products p ON p.id = d.product_id
    WHERE d.quantity > 0
    FOR UPDATE OF p
  LOOP
    IF v_row.stock < v_row.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %. Available %, needed %',
        COALESCE(v_row.name, v_row.product_id::text),
        v_row.stock,
        v_row.quantity;
    END IF;

    UPDATE products
    SET stock = stock - v_row.quantity
    WHERE id = v_row.product_id;

    INSERT INTO inventory_movements (
      product_id,
      order_id,
      movement_type,
      quantity,
      previous_stock,
      next_stock,
      note
    )
    VALUES (
      v_row.product_id,
      p_order_id,
      'order_deduction',
      -v_row.quantity,
      v_row.stock,
      v_row.stock - v_row.quantity,
      'Auto deducted from order'
    );
  END LOOP;

  UPDATE orders
  SET inventory_deducted_at = now()
  WHERE id = p_order_id;
END;
$$;
