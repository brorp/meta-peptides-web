ALTER TABLE products
ALTER COLUMN product_type SET DEFAULT 'mainproduct';

ALTER TABLE products
ALTER COLUMN product_type SET NOT NULL;

CREATE SEQUENCE IF NOT EXISTS metawellness_invoice_number_seq START WITH 1001;

-- Idempotency + per-user rate limit for the Discord bot API.
CREATE OR REPLACE FUNCTION public.record_discord_bot_request(
  p_message_id text,
  p_command text,
  p_guild_id text,
  p_channel_id text,
  p_user_id text,
  p_request_path text,
  p_max_requests integer DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_count integer;
BEGIN
  -- A retried request for the same Discord message is not counted twice.
  IF EXISTS (
    SELECT 1
    FROM discord_bot_request_log
    WHERE message_id = p_message_id
      AND command = p_command
      AND request_path = p_request_path
  ) THEN
    RETURN true;
  END IF;

  -- Serialize requests for the same Discord user/channel so parallel calls
  -- cannot race past the limit.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id || ':' || p_channel_id));

  SELECT COUNT(*)
  INTO v_request_count
  FROM discord_bot_request_log
  WHERE user_id = p_user_id
    AND channel_id = p_channel_id
    AND created_at >= now() - interval '1 minute';

  IF v_request_count >= GREATEST(1, p_max_requests) THEN
    RAISE EXCEPTION 'BOT_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO discord_bot_request_log (
    message_id,
    command,
    guild_id,
    channel_id,
    user_id,
    request_path
  )
  VALUES (
    p_message_id,
    p_command,
    p_guild_id,
    p_channel_id,
    p_user_id,
    p_request_path
  )
  ON CONFLICT (message_id, command, request_path) DO NOTHING;

  -- Keep a short audit window only.
  DELETE FROM discord_bot_request_log
  WHERE created_at < now() - interval '7 days';

  RETURN true;
END;
$$;

