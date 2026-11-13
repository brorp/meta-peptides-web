-- Initial configuration requested by management: one CS, every day,
-- 10:00-22:00 WIB, 30-minute reply SLA and 3 working hours for abandonment.
-- Daily Report uses the end of shift as its configurable deadline.
-- Separate seed/configuration migration; does not score historical activity.
DO $$ DECLARE v_admin uuid; BEGIN
  INSERT INTO public.cs_kpi_admins (name,work_days)
  VALUES ('CS Utama',ARRAY[0,1,2,3,4,5,6]) RETURNING id INTO v_admin;
  PERFORM public.cs_kpi_save_settings(jsonb_build_object(
    'enabled',true,'work_days',jsonb_build_array(0,1,2,3,4,5,6),
    'work_start','10:00','work_end','22:00','off_dates','[]'::jsonb,
    'abandon_after_minutes',180,'report_deadline','22:00','default_admin_id',v_admin
  ),'Konfigurasi awal direksi');
END $$;
