-- Drop the existing constraint
ALTER TABLE case_finances DROP CONSTRAINT case_finances_status_check;

-- Add the updated constraint with pending_review included
ALTER TABLE case_finances 
ADD CONSTRAINT case_finances_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'pending_review'::text, 'paid'::text, 'overdue'::text, 'approved'::text, 'rejected'::text]));