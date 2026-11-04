-- Shopee/Tokopedia orders made with !invoice skip !payment and
-- !updateshipping: the buyer already paid inside the marketplace and the
-- marketplace ships the parcel. So create_discord_invoice now saves them as
--   * paid: orders.is_paid / paid_at, and the payment row as success with the
--     order total (after the marketplace fee) as the amount;
--   * shipped by the marketplace: no courier, shipping fee 0, and "-" as the
--     tracking number (the panel also leaves the courier empty for these).
-- WhatsApp orders are unchanged: they still go through !payment and
-- !updateshipping. Everything else is unchanged from 20261103090000.
--
-- The end of this file gives Shopee/Tokopedia orders already made with
-- !invoice the same state.
--
-- Older versions are dropped first (they are already gone where 20261103090000
-- ran). Keeping them would give PostgREST two candidate functions for the same
-- call.
DROP FUNCTION IF EXISTS public.create_discord_invoice(
  uuid, text, text, text, jsonb, numeric, text, text, text
);
DROP FUNCTION IF EXISTS public.create_discord_invoice(
  uuid, text, text, text, jsonb, numeric, text, text, text, text, numeric, text
);

CREATE OR REPLACE FUNCTION public.create_discord_invoice(
  p_lead_id uuid,
  p_shipping_address text,
  p_shipping_regional text,
  p_shipping_zip text,
  p_items jsonb,
  p_discount_amount numeric,
  p_payment_type text,
  p_note text,
  p_discord_message_id text,
  p_order_source text DEFAULT 'manual_whatsapp',
  p_marketplace_fee numeric DEFAULT 0,
  p_marketplace_order_no text DEFAULT NULL,
  p_buyer_name text DEFAULT NULL
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
  v_order_source text := COALESCE(NULLIF(btrim(p_order_source), ''), 'manual_whatsapp');
  v_is_marketplace boolean;
  v_marketplace_label text;
  v_discount numeric(14, 2) := COALESCE(p_discount_amount, 0);
  v_marketplace_fee numeric(14, 2) := COALESCE(p_marketplace_fee, 0);
  v_marketplace_order_no text := NULLIF(btrim(COALESCE(p_marketplace_order_no, '')), '');
  v_buyer_name text := NULLIF(btrim(COALESCE(p_buyer_name, '')), '');
  v_shipping_name text;
  v_shipping_phone text;
  v_payment_status payments.status%TYPE := 'pending';
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

  IF v_order_source NOT IN ('manual_whatsapp', 'shopee', 'tokopedia') THEN
    RAISE EXCEPTION 'Order type tidak valid (whatsapp, shopee, atau tokopedia)';
  END IF;

  v_is_marketplace := v_order_source IN ('shopee', 'tokopedia');
  v_marketplace_label := CASE v_order_source
    WHEN 'shopee' THEN 'Shopee'
    WHEN 'tokopedia' THEN 'Tokopedia'
  END;

  -- Paid inside the marketplace, so there is no !payment step.
  IF v_is_marketplace THEN
    v_payment_status := 'success';
  END IF;

  IF v_marketplace_fee < 0 THEN
    RAISE EXCEPTION 'Marketplace fee tidak boleh negatif';
  END IF;

  IF NOT v_is_marketplace AND v_marketplace_fee > 0 THEN
    RAISE EXCEPTION 'Marketplace fee hanya untuk order Shopee/Tokopedia';
  END IF;

  IF NOT v_is_marketplace AND v_marketplace_order_no IS NOT NULL THEN
    RAISE EXCEPTION 'Nomor pesanan marketplace hanya untuk order Shopee/Tokopedia';
  END IF;

  IF v_is_marketplace AND v_discount > 0 THEN
    RAISE EXCEPTION 'Discount hanya untuk order WhatsApp. Untuk order %, tulis harga jual di item', v_marketplace_label;
  END IF;

  IF p_lead_id IS NULL THEN
    IF NOT v_is_marketplace THEN
      RAISE EXCEPTION 'Lead wajib diisi untuk order WhatsApp';
    END IF;

    IF v_buyer_name IS NULL THEN
      RAISE EXCEPTION 'Nama pembeli wajib diisi untuk order % tanpa lead', v_marketplace_label;
    END IF;

    IF length(v_buyer_name) > 200 THEN
      RAISE EXCEPTION 'Nama pembeli maksimal 200 karakter';
    END IF;

    v_shipping_name := v_buyer_name;
    v_shipping_phone := '-';
  ELSE
    IF v_buyer_name IS NOT NULL THEN
      RAISE EXCEPTION 'Nama pembeli hanya untuk order tanpa lead (nama diambil dari lead)';
    END IF;

    SELECT *
    INTO v_lead
    FROM leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lead tidak ditemukan';
    END IF;

    v_shipping_name := v_lead.full_name;
    v_shipping_phone := v_lead.whatsapp_phone;
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

  IF p_payment_type IS NULL OR p_payment_type NOT IN ('Shopee', 'Tokopedia', 'QRIS', 'Bank Transfer') THEN
    RAISE EXCEPTION 'Payment type tidak valid';
  END IF;

  IF v_is_marketplace AND p_payment_type <> v_marketplace_label THEN
    RAISE EXCEPTION 'Order % dibayar lewat %, payment type harus %', v_marketplace_label, v_marketplace_label, v_marketplace_label;
  END IF;

  IF NOT v_is_marketplace AND p_payment_type IN ('Shopee', 'Tokopedia') THEN
    RAISE EXCEPTION 'Payment type % hanya untuk order %', p_payment_type, p_payment_type;
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

  IF v_discount < 0 OR v_discount > v_subtotal THEN
    RAISE EXCEPTION 'Discount tidak valid (tidak boleh negatif atau melebihi subtotal)';
  END IF;

  IF v_marketplace_fee > v_subtotal THEN
    RAISE EXCEPTION 'Marketplace fee tidak boleh melebihi subtotal';
  END IF;

  -- Same as the panel: the marketplace fee comes off the order total.
  v_total := v_subtotal - v_discount - v_marketplace_fee;

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
    paid_at,
    tracking_number,
    discord_message_id
  )
  VALUES (
    NULL,
    true,
    v_total,
    v_subtotal,
    v_marketplace_fee,
    NULL,
    0,
    btrim(p_shipping_address),
    btrim(p_shipping_regional),
    v_shipping_name,
    v_shipping_phone,
    NULLIF(btrim(COALESCE(p_shipping_zip, '')), ''),
    NULL,
    NULL,
    NULLIF(btrim(COALESCE(p_note, '')), ''),
    NULL,
    NULL,
    v_discount,
    'processing',
    v_order_source,
    'discord',
    COALESCE(v_marketplace_order_no, v_invoice_number),
    v_invoice_number,
    p_lead_id,
    v_is_marketplace,
    CASE WHEN v_is_marketplace THEN now() END,
    -- The marketplace ships it: no !updateshipping, "-" as the tracking number.
    CASE WHEN v_is_marketplace THEN '-' END,
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
    is_paid,
    payment_amount,
    payment_date
  )
  VALUES (
    v_order_id,
    '',
    v_invoice_number,
    v_shipping_name,
    v_payment_status,
    p_payment_type,
    v_is_marketplace,
    CASE WHEN v_is_marketplace THEN v_total END,
    CASE WHEN v_is_marketplace THEN now() END
  );

  -- Raises "Insufficient stock ..." and rolls everything back when stock is short.
  PERFORM public.deduct_order_inventory(v_order_id);

  -- Customers are matched by WhatsApp number, so an order without a lead
  -- (no phone number) creates no customer and updates no lead.
  IF p_lead_id IS NOT NULL THEN
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
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'invoice_number', v_invoice_number,
    'duplicate', false
  );
