-- A lead becomes a customer as soon as an order on the same WhatsApp number
-- is paid, wherever the order was made: !invoice + !payment, the panel order
-- form, or the website checkout. Before this, only !invoice set
-- leads.is_customer, so leads who bought through the panel kept showing up in
-- !followup and as prospects on the panel Leads page.
--
-- "Paid" is the same rule as isOrderPaid() in lib/discord-bot-data.ts, which
-- !aftersales and !reorder use:
--   * cancelled and rejected orders never count;
--   * is_paid = true counts;
--   * orders made by the bot (manual_channel 'discord' or with a lead_id)
--     count only once !payment sets is_paid;
--   * other orders count once their status is processing, shipping or completed.
--
-- Phone numbers are compared after the same normalization as
-- normalizeBotPhone(): digits only, a leading 0 or 8 becomes 62. Orders without
-- a usable number (Shopee/Tokopedia "-" or masked numbers) never match a lead.
--
-- Leads are never switched back to prospect automatically (for example when an
-- order is cancelled). Fix those with !updateleads <wa> + is_customer: false.

CREATE OR REPLACE FUNCTION public.normalize_wa_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN length(cleaned.digits) < 8 THEN NULL
    WHEN left(cleaned.digits, 1) = '0' THEN '62' || substr(cleaned.digits, 2)
    WHEN left(cleaned.digits, 1) = '8' THEN '62' || cleaned.digits
    ELSE cleaned.digits
  END
  FROM (SELECT regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g') AS digits) AS cleaned
$$;

CREATE OR REPLACE FUNCTION public.order_counts_as_paid(
  p_status text,
  p_is_paid boolean,
  p_manual_channel text,
  p_lead_id uuid
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_status IN ('cancelled', 'reject') THEN false
    WHEN COALESCE(p_is_paid, false) THEN true
    WHEN p_manual_channel = 'discord' OR p_lead_id IS NOT NULL THEN false
    ELSE COALESCE(p_status, '') IN ('processing', 'shipping', 'completed')
  END
$$;

-- After an order is saved: mark the lead with the same WhatsApp number as a
-- customer and point last_order_id at the newest paid order.
--
-- SECURITY DEFINER because the website checkout inserts orders with the
-- shopper's own session, which cannot read or update leads. Errors are caught
-- so this bookkeeping can never block an order from being saved.
CREATE OR REPLACE FUNCTION public.mark_lead_customer_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_phone text;
BEGIN
  IF NOT public.order_counts_as_paid(NEW.status::text, NEW.is_paid, NEW.manual_channel, NEW.lead_id) THEN
    RETURN NULL;
  END IF;

  v_phone := public.normalize_wa_phone(NEW.shipping_phone);
  IF v_phone IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    UPDATE public.leads AS l
    SET
      is_customer = true,
      converted_at = COALESCE(l.converted_at, LEAST(NEW.created_at, now())),
      last_order_id = CASE
        WHEN l.last_order_id IS NULL THEN NEW.id
        WHEN EXISTS (
          SELECT 1 FROM public.orders AS o
          WHERE o.id = l.last_order_id AND o.created_at > NEW.created_at
        ) THEN l.last_order_id
        ELSE NEW.id
      END,
      updated_at = now()
    WHERE l.whatsapp_phone = v_phone
      AND (
        NOT l.is_customer
        OR l.last_order_id IS NULL
        OR (
          l.last_order_id <> NEW.id
          AND NOT EXISTS (
            SELECT 1 FROM public.orders AS o
            WHERE o.id = l.last_order_id AND o.created_at > NEW.created_at
          )
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'mark_lead_customer_on_paid_order: lead not updated for order %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END;
$$;

-- Before a lead is saved (new lead, or its WhatsApp number changed): a number
-- that already has a paid order belongs to someone who already bought, so the
-- lead starts as a customer and stays out of !followup.
CREATE OR REPLACE FUNCTION public.mark_new_lead_customer_from_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_first_paid_at timestamptz;
  v_last_order_id uuid;
BEGIN
  IF NEW.is_customer THEN
    RETURN NEW;
  END IF;
  -- An edit that keeps the number (for example unticking "customer" by hand)
  -- is left alone.
  IF TG_OP = 'UPDATE' AND NEW.whatsapp_phone IS NOT DISTINCT FROM OLD.whatsapp_phone THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT min(o.created_at), (array_agg(o.id ORDER BY o.created_at DESC))[1]
    INTO v_first_paid_at, v_last_order_id
    FROM public.orders AS o
    WHERE public.normalize_wa_phone(o.shipping_phone) = public.normalize_wa_phone(NEW.whatsapp_phone)
      AND public.order_counts_as_paid(o.status::text, o.is_paid, o.manual_channel, o.lead_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'mark_new_lead_customer_from_orders: paid orders not checked for lead %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  IF v_last_order_id IS NOT NULL THEN
    NEW.is_customer := true;
    NEW.converted_at := COALESCE(NEW.converted_at, v_first_paid_at);
    NEW.last_order_id := COALESCE(NEW.last_order_id, v_last_order_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_mark_lead_customer ON public.orders;
CREATE TRIGGER orders_mark_lead_customer
AFTER INSERT OR UPDATE OF status, is_paid, shipping_phone, manual_channel, lead_id
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.mark_lead_customer_on_paid_order();

DROP TRIGGER IF EXISTS leads_mark_customer_from_orders ON public.leads;
CREATE TRIGGER leads_mark_customer_from_orders
BEFORE INSERT OR UPDATE OF whatsapp_phone
ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.mark_new_lead_customer_from_orders();

-- Supabase grants EXECUTE on new public functions to anon/authenticated, which
-- would expose the helpers as RPC endpoints. The triggers do not need it: they
-- run as the function owner.
REVOKE ALL ON FUNCTION public.normalize_wa_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.order_counts_as_paid(text, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_lead_customer_on_paid_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_new_lead_customer_from_orders() FROM PUBLIC, anon, authenticated;

-- Existing data: leads whose number already has a paid order.
WITH paid AS (
  SELECT
    public.normalize_wa_phone(o.shipping_phone) AS phone,
    min(o.created_at) AS first_paid_at,
    (array_agg(o.id ORDER BY o.created_at DESC))[1] AS last_order_id
  FROM public.orders AS o
  WHERE public.order_counts_as_paid(o.status::text, o.is_paid, o.manual_channel, o.lead_id)
  GROUP BY 1
)
UPDATE public.leads AS l
SET
  is_customer = true,
  converted_at = COALESCE(l.converted_at, paid.first_paid_at),
  last_order_id = COALESCE(l.last_order_id, paid.last_order_id),
  updated_at = now()
FROM paid
WHERE paid.phone IS NOT NULL
  AND l.whatsapp_phone = paid.phone
  AND NOT l.is_customer;
