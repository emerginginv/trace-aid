-- First, update any existing 'invoice' records to 'expense' to preserve data
UPDATE public.case_finances 
SET finance_type = 'expense' 
WHERE finance_type = 'invoice';

-- Drop the old CHECK constraint
ALTER TABLE public.case_finances 
DROP CONSTRAINT case_finances_finance_type_check;

-- Add new CHECK constraint that includes 'time' (and removes 'invoice')
ALTER TABLE public.case_finances 
ADD CONSTRAINT case_finances_finance_type_check 
CHECK (finance_type IN ('retainer', 'expense', 'time'));