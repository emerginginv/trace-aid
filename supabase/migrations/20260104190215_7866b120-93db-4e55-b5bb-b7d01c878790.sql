-- Add event_subtype column to case_activities for categorizing events
ALTER TABLE case_activities
ADD COLUMN IF NOT EXISTS event_subtype text;

-- Create index for faster filtering by event_subtype
CREATE INDEX IF NOT EXISTS idx_case_activities_event_subtype 
ON case_activities(event_subtype) WHERE activity_type = 'event';