END;
$$;

-- Only the server (service role) may call this. Supabase grants EXECUTE on
-- new public functions to anon/authenticated by default, so revoke it.
REVOKE ALL ON FUNCTION public.create_discord_invoice(
  uuid, text, text, text, jsonb, numeric, text, text, text, text, numeric, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_discord_invoice(
  uuid, text, text, text, jsonb, numeric, text, text, text, text, numeric, text, text
) TO service_role;

-- Shopee/Tokopedia orders already made with !invoice (not cancelled) get the
-- same state: paid at the order time, and "-" as the tracking number unless a
-- real one was recorded with !updateshipping.
UPDATE public.payments AS p
SET
  status = 'success',
  is_paid = true,
  payment_amount = COALESCE(p.payment_amount, o.total_price),
  payment_date = COALESCE(p.payment_date, o.created_at)
FROM public.orders AS o
WHERE p.order_id = o.id
  AND o.manual_channel = 'discord'
  AND o.order_source IN ('shopee', 'tokopedia')
  AND o.status::text NOT IN ('cancelled', 'reject')
  AND NOT p.is_paid;

UPDATE public.orders
SET
  is_paid = true,
  paid_at = COALESCE(paid_at, created_at),
  shipping_fee = COALESCE(shipping_fee, 0),
  tracking_number = COALESCE(NULLIF(btrim(tracking_number), ''), '-')
WHERE manual_channel = 'discord'
  AND order_source IN ('shopee', 'tokopedia')
  AND status::text NOT IN ('cancelled', 'reject')
  AND (
    NOT is_paid
    OR shipping_fee IS NULL
    OR tracking_number IS NULL
    OR btrim(tracking_number) = ''
  );
