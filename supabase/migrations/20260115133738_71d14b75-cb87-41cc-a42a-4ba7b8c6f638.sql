-- Enhance service_pricing_rules with dual-rate support
-- Keep existing 'rate' column as 'default_rate' for backwards compatibility
ALTER TABLE public.service_pricing_rules 
  RENAME COLUMN rate TO default_rate;

-- Add expense_rate (what you pay employees)
ALTER TABLE public.service_pricing_rules 
  ADD COLUMN expense_rate numeric;

-- Add invoice_rate (what you bill clients)
ALTER TABLE public.service_pricing_rules 
  ADD COLUMN invoice_rate numeric;

-- Copy default_rate to both expense_rate and invoice_rate for existing records
UPDATE public.service_pricing_rules 
  SET expense_rate = default_rate, 
      invoice_rate = default_rate 
  WHERE expense_rate IS NULL;

-- Create rate_type enum
DO $$ BEGIN
  CREATE TYPE public.rate_type AS ENUM ('hourly', 'fixed', 'variable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add rate_type column (existing pricing_model will be migrated)
ALTER TABLE public.service_pricing_rules 
  ADD COLUMN rate_type public.rate_type DEFAULT 'hourly';

-- Migrate existing pricing_model values to rate_type
UPDATE public.service_pricing_rules 
  SET rate_type = CASE 
    WHEN pricing_model ILIKE '%hour%' THEN 'hourly'::public.rate_type
    WHEN pricing_model ILIKE '%fixed%' OR pricing_model ILIKE '%flat%' THEN 'fixed'::public.rate_type
    WHEN pricing_model ILIKE '%variable%' OR pricing_model ILIKE '%unit%' THEN 'variable'::public.rate_type
    ELSE 'hourly'::public.rate_type
  END;

-- ============================================
-- Employee Price List (custom rates per employee)
-- ============================================
CREATE TABLE public.employee_price_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pricing_rule_id UUID NOT NULL REFERENCES public.service_pricing_rules(id) ON DELETE CASCADE,
  custom_expense_rate numeric NOT NULL,
  effective_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(organization_id, user_id, pricing_rule_id, effective_date)
);

-- Enable RLS on employee_price_list
ALTER TABLE public.employee_price_list ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_price_list
CREATE POLICY "Users can view employee price list in their org"
  ON public.employee_price_list FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage employee price list"
  ON public.employee_price_list FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- Client Price List (custom rates per client/account)
-- ============================================
CREATE TABLE public.client_price_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  pricing_rule_id UUID NOT NULL REFERENCES public.service_pricing_rules(id) ON DELETE CASCADE,
  custom_invoice_rate numeric NOT NULL,
  effective_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(organization_id, account_id, pricing_rule_id, effective_date)
);

-- Enable RLS on client_price_list
ALTER TABLE public.client_price_list ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_price_list
CREATE POLICY "Users can view client price list in their org"
  ON public.client_price_list FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage client price list"
  ON public.client_price_list FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_employee_price_list_org_user 
  ON public.employee_price_list(organization_id, user_id);

CREATE INDEX idx_employee_price_list_rule 
  ON public.employee_price_list(pricing_rule_id);

CREATE INDEX idx_client_price_list_org_account 
  ON public.client_price_list(organization_id, account_id);

CREATE INDEX idx_client_price_list_rule 
  ON public.client_price_list(pricing_rule_id);

-- ============================================
-- Helper function to resolve expense rate
-- ============================================
CREATE OR REPLACE FUNCTION public.get_expense_rate(
  p_pricing_rule_id UUID,
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
  WHERE pricing_rule_id = p_pricing_rule_id
    AND user_id = p_user_id
    AND organization_id = p_organization_id
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;
  
  -- Fall back to default expense_rate
  SELECT COALESCE(expense_rate, default_rate) INTO v_default_rate
  FROM public.service_pricing_rules
  WHERE id = p_pricing_rule_id;
  
  RETURN COALESCE(v_default_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Helper function to resolve invoice rate
-- ============================================
CREATE OR REPLACE FUNCTION public.get_invoice_rate(
  p_pricing_rule_id UUID,
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
  WHERE pricing_rule_id = p_pricing_rule_id
    AND account_id = p_account_id
    AND organization_id = p_organization_id
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;
  
  -- Fall back to default invoice_rate
  SELECT COALESCE(invoice_rate, default_rate) INTO v_default_rate
  FROM public.service_pricing_rules
  WHERE id = p_pricing_rule_id;
  
  RETURN COALESCE(v_default_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Helper function to calculate profit margin
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_profit_margin(
  p_pricing_rule_id UUID,
  p_user_id UUID,
  p_account_id UUID,
  p_organization_id UUID,
  p_quantity numeric,
  p_date date DEFAULT CURRENT_DATE
) RETURNS TABLE (
  expense_total numeric,
  invoice_total numeric,
  profit numeric,
  margin_percent numeric
) AS $$
DECLARE
  v_expense_rate numeric;
  v_invoice_rate numeric;
BEGIN
  v_expense_rate := public.get_expense_rate(p_pricing_rule_id, p_user_id, p_organization_id, p_date);
  v_invoice_rate := public.get_invoice_rate(p_pricing_rule_id, p_account_id, p_organization_id, p_date);
  
  expense_total := v_expense_rate * p_quantity;
  invoice_total := v_invoice_rate * p_quantity;
  profit := invoice_total - expense_total;
  margin_percent := CASE WHEN invoice_total > 0 THEN (profit / invoice_total) * 100 ELSE 0 END;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update timestamp trigger for new tables
CREATE TRIGGER update_employee_price_list_updated_at
  BEFORE UPDATE ON public.employee_price_list
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_price_list_updated_at
  BEFORE UPDATE ON public.client_price_list
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();