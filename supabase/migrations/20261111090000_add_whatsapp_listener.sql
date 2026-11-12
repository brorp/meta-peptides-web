-- WhatsApp listener (whatsapp-listener/ on the VPS). It reads the CS
-- WhatsApp number as a linked device and never sends anything. Chats from a
-- new number become leads automatically through /api/bot/whatsapp/inbound.
--
-- * Lead origin 'unknown': the chat did not show where the person came from
--   (not a Click-to-WhatsApp ad, not Instagram). The team fills it in with
--   !updateleads.
-- * whatsapp_messages: the text of chats with leads that are not customers
--   yet, kept for the later chat analysis (status/interest). Only the server
--   can read it. Rows older than 90 days are removed by
--   purge_old_whatsapp_messages(), which the listener calls once a day.
-- * whatsapp_ignored_numbers: numbers that never become leads (friends,
--   family, suppliers), managed with !ignorewa / !unignorewa.
--
-- Safe to run in the Supabase SQL editor (one transaction): the new enum value
-- is not used inside this file.

ALTER TYPE public.lead_origin_enum ADD VALUE IF NOT EXISTS 'unknown';

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id text NOT NULL,
  chat_phone text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  direction text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  body text,
  is_ad boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_messages_direction_check CHECK (direction IN ('in', 'out')),
  CONSTRAINT whatsapp_messages_phone_check CHECK (chat_phone ~ '^62[0-9]{6,15}$'),
  CONSTRAINT whatsapp_messages_body_length CHECK (body IS NULL OR length(body) <= 4000)
);

-- The same message can reach the API twice (listener retry): stored once.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_chat_message_unique_idx
ON public.whatsapp_messages (chat_phone, wa_message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_sent
ON public.whatsapp_messages (lead_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent
ON public.whatsapp_messages (sent_at);

CREATE TABLE IF NOT EXISTS public.whatsapp_ignored_numbers (
  phone text PRIMARY KEY,
  note text,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_ignored_numbers_phone_check CHECK (phone ~ '^62[0-9]{6,15}$'),
  CONSTRAINT whatsapp_ignored_numbers_note_length CHECK (note IS NULL OR length(note) <= 200)
);

-- Chat text and the ignore list are server-only: RLS on with no policies, and
-- no grants for the public roles.
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ignored_numbers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.whatsapp_ignored_numbers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_ignored_numbers TO service_role;

CREATE OR REPLACE FUNCTION public.purge_old_whatsapp_messages(p_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_days IS NULL OR p_days < 30 THEN
    RAISE EXCEPTION 'Retensi minimal 30 hari';
  END IF;

  DELETE FROM whatsapp_messages
  WHERE sent_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_whatsapp_messages(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_whatsapp_messages(integer) TO service_role;
