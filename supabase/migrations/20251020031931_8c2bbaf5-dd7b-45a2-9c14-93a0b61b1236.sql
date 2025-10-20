-- Remove the old status check constraint
ALTER TABLE case_finances
DROP CONSTRAINT IF EXISTS case_finances_status_check;

-- Add a new check constraint that includes all valid status values
ALTER TABLE case_finances
ADD CONSTRAINT case_finances_status_check 
CHECK (
  status IN ('pending', 'paid', 'overdue', 'approved', 'rejected')
);