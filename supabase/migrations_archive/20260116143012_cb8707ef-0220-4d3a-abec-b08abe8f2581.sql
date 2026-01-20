-- Add applied_budget_strategy to store the budget strategy at time of case type assignment
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS applied_budget_strategy text DEFAULT NULL;

-- Add active_service_ids to store the snapshot of allowed services at assignment time
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS active_service_ids uuid[] DEFAULT '{}'::uuid[];

-- Add comments explaining the columns
COMMENT ON COLUMN public.cases.applied_budget_strategy IS 
  'Budget strategy applied to this case at creation/case type assignment. Preserved even if case type changes.';
COMMENT ON COLUMN public.cases.active_service_ids IS 
  'Snapshot of active service IDs for this case. Synced from case_service_instances.';

-- Backfill applied_budget_strategy from current case_types
UPDATE public.cases c
SET applied_budget_strategy = ct.budget_strategy
FROM public.case_types ct
WHERE c.case_type_id = ct.id
  AND c.applied_budget_strategy IS NULL;

-- For cases without case_type, default to 'both'
UPDATE public.cases
SET applied_budget_strategy = 'both'
WHERE case_type_id IS NULL AND applied_budget_strategy IS NULL;

-- Backfill active_service_ids from case_service_instances
UPDATE public.cases c
SET active_service_ids = COALESCE(
  (SELECT ARRAY_AGG(DISTINCT csi.case_service_id)
   FROM public.case_service_instances csi
   WHERE csi.case_id = c.id),
  '{}'::uuid[]
)
WHERE active_service_ids = '{}' OR active_service_ids IS NULL;

-- Create function to sync active_service_ids when case_service_instances changes
CREATE OR REPLACE FUNCTION public.sync_case_active_services()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the case's active_service_ids array
  UPDATE public.cases
  SET active_service_ids = COALESCE(
    (SELECT ARRAY_AGG(DISTINCT case_service_id)
     FROM public.case_service_instances
     WHERE case_id = COALESCE(NEW.case_id, OLD.case_id)),
    '{}'::uuid[]
  )
  WHERE id = COALESCE(NEW.case_id, OLD.case_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync active_service_ids
DROP TRIGGER IF EXISTS trg_sync_case_active_services ON public.case_service_instances;
CREATE TRIGGER trg_sync_case_active_services
AFTER INSERT OR UPDATE OR DELETE ON public.case_service_instances
FOR EACH ROW
EXECUTE FUNCTION public.sync_case_active_services();