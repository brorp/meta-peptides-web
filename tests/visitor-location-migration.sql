CREATE FUNCTION pg_temp.assert_true(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;
SET ROLE service_role;
SELECT visitor_location_start('10000000-0000-4000-8000-000000000001','9.9.9.9','metawellness.id',repeat('c',64),'{"user_agent":"Chrome/130.0","is_bot":false}','{}');
SELECT visitor_location_start('10000000-0000-4000-8000-000000000002','9.9.9.9','metawellness.id',repeat('c',64),'{"user_agent":"Chrome/130.0","is_bot":false}','{}');
SELECT visitor_location_start('10000000-0000-4000-8000-000000000003','9.9.9.9','metawellness.id',repeat('c',64),'{"user_agent":"Chrome/130.0","is_bot":false}','{}');
SELECT pg_temp.assert_true((SELECT count(*)=3 AND bool_and(latitude IS NULL) FROM visitor_device_locations),'consent alone stores no coordinates');
DO $$ DECLARE r jsonb; BEGIN
 r:=visitor_location_record('10000000-0000-4000-8000-000000000001','9.9.9.9','metawellness.id',repeat('c',64),'{}','{}',-6.2,106.8,12,clock_timestamp()-interval '60 seconds');
 PERFORM pg_temp.assert_true(r->>'status'='saved','first browser fix saved');
 r:=visitor_location_record('10000000-0000-4000-8000-000000000002','9.9.9.9','metawellness.id',repeat('c',64),'{}','{}',-7.2,110.8,20,clock_timestamp()-interval '60 seconds');
 PERFORM pg_temp.assert_true(r->>'status'='saved','same IP and UA keep distinct browser sessions');
 r:=visitor_location_record('10000000-0000-4000-8000-000000000001','9.9.9.9','metawellness.id',repeat('c',64),'{}','{}',0,0,12,clock_timestamp()-interval '90 seconds');
 PERFORM pg_temp.assert_true(r->>'status'='stale','old fixes cannot overwrite latest position');
 r:=visitor_location_record('10000000-0000-4000-8000-000000000001','9.9.9.9','metawellness.id',repeat('c',64),'{}','{}',0,0,12,clock_timestamp());
 PERFORM pg_temp.assert_true(r->>'status'='throttled','frequent updates are bounded');
 PERFORM visitor_location_end('10000000-0000-4000-8000-000000000001',false);
 PERFORM pg_temp.assert_true((SELECT NOT sharing AND ended_at IS NULL FROM visitor_device_locations WHERE session_id='10000000-0000-4000-8000-000000000001'),'hidden page pauses sharing');
 PERFORM visitor_location_end('10000000-0000-4000-8000-000000000003',true);
 r:=visitor_location_record('10000000-0000-4000-8000-000000000003','9.9.9.9','metawellness.id',repeat('c',64),'{}','{}',0,0,12,clock_timestamp());
 PERFORM pg_temp.assert_true(r->>'status'='ended','stop before first fix prevents a late in-flight write');
 BEGIN PERFORM visitor_location_record('10000000-0000-4000-8000-000000000001','9.9.9.9','metawellness.id',repeat('c',64),'{}','{}',91,0,12,clock_timestamp()); RAISE EXCEPTION 'Invalid latitude allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Invalid browser position%' THEN RAISE; END IF; END;
 BEGIN UPDATE visitor_device_locations SET latitude=0; RAISE EXCEPTION 'Direct write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE visitor_device_locations SET received_at=clock_timestamp()-interval '6 seconds' WHERE session_id='10000000-0000-4000-8000-000000000001';
SET ROLE service_role;
DO $$ DECLARE r jsonb; BEGIN
 r:=visitor_location_record('10000000-0000-4000-8000-000000000001','1.0.0.1','metawellness.id',repeat('c',64),'{}','{}',-6.3,106.9,8,clock_timestamp());
 PERFORM pg_temp.assert_true(r->>'status'='saved','a resumed session can change IP');
 PERFORM pg_temp.assert_true((SELECT count(*)=3 FROM visitor_device_locations),'updates store only latest position, no movement history');
 PERFORM pg_temp.assert_true((SELECT l.sharing AND l.latitude=-6.3 AND i.ip_address='1.0.0.1' FROM visitor_device_locations l JOIN visitor_ip_logs i ON i.id=l.ip_id WHERE session_id='10000000-0000-4000-8000-000000000001'),'latest fix belongs to the current IP');
 PERFORM visitor_location_end('10000000-0000-4000-8000-000000000001',true);
 r:=visitor_location_record('10000000-0000-4000-8000-000000000001','1.0.0.1','metawellness.id',repeat('c',64),'{}','{}',0,0,12,clock_timestamp());
 PERFORM pg_temp.assert_true(r->>'status'='ended','stopped session cannot restart with a retained token');
 r:=visitor_location_record(gen_random_uuid(),'1.0.0.1','metawellness.id',repeat('c',64),'{}','{}',0,0,12,clock_timestamp());
 PERFORM pg_temp.assert_true(r->>'status'='ended','unknown sessions cannot create position records');
 FOR i IN 1..100 LOOP
   r:=visitor_location_start(gen_random_uuid(),'9.9.9.10','metawellness.id',repeat('d',64),'{}','{}');
   PERFORM pg_temp.assert_true(r->>'status'='started','new sessions within the shared IP budget are accepted');
 END LOOP;
 r:=visitor_location_start(gen_random_uuid(),'9.9.9.10','metawellness.id',repeat('d',64),'{}','{}');
 PERFORM pg_temp.assert_true(r->>'status'='limited','database bounds new sessions per IP per hour');
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM visitor_device_locations; RAISE EXCEPTION 'Anonymous position read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM visitor_location_end(gen_random_uuid(),true); RAISE EXCEPTION 'Anonymous stop allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM * FROM visitor_device_locations; RAISE EXCEPTION 'User position read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM visitor_location_start(gen_random_uuid(),'8.8.8.8','metawellness.id',repeat('c',64),'{}','{}'); RAISE EXCEPTION 'User start allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'Browser location sessions, freshness, stop races and restricted access passed' AS result;
