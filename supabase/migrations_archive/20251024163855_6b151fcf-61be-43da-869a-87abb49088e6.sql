-- Add columns to track who closed the case and when
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS closed_by_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_closed_by ON cases(closed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_cases_closed_at ON cases(closed_at);

-- Add a comment to document the fields
COMMENT ON COLUMN cases.closed_by_user_id IS 'User who closed this case';
COMMENT ON COLUMN cases.closed_at IS 'Timestamp when the case was closed';