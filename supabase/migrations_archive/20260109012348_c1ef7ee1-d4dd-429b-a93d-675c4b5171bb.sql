-- Add address column to case_activities for event locations
ALTER TABLE case_activities ADD COLUMN IF NOT EXISTS address TEXT;