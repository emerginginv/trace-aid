-- Add total_paid column to track cumulative payments
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;

-- Update the generated balance_due column to account for both retainer and payments
ALTER TABLE invoices 
DROP COLUMN balance_due;

ALTER TABLE invoices
ADD COLUMN balance_due NUMERIC GENERATED ALWAYS AS (total - COALESCE(retainer_applied, 0) - COALESCE(total_paid, 0)) STORED;