-- Chat analysis for leads (needs 20261111090000: chats saved by the WhatsApp
-- listener). Twice a day the API reads the WhatsApp chat of every lead that
-- is not a customer yet and has new messages, and Claude suggests status,
-- rejection, interest, goal and domicile. For now these are suggestions: the
-- team applies one with !applyai.
--
-- * lead_ai_suggestions: every suggestion (source 'ai'), and every change
--   made by the ghosting rule (source 'rule', applied right away).
-- * leads.ai_analyzed_at / ai_analyzed_through: when the chat was last
--   analysed and up to which message, so only chats with new messages are
--   sent again.
-- * leads.ai_applied_at: when !applyai last changed the lead, so the ghosting
--   rule can tell a suggestion the team accepted from a manual edit.
-- * lead_analysis_candidates(): leads whose customer wrote something new
--   since the last analysis (messages from the CS alone do not count). A lead
--   the ghosting rule changed waits until the customer replies.
-- * apply_lead_ghosting_rule(): the customer has not replied for more than 3
--   days after the CS's last message -> status cold, rejection ghosting.
--   Leads the team changed by hand after that message are left alone.
--
-- Safe to run in the Supabase SQL editor (one transaction).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_analyzed_through timestamptz,
  ADD COLUMN IF NOT EXISTS ai_applied_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lead_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'ai',
  model text,
  status lead_status_enum,
  rejection lead_rejection_enum,
  interest_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  interest_text text,
  goal text,
  domicile text,
  summary text,
  evidence text,
  confidence text,
  previous_status lead_status_enum,
  changes text[] NOT NULL DEFAULT '{}',
  messages_through timestamptz,
  message_count integer,
  input_tokens integer,
  output_tokens integer,
  applied_at timestamptz,
  applied_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_ai_suggestions_source_check CHECK (source IN ('ai', 'rule')),
  CONSTRAINT lead_ai_suggestions_confidence_check CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low')),
  CONSTRAINT lead_ai_suggestions_text_length CHECK (
    coalesce(length(interest_text), 0) <= 200 AND coalesce(length(goal), 0) <= 300 AND
    coalesce(length(domicile), 0) <= 160 AND coalesce(length(summary), 0) <= 600 AND
    coalesce(length(evidence), 0) <= 300
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_ai_suggestions_lead_created
ON public.lead_ai_suggestions (lead_id, created_at DESC);

ALTER TABLE public.lead_ai_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_ai_suggestions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_ai_suggestions TO service_role;

CREATE OR REPLACE FUNCTION public.lead_analysis_candidates(p_limit integer DEFAULT 10)
RETURNS TABLE (lead_id uuid, last_message_at timestamptz, message_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.id, max(m.sent_at), count(*)::integer
  FROM leads AS l
  JOIN whatsapp_messages AS m ON m.lead_id = l.id
  WHERE l.is_customer = false
    AND l.status <> 'skip'
  GROUP BY l.id, l.ai_analyzed_through, l.rejection, l.updated_at
  HAVING max(m.sent_at) FILTER (WHERE m.direction = 'in') > coalesce(l.ai_analyzed_through, '-infinity'::timestamptz)
     AND NOT (
       l.rejection IS NOT DISTINCT FROM 'ghosting'
       AND max(m.sent_at) FILTER (WHERE m.direction = 'in') <= l.updated_at
     )
  ORDER BY max(m.sent_at) FILTER (WHERE m.direction = 'in')
  LIMIT greatest(1, least(coalesce(p_limit, 10), 100));
$$;

CREATE OR REPLACE FUNCTION public.apply_lead_ghosting_rule(p_days integer DEFAULT 3)
RETURNS TABLE (lead_id uuid, whatsapp_phone text, full_name text, previous_status lead_status_enum)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_row record;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'Aturan ghosting minimal 1 hari';
  END IF;

  FOR v_row IN
    WITH last_message AS (
      SELECT DISTINCT ON (m.lead_id) m.lead_id, m.direction, m.sent_at
      FROM whatsapp_messages AS m
      WHERE m.lead_id IS NOT NULL
      ORDER BY m.lead_id, m.sent_at DESC
    )
    SELECT l.id, l.whatsapp_phone, l.full_name, l.status, lm.sent_at
    FROM leads AS l
    JOIN last_message AS lm ON lm.lead_id = l.id
    WHERE lm.direction = 'out'
      AND lm.sent_at < now() - make_interval(days => p_days)
      AND l.is_customer = false
      AND l.status <> 'skip'
      AND l.rejection IS DISTINCT FROM 'ghosting'
      -- Not changed by hand after the CS's last message (a suggestion the
      -- team applied with !applyai does not count as a manual change).
      AND (l.updated_at < lm.sent_at OR l.updated_at = l.ai_applied_at)
    FOR UPDATE OF l
  LOOP
    UPDATE leads
    SET status = 'cold', rejection = 'ghosting', updated_at = now(), ai_applied_at = now()
    WHERE id = v_row.id;

    INSERT INTO lead_ai_suggestions (lead_id, source, status, rejection, previous_status, changes, summary, messages_through, applied_at, applied_by)
    VALUES (
      v_row.id, 'rule', 'cold', 'ghosting', v_row.status, ARRAY['status', 'rejection'],
      format('Tidak membalas lebih dari %s hari sejak pesan terakhir CS.', p_days),
      v_row.sent_at, now(), 'aturan ghosting'
    );

    lead_id := v_row.id;
    whatsapp_phone := v_row.whatsapp_phone;
    full_name := v_row.full_name;
    previous_status := v_row.status;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_analysis_candidates(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_lead_ghosting_rule(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_analysis_candidates(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_lead_ghosting_rule(integer) TO service_role;
