-- Add update_id column to link billing item to case update
ALTER TABLE case_finances 
ADD COLUMN IF NOT EXISTS update_id uuid REFERENCES case_updates(id);

-- Add start_time and end_time columns for confirmed time range
ALTER TABLE case_finances 
ADD COLUMN IF NOT EXISTS start_time timestamptz;

ALTER TABLE case_finances 
ADD COLUMN IF NOT EXISTS end_time timestamptz;

-- Create index for update_id lookups
CREATE INDEX IF NOT EXISTS idx_case_finances_update_id ON case_finances(update_id);