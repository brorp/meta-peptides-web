-- Leads become contacts in the CS WhatsApp account itself (not the phone
-- address book), so WhatsApp shows the lead's name instead of the number. The
-- WhatsApp listener saves them; the API keeps the state here:
--   wa_contact_name         name last saved in WhatsApp, NULL until saved;
--   wa_contact_phone        number it was saved under (a changed number
--                           removes the old contact first);
--   wa_contact_synced_at    when the lead and its contact were last in step;
--   wa_contact_error        last error, short text for !synccontacts;
--   wa_contact_attempted_at last try (a failed lead is retried after an hour).
-- lead_wa_contact_candidates(): leads whose contact is missing (new leads
-- only, unless p_created_since is NULL for !synccontacts) or may be out of
-- date (the lead changed after the last save).
-- Only adds nullable columns and a function: safe before or after the code is
-- deployed. Safe to run in the Supabase SQL editor (one transaction).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS wa_contact_name text,
  ADD COLUMN IF NOT EXISTS wa_contact_phone text,
  ADD COLUMN IF NOT EXISTS wa_contact_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS wa_contact_error text,
  ADD COLUMN IF NOT EXISTS wa_contact_attempted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_wa_contact_name_length') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_wa_contact_name_length
      CHECK (wa_contact_name IS NULL OR length(wa_contact_name) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_wa_contact_error_length') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_wa_contact_error_length
      CHECK (wa_contact_error IS NULL OR length(wa_contact_error) <= 300);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_leads_wa_contact_missing
ON public.leads (created_at)
WHERE wa_contact_name IS NULL;

CREATE OR REPLACE FUNCTION public.lead_wa_contact_candidates(
  p_limit integer DEFAULT 10,
  p_created_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  whatsapp_phone text,
  full_name text,
  origin text,
  chat_date date,
  status text,
  wa_contact_name text,
  wa_contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.whatsapp_phone, l.full_name, l.origin::text, l.chat_date, l.status::text, l.wa_contact_name, l.wa_contact_phone
  FROM public.leads l
  WHERE (l.wa_contact_synced_at IS NULL OR l.updated_at > l.wa_contact_synced_at)
    -- A failed lead waits an hour; a saved one comes back as soon as it changes.
    AND (l.wa_contact_error IS NULL OR l.wa_contact_attempted_at IS NULL OR l.wa_contact_attempted_at < now() - interval '1 hour')
    AND (
      l.wa_contact_name IS NOT NULL
      OR (l.status <> 'skip' AND (p_created_since IS NULL OR l.created_at >= p_created_since))
    )
  ORDER BY l.created_at
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 200);
$$;

REVOKE ALL ON FUNCTION public.lead_wa_contact_candidates(integer, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_wa_contact_candidates(integer, timestamptz) TO service_role;
