-- Update invoices table to support comprehensive status tracking
ALTER TABLE invoices 
ALTER COLUMN status SET DEFAULT 'draft';

-- Add comment to document valid status values
COMMENT ON COLUMN invoices.status IS 'Valid values: draft, sent, viewed, paid, partial, overdue, unpaid';

-- Add retainer_applied column to track retainer funds used
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS retainer_applied numeric DEFAULT 0;

-- Add balance_due column for easier querying
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS balance_due numeric GENERATED ALWAYS AS (total - retainer_applied) STORED;