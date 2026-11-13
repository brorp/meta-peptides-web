-- Run only in the disposable PostgreSQL cluster created by the test runner.
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;

SELECT pg_temp.assert_true((SELECT config->>'work_start'='10:00' AND config->>'work_end'='22:00' AND config->>'abandon_after_minutes'='180' AND monitoring_started_at IS NOT NULL FROM cs_kpi_settings), 'requested schedule activated');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM cs_kpi_findings), 'no historical scores');
SELECT pg_temp.assert_true((SELECT o.cs_recorded_at<s.monitoring_started_at FROM orders o CROSS JOIN cs_kpi_settings s WHERE o.tracking_number='old-before-supervision'), 'pre-existing orders precede activation even in one migration transaction');

DO $$ DECLARE v_recorded timestamptz; v_processed timestamptz; v_id uuid; BEGIN
  INSERT INTO orders(status,tracking_number,cs_recorded_at,cs_processed_at) VALUES ('pending','-','2000-01-01','2000-01-01') RETURNING id,cs_recorded_at,cs_processed_at INTO v_id,v_recorded,v_processed;
  PERFORM pg_temp.assert_true(v_recorded>now()-interval '1 minute' AND v_processed IS NULL,'forged insert timestamps overwritten');
  UPDATE orders SET cs_recorded_at='2000-01-01',cs_processed_at='2000-01-01' WHERE id=v_id;
  PERFORM pg_temp.assert_true((SELECT cs_recorded_at=v_recorded AND cs_processed_at IS NULL FROM orders WHERE id=v_id),'recorded timestamp immutable');
  UPDATE orders SET status='processing' WHERE id=v_id;
  SELECT cs_processed_at INTO v_processed FROM orders WHERE id=v_id;
  PERFORM pg_temp.assert_true(v_processed>now()-interval '1 minute','processing transition captured');
  UPDATE orders SET cs_processed_at='2000-01-01',status='pending' WHERE id=v_id;
  PERFORM pg_temp.assert_true((SELECT cs_processed_at=v_processed FROM orders WHERE id=v_id),'processing evidence cannot be reset');
  INSERT INTO leads(cs_recorded_at) VALUES ('2000-01-01') RETURNING cs_recorded_at INTO v_recorded;
  PERFORM pg_temp.assert_true(v_recorded>now()-interval '1 minute','lead trigger works without order-only columns');
END $$;

