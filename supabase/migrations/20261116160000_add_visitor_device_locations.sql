-- Latest consented browser position per sharing session, never per IP/person.
-- Additive rollout: existing IP logs and storefront requests remain compatible.
CREATE TABLE public.visitor_device_locations (
  session_id uuid PRIMARY KEY,
  ip_id uuid NOT NULL REFERENCES public.visitor_ip_logs(id) ON DELETE CASCADE,
  device_key text NOT NULL,
  hostname text NOT NULL CHECK (hostname IN ('meta-peptides.com','metawellness.id','localhost')),
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m double precision CHECK (accuracy_m BETWEEN 0 AND 20000000),
  observed_at timestamptz,
  received_at timestamptz,
  consented_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  sharing boolean NOT NULL DEFAULT false,
  ended_at timestamptz,
  CHECK (num_nonnulls(latitude,longitude,accuracy_m,observed_at,received_at) IN (0,5)),
  FOREIGN KEY (ip_id,device_key) REFERENCES public.visitor_ip_devices(ip_id,device_key) ON DELETE CASCADE
);
CREATE INDEX visitor_device_locations_ip_idx ON public.visitor_device_locations(ip_id,received_at DESC);
CREATE INDEX visitor_device_locations_consent_idx ON public.visitor_device_locations(ip_id,consented_at DESC);
ALTER TABLE public.visitor_device_locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visitor_device_locations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.visitor_device_locations TO service_role;

CREATE FUNCTION public.visitor_location_start(p_session_id uuid,p_ip inet,p_hostname text,p_device_key text,p_device jsonb,p_geo jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_capture jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip::text,720));
  IF (SELECT count(*) FROM visitor_device_locations l JOIN visitor_ip_logs i ON i.id=l.ip_id
    WHERE i.ip_address=p_ip AND l.consented_at>clock_timestamp()-interval '1 hour') >= 100
    THEN RETURN jsonb_build_object('status','limited'); END IF;
  v_capture := visitor_log_record(p_ip,p_hostname,'/',p_device_key,p_device,p_geo);
  INSERT INTO visitor_device_locations(session_id,ip_id,device_key,hostname)
  VALUES(p_session_id,(v_capture->>'id')::uuid,p_device_key,p_hostname);
  RETURN v_capture || jsonb_build_object('status','started');
END $$;

CREATE FUNCTION public.visitor_location_record(
  p_session_id uuid,p_ip inet,p_hostname text,p_device_key text,p_device jsonb,p_geo jsonb,
  p_latitude double precision,p_longitude double precision,p_accuracy_m double precision,p_observed_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_capture jsonb; v_previous visitor_device_locations%ROWTYPE; v_now timestamptz := clock_timestamp();
BEGIN
  IF p_session_id IS NULL OR p_latitude IS NULL OR NOT p_latitude BETWEEN -90 AND 90
    OR p_longitude IS NULL OR NOT p_longitude BETWEEN -180 AND 180
    OR p_accuracy_m IS NULL OR NOT p_accuracy_m BETWEEN 0 AND 20000000
    OR p_observed_at IS NULL OR p_observed_at < v_now-interval '2 minutes' OR p_observed_at > v_now+interval '30 seconds'
    THEN RAISE EXCEPTION 'Invalid browser position'; END IF;
  -- Serialize a session's updates; old/out-of-order fixes cannot overwrite it.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id::text,719));
  SELECT * INTO v_previous FROM visitor_device_locations WHERE session_id=p_session_id;
  IF NOT FOUND OR v_previous.ended_at IS NOT NULL THEN RETURN jsonb_build_object('status','ended'); END IF;
  IF v_previous.device_key <> p_device_key OR v_previous.hostname <> p_hostname THEN RAISE EXCEPTION 'Session mismatch'; END IF;
  IF p_observed_at <= v_previous.observed_at THEN RETURN jsonb_build_object('status','stale'); END IF;
  IF v_previous.received_at > v_now-interval '5 seconds' THEN RETURN jsonb_build_object('status','throttled'); END IF;
  v_capture := visitor_log_record(p_ip,p_hostname,'/',p_device_key,p_device,p_geo);
  UPDATE visitor_device_locations SET ip_id=(v_capture->>'id')::uuid,
    latitude=p_latitude,longitude=p_longitude,accuracy_m=p_accuracy_m,
    observed_at=p_observed_at,received_at=v_now,sharing=true WHERE session_id=p_session_id;
  RETURN v_capture || jsonb_build_object('status','saved');
END $$;

CREATE FUNCTION public.visitor_location_end(p_session_id uuid,p_stop boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id::text,719));
  UPDATE visitor_device_locations SET sharing=false,
    ended_at=CASE WHEN p_stop THEN coalesce(ended_at,clock_timestamp()) ELSE ended_at END
  WHERE session_id=p_session_id;
END $$;
REVOKE ALL ON FUNCTION public.visitor_location_record(uuid,inet,text,text,jsonb,jsonb,double precision,double precision,double precision,timestamptz), public.visitor_location_end(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_location_record(uuid,inet,text,text,jsonb,jsonb,double precision,double precision,double precision,timestamptz), public.visitor_location_end(uuid,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.visitor_location_start(uuid,inet,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_location_start(uuid,inet,text,text,jsonb,jsonb) TO service_role;

-- Rollback (removes only this feature's positions, so export them first):
-- DROP FUNCTION public.visitor_location_record(uuid,inet,text,text,jsonb,jsonb,double precision,double precision,double precision,timestamptz);
-- DROP FUNCTION public.visitor_location_end(uuid,boolean);
-- DROP FUNCTION public.visitor_location_start(uuid,inet,text,text,jsonb,jsonb);
-- DROP TABLE public.visitor_device_locations;
