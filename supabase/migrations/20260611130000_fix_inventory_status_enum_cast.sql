-- Keep the live inventory deduction RPC safe on databases where the cancelled
-- enum migration was skipped, and allow cancelled orders going forward.
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'cancelled';

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

  IF v_order.status::text IN ('cancelled', 'canceled') THEN
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
