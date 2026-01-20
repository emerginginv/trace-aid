-- Fix the type mismatch in validate_status_transition function
-- The v_user_role variable was declared as TEXT but should be app_role

CREATE OR REPLACE FUNCTION public.validate_status_transition(p_case_id uuid, p_from_status_id uuid, p_to_status_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_case RECORD;
  v_from_status RECORD;
  v_to_status RECORD;
  v_has_permission BOOLEAN;
  v_user_role app_role;  -- Fixed: was TEXT, now app_role
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
$function$;