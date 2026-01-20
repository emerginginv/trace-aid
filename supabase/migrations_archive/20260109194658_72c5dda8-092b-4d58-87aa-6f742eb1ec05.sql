-- Add activity_timeline column to case_updates table
-- Stores optional chronological activity entries as JSONB array
-- Format: [{"time": "08:30", "description": "Activity description"}, ...]

ALTER TABLE public.case_updates 
ADD COLUMN activity_timeline jsonb DEFAULT NULL;

COMMENT ON COLUMN public.case_updates.activity_timeline IS 
  'Optional array of timeline entries [{time: "HH:MM", description: "text"}] for narrative activity logs';