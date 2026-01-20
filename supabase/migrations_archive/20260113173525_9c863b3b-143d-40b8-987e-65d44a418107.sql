-- Drop the existing constraint
ALTER TABLE public.case_service_instances 
DROP CONSTRAINT valid_status;

-- Add new constraint with 'completed' included
ALTER TABLE public.case_service_instances 
ADD CONSTRAINT valid_status 
CHECK (status = ANY (ARRAY['scheduled'::text, 'unscheduled'::text, 'completed'::text]));