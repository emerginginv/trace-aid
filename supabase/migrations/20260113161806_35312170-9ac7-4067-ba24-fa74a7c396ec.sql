-- Remove all event_type picklist entries
DELETE FROM public.picklists WHERE type = 'event_type';

-- Remove the event_subtype column from case_activities
ALTER TABLE public.case_activities DROP COLUMN IF EXISTS event_subtype;