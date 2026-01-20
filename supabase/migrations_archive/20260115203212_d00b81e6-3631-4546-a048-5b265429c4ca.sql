-- Add organization default invoice rate back to finance_items for display/reference
-- INVARIANT: This is for UI display only - billing still requires client_price_list rates OR uses this as fallback
ALTER TABLE public.finance_items 
ADD COLUMN IF NOT EXISTS default_invoice_rate numeric;

COMMENT ON COLUMN public.finance_items.default_invoice_rate IS 
'Organization standard invoice rate. Accounts can override via client_price_list. Used as default if no account-specific rate exists.';