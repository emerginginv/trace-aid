-- Update the status field to support approval workflow for expenses
-- Add approved and rejected status options to case_finances table

-- The status field already exists, so we just need to make sure it supports the new values
-- No schema changes needed, just adding a comment to document the new usage
COMMENT ON COLUMN case_finances.status IS 'Status of the financial transaction. For expenses: pending, approved, rejected. For invoices: pending, paid, overdue. For retainers: pending, paid, overdue.';