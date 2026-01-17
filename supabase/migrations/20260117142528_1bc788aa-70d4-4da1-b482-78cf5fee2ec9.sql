-- =====================================================
-- CASE STATUS TRANSITION ENGINE
-- Add permission, workflow column, and validation function
-- =====================================================

-- 1. Add modify_case_status permission for all roles
INSERT INTO permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'modify_case_status', true),
  ('manager', 'modify_case_status', true),
  ('investigator', 'modify_case_status', false),
  ('vendor', 'modify_case_status', false),
  ('member', 'modify_case_status', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- 2. Add workflow column to cases table
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS workflow TEXT DEFAULT 'standard';

-- 3. Create status transition validation function
CREATE OR REPLACE FUNCTION public.validate_status_transition(
  p_case_id UUID,
  p_from_status_id UUID,
  p_to_status_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_from_status RECORD;
  v_to_status RECORD;
  v_has_permission BOOLEAN;
  v_user_role TEXT;
BEGIN
  -- Get case details
  SELECT * INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Case not found');
  END IF;
  
  -- Get from status (may be null for new cases)
  IF p_from_status_id IS NOT NULL THEN
    SELECT * INTO v_from_status FROM public.case_statuses WHERE id = p_from_status_id;
    
    -- Rule 1: Check if current status is read-only
    IF v_from_status.is_read_only THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Current status is read-only');
    END IF;
  END IF;
  
  -- Get to status
  SELECT * INTO v_to_status FROM public.case_statuses WHERE id = p_to_status_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Target status not found');
  END IF;
  
  -- Rule 2: Check if target status is in case's workflow
  IF NOT (COALESCE(v_case.workflow, 'standard') = ANY(v_to_status.workflows)) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Target status not in case workflow');
  END IF;
  
  -- Rule 3: Check user permission
  -- Get user's role in the organization
  SELECT role INTO v_user_role 
  FROM public.organization_members 
  WHERE user_id = p_user_id AND organization_id = v_case.organization_id;
  
  -- Check permission based on role
  SELECT allowed INTO v_has_permission 
  FROM public.permissions 
  WHERE role = v_user_role AND feature_key = 'modify_case_status';
  
  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'User lacks permission to modify case status');
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Update track_case_status_change_v2 trigger to include validation and handle initial status
CREATE OR REPLACE FUNCTION public.track_case_status_change_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_old_category_id UUID;
  v_new_category_id UUID;
  v_old_status_name TEXT;
  v_new_status_name TEXT;
  v_validation JSONB;
  v_user_id UUID;
BEGIN
  -- Only proceed if current_status_id changed
  IF OLD.current_status_id IS DISTINCT FROM NEW.current_status_id AND NEW.current_status_id IS NOT NULL THEN
    v_user_id := auth.uid();
    
    -- Validate transition (skip for initial assignment when OLD.current_status_id is NULL)
    IF OLD.current_status_id IS NOT NULL AND v_user_id IS NOT NULL THEN
      v_validation := validate_status_transition(NEW.id, OLD.current_status_id, NEW.current_status_id, v_user_id);
      
      IF NOT (v_validation->>'valid')::BOOLEAN THEN
        RAISE EXCEPTION 'Status transition blocked: %', v_validation->>'reason';
      END IF;
    END IF;
    
    -- Get old and new status info
    IF OLD.current_status_id IS NOT NULL THEN
      SELECT category_id, name INTO v_old_category_id, v_old_status_name 
      FROM public.case_statuses WHERE id = OLD.current_status_id;
    END IF;
    
    SELECT category_id, name INTO v_new_category_id, v_new_status_name 
    FROM public.case_statuses WHERE id = NEW.current_status_id;
    
    -- Close previous status history record (if exists)
    UPDATE public.case_status_history
    SET exited_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - entered_at))::INTEGER
    WHERE case_id = NEW.id AND exited_at IS NULL;
    
    -- Insert new status history record
    INSERT INTO public.case_status_history (
      case_id, organization_id, status_id,
      from_status, to_status, from_status_key, to_status_key,
      changed_by, entered_at
    ) VALUES (
      NEW.id, NEW.organization_id, NEW.current_status_id,
      v_old_status_name, v_new_status_name,
      OLD.status_key, NEW.status_key, -- Keep for backward compat
      v_user_id, now()
    );
    
    -- Update status_entered_at
    NEW.status_entered_at := now();
    
    -- Check if category changed
    IF v_old_category_id IS DISTINCT FROM v_new_category_id THEN
      -- Log category transition
      INSERT INTO public.case_category_transition_log (
        case_id, organization_id, from_category_id, to_category_id, transitioned_by
      ) VALUES (
        NEW.id, NEW.organization_id, v_old_category_id, v_new_category_id, v_user_id
      );
      
      NEW.current_category_id := v_new_category_id;
      NEW.category_entered_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create function to check if reopen is allowed
CREATE OR REPLACE FUNCTION public.can_reopen_case(p_case_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_current_status RECORD;
  v_existing_reopen RECORD;
BEGIN
  -- Get case
  SELECT * INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Case not found');
  END IF;
  
  -- Get current status
  SELECT * INTO v_current_status FROM public.case_statuses WHERE id = v_case.current_status_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Status not found');
  END IF;
  
  -- Check is_reopenable flag
  IF NOT v_current_status.is_reopenable THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'This status does not allow reopening');
  END IF;
  
  -- Check if already reopened
  SELECT id INTO v_existing_reopen FROM public.cases 
  WHERE parent_case_id = p_case_id LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Case has already been reopened');
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;