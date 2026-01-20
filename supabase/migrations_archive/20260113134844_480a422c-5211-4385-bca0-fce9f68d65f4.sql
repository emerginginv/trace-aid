-- =====================================================
-- SYSTEM PROMPT 3: Enhanced Case Service Instances
-- The bridge between work, budgets, and billing
-- =====================================================

-- Add missing fields to case_service_instances
ALTER TABLE public.case_service_instances
ADD COLUMN IF NOT EXISTS assigned_investigator_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quantity_estimated NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS quantity_actual NUMERIC(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON TABLE public.case_service_instances IS 
'Per-case work execution records. The primary bridge between services, activities, budgets, and billing.
One service definition can have many case service instances across different cases.';

COMMENT ON COLUMN public.case_service_instances.assigned_investigator_id IS 'Investigator assigned to perform this service';
COMMENT ON COLUMN public.case_service_instances.scheduled_start IS 'Scheduled start date/time';
COMMENT ON COLUMN public.case_service_instances.scheduled_end IS 'Scheduled end date/time';
COMMENT ON COLUMN public.case_service_instances.quantity_estimated IS 'Estimated hours/days/units for this service';
COMMENT ON COLUMN public.case_service_instances.quantity_actual IS 'Actual hours/days/units computed from linked activities';
COMMENT ON COLUMN public.case_service_instances.billable IS 'Override: whether this instance is billable (default true)';
COMMENT ON COLUMN public.case_service_instances.completion_date IS 'When the service was marked completed';
COMMENT ON COLUMN public.case_service_instances.notes IS 'Notes about this service execution';

-- Create function to compute quantity_actual from linked activities
CREATE OR REPLACE FUNCTION public.compute_service_instance_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- When an activity linked to a service instance is created/updated/deleted,
  -- recalculate the quantity_actual for that service instance
  IF TG_OP = 'DELETE' THEN
    UPDATE public.case_service_instances
    SET quantity_actual = COALESCE((
      SELECT SUM(
        CASE 
          WHEN cf.hours IS NOT NULL THEN cf.hours
          ELSE 1 -- Count as 1 unit if no hours specified
        END
      )
      FROM public.case_finances cf
      WHERE cf.case_id = (SELECT case_id FROM public.case_service_instances WHERE id = OLD.case_service_instance_id)
        AND cf.activity_id = OLD.id
    ), 0),
    updated_at = now()
    WHERE id = OLD.case_service_instance_id;
    RETURN OLD;
  ELSE
    -- For INSERT or UPDATE
    IF NEW.case_service_instance_id IS NOT NULL THEN
      UPDATE public.case_service_instances
      SET quantity_actual = COALESCE((
        SELECT SUM(
          CASE 
            WHEN ca.completed = true THEN 1
            ELSE 0
          END
        )
        FROM public.case_activities ca
        WHERE ca.case_service_instance_id = NEW.case_service_instance_id
      ), 0),
      updated_at = now()
      WHERE id = NEW.case_service_instance_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update quantity_actual when activities change
DROP TRIGGER IF EXISTS tr_compute_service_quantity ON public.case_activities;
CREATE TRIGGER tr_compute_service_quantity
AFTER INSERT OR UPDATE OR DELETE ON public.case_activities
FOR EACH ROW
EXECUTE FUNCTION public.compute_service_instance_quantity();

-- Create function to auto-set completion_date when status changes to completed
CREATE OR REPLACE FUNCTION public.set_service_instance_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completion_date := COALESCE(NEW.completion_date, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_set_completion_date ON public.case_service_instances;
CREATE TRIGGER tr_set_completion_date
BEFORE UPDATE ON public.case_service_instances
FOR EACH ROW
EXECUTE FUNCTION public.set_service_instance_completion();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_instances_investigator 
ON public.case_service_instances(assigned_investigator_id) 
WHERE assigned_investigator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_instances_status 
ON public.case_service_instances(status);

CREATE INDEX IF NOT EXISTS idx_service_instances_billable 
ON public.case_service_instances(billable) 
WHERE billable = true;