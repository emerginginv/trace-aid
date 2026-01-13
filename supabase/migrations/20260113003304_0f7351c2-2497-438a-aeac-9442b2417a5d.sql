-- Add schedule_mode column to case_services table
ALTER TABLE public.case_services 
ADD COLUMN schedule_mode TEXT NOT NULL DEFAULT 'primary_investigator'
CHECK (schedule_mode IN ('none', 'primary_investigator', 'activity_based'));

-- Add comment for documentation
COMMENT ON COLUMN public.case_services.schedule_mode IS 
  'Scheduling mode: none, primary_investigator (default), or activity_based (Enterprise only)';