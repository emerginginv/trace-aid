-- Migration Infrastructure Tables
CREATE TABLE IF NOT EXISTS public.case_status_migration_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  migration_step TEXT NOT NULL,
  records_affected INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- running, completed, failed, rolled_back
  details JSONB DEFAULT '{}',
  executed_by UUID
);

CREATE TABLE IF NOT EXISTS public.case_status_migration_backup (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_log_id UUID REFERENCES case_status_migration_log(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  original_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_status_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_migration_backup ENABLE ROW LEVEL SECURITY;

-- RLS policies for migration log using organization_members
CREATE POLICY "Users can view migration logs for their organization" 
ON public.case_status_migration_log FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert migration logs for their organization" 
ON public.case_status_migration_log FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update migration logs for their organization" 
ON public.case_status_migration_log FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- RLS policies for migration backup
CREATE POLICY "Users can view migration backups for their organization" 
ON public.case_status_migration_backup FOR SELECT 
USING (migration_log_id IN (SELECT id FROM case_status_migration_log WHERE organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert migration backups for their organization" 
ON public.case_status_migration_backup FOR INSERT 
WITH CHECK (migration_log_id IN (SELECT id FROM case_status_migration_log WHERE organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())));

-- Get status_id from legacy text status
CREATE OR REPLACE FUNCTION public.get_status_id_from_legacy(
  p_organization_id UUID,
  p_legacy_status TEXT
) RETURNS UUID AS $$
DECLARE
  v_status_id UUID;
BEGIN
  IF p_legacy_status IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Exact match first (case insensitive)
  SELECT id INTO v_status_id
  FROM case_statuses
  WHERE organization_id = p_organization_id
    AND LOWER(name) = LOWER(p_legacy_status);
  
  IF v_status_id IS NOT NULL THEN
    RETURN v_status_id;
  END IF;
  
  -- Fallback mapping for common variations
  SELECT id INTO v_status_id
  FROM case_statuses
  WHERE organization_id = p_organization_id
    AND LOWER(name) = CASE LOWER(TRIM(p_legacy_status))
      WHEN 'open' THEN 'active'
      WHEN 'pending' THEN 'new'
      WHEN 'draft' THEN 'new'
      WHEN 'in progress' THEN 'active'
      WHEN 'closed' THEN 'closed'
      WHEN 'complete' THEN 'complete'
      WHEN 'cancelled' THEN 'cancelled'
      ELSE LOWER(TRIM(p_legacy_status))
    END;
  
  RETURN v_status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate migration status
CREATE OR REPLACE FUNCTION public.validate_status_migration(
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_results JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_cases', (SELECT COUNT(*) FROM cases WHERE organization_id = p_organization_id),
    'cases_with_status_id', (SELECT COUNT(*) FROM cases WHERE organization_id = p_organization_id AND current_status_id IS NOT NULL),
    'cases_without_status_id', (SELECT COUNT(*) FROM cases WHERE organization_id = p_organization_id AND current_status_id IS NULL),
    'total_history_entries', (SELECT COUNT(*) FROM case_status_history h JOIN cases c ON c.id = h.case_id WHERE c.organization_id = p_organization_id),
    'history_with_status_id', (SELECT COUNT(*) FROM case_status_history h JOIN cases c ON c.id = h.case_id WHERE c.organization_id = p_organization_id AND h.status_id IS NOT NULL),
    'history_without_status_id', (SELECT COUNT(*) FROM case_status_history h JOIN cases c ON c.id = h.case_id WHERE c.organization_id = p_organization_id AND h.status_id IS NULL),
    'history_with_duration', (SELECT COUNT(*) FROM case_status_history h JOIN cases c ON c.id = h.case_id WHERE c.organization_id = p_organization_id AND h.duration_seconds IS NOT NULL),
    'category_transitions', (SELECT COUNT(*) FROM case_category_transition_log WHERE organization_id = p_organization_id),
    'total_categories', (SELECT COUNT(*) FROM case_status_categories WHERE organization_id = p_organization_id),
    'total_statuses', (SELECT COUNT(*) FROM case_statuses WHERE organization_id = p_organization_id)
  ) INTO v_results;
  
  RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main migration function: backfill history status_ids
CREATE OR REPLACE FUNCTION public.migrate_case_status_data(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT TRUE
) RETURNS JSONB AS $$
DECLARE
  v_log_id UUID;
  v_history RECORD;
  v_status_id UUID;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Create migration log entry
  IF NOT p_dry_run THEN
    INSERT INTO case_status_migration_log (
      organization_id, migration_step, executed_by, status
    ) VALUES (
      p_organization_id, 'backfill_status_history', p_user_id, 'running'
    ) RETURNING id INTO v_log_id;
  END IF;
  
  -- Process legacy history entries without status_id
  FOR v_history IN
    SELECT h.id, h.to_status, h.to_status_key, c.organization_id as org_id
    FROM case_status_history h
    JOIN cases c ON c.id = h.case_id
    WHERE c.organization_id = p_organization_id
      AND h.status_id IS NULL
      AND (h.to_status IS NOT NULL OR h.to_status_key IS NOT NULL)
  LOOP
    -- Get mapped status_id (try to_status first, then to_status_key)
    v_status_id := get_status_id_from_legacy(v_history.org_id, COALESCE(v_history.to_status, v_history.to_status_key));
    
    IF v_status_id IS NULL THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'history_id', v_history.id,
        'to_status', v_history.to_status,
        'to_status_key', v_history.to_status_key,
        'error', 'No matching status found'
      );
      CONTINUE;
    END IF;
    
    IF NOT p_dry_run THEN
      -- Backup original data
      INSERT INTO case_status_migration_backup (
        migration_log_id, table_name, record_id, original_data
      ) VALUES (
        v_log_id, 'case_status_history', v_history.id,
        jsonb_build_object('status_id', NULL)
      );
      
      -- Update history entry
      UPDATE case_status_history SET
        status_id = v_status_id
      WHERE id = v_history.id;
    END IF;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  -- Complete migration log
  IF NOT p_dry_run AND v_log_id IS NOT NULL THEN
    UPDATE case_status_migration_log SET
      records_affected = v_updated_count,
      completed_at = now(),
      status = CASE WHEN v_error_count > 0 THEN 'completed_with_errors' ELSE 'completed' END,
      details = jsonb_build_object(
        'updated', v_updated_count,
        'skipped', v_skipped_count,
        'errors', v_error_count,
        'error_details', v_errors
      )
    WHERE id = v_log_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'log_id', v_log_id,
    'updated', v_updated_count,
    'skipped', v_skipped_count,
    'errors', v_error_count,
    'error_details', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix history timestamps and durations
CREATE OR REPLACE FUNCTION public.fix_status_history_timestamps(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT TRUE
) RETURNS JSONB AS $$
DECLARE
  v_log_id UUID;
  v_case RECORD;
  v_history RECORD;
  v_prev_entered_at TIMESTAMPTZ := NULL;
  v_prev_id UUID := NULL;
  v_fixed_count INTEGER := 0;
  v_cases_processed INTEGER := 0;
BEGIN
  -- Create migration log entry
  IF NOT p_dry_run THEN
    INSERT INTO case_status_migration_log (
      organization_id, migration_step, executed_by, status
    ) VALUES (
      p_organization_id, 'fix_timestamps', p_user_id, 'running'
    ) RETURNING id INTO v_log_id;
  END IF;
  
  FOR v_case IN
    SELECT c.id, c.created_at, c.updated_at
    FROM cases c
    WHERE c.organization_id = p_organization_id
  LOOP
    v_cases_processed := v_cases_processed + 1;
    v_prev_entered_at := NULL;
    v_prev_id := NULL;
    
    FOR v_history IN
      SELECT h.id, h.entered_at, h.exited_at
      FROM case_status_history h
      WHERE h.case_id = v_case.id
      ORDER BY h.entered_at ASC, h.created_at ASC
    LOOP
      IF NOT p_dry_run THEN
        -- First entry: use case created_at if entered_at is after it
        IF v_prev_id IS NULL AND v_history.entered_at > v_case.created_at THEN
          -- Backup and update first entry
          INSERT INTO case_status_migration_backup (
            migration_log_id, table_name, record_id, original_data
          ) VALUES (
            v_log_id, 'case_status_history', v_history.id,
            jsonb_build_object('entered_at', v_history.entered_at)
          );
          
          UPDATE case_status_history SET
            entered_at = v_case.created_at
          WHERE id = v_history.id;
          
          v_fixed_count := v_fixed_count + 1;
        END IF;
        
        -- Update previous entry's exited_at and duration
        IF v_prev_id IS NOT NULL THEN
          UPDATE case_status_history SET
            exited_at = v_history.entered_at,
            duration_seconds = EXTRACT(EPOCH FROM (v_history.entered_at - v_prev_entered_at))::INTEGER
          WHERE id = v_prev_id;
          
          v_fixed_count := v_fixed_count + 1;
        END IF;
      ELSE
        v_fixed_count := v_fixed_count + 1;
      END IF;
      
      v_prev_entered_at := v_history.entered_at;
      v_prev_id := v_history.id;
    END LOOP;
  END LOOP;
  
  -- Complete migration log
  IF NOT p_dry_run AND v_log_id IS NOT NULL THEN
    UPDATE case_status_migration_log SET
      records_affected = v_fixed_count,
      completed_at = now(),
      status = 'completed',
      details = jsonb_build_object(
        'cases_processed', v_cases_processed,
        'entries_fixed', v_fixed_count
      )
    WHERE id = v_log_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'log_id', v_log_id,
    'cases_processed', v_cases_processed,
    'entries_fixed', v_fixed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rollback migration step
CREATE OR REPLACE FUNCTION public.rollback_status_migration(
  p_log_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_backup RECORD;
  v_restored INTEGER := 0;
  v_log RECORD;
BEGIN
  -- Get log info
  SELECT * INTO v_log FROM case_status_migration_log WHERE id = p_log_id;
  
  IF v_log IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Migration log not found');
  END IF;
  
  FOR v_backup IN
    SELECT * FROM case_status_migration_backup
    WHERE migration_log_id = p_log_id
    ORDER BY created_at DESC
  LOOP
    IF v_backup.table_name = 'case_status_history' THEN
      UPDATE case_status_history SET
        status_id = (v_backup.original_data->>'status_id')::UUID,
        entered_at = COALESCE((v_backup.original_data->>'entered_at')::TIMESTAMPTZ, entered_at),
        exited_at = CASE 
          WHEN v_backup.original_data ? 'exited_at' THEN (v_backup.original_data->>'exited_at')::TIMESTAMPTZ
          ELSE exited_at
        END,
        duration_seconds = CASE 
          WHEN v_backup.original_data ? 'duration_seconds' THEN (v_backup.original_data->>'duration_seconds')::INTEGER
          ELSE duration_seconds
        END
      WHERE id = v_backup.record_id;
      v_restored := v_restored + 1;
    END IF;
  END LOOP;
  
  -- Mark log as rolled back
  UPDATE case_status_migration_log SET
    status = 'rolled_back',
    completed_at = now()
  WHERE id = p_log_id;
  
  RETURN jsonb_build_object('success', true, 'restored', v_restored);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent legacy status updates (to be enabled after migration)
CREATE OR REPLACE FUNCTION public.prevent_legacy_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.status_key IS DISTINCT FROM NEW.status_key THEN
    -- Only allow if current_status_id is also being updated (system migration)
    IF OLD.current_status_id IS NOT DISTINCT FROM NEW.current_status_id THEN
      RAISE EXCEPTION 'Legacy status fields are read-only. Use current_status_id to change status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enable/disable the legacy lock
CREATE OR REPLACE FUNCTION public.toggle_legacy_status_lock(
  p_enable BOOLEAN DEFAULT TRUE
) RETURNS JSONB AS $$
BEGIN
  IF p_enable THEN
    -- Create trigger if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_legacy_status_readonly') THEN
      CREATE TRIGGER enforce_legacy_status_readonly
      BEFORE UPDATE ON cases
      FOR EACH ROW
      EXECUTE FUNCTION prevent_legacy_status_update();
    END IF;
    RETURN jsonb_build_object('success', true, 'action', 'enabled');
  ELSE
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS enforce_legacy_status_readonly ON cases;
    RETURN jsonb_build_object('success', true, 'action', 'disabled');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;