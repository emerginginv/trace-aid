-- ═══════════════════════════════════════════════════════════════════════════════
-- PRICING INVARIANTS ENFORCEMENT MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- INVARIANT 1: Client billing rates live ONLY on the Account (client_price_list)
-- INVARIANT 2: Investigator pay rates live ONLY on the User (employee_price_list)
-- INVARIANT 3: Pay rates ≠ Billing rates - complete isolation
--
-- This migration:
-- 1. Drops orphaned pricing profile functions (cleanup from prior migration)
-- 2. Drops default_rate column from case_services (no service-level rates)
-- 3. Drops default_expense_rate and default_invoice_rate from finance_items
-- 4. Updates rate resolution functions to return NULL (no fallback)
-- 5. Adds validation triggers on time_entries and expense_entries
-- ═══════════════════════════════════════════════════════════════════════════════

-- Phase 1: Drop legacy columns that violate invariants
-- These columns allowed fallback rates which violates rate isolation

-- Drop default_rate from case_services (rates are account-specific, not service-level)
ALTER TABLE public.case_services DROP COLUMN IF EXISTS default_rate;

-- Drop default rates from finance_items (rates are user/account specific)
ALTER TABLE public.finance_items DROP COLUMN IF EXISTS default_expense_rate;
ALTER TABLE public.finance_items DROP COLUMN IF EXISTS default_invoice_rate;

-- Phase 2: Update rate resolution functions to enforce NO FALLBACK
-- If no custom rate exists, return NULL - the application layer must validate

CREATE OR REPLACE FUNCTION public.get_expense_rate_by_finance_item(
  p_finance_item_id UUID,
  p_user_id UUID,
  p_organization_id UUID,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric AS $$
DECLARE
  v_custom_rate numeric;
BEGIN
  -- INVARIANT 2: Pay rates come ONLY from employee_price_list
  SELECT custom_expense_rate INTO v_custom_rate
  FROM public.employee_price_list
  WHERE finance_item_id = p_finance_item_id
    AND user_id = p_user_id
    AND organization_id = p_organization_id
    AND (effective_date IS NULL OR effective_date <= p_date)
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC NULLS LAST
  LIMIT 1;
  
  -- NO FALLBACK: Return NULL if no custom rate exists
  -- Application layer must validate and show error to user
  RETURN v_custom_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_invoice_rate_by_finance_item(
  p_finance_item_id UUID,
  p_account_id UUID,
  p_organization_id UUID,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric AS $$
DECLARE
  v_custom_rate numeric;
BEGIN
  -- INVARIANT 1: Billing rates come ONLY from client_price_list
  SELECT custom_invoice_rate INTO v_custom_rate
  FROM public.client_price_list
  WHERE finance_item_id = p_finance_item_id
    AND account_id = p_account_id
    AND organization_id = p_organization_id
    AND (effective_date IS NULL OR effective_date <= p_date)
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC NULLS LAST
  LIMIT 1;
  
  -- NO FALLBACK: Return NULL if no custom rate exists
  -- Application layer must validate and show error to user
  RETURN v_custom_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 3: Add validation triggers to enforce rate requirements at database level

-- Validation function for time_entries - rate must be explicitly set
CREATE OR REPLACE FUNCTION public.validate_time_entry_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rate IS NULL THEN
    RAISE EXCEPTION 'Time entry requires a pay rate. Configure rate in User Profile > Compensation.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validation function for expense_entries - rate must be explicitly set
CREATE OR REPLACE FUNCTION public.validate_expense_entry_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rate IS NULL THEN
    RAISE EXCEPTION 'Expense entry requires a pay rate. Configure rate in User Profile > Compensation.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS enforce_time_entry_rate ON public.time_entries;
CREATE TRIGGER enforce_time_entry_rate
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_entry_rate();

DROP TRIGGER IF EXISTS enforce_expense_entry_rate ON public.expense_entries;
CREATE TRIGGER enforce_expense_entry_rate
  BEFORE INSERT OR UPDATE ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_entry_rate();

-- Add comment documenting the invariants
COMMENT ON FUNCTION public.get_expense_rate_by_finance_item IS 
'INVARIANT 2: Pay rates come ONLY from employee_price_list. Returns NULL if no rate configured.';

COMMENT ON FUNCTION public.get_invoice_rate_by_finance_item IS 
'INVARIANT 1: Billing rates come ONLY from client_price_list. Returns NULL if no rate configured.';