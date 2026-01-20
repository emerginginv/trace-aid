-- Unified Pricing Item System Migration
-- Links service_pricing_rules, employee_price_list, and client_price_list to finance_items

-- 1. Add finance_item_id to service_pricing_rules
ALTER TABLE public.service_pricing_rules 
  ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE SET NULL;

-- 2. Add finance_item_id to employee_price_list  
ALTER TABLE public.employee_price_list 
  ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE CASCADE;

-- 3. Add finance_item_id to client_price_list
ALTER TABLE public.client_price_list 
  ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE CASCADE;

-- 4. Add finance_item_id to time_entries for unified tracking
ALTER TABLE public.time_entries 
  ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE SET NULL;

-- 5. Add finance_item_id to expense_entries for unified tracking
ALTER TABLE public.expense_entries 
  ADD COLUMN IF NOT EXISTS finance_item_id UUID REFERENCES public.finance_items(id) ON DELETE SET NULL;

-- 6. Add invoice_rate column to time_entries (for storing resolved billing rate)
ALTER TABLE public.time_entries 
  ADD COLUMN IF NOT EXISTS invoice_rate NUMERIC;

-- 7. Add invoice_rate column to expense_entries (for storing resolved billing rate)
ALTER TABLE public.expense_entries 
  ADD COLUMN IF NOT EXISTS invoice_rate NUMERIC;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_pricing_rules_finance_item 
  ON public.service_pricing_rules(finance_item_id);
  
CREATE INDEX IF NOT EXISTS idx_employee_price_list_finance_item 
  ON public.employee_price_list(finance_item_id);
  
CREATE INDEX IF NOT EXISTS idx_client_price_list_finance_item 
  ON public.client_price_list(finance_item_id);
  
CREATE INDEX IF NOT EXISTS idx_time_entries_finance_item 
  ON public.time_entries(finance_item_id);
  
CREATE INDEX IF NOT EXISTS idx_expense_entries_finance_item 
  ON public.expense_entries(finance_item_id);

-- 9. Create unified get_expense_rate_by_finance_item function
CREATE OR REPLACE FUNCTION public.get_expense_rate_by_finance_item(
  p_finance_item_id UUID,
  p_user_id UUID,
  p_organization_id UUID,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric AS $$
DECLARE
  v_custom_rate numeric;
  v_default_rate numeric;
BEGIN
  -- Check for employee custom rate first
  SELECT custom_expense_rate INTO v_custom_rate
  FROM public.employee_price_list
  WHERE finance_item_id = p_finance_item_id
    AND user_id = p_user_id
    AND organization_id = p_organization_id
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;
  
  -- Fall back to default_expense_rate from finance_items
  SELECT default_expense_rate INTO v_default_rate
  FROM public.finance_items
  WHERE id = p_finance_item_id;
  
  RETURN COALESCE(v_default_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Create unified get_invoice_rate_by_finance_item function
CREATE OR REPLACE FUNCTION public.get_invoice_rate_by_finance_item(
  p_finance_item_id UUID,
  p_account_id UUID,
  p_organization_id UUID,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric AS $$
DECLARE
  v_custom_rate numeric;
  v_default_rate numeric;
BEGIN
  -- Check for client custom rate first
  SELECT custom_invoice_rate INTO v_custom_rate
  FROM public.client_price_list
  WHERE finance_item_id = p_finance_item_id
    AND account_id = p_account_id
    AND organization_id = p_organization_id
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;
  
  -- Fall back to default_invoice_rate from finance_items
  SELECT default_invoice_rate INTO v_default_rate
  FROM public.finance_items
  WHERE id = p_finance_item_id;
  
  RETURN COALESCE(v_default_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;