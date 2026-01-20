-- Add invoice_id to track which invoice an expense belongs to
ALTER TABLE case_finances
ADD COLUMN invoice_id uuid;

COMMENT ON COLUMN case_finances.invoice_id IS 'References the invoice that includes this expense (for expense line items)';