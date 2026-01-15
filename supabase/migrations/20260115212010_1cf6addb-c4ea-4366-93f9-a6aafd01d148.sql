-- Add organization default expense rate back to finance_items for display/reference
-- INVARIANT: This is for UI display only - expense tracking still requires employee_price_list rates OR uses this as fallback
ALTER TABLE public.finance_items 
ADD COLUMN IF NOT EXISTS default_expense_rate numeric;

COMMENT ON COLUMN public.finance_items.default_expense_rate IS 
'Organization standard expense rate (pay rate). Employees can override via employee_price_list. Used as default if no employee-specific rate exists.';