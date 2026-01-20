-- Create case_budgets table to provide structured budget authorization
CREATE TABLE public.case_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('hours', 'money', 'both')),
  total_budget_hours NUMERIC(10, 2) NULL,
  total_budget_amount NUMERIC(12, 2) NULL,
  hard_cap BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT NULL,
  -- Ensure only one budget per case
  CONSTRAINT case_budgets_case_unique UNIQUE (case_id),
  -- Ensure appropriate budget values based on type
  CONSTRAINT case_budgets_hours_check CHECK (
    (budget_type = 'money') OR (total_budget_hours IS NOT NULL AND total_budget_hours >= 0)
  ),
  CONSTRAINT case_budgets_amount_check CHECK (
    (budget_type = 'hours') OR (total_budget_amount IS NOT NULL AND total_budget_amount >= 0)
  )
);

-- Add index for faster lookups
CREATE INDEX idx_case_budgets_case_id ON public.case_budgets(case_id);
CREATE INDEX idx_case_budgets_organization_id ON public.case_budgets(organization_id);

-- Enable RLS
ALTER TABLE public.case_budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for case_budgets
CREATE POLICY "Users can view budgets in their organization"
ON public.case_budgets
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Admins and managers can create budgets"
ON public.case_budgets
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_permission(auth.uid(), 'modify_case_budget'))
);

CREATE POLICY "Admins and managers can update budgets"
ON public.case_budgets
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_permission(auth.uid(), 'modify_case_budget'))
);

CREATE POLICY "Admins can delete budgets"
ON public.case_budgets
FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create function to check budget status before activities
CREATE OR REPLACE FUNCTION public.check_budget_cap(
  p_case_id UUID,
  p_additional_hours NUMERIC DEFAULT 0,
  p_additional_amount NUMERIC DEFAULT 0
)
RETURNS TABLE (
  can_proceed BOOLEAN,
  warning_message TEXT,
  budget_type TEXT,
  hard_cap BOOLEAN,
  hours_remaining NUMERIC,
  amount_remaining NUMERIC,
  would_exceed_hours BOOLEAN,
  would_exceed_amount BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_summary RECORD;
  v_hours_remaining NUMERIC;
  v_amount_remaining NUMERIC;
  v_would_exceed_hours BOOLEAN := false;
  v_would_exceed_amount BOOLEAN := false;
  v_warning TEXT := NULL;
  v_can_proceed BOOLEAN := true;
BEGIN
  -- Get the budget for this case
  SELECT cb.* INTO v_budget
  FROM case_budgets cb
  WHERE cb.case_id = p_case_id;
  
  -- If no budget exists, allow everything
  IF v_budget IS NULL THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      NULL::TEXT,
      NULL::TEXT,
      false::BOOLEAN,
      NULL::NUMERIC,
      NULL::NUMERIC,
      false::BOOLEAN,
      false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Get current consumption
  SELECT * INTO v_summary
  FROM get_case_budget_summary(p_case_id) AS s
  LIMIT 1;
  
  -- Calculate remaining
  v_hours_remaining := COALESCE(v_budget.total_budget_hours, 0) - COALESCE(v_summary.hours_consumed, 0);
  v_amount_remaining := COALESCE(v_budget.total_budget_amount, 0) - COALESCE(v_summary.dollars_consumed, 0);
  
  -- Check if additional work would exceed budget
  IF v_budget.budget_type IN ('hours', 'both') AND v_budget.total_budget_hours IS NOT NULL THEN
    v_would_exceed_hours := (v_hours_remaining - p_additional_hours) < 0;
  END IF;
  
  IF v_budget.budget_type IN ('money', 'both') AND v_budget.total_budget_amount IS NOT NULL THEN
    v_would_exceed_amount := (v_amount_remaining - p_additional_amount) < 0;
  END IF;
  
  -- Determine if we can proceed and generate warning
  IF v_would_exceed_hours OR v_would_exceed_amount THEN
    IF v_budget.hard_cap THEN
      v_can_proceed := false;
      v_warning := 'Budget limit reached. This case has a hard cap - no additional work can be logged without increasing the budget.';
    ELSE
      v_warning := 'Warning: This action will exceed the authorized budget.';
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_can_proceed,
    v_warning,
    v_budget.budget_type,
    v_budget.hard_cap,
    v_hours_remaining,
    v_amount_remaining,
    v_would_exceed_hours,
    v_would_exceed_amount;
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_case_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_case_budgets_updated_at
BEFORE UPDATE ON public.case_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_case_budgets_updated_at();

-- Migrate existing budget data from cases table to case_budgets
INSERT INTO case_budgets (case_id, organization_id, budget_type, total_budget_hours, total_budget_amount, hard_cap, created_by, notes)
SELECT 
  c.id,
  c.organization_id,
  CASE 
    WHEN c.budget_hours IS NOT NULL AND c.budget_dollars IS NOT NULL THEN 'both'
    WHEN c.budget_hours IS NOT NULL THEN 'hours'
    ELSE 'money'
  END,
  c.budget_hours,
  c.budget_dollars,
  false, -- Default to soft cap for migrated data
  c.user_id,
  c.budget_notes
FROM cases c
WHERE c.budget_hours IS NOT NULL OR c.budget_dollars IS NOT NULL;