-- =====================================================
-- SYSTEM PROMPT 4: Link Activities to Services
-- Activities execute services, contributing actual work
-- =====================================================

-- Verify case_service_instance_id exists on case_activities (it does per schema)
-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activities_service_instance 
ON public.case_activities(case_service_instance_id) 
WHERE case_service_instance_id IS NOT NULL;

-- Enhanced function to compute quantity_actual from linked activities
-- and auto-update service status
CREATE OR REPLACE FUNCTION public.sync_service_instance_from_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_service_instance_id UUID;
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_has_scheduled BOOLEAN;
  v_current_status TEXT;
BEGIN
  -- Determine which service instance to update
  IF TG_OP = 'DELETE' THEN
    v_service_instance_id := OLD.case_service_instance_id;
  ELSE
    v_service_instance_id := NEW.case_service_instance_id;
    
    -- Also handle case where service instance changed
    IF TG_OP = 'UPDATE' AND OLD.case_service_instance_id IS DISTINCT FROM NEW.case_service_instance_id THEN
      -- Update the old service instance too
      IF OLD.case_service_instance_id IS NOT NULL THEN
        PERFORM public.update_service_instance_stats(OLD.case_service_instance_id);
      END IF;
    END IF;
  END IF;
  
  -- Update the current service instance
  IF v_service_instance_id IS NOT NULL THEN
    PERFORM public.update_service_instance_stats(v_service_instance_id);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to update service instance statistics
CREATE OR REPLACE FUNCTION public.update_service_instance_stats(p_service_instance_id UUID)
RETURNS VOID AS $$
DECLARE
  v_completed_count INTEGER;
  v_total_count INTEGER;
  v_has_scheduled BOOLEAN;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM public.case_service_instances
  WHERE id = p_service_instance_id;
  
  -- Count activities
  SELECT 
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*),
    BOOL_OR(due_date IS NOT NULL OR status = 'scheduled')
  INTO v_completed_count, v_total_count, v_has_scheduled
  FROM public.case_activities
  WHERE case_service_instance_id = p_service_instance_id;
  
  -- Determine new status based on activities
  -- Don't downgrade from 'completed' automatically
  IF v_current_status = 'completed' THEN
    v_new_status := 'completed';
  ELSIF v_total_count > 0 AND v_completed_count = v_total_count THEN
    -- All activities completed = service completed
    v_new_status := 'completed';
  ELSIF v_has_scheduled OR v_total_count > 0 THEN
    -- Has scheduled activities = scheduled
    v_new_status := 'scheduled';
  ELSE
    v_new_status := 'unscheduled';
  END IF;
  
  -- Update the service instance
  UPDATE public.case_service_instances
  SET 
    quantity_actual = v_completed_count,
    status = v_new_status,
    updated_at = now(),
    -- Auto-set scheduled_at when first activity is added
    scheduled_at = CASE 
      WHEN scheduled_at IS NULL AND v_total_count > 0 THEN now()
      ELSE scheduled_at
    END,
    -- Auto-set completion_date when all activities complete
    completion_date = CASE 
      WHEN v_new_status = 'completed' AND completion_date IS NULL THEN now()
      ELSE completion_date
    END
  WHERE id = p_service_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS tr_compute_service_quantity ON public.case_activities;

-- Create new comprehensive trigger
DROP TRIGGER IF EXISTS tr_sync_service_from_activity ON public.case_activities;
CREATE TRIGGER tr_sync_service_from_activity
AFTER INSERT OR UPDATE OR DELETE ON public.case_activities
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_instance_from_activity();

-- Also sync when activity completion status changes
CREATE OR REPLACE FUNCTION public.sync_service_on_activity_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if completed status changed and has service instance
  IF NEW.case_service_instance_id IS NOT NULL 
     AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
    PERFORM public.update_service_instance_stats(NEW.case_service_instance_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment documenting the relationship
COMMENT ON COLUMN public.case_activities.case_service_instance_id IS 
'Links this activity to a service instance. Activities contribute to:
- quantity_actual on the service instance
- Automatic status updates (unscheduled → scheduled → completed)
One service instance can have many activities.';