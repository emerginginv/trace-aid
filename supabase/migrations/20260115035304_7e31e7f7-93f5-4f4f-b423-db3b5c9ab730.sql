-- Phase 1: Unify Activity Statuses

-- Add unified status CHECK constraint
ALTER TABLE case_activities 
DROP CONSTRAINT IF EXISTS case_activities_status_check;

ALTER TABLE case_activities
ADD CONSTRAINT case_activities_status_check 
CHECK (status IN (
  'to_do',        -- Not started, no specific time (primary for tasks)
  'scheduled',    -- Has a future scheduled time (primary for events)
  'in_progress',  -- Currently being worked on (now usable by both)
  'blocked',      -- Waiting on external dependency (now usable by both)
  'done',         -- Completed (for tasks)
  'completed',    -- Completed (for events - keeping for backwards compatibility)
  'cancelled'     -- Will not be done (shared)
));

-- Add computed column to easily identify scheduled activities
ALTER TABLE case_activities
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN 
GENERATED ALWAYS AS (start_time IS NOT NULL AND due_date IS NOT NULL) STORED;

-- Add index for efficient filtering by scheduled status
CREATE INDEX IF NOT EXISTS idx_case_activities_is_scheduled 
ON case_activities(is_scheduled) WHERE is_scheduled = true;

-- Update the column comment to reflect unified statuses
COMMENT ON COLUMN case_activities.status IS 
  'Unified statuses: to_do, scheduled, in_progress, blocked, done, completed, cancelled. Both tasks and events can use any status.';