-- Drop orphaned pricing profile functions
DROP FUNCTION IF EXISTS public.auto_assign_pricing_profile() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_pricing_rules() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_single_default_pricing_profile() CASCADE;

-- Drop old rate functions that use pricing_rule_id
DROP FUNCTION IF EXISTS public.get_expense_rate(date, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_invoice_rate(uuid, date, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_profit_margin(uuid, date, uuid, uuid, numeric, uuid) CASCADE;

-- Update rate resolution functions to return NULL when rate is missing (NO FALLBACK)
CREATE OR REPLACE FUNCTION public.get_expense_rate_by_finance_item(
  p_finance_item_id UUID,
  p_user_id UUID,
  p_organization_id UUID,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric AS $$
DECLARE
  v_custom_rate numeric;
BEGIN
  -- Check for employee custom rate
  SELECT custom_expense_rate INTO v_custom_rate
  FROM public.employee_price_list
  WHERE finance_item_id = p_finance_item_id
    AND user_id = p_user_id
    AND organization_id = p_organization_id
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- NO FALLBACK: Return NULL to indicate missing rate
  RETURN v_custom_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Same for invoice rate - NO FALLBACK
CREATE OR REPLACE FUNCTION public.get_invoice_rate_by_finance_item(
  p_finance_item_id UUID,
  p_account_id UUID,
  p_organization_id UUID,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric AS $$
DECLARE
  v_custom_rate numeric;
BEGIN
  -- Check for client custom rate
  SELECT custom_invoice_rate INTO v_custom_rate
  FROM public.client_price_list
  WHERE finance_item_id = p_finance_item_id
    AND account_id = p_account_id
    AND organization_id = p_organization_id
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- NO FALLBACK: Return NULL to indicate missing rate
  RETURN v_custom_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;