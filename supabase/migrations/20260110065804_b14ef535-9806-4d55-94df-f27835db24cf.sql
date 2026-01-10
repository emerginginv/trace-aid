-- Step 11: Disaster Recovery & Restore Readiness

-- 1. Create backup_type and backup_status enums
CREATE TYPE backup_type AS ENUM ('database', 'storage', 'config');
CREATE TYPE backup_status AS ENUM ('pending', 'running', 'success', 'failed');
CREATE TYPE restore_environment AS ENUM ('staging', 'isolated', 'production');
CREATE TYPE disaster_severity AS ENUM ('minor', 'major', 'critical');

-- 2. Recovery objectives configuration table
CREATE TABLE IF NOT EXISTS public.recovery_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rpo_hours integer NOT NULL DEFAULT 24,
  rto_hours integer NOT NULL DEFAULT 4,
  backup_retention_days integer NOT NULL DEFAULT 30,
  restore_test_frequency_days integer NOT NULL DEFAULT 90,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Insert default recovery objectives
INSERT INTO public.recovery_objectives (rpo_hours, rto_hours, backup_retention_days, restore_test_frequency_days)
VALUES (24, 4, 30, 90);

-- 3. Backups tracking table
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type backup_type NOT NULL,
  location text NOT NULL,
  description text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status backup_status NOT NULL DEFAULT 'pending',
  size_bytes bigint,
  checksum text,
  retention_expires_at timestamptz NOT NULL,
  error_message text,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Restore tests table
CREATE TABLE IF NOT EXISTS public.restore_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id uuid REFERENCES public.backups(id),
  restore_type backup_type NOT NULL,
  environment restore_environment NOT NULL DEFAULT 'staging',
  status backup_status NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  validated_by uuid REFERENCES public.profiles(id),
  validation_checklist jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Disaster events table
CREATE TABLE IF NOT EXISTS public.disaster_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.security_incidents(id),
  severity disaster_severity NOT NULL,
  description text NOT NULL,
  declared_at timestamptz NOT NULL DEFAULT now(),
  declared_by uuid NOT NULL REFERENCES public.profiles(id),
  recovery_started_at timestamptz,
  recovery_completed_at timestamptz,
  outcome_summary text,
  lessons_learned text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE public.recovery_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_events ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Platform staff only