SET ROLE service_role;
DO $$ DECLARE v_admin uuid; v_id uuid; v_result uuid; v_version integer; BEGIN
  SELECT id INTO v_admin FROM cs_kpi_admins LIMIT 1;
  v_id := cs_kpi_record_finding(jsonb_build_object('incident_key','reply:test','rule','reply_late','admin_id',v_admin,'occurred_at',now(),'evidence',jsonb_build_object('reason','Test evidence')));
  PERFORM pg_temp.assert_true(v_id IS NOT NULL,'service records finding');
  v_result := cs_kpi_record_finding(jsonb_build_object('incident_key','reply:test','rule','reply_late','admin_id',v_admin,'occurred_at',now(),'evidence','{}'::jsonb));
  PERFORM pg_temp.assert_true(v_result IS NULL,'repeated scan deduplicated');
  PERFORM cs_kpi_record_batch(jsonb_build_array(jsonb_build_object('incident_key','reply:test','rule','consultation_abandoned','admin_id',v_admin,'occurred_at',now(),'evidence','{}'::jsonb)));
  PERFORM pg_temp.assert_true((SELECT points=2 AND version=1 AND status='pending' FROM cs_kpi_findings WHERE id=v_id),'one pending incident escalates');
  PERFORM cs_kpi_review_finding(v_id,'confirmed',v_admin,'Sudah ditinjau','Direktur',1);
  PERFORM pg_temp.assert_true((SELECT status='confirmed' AND version=2 FROM cs_kpi_findings WHERE id=v_id),'director confirmation recorded');
  BEGIN
    PERFORM cs_kpi_review_finding(v_id,'dismissed',v_admin,'Stale decision','Other director',1);
    RAISE EXCEPTION 'Stale review accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%CS_KPI_CONFLICT%' THEN RAISE; END IF;
  END;
  PERFORM cs_kpi_record_finding(jsonb_build_object('incident_key','reply:test','rule','order_processing_late','admin_id',v_admin,'occurred_at',now(),'evidence','{}'::jsonb));
  PERFORM pg_temp.assert_true((SELECT points=2 AND status='confirmed' AND version=2 FROM cs_kpi_findings WHERE id=v_id),'reviewed finding never overwritten by scan');
  PERFORM pg_temp.assert_true((SELECT count(*)=3 FROM cs_kpi_audit WHERE row_id=v_id::text),'creation escalation and review audited');
  PERFORM pg_temp.assert_true((SELECT actor='root: Direktur' FROM cs_kpi_audit WHERE row_id=v_id::text ORDER BY id DESC LIMIT 1),'review actor audited');
  v_result := cs_kpi_record_finding(jsonb_build_object('incident_key','manual:test','rule','reply_late','admin_id',v_admin,'source','manual','occurred_at',now(),'evidence',jsonb_build_object('recorded_by','root: Manual reviewer')));
  PERFORM pg_temp.assert_true((SELECT actor='root: Manual reviewer' FROM cs_kpi_audit WHERE row_id=v_result::text),'manual actor audited');
  BEGIN
    PERFORM cs_kpi_review_finding(v_result,'pending',v_admin,NULL,NULL,0);
    RAISE EXCEPTION 'Null review accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%Invalid review%' THEN RAISE; END IF;
  END;
  INSERT INTO cs_kpi_daily_reports(admin_id,report_date,sent_at,source_key,source,summary,recorded_by)
  VALUES(v_admin,current_date,now(),'report:1','panel','Daily work summary for management','admin');
  BEGIN
    INSERT INTO cs_kpi_daily_reports(admin_id,report_date,sent_at,source_key,source,summary,recorded_by)
    VALUES(v_admin,current_date,now(),'report:2','panel','Attempt to replace daily report','admin');
    RAISE EXCEPTION 'Duplicate report accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE cs_kpi_audit SET actor='forged';
    RAISE EXCEPTION 'Audit mutation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM cs_kpi_audit;
    RAISE EXCEPTION 'Audit deletion accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    TRUNCATE cs_kpi_audit;
    RAISE EXCEPTION 'Audit truncation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE cs_kpi_daily_reports SET summary='Attempt to replace original report';
    RAISE EXCEPTION 'Report mutation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM pg_temp.assert_true(cs_kpi_acquire_scan(gen_random_uuid()),'first scan obtains lease');
  PERFORM pg_temp.assert_true(NOT cs_kpi_acquire_scan(gen_random_uuid()),'concurrent scan denied lease');
  PERFORM cs_kpi_heartbeat(true);
  PERFORM pg_temp.assert_true((SELECT listener_connected AND chat_observed_from IS NOT NULL FROM cs_kpi_settings),'heartbeat establishes coverage');
  UPDATE cs_kpi_settings SET listener_heartbeat_at=now()-interval '10 minutes',chat_observed_from=now()-interval '10 minutes';
  PERFORM cs_kpi_heartbeat(true);
  PERFORM pg_temp.assert_true((SELECT chat_observed_from>now()-interval '1 minute' FROM cs_kpi_settings),'gap resets coverage');
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM cs_kpi_findings;
    RAISE EXCEPTION 'Authenticated read accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM cs_kpi_record_finding('{}');
    RAISE EXCEPTION 'Authenticated RPC accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM cs_kpi_daily_reports;
    RAISE EXCEPTION 'Anonymous read accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM cs_kpi_save_settings('{}','forged');
    RAISE EXCEPTION 'Anonymous settings write accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'CS KPI database assertions passed' AS result;
