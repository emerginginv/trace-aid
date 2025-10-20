-- Update retainer_funds table to allow negative amounts (deductions) and link to invoices
ALTER TABLE public.retainer_funds 
DROP CONSTRAINT IF EXISTS retainer_funds_amount_check;

ALTER TABLE public.retainer_funds 
ADD CONSTRAINT retainer_funds_amount_nonzero CHECK (amount != 0);

-- Add invoice_id column to track which invoice a deduction is for
ALTER TABLE public.retainer_funds 
ADD COLUMN invoice_id UUID REFERENCES public.case_finances(id);

-- Create index for invoice lookups
CREATE INDEX idx_retainer_funds_invoice_id ON public.retainer_funds(invoice_id);