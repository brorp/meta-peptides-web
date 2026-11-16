-- One record per public IP across both storefronts. No repeat-visit history.
CREATE TABLE public.visitor_ip_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE CHECK (masklen(ip_address) = CASE family(ip_address) WHEN 4 THEN 32 ELSE 128 END),
  first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  hostnames text[] NOT NULL CHECK (hostnames <@ ARRAY['meta-peptides.com','metawellness.id','localhost']::text[]),
  entry_path text NOT NULL CHECK (length(entry_path) <= 1024),
  geo jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(geo)='object' AND octet_length(geo::text)<=16000),
  geo_status text NOT NULL DEFAULT 'pending' CHECK (geo_status IN ('pending','ready','unavailable')),
  geo_source text,
  geo_checked_at timestamptz,
  next_lookup_at timestamptz
);
CREATE INDEX visitor_ip_first_seen_idx ON public.visitor_ip_logs(first_seen_at DESC,id);
CREATE INDEX visitor_ip_hosts_idx ON public.visitor_ip_logs USING gin(hostnames);

CREATE TABLE public.visitor_ip_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_id uuid NOT NULL REFERENCES public.visitor_ip_logs(id) ON DELETE CASCADE,
  device_key text NOT NULL CHECK (device_key ~ '^[0-9a-f]{64}$'),
  first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  hostname text NOT NULL,
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata)='object' AND octet_length(metadata::text)<=8000),
  UNIQUE (ip_id,device_key)
);
CREATE TABLE public.visitor_ip_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_id uuid NOT NULL REFERENCES public.visitor_ip_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_guest boolean NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  source text NOT NULL CHECK (source IN ('guest','login','register','oauth','checkout','session')),
  UNIQUE(ip_id,user_id)
);

-- Only server-side calls with an edge-derived IP and a verified auth user can
-- insert. Repeated IP/device/account observations make no new rows.
CREATE FUNCTION public.visitor_log_record(p_ip inet,p_hostname text,p_path text,p_device_key text,p_device jsonb,p_geo jsonb,p_user_id uuid DEFAULT NULL,p_is_guest boolean DEFAULT true,p_source text DEFAULT 'session')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_created boolean := false;
BEGIN
  IF p_hostname NOT IN ('meta-peptides.com','metawellness.id','localhost') OR p_hostname IS NULL THEN RAISE EXCEPTION 'Invalid visitor host'; END IF;
  INSERT INTO visitor_ip_logs(ip_address,hostnames,entry_path,geo,geo_source)
  VALUES(p_ip,ARRAY[p_hostname],p_path,coalesce(p_geo,'{}'::jsonb),CASE WHEN p_geo <> '{}'::jsonb THEN 'vercel' END)
  ON CONFLICT(ip_address) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN v_created := true;
  ELSE
    SELECT id INTO v_id FROM visitor_ip_logs WHERE ip_address=p_ip;
    UPDATE visitor_ip_logs SET hostnames=array_append(hostnames,p_hostname)
    WHERE id=v_id AND NOT p_hostname=ANY(hostnames);
  END IF;
  INSERT INTO visitor_ip_devices(ip_id,device_key,hostname,metadata)
  VALUES(v_id,p_device_key,p_hostname,p_device) ON CONFLICT(ip_id,device_key) DO NOTHING;
  IF p_user_id IS NOT NULL THEN
    INSERT INTO visitor_ip_identities(ip_id,user_id,is_guest,source) VALUES(v_id,p_user_id,p_is_guest,p_source)
    ON CONFLICT(ip_id,user_id) DO UPDATE SET is_guest=false
    WHERE visitor_ip_identities.is_guest AND NOT EXCLUDED.is_guest;
  END IF;
  RETURN jsonb_build_object('id',v_id,'created',v_created);
END $$;

CREATE FUNCTION public.visitor_log_claim_lookup(p_id uuid) RETURNS inet
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_ip inet;
BEGIN
  UPDATE visitor_ip_logs SET next_lookup_at=clock_timestamp()+interval '10 minutes'
  WHERE id=p_id AND (next_lookup_at IS NULL OR next_lookup_at<clock_timestamp())
  RETURNING ip_address INTO v_ip;
  RETURN v_ip;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['visitor_ip_logs','visitor_ip_devices','visitor_ip_identities'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('GRANT SELECT ON public.%I TO service_role',t);
  END LOOP;
END $$;
GRANT UPDATE(geo,geo_status,geo_source,geo_checked_at) ON public.visitor_ip_logs TO service_role;
REVOKE ALL ON FUNCTION public.visitor_log_record(inet,text,text,text,jsonb,jsonb,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.visitor_log_claim_lookup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_log_record(inet,text,text,text,jsonb,jsonb,uuid,boolean,text), public.visitor_log_claim_lookup(uuid) TO service_role;