-- !invoice: creates the order, items (with usage life snapshot), pending
-- payment, deducts stock (including packaging components), upserts the
-- customer, and marks the lead as a customer. Runs as one transaction.
--
-- p_items: [{ "product_id": uuid, "quantity": 1..100, "price": number|null }]
-- When price is null the current product price is used.
CREATE OR REPLACE FUNCTION public.create_discord_invoice(
  p_lead_id uuid,
  p_shipping_address text,
  p_shipping_regional text,
  p_shipping_zip text,
  p_items jsonb,
  p_discount_amount numeric,
  p_payment_type text,
  p_note text,
  p_discord_message_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_order_id uuid;
  v_customer_id uuid;
  v_invoice_number text;
  v_subtotal numeric(14, 2);
  v_total numeric(14, 2);
  v_requested_count integer;
  v_valid_count integer;
  v_existing record;
BEGIN
  IF p_discord_message_id IS NOT NULL THEN
    SELECT id, invoice_number
    INTO v_existing
    FROM orders
    WHERE discord_message_id = p_discord_message_id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'order_id', v_existing.id,
        'invoice_number', v_existing.invoice_number,
        'duplicate', true
      );
    END IF;
  END IF;

  SELECT *
  INTO v_lead
  FROM leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead tidak ditemukan';
  END IF;

  IF btrim(COALESCE(p_shipping_address, '')) = '' THEN
    RAISE EXCEPTION 'Alamat pengiriman wajib diisi';
  END IF;

  IF btrim(COALESCE(p_shipping_regional, '')) = '' THEN
    RAISE EXCEPTION 'Kota pengiriman wajib diisi';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invoice minimal berisi 1 item';
  END IF;

  IF p_payment_type NOT IN ('Shopee', 'Tokopedia', 'QRIS', 'Bank Transfer') THEN
    RAISE EXCEPTION 'Payment type tidak valid';
  END IF;

  SELECT COUNT(*)
  INTO v_requested_count
  FROM jsonb_array_elements(p_items) AS item;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE COALESCE((item->>'quantity')::integer, 0) <= 0
       OR COALESCE((item->>'quantity')::integer, 0) > 100
       OR (item->>'price' IS NOT NULL AND (item->>'price')::numeric < 0)
  ) THEN
    RAISE EXCEPTION 'Qty item harus 1-100 dan harga tidak boleh negatif';
  END IF;

  SELECT COUNT(*)
  INTO v_valid_count
  FROM jsonb_array_elements(p_items) AS item
  JOIN products AS product
    ON product.id = (item->>'product_id')::uuid
   AND product.is_active IS NOT FALSE;

  IF v_valid_count <> v_requested_count THEN
    RAISE EXCEPTION 'Ada produk yang tidak ditemukan atau tidak aktif';
  END IF;

  SELECT COALESCE(
    SUM(
      COALESCE((item->>'price')::numeric, product.price) *
      (item->>'quantity')::integer
    ),
    0
  )
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item
  JOIN products AS product
    ON product.id = (item->>'product_id')::uuid;

  IF COALESCE(p_discount_amount, 0) < 0 OR COALESCE(p_discount_amount, 0) > v_subtotal THEN
    RAISE EXCEPTION 'Discount tidak valid (tidak boleh negatif atau melebihi subtotal)';
  END IF;

  v_total := v_subtotal - COALESCE(p_discount_amount, 0);

  -- Invoice date follows Jakarta time, not the database's UTC clock.
  v_invoice_number := 'MW-' ||
    to_char((now() AT TIME ZONE 'Asia/Jakarta')::date, 'YYYYMMDD') || '-' ||
    lpad(nextval('metawellness_invoice_number_seq')::text, 5, '0');

  INSERT INTO orders (
    user_id,
    is_guest,
    total_price,
    subtotal,
    marketplace_fee,
    shipment_type,
    shipping_fee,
    shipping_address,
    shipping_regional,
    shipping_name,
    shipping_phone,
    shipping_zip,
    shipping_email,
    customer_username,
    note,
    voucher_code,
    voucher_id,
    voucher_discount_amount,
    status,
    order_source,
    manual_channel,
    manual_reference,
    invoice_number,
    lead_id,
    is_paid,
    discord_message_id
  )
  VALUES (
    NULL,
    true,
    v_total,
    v_subtotal,
    0,
    NULL,
    0,
    btrim(p_shipping_address),
    btrim(p_shipping_regional),
    v_lead.full_name,
    v_lead.whatsapp_phone,
    NULLIF(btrim(COALESCE(p_shipping_zip, '')), ''),
    NULL,
    NULL,
    NULLIF(btrim(COALESCE(p_note, '')), ''),
    NULL,
    NULL,
    COALESCE(p_discount_amount, 0),
    'processing',
    'manual_whatsapp',
    'discord',
    v_invoice_number,
    v_invoice_number,
    v_lead.id,
    false,
    p_discord_message_id
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    price_at_purchase,
    cogs_at_purchase,
    usage_days_at_purchase
  )
  SELECT
    v_order_id,
    product.id,
    (item->>'quantity')::integer,
    COALESCE((item->>'price')::numeric, product.price),
    COALESCE(product.cost_of_goods, 0),
    CASE
      WHEN product.product_type = 'misc' THEN 0
      ELSE GREATEST(0, COALESCE(product.usage_days, 0))
    END
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS entry(item, position)
  JOIN products AS product
    ON product.id = (entry.item->>'product_id')::uuid
  ORDER BY entry.position;

  INSERT INTO payments (
    order_id,
    receipt_url,
    transaction_code,
    sender_name,
    status,
    payment_type,
    is_paid
  )
  VALUES (
    v_order_id,
    '',
    v_invoice_number,
    v_lead.full_name,
    'pending',
    p_payment_type,
    false
  );

  -- Raises "Insufficient stock ..." and rolls everything back when stock is short.
  PERFORM public.deduct_order_inventory(v_order_id);

  SELECT id
  INTO v_customer_id
  FROM customers
  WHERE whatsapp_phone = v_lead.whatsapp_phone
  LIMIT 1
  FOR UPDATE;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (
      full_name,
      whatsapp_phone,
      domicile,
      lead_source,
      current_journey,
      first_order_id,
      last_order_id,
      closing_at,
      journey_updated_at,
      notes
    )
    VALUES (
      v_lead.full_name,
      v_lead.whatsapp_phone,
      COALESCE(v_lead.domicile, btrim(p_shipping_regional)),
      v_lead.origin::text,
      'closing',
      v_order_id,
      v_order_id,
      now(),
      now(),
      v_lead.notes
    )
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE customers
    SET
      full_name = v_lead.full_name,
      domicile = COALESCE(domicile, v_lead.domicile, btrim(p_shipping_regional)),
      first_order_id = COALESCE(first_order_id, v_order_id),
      last_order_id = v_order_id,
      current_journey = 'closing',
      closing_at = now(),
      journey_updated_at = now(),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  UPDATE leads
  SET
    is_customer = true,
    customer_id = v_customer_id,
    last_order_id = v_order_id,
    converted_at = COALESCE(converted_at, now()),
    updated_at = now()
  WHERE id = v_lead.id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'invoice_number', v_invoice_number,
    'duplicate', false
  );
