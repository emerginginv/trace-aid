-- Add optional linked_activity_id to case_updates for linking updates to tasks/events
ALTER TABLE public.case_updates 
ADD COLUMN linked_activity_id UUID REFERENCES public.case_activities(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX idx_case_updates_linked_activity ON public.case_updates(linked_activity_id) WHERE linked_activity_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.case_updates.linked_activity_id IS 'Optional reference to a related task or event this update is about';