CREATE POLICY "Platform staff can view recovery objectives"
  ON public.recovery_objectives FOR SELECT
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update recovery objectives"
  ON public.recovery_objectives FOR UPDATE
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can view backups"
  ON public.backups FOR SELECT
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can insert backups"
  ON public.backups FOR INSERT
  WITH CHECK (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update backups"
  ON public.backups FOR UPDATE
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can view restore tests"
  ON public.restore_tests FOR SELECT
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can manage restore tests"
  ON public.restore_tests FOR ALL
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can view disaster events"
  ON public.disaster_events FOR SELECT
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can manage disaster events"
  ON public.disaster_events FOR ALL
  USING (public.is_platform_staff(auth.uid()));

-- 8. RPC: Get DR dashboard data
CREATE OR REPLACE FUNCTION public.get_dr_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  objectives record;
  last_backup record;
  last_restore_test record;
  active_disaster record;
BEGIN
  -- Check platform staff
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get recovery objectives
  SELECT * INTO objectives FROM recovery_objectives LIMIT 1;

  -- Get last successful backup of each type
  SELECT 
    jsonb_object_agg(
      bt.type_name,
      jsonb_build_object(
        'id', b.id,
        'completed_at', b.completed_at,
        'status', b.status,
        'size_bytes', b.size_bytes
      )
    ) INTO last_backup
  FROM (VALUES ('database'), ('storage'), ('config')) AS bt(type_name)
  LEFT JOIN LATERAL (
    SELECT * FROM backups 
    WHERE backup_type::text = bt.type_name 
    AND status = 'success'
    ORDER BY completed_at DESC 
    LIMIT 1
  ) b ON true;

  -- Get last restore test
  SELECT * INTO last_restore_test 
  FROM restore_tests 
  WHERE status = 'success'
  ORDER BY completed_at DESC 
  LIMIT 1;

  -- Get any active disaster
  SELECT * INTO active_disaster
  FROM disaster_events
  WHERE recovery_completed_at IS NULL
  ORDER BY declared_at DESC
  LIMIT 1;

  result := jsonb_build_object(
    'objectives', jsonb_build_object(
      'rpo_hours', objectives.rpo_hours,
      'rto_hours', objectives.rto_hours,
      'backup_retention_days', objectives.backup_retention_days,
      'restore_test_frequency_days', objectives.restore_test_frequency_days
    ),
    'last_backups', COALESCE(last_backup, '{}'::jsonb),
    'last_restore_test', CASE WHEN last_restore_test.id IS NOT NULL THEN
      jsonb_build_object(
        'id', last_restore_test.id,
        'completed_at', last_restore_test.completed_at,
        'status', last_restore_test.status,
        'environment', last_restore_test.environment
      )
    ELSE NULL END,
    'active_disaster', CASE WHEN active_disaster.id IS NOT NULL THEN
      jsonb_build_object(
        'id', active_disaster.id,
        'severity', active_disaster.severity,
        'declared_at', active_disaster.declared_at,
        'description', active_disaster.description
      )
    ELSE NULL END,
    'backup_count_30d', (SELECT COUNT(*) FROM backups WHERE created_at > now() - interval '30 days'),
    'restore_test_count_90d', (SELECT COUNT(*) FROM restore_tests WHERE created_at > now() - interval '90 days' AND status = 'success'),
    'disaster_count_ytd', (SELECT COUNT(*) FROM disaster_events WHERE declared_at > date_trunc('year', now()))
  );

  RETURN result;
END;
$$;

-- 9. RPC: Log a backup
CREATE OR REPLACE FUNCTION public.log_backup(
  p_backup_type text,
  p_location text,
  p_description text DEFAULT NULL,
  p_status text DEFAULT 'success',
  p_size_bytes bigint DEFAULT NULL,
  p_checksum text DEFAULT NULL,
  p_retention_days integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id uuid;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO backups (
    backup_type,
    location,
    description,
    status,
    completed_at,
    size_bytes,
    checksum,
    retention_expires_at,
    created_by
  ) VALUES (
    p_backup_type::backup_type,
    p_location,
    p_description,
    p_status::backup_status,
    CASE WHEN p_status IN ('success', 'failed') THEN now() ELSE NULL END,
    p_size_bytes,
    p_checksum,
    now() + (p_retention_days || ' days')::interval,
    COALESCE(auth.uid()::text, 'system')
  ) RETURNING id INTO v_backup_id;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    CASE WHEN p_status = 'success' THEN 'BACKUP_COMPLETED' ELSE 'BACKUP_FAILED' END,
    auth.uid(),
    jsonb_build_object(
      'backup_id', v_backup_id,
      'backup_type', p_backup_type,
      'status', p_status
    )
  );

  RETURN v_backup_id;
END;
$$;

-- 10. RPC: Log restore test
CREATE OR REPLACE FUNCTION public.log_restore_test(
  p_backup_id uuid DEFAULT NULL,
  p_restore_type text DEFAULT 'database',
  p_environment text DEFAULT 'staging',
  p_status text DEFAULT 'success',
  p_validation_checklist jsonb DEFAULT '{}',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id uuid;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO restore_tests (
    backup_id,
    restore_type,
    environment,
    status,
    completed_at,
    validated_by,
    validation_checklist,
    notes
  ) VALUES (
    p_backup_id,
    p_restore_type::backup_type,
    p_environment::restore_environment,
    p_status::backup_status,
    CASE WHEN p_status IN ('success', 'failed') THEN now() ELSE NULL END,
    auth.uid(),
    p_validation_checklist,
    p_notes
  ) RETURNING id INTO v_test_id;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'RESTORE_TEST_COMPLETED',
    auth.uid(),
    jsonb_build_object(
      'test_id', v_test_id,
      'restore_type', p_restore_type,
      'environment', p_environment,
      'status', p_status
    )
  );

  -- Also collect as SOC-2 evidence
  INSERT INTO control_evidence (control_id, evidence_type, description, source, metadata)
  SELECT 
    id,
    'report',
    'Restore test completed: ' || p_restore_type || ' to ' || p_environment,
    'system',
    jsonb_build_object('test_id', v_test_id, 'status', p_status)
  FROM soc2_controls
  WHERE control_code = 'A1.2';

  RETURN v_test_id;
END;
$$;

-- 11. RPC: Declare disaster
CREATE OR REPLACE FUNCTION public.declare_disaster(
  p_severity text,
  p_description text,
  p_incident_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO disaster_events (
    incident_id,
    severity,
    description,
    declared_by
  ) VALUES (
    p_incident_id,
    p_severity::disaster_severity,
    p_description,
    auth.uid()
  ) RETURNING id INTO v_event_id;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'DISASTER_DECLARED',
    auth.uid(),
    jsonb_build_object(
      'event_id', v_event_id,
      'severity', p_severity,
      'description', p_description
    )
  );

  RETURN v_event_id;
END;
$$;

-- 12. RPC: Start disaster recovery
CREATE OR REPLACE FUNCTION public.start_disaster_recovery(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE disaster_events
  SET recovery_started_at = now()
  WHERE id = p_event_id AND recovery_started_at IS NULL;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'RECOVERY_STARTED',
    auth.uid(),
    jsonb_build_object('event_id', p_event_id)
  );
END;
$$;

-- 13. RPC: Complete disaster recovery
CREATE OR REPLACE FUNCTION public.complete_disaster_recovery(
  p_event_id uuid,
  p_outcome_summary text,
  p_lessons_learned text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE disaster_events
  SET 
    recovery_completed_at = now(),
    outcome_summary = p_outcome_summary,
    lessons_learned = p_lessons_learned
  WHERE id = p_event_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'RECOVERY_COMPLETED',
    auth.uid(),
    jsonb_build_object(
      'event_id', p_event_id,
      'outcome_summary', p_outcome_summary
    )
  );
END;
$$;

-- 14. RPC: Update recovery objectives
CREATE OR REPLACE FUNCTION public.update_recovery_objectives(
  p_rpo_hours integer DEFAULT NULL,
  p_rto_hours integer DEFAULT NULL,
  p_backup_retention_days integer DEFAULT NULL,
  p_restore_test_frequency_days integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE recovery_objectives
  SET
    rpo_hours = COALESCE(p_rpo_hours, rpo_hours),
    rto_hours = COALESCE(p_rto_hours, rto_hours),
    backup_retention_days = COALESCE(p_backup_retention_days, backup_retention_days),
    restore_test_frequency_days = COALESCE(p_restore_test_frequency_days, restore_test_frequency_days),
    updated_at = now(),
    updated_by = auth.uid();
END;
$$;

-- 15. RPC: Get recent backups
CREATE OR REPLACE FUNCTION public.get_recent_backups(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  backup_type text,
  location text,
  description text,
  started_at timestamptz,
  completed_at timestamptz,
  status text,
  size_bytes bigint,
  retention_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    b.backup_type::text,
    b.location,
    b.description,
    b.started_at,
    b.completed_at,
    b.status::text,
    b.size_bytes,
    b.retention_expires_at
  FROM backups b
  ORDER BY b.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 16. RPC: Get restore tests
CREATE OR REPLACE FUNCTION public.get_restore_tests(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  backup_id uuid,
  restore_type text,
  environment text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  validated_by_name text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    rt.id,
    rt.backup_id,
    rt.restore_type::text,
    rt.environment::text,
    rt.status::text,
    rt.started_at,
    rt.completed_at,
    p.full_name as validated_by_name,
    rt.notes
  FROM restore_tests rt
  LEFT JOIN profiles p ON rt.validated_by = p.id
  ORDER BY rt.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 17. RPC: Get disaster events
CREATE OR REPLACE FUNCTION public.get_disaster_events(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  incident_id uuid,
  severity text,
  description text,
  declared_at timestamptz,
  declared_by_name text,
  recovery_started_at timestamptz,
  recovery_completed_at timestamptz,
  outcome_summary text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    de.id,
    de.incident_id,
    de.severity::text,
    de.description,
    de.declared_at,
    p.full_name as declared_by_name,
    de.recovery_started_at,
    de.recovery_completed_at,
    de.outcome_summary
  FROM disaster_events de
  LEFT JOIN profiles p ON de.declared_by = p.id
  ORDER BY de.declared_at DESC
  LIMIT p_limit;
END;
$$;