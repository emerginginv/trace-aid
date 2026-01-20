-- Add status_type column to picklists table
ALTER TABLE picklists 
ADD COLUMN status_type text CHECK (status_type IN ('open', 'closed')) DEFAULT 'open';

-- Update the column to be required for case_status picklists
-- and keep it optional for other picklist types
UPDATE picklists 
SET status_type = 'open' 
WHERE type = 'case_status' AND status_type IS NULL;

-- Add a comment for clarity
COMMENT ON COLUMN picklists.status_type IS 'Indicates whether a case status represents an open or closed state. Only applicable for case_status type picklists.';