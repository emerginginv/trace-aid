-- ═══════════════════════════════════════════════════════════════════════════════
-- MODIFY TRIGGERS: Events no longer increment quantity_actual
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- CHANGES:
-- 1. Events no longer increment quantity_actual on service instances
-- 2. quantity_actual is now derived from APPROVED billing items only:
--    - Approved time entries (case_finances.finance_type = 'time' AND status = 'approved')
--    - Approved expenses linked to updates (case_finances.finance_type = 'expense' AND status = 'approved')
-- 
-- Events may still:
--   - Update service instance status (scheduled, in_progress, completed)
--   - Show planned quantity via quantity_estimated
--   - Show linked updates
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update the main stats function
CREATE OR REPLACE FUNCTION public.update_service_instance_stats(p_service_instance_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_has_scheduled BOOLEAN;
  v_current_status TEXT;
  v_new_status TEXT;
  v_approved_quantity NUMERIC;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM public.case_service_instances
  WHERE id = p_service_instance_id;
  
  -- Count TASKS only for status determination (events excluded from quantity)
  -- Events are tracked separately via linked updates and billing items
  SELECT 
    COUNT(*) FILTER (WHERE completed = true AND activity_type = 'task'),
    COUNT(*) FILTER (WHERE activity_type = 'task'),
    BOOL_OR(due_date IS NOT NULL OR status = 'scheduled')
  INTO v_completed_count, v_total_count, v_has_scheduled
  FROM public.case_activities
  WHERE case_service_instance_id = p_service_instance_id;
  
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- NEW: quantity_actual is derived from APPROVED billing items only
  -- ═══════════════════════════════════════════════════════════════════════════════
  -- Sum quantity from approved time entries and expenses linked to this service instance
  SELECT COALESCE(SUM(cf.quantity), 0)
  INTO v_approved_quantity
  FROM public.case_finances cf
  WHERE cf.case_service_instance_id = p_service_instance_id
    AND cf.status = 'approved'
    AND cf.finance_type IN ('time', 'expense', 'billing_item');
  
  -- Determine new status based on activities (still considers all activity types for scheduling)
  -- Don't downgrade from 'completed' automatically
  IF v_current_status = 'completed' THEN
    v_new_status := 'completed';
  ELSIF v_total_count > 0 AND v_completed_count = v_total_count THEN
    -- All TASKS completed = service completed (events don't block completion)
    v_new_status := 'completed';
  ELSIF v_has_scheduled OR v_total_count > 0 THEN
    -- Has scheduled activities = scheduled
    v_new_status := 'scheduled';
  ELSE
    v_new_status := 'unscheduled';
  END IF;
  
  -- Update the service instance
  -- NOTE: quantity_actual now comes from approved billing items, NOT event completions
  UPDATE public.case_service_instances
  SET 
    quantity_actual = v_approved_quantity,
    status = v_new_status,
    updated_at = now(),
    -- Auto-set scheduled_at when first activity is added
    scheduled_at = CASE 
      WHEN scheduled_at IS NULL AND (SELECT COUNT(*) FROM public.case_activities WHERE case_service_instance_id = p_service_instance_id) > 0 THEN now()
      ELSE scheduled_at
    END,
    -- Auto-set completion_date when all tasks complete
    completion_date = CASE 
      WHEN v_new_status = 'completed' AND completion_date IS NULL THEN now()
      ELSE completion_date
    END
  WHERE id = p_service_instance_id;
END;
$function$;

-- Add comment documenting the change
COMMENT ON FUNCTION public.update_service_instance_stats(uuid) IS 
'Updates service instance stats based on linked activities and billing items.
IMPORTANT: quantity_actual is derived from APPROVED billing items only (time entries, expenses).
Events no longer increment quantity_actual directly - they must go through the billing workflow.
Status is still determined by task completion and scheduling state.';

-- Create a trigger on case_finances to update service instance stats when billing items are approved
CREATE OR REPLACE FUNCTION public.sync_service_instance_on_billing_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger if status changed to/from 'approved' and has service instance
  IF NEW.case_service_instance_id IS NOT NULL 
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND (OLD.status = 'approved' OR NEW.status = 'approved') THEN
    PERFORM public.update_service_instance_stats(NEW.case_service_instance_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Create the trigger (drop if exists first)
DROP TRIGGER IF EXISTS sync_service_instance_on_billing_approval_trigger ON public.case_finances;

CREATE TRIGGER sync_service_instance_on_billing_approval_trigger
  AFTER UPDATE ON public.case_finances
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_service_instance_on_billing_approval();

COMMENT ON FUNCTION public.sync_service_instance_on_billing_approval() IS 
'Syncs service instance quantity_actual when a billing item is approved or unapproved.
This ensures quantity_actual reflects only approved billable work.';