-- Director-only CS KPI supervision. Additive; existing business data is not
-- scored retroactively. Monitoring starts only after a director configures
-- and enables it. Rollback: disable monitoring; retain audit tables/evidence.

CREATE TABLE public.cs_kpi_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  discord_user_id text UNIQUE CHECK (discord_user_id IS NULL OR discord_user_id ~ '^[0-9]{6,24}$'),
  active boolean NOT NULL DEFAULT true,
  report_required boolean NOT NULL DEFAULT true,
  work_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}' CHECK (work_days <@ ARRAY[0,1,2,3,4,5,6]),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cs_kpi_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  config jsonb NOT NULL DEFAULT '{"enabled":false}',
  monitoring_started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_scan_at timestamptz,
  last_scan_count integer,
  last_scan_error text,
  listener_heartbeat_at timestamptz,
  listener_connected boolean NOT NULL DEFAULT false,
  chat_observed_from timestamptz,
  lease_token uuid,
  lease_until timestamptz
);
INSERT INTO public.cs_kpi_settings (singleton) VALUES (true);

CREATE TABLE public.cs_kpi_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key text NOT NULL UNIQUE CHECK (length(incident_key) BETWEEN 1 AND 240),
  rule text NOT NULL CHECK (rule IN ('reply_late','consultation_abandoned','data_entry_late','daily_report_missing','order_processing_late')),
  admin_id uuid REFERENCES public.cs_kpi_admins(id) ON DELETE RESTRICT,
  points integer NOT NULL,
  occurred_at timestamptz NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL CHECK (length(evidence::text) <= 24000),
  source text NOT NULL DEFAULT 'automatic' CHECK (source IN ('automatic','manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','dismissed')),
  reviewer text,
  review_note text,
  reviewed_at timestamptz,
  version integer NOT NULL DEFAULT 0,
  CHECK (points = CASE rule WHEN 'reply_late' THEN 1 WHEN 'order_processing_late' THEN 5 ELSE 2 END),
  CHECK (status <> 'confirmed' OR admin_id IS NOT NULL),
  CHECK (status = 'pending' OR (reviewed_at IS NOT NULL AND reviewer IS NOT NULL AND review_note IS NOT NULL AND length(btrim(reviewer)) > 0 AND length(btrim(review_note)) > 0))
);
CREATE INDEX cs_kpi_findings_period_idx ON public.cs_kpi_findings (occurred_at DESC, id);
CREATE INDEX cs_kpi_findings_admin_period_idx ON public.cs_kpi_findings (admin_id, occurred_at);

CREATE TABLE public.cs_kpi_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.cs_kpi_admins(id) ON DELETE RESTRICT,
  report_date date NOT NULL,
  sent_at timestamptz NOT NULL,
  evidence_url text CHECK (evidence_url IS NULL OR evidence_url ~ '^https://' AND length(evidence_url) <= 1000),
  source_key text NOT NULL UNIQUE CHECK (length(source_key) BETWEEN 1 AND 200),
  source text NOT NULL CHECK (source IN ('panel','manual')),
  summary text NOT NULL CHECK (length(btrim(summary)) BETWEEN 20 AND 4000),
  follow_up text NOT NULL DEFAULT '' CHECK (length(follow_up) <= 2000),
  blockers text NOT NULL DEFAULT '' CHECK (length(blockers) <= 2000),
  recorded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cs_kpi_reports_admin_date_idx ON public.cs_kpi_daily_reports (admin_id, report_date);
CREATE UNIQUE INDEX cs_kpi_reports_panel_once_idx ON public.cs_kpi_daily_reports (admin_id,report_date) WHERE source='panel';

CREATE TABLE public.cs_kpi_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL,
  actor text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cs_kpi_audit_row_idx ON public.cs_kpi_audit (table_name, row_id, created_at DESC);

-- Clients cannot forge the actual recording/processing times by editing the
-- existing (backdateable) order date. No backfill of historical work is made.
ALTER TABLE public.orders ADD COLUMN cs_recorded_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.orders ADD COLUMN cs_processed_at timestamptz;
ALTER TABLE public.leads ADD COLUMN cs_recorded_at timestamptz NOT NULL DEFAULT now();

CREATE FUNCTION public.cs_kpi_capture_times() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.cs_recorded_at := clock_timestamp();
  ELSE NEW.cs_recorded_at := OLD.cs_recorded_at; END IF;
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'UPDATE' THEN NEW.cs_processed_at := OLD.cs_processed_at;
    ELSE NEW.cs_processed_at := NULL; END IF;
    IF NEW.cs_processed_at IS NULL AND (
      NEW.status::text IN ('processing','completed') OR
      NULLIF(btrim(coalesce(NEW.tracking_number,'')), '') IS NOT NULL AND btrim(NEW.tracking_number) <> '-'
    ) THEN NEW.cs_processed_at := clock_timestamp(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cs_kpi_order_times BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.cs_kpi_capture_times();
CREATE TRIGGER cs_kpi_lead_times BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.cs_kpi_capture_times();

CREATE FUNCTION public.cs_kpi_audit_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO cs_kpi_audit (table_name, row_id, action, actor, before_value, after_value)
  VALUES (TG_TABLE_NAME, CASE WHEN TG_TABLE_NAME = 'cs_kpi_settings' THEN 'settings' ELSE to_jsonb(NEW)->>'id' END,
    TG_OP, coalesce(nullif(current_setting('app.cs_kpi_actor', true),''),to_jsonb(NEW)->>'recorded_by', 'system'),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER cs_kpi_finding_audit AFTER INSERT OR UPDATE ON public.cs_kpi_findings
FOR EACH ROW EXECUTE FUNCTION public.cs_kpi_audit_change();
CREATE TRIGGER cs_kpi_admin_audit AFTER INSERT OR UPDATE ON public.cs_kpi_admins
FOR EACH ROW EXECUTE FUNCTION public.cs_kpi_audit_change();
CREATE TRIGGER cs_kpi_report_audit AFTER INSERT ON public.cs_kpi_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.cs_kpi_audit_change();

CREATE FUNCTION public.cs_kpi_save_settings(p_config jsonb, p_actor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old cs_kpi_settings; v_new cs_kpi_settings;
BEGIN
  IF coalesce(length(btrim(p_actor)),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid actor'; END IF;
  SELECT * INTO v_old FROM cs_kpi_settings WHERE singleton FOR UPDATE;
  PERFORM set_config('app.cs_kpi_actor', 'root: ' || p_actor, true);
  UPDATE cs_kpi_settings SET config = p_config, updated_at = now(),
    monitoring_started_at = CASE
      WHEN coalesce((p_config->>'enabled')::boolean, false) AND NOT coalesce((v_old.config->>'enabled')::boolean, false) THEN clock_timestamp()
      ELSE monitoring_started_at END
  WHERE singleton RETURNING * INTO v_new;
  INSERT INTO cs_kpi_audit (table_name,row_id,action,actor,before_value,after_value)
  VALUES ('cs_kpi_settings','settings','UPDATE','root: ' || p_actor,
    jsonb_build_object('config',v_old.config,'monitoring_started_at',v_old.monitoring_started_at),
    jsonb_build_object('config',v_new.config,'monitoring_started_at',v_new.monitoring_started_at));
  RETURN jsonb_build_object('config',v_new.config,'monitoring_started_at',v_new.monitoring_started_at);
END $$;

CREATE FUNCTION public.cs_kpi_upsert_admin(p_id uuid, p_name text, p_discord_user_id text, p_active boolean, p_report_required boolean, p_work_days integer[], p_actor text)
RETURNS public.cs_kpi_admins LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_admin cs_kpi_admins;
BEGIN
  IF coalesce(length(btrim(p_actor)),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid actor'; END IF;
  PERFORM set_config('app.cs_kpi_actor', 'root: ' || p_actor, true);
  INSERT INTO cs_kpi_admins (id,name,discord_user_id,active,report_required,work_days)
  VALUES (coalesce(p_id,gen_random_uuid()),btrim(p_name),nullif(p_discord_user_id,''),p_active,p_report_required,p_work_days)
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, discord_user_id=EXCLUDED.discord_user_id,
    active=EXCLUDED.active, report_required=EXCLUDED.report_required, work_days=EXCLUDED.work_days
  RETURNING * INTO v_admin;
  RETURN v_admin;
END $$;

-- One episode is one incident. A longer consultation wait escalates the same
-- pending finding (1 -> 2 points) instead of counting the same silence twice.
-- Reviewed evidence and scores are never overwritten by background scans.
CREATE FUNCTION public.cs_kpi_record_finding(p_finding jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_points integer;
BEGIN
  IF p_finding->>'source' = 'manual' THEN
    PERFORM set_config('app.cs_kpi_actor',p_finding->'evidence'->>'recorded_by',true);
  END IF;
  v_points := CASE p_finding->>'rule' WHEN 'reply_late' THEN 1 WHEN 'order_processing_late' THEN 5 ELSE 2 END;
  INSERT INTO cs_kpi_findings (incident_key,rule,admin_id,points,occurred_at,evidence,source)
  VALUES (p_finding->>'incident_key',p_finding->>'rule',nullif(p_finding->>'admin_id','')::uuid,
    v_points,(p_finding->>'occurred_at')::timestamptz,p_finding->'evidence',coalesce(p_finding->>'source','automatic'))
  ON CONFLICT (incident_key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    UPDATE cs_kpi_findings SET rule=p_finding->>'rule',points=v_points,evidence=p_finding->'evidence',
      occurred_at=(p_finding->>'occurred_at')::timestamptz,version=version+1
    WHERE incident_key=p_finding->>'incident_key' AND status='pending' AND points < v_points
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE FUNCTION public.cs_kpi_review_finding(p_id uuid, p_status text, p_admin_id uuid, p_note text, p_reviewer text, p_version integer)
RETURNS public.cs_kpi_findings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old cs_kpi_findings; v_new cs_kpi_findings;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('pending','confirmed','dismissed') OR coalesce(length(btrim(p_note)),0) NOT BETWEEN 1 AND 1000
    OR coalesce(length(btrim(p_reviewer)),0) NOT BETWEEN 1 AND 100 OR p_version IS NULL THEN RAISE EXCEPTION 'Invalid review'; END IF;
  SELECT * INTO v_old FROM cs_kpi_findings WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CS_KPI_NOT_FOUND'; END IF;
  IF v_old.version <> p_version THEN RAISE EXCEPTION 'CS_KPI_CONFLICT'; END IF;
  IF p_status='confirmed' AND p_admin_id IS NULL THEN RAISE EXCEPTION 'Admin wajib dipilih'; END IF;
  PERFORM set_config('app.cs_kpi_actor', 'root: ' || p_reviewer, true);
  UPDATE cs_kpi_findings SET status=p_status,admin_id=p_admin_id,reviewer=btrim(p_reviewer),
    review_note=btrim(p_note),reviewed_at=now(),version=version+1
  WHERE id=p_id RETURNING * INTO v_new;
  RETURN v_new;
END $$;

CREATE FUNCTION public.cs_kpi_acquire_scan(p_token uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rows integer;
BEGIN
  UPDATE cs_kpi_settings SET lease_token=p_token,lease_until=now()+interval '5 minutes'
  WHERE singleton AND (lease_until IS NULL OR lease_until<now());
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows=1;
END $$;

CREATE FUNCTION public.cs_kpi_heartbeat(p_connected boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE cs_kpi_settings SET
    chat_observed_from = CASE WHEN p_connected AND (
      NOT listener_connected OR listener_heartbeat_at IS NULL OR listener_heartbeat_at < now()-interval '5 minutes'
    ) THEN now() ELSE chat_observed_from END,
    listener_heartbeat_at=now(),listener_connected=p_connected WHERE singleton;
END $$;

CREATE FUNCTION public.cs_kpi_record_batch(p_findings jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_item jsonb; v_count integer := 0;
BEGIN
  PERFORM set_config('app.cs_kpi_actor','system:supervisor',true);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_findings) LOOP
    IF public.cs_kpi_record_finding(v_item) IS NOT NULL THEN v_count := v_count+1; END IF;
  END LOOP;
  RETURN v_count;
END $$;

-- Every object is server-only. Staff cookies are checked again by API routes;
-- an anon/authenticated Supabase client cannot bypass those role checks.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cs_kpi_admins','cs_kpi_settings','cs_kpi_findings','cs_kpi_daily_reports','cs_kpi_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    -- Supabase default privileges can grant ALL to service_role. Reset those
    -- too, so audit DELETE/TRUNCATE are not accidentally inherited.
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO service_role',t);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE ON public.cs_kpi_audit FROM service_role;
REVOKE UPDATE ON public.cs_kpi_daily_reports FROM service_role;
REVOKE ALL ON SEQUENCE public.cs_kpi_audit_id_seq FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cs_kpi_audit_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.cs_kpi_capture_times() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_audit_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_save_settings(jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_upsert_admin(uuid,text,text,boolean,boolean,integer[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_record_finding(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_review_finding(uuid,text,uuid,text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_acquire_scan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_heartbeat(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_kpi_record_batch(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cs_kpi_save_settings(jsonb,text), public.cs_kpi_upsert_admin(uuid,text,text,boolean,boolean,integer[],text),
  public.cs_kpi_record_finding(jsonb), public.cs_kpi_review_finding(uuid,text,uuid,text,text,integer), public.cs_kpi_acquire_scan(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cs_kpi_heartbeat(boolean), public.cs_kpi_record_batch(jsonb) TO service_role;