END;
$$;

-- !payment: marks the invoice paid and stores the proof path. Rejects
-- cancelled or already-paid invoices so a proof is never overwritten.
CREATE OR REPLACE FUNCTION public.mark_discord_order_paid(
  p_order_id uuid,
  p_payment_amount numeric,
  p_payment_type text,
  p_payment_date timestamptz,
  p_proof_storage_path text,
  p_discord_message_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_payment_id uuid;
  v_replay_order_id uuid;
  v_payment_date timestamptz := COALESCE(p_payment_date, now());
BEGIN
  IF p_discord_message_id IS NOT NULL THEN
    SELECT order_id
    INTO v_replay_order_id
    FROM payments
    WHERE discord_message_id = p_discord_message_id
    LIMIT 1;

    IF v_replay_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'order_id', v_replay_order_id,
        'invoice_number', (SELECT invoice_number FROM orders WHERE id = v_replay_order_id),
        'duplicate', true
      );
    END IF;
  END IF;

  IF COALESCE(p_payment_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Nominal pembayaran harus lebih dari 0';
  END IF;

  IF p_payment_type NOT IN ('Shopee', 'Tokopedia', 'QRIS', 'Bank Transfer') THEN
    RAISE EXCEPTION 'Payment type tidak valid';
  END IF;

  IF btrim(COALESCE(p_proof_storage_path, '')) = '' THEN
    RAISE EXCEPTION 'Bukti pembayaran wajib diupload';
  END IF;

  SELECT id, status, is_paid, invoice_number, shipping_name
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan';
  END IF;

  IF v_order.status::text IN ('cancelled', 'canceled', 'reject') THEN
    RAISE EXCEPTION 'Invoice % sudah dibatalkan', COALESCE(v_order.invoice_number, p_order_id::text);
  END IF;

  IF v_order.is_paid THEN
    RAISE EXCEPTION 'Invoice % sudah lunas', COALESCE(v_order.invoice_number, p_order_id::text);
  END IF;

  SELECT id
  INTO v_payment_id
  FROM payments
  WHERE order_id = p_order_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    INSERT INTO payments (
      order_id,
      receipt_url,
      transaction_code,
      sender_name,
      status,
      payment_type,
      is_paid
    )
    VALUES (
      p_order_id,
      '',
      COALESCE(v_order.invoice_number, 'PAY-' || upper(left(p_order_id::text, 8))),
      v_order.shipping_name,
      'pending',
      p_payment_type,
      false
    )
    RETURNING id INTO v_payment_id;
  END IF;

  UPDATE payments
  SET
    payment_type = p_payment_type,
    status = 'success',
    is_paid = true,
    payment_amount = p_payment_amount,
    payment_date = v_payment_date,
    proof_storage_path = p_proof_storage_path,
    receipt_url = '/api/admin/payments/' || v_payment_id::text || '/proof',
    discord_message_id = p_discord_message_id
  WHERE id = v_payment_id;

  UPDATE orders
  SET
    is_paid = true,
    paid_at = v_payment_date
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'invoice_number', v_order.invoice_number,
    'duplicate', false
  );
END;
$$;

-- Only the server (service role) may call these. Supabase grants EXECUTE on
-- new public functions to anon/authenticated by default, so revoke it
-- explicitly; otherwise anyone with the public anon key could call them.
REVOKE ALL ON FUNCTION public.record_discord_bot_request(
  text, text, text, text, text, text, integer
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_discord_invoice(
  uuid, text, text, text, jsonb, numeric, text, text, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_discord_order_paid(
  uuid, numeric, text, timestamptz, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_discord_bot_request(
  text, text, text, text, text, text, integer
) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_discord_invoice(
  uuid, text, text, text, jsonb, numeric, text, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_discord_order_paid(
  uuid, numeric, text, timestamptz, text, text
) TO service_role;
