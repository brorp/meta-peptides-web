CREATE FUNCTION pg_temp.assert_true(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;
SELECT pg_temp.assert_true(to_json('8.8.8.8'::inet)::text='"8.8.8.8"','inet RPC JSON serializes a bare IP');
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
SET ROLE service_role;
DO $$ DECLARE a jsonb; b jsonb; v_id uuid; v_seen timestamptz; BEGIN
 a:=visitor_log_record('8.8.8.8','meta-peptides.com','/shop',repeat('a',64),'{"browser":"Chrome"}','{"country_code":"ID"}');
 v_id:=(a->>'id')::uuid;
 SELECT first_seen_at INTO v_seen FROM visitor_ip_logs WHERE id=v_id;
 PERFORM pg_temp.assert_true((a->>'created')::boolean,'first IP is created');
 FOR i IN 1..10 LOOP
   b:=visitor_log_record('8.8.8.8','meta-peptides.com','/repeat',repeat('a',64),'{}','{}');
   PERFORM pg_temp.assert_true(NOT (b->>'created')::boolean,'repeat does not create');
 END LOOP;
 PERFORM visitor_log_record('8.8.8.8','metawellness.id','/other',repeat('a',64),'{}','{}');
 PERFORM visitor_log_record('8.8.8.8','metawellness.id','/other',repeat('b',64),'{"browser":"Safari"}','{}');
 PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM visitor_ip_logs),'one row per IP across domains');
 PERFORM pg_temp.assert_true((SELECT count(*)=2 FROM visitor_ip_devices),'new device recorded once');
 PERFORM pg_temp.assert_true((SELECT first_seen_at=v_seen AND entry_path='/shop' AND array_length(hostnames,1)=2 FROM visitor_ip_logs WHERE id=v_id),'repeat does not overwrite first encounter');
 PERFORM visitor_log_record('8.8.8.8','metawellness.id','/auth',repeat('a',64),'{}','{}','00000000-0000-4000-8000-000000000001',true,'guest');
 PERFORM visitor_log_record('8.8.8.8','metawellness.id','/shop',repeat('a',64),'{}','{}','00000000-0000-4000-8000-000000000001',false,'login');
 PERFORM visitor_log_record('8.8.8.8','metawellness.id','/auth',repeat('a',64),'{}','{}','00000000-0000-4000-8000-000000000002',false,'login');
 PERFORM pg_temp.assert_true((SELECT count(*)=2 AND bool_and(NOT is_guest) FROM visitor_ip_identities),'shared IP keeps accounts separate and deduplicates guest upgrade');
 PERFORM visitor_log_record('2001:4860:4860:0:0:0:0:8888','meta-peptides.com','/',repeat('a',64),'{}','{}');
 PERFORM visitor_log_record('2001:4860:4860::8888','meta-peptides.com','/',repeat('a',64),'{}','{}');
 PERFORM pg_temp.assert_true((SELECT count(*)=2 FROM visitor_ip_logs),'IPv6 textual variants deduplicate');
 PERFORM pg_temp.assert_true(visitor_log_claim_lookup(v_id) IS NOT NULL,'first enrichment claim accepted');
 PERFORM pg_temp.assert_true(visitor_log_claim_lookup(v_id) IS NULL,'repeat enrichment denied during cooldown');
 UPDATE visitor_ip_logs SET geo='{"isp":"Example ISP"}',geo_status='ready' WHERE id=v_id;
 BEGIN UPDATE visitor_ip_logs SET ip_address='1.1.1.1' WHERE id=v_id; RAISE EXCEPTION 'IP overwrite allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM visitor_ip_logs; RAISE EXCEPTION 'Log deletion allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO visitor_ip_devices(ip_id,device_key,hostname,metadata) VALUES(v_id,repeat('c',64),'fake','{}'); RAISE EXCEPTION 'Direct arbitrary insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM visitor_log_record('1.1.1.1','evil.example','/',repeat('a',64),'{}','{}'); RAISE EXCEPTION 'Untrusted host allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Invalid visitor host%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM * FROM visitor_ip_logs; RAISE EXCEPTION 'User read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM visitor_log_record('1.1.1.1','meta-peptides.com','/',repeat('a',64),'{}','{}'); RAISE EXCEPTION 'User RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM visitor_ip_identities; RAISE EXCEPTION 'Anonymous PII read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM visitor_log_claim_lookup(gen_random_uuid()); RAISE EXCEPTION 'Anonymous lookup allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'Visitor IP schema, deduplication, identity isolation and permissions passed' AS result;
