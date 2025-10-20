-- Add invoiced flag to track which expenses have been included in invoices
ALTER TABLE case_finances
ADD COLUMN invoiced boolean DEFAULT false;

COMMENT ON COLUMN case_finances.invoiced IS 'Indicates whether this expense has been included in an invoice';