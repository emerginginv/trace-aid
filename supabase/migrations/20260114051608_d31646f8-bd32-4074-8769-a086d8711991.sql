
-- Fix compute_case_budget_consumption to use case_finances as source of truth
-- The current function double-counts by looking at service instances AND activities
-- The actual consumed hours/dollars should come from case_finances table

CREATE OR REPLACE FUNCTION public.compute_case_budget_consumption(p_case_id UUID)
RETURNS TABLE (
  hours_consumed NUMERIC,
  amount_consumed NUMERIC,
  hours_from_activities NUMERIC,
  amount_from_activities NUMERIC,
  hours_from_services NUMERIC,
  amount_from_services NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours_from_time NUMERIC := 0;
  v_amount_from_time NUMERIC := 0;
  v_amount_from_expenses NUMERIC := 0;
BEGIN
  -- Get consumed hours and amount from case_finances (the actual source of truth)
  -- Time entries have finance_type = 'time' and contain hours worked
  SELECT 
    COALESCE(SUM(CASE WHEN cf.finance_type = 'time' THEN COALESCE(cf.hours, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cf.finance_type = 'time' THEN COALESCE(cf.amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cf.finance_type = 'expense' THEN COALESCE(cf.amount, 0) ELSE 0 END), 0)
  INTO v_hours_from_time, v_amount_from_time, v_amount_from_expenses
  FROM case_finances cf
  WHERE cf.case_id = p_case_id;

  -- Return the summary
  -- hours_consumed = hours from time entries
  -- amount_consumed = amount from time entries + amount from expenses
  -- We maintain the columns for backwards compatibility but repurpose them:
  --   hours_from_activities = hours from time entries
  --   amount_from_activities = amount from time entries  
  --   hours_from_services = 0 (not used anymore)
  --   amount_from_services = amount from expenses
  RETURN QUERY SELECT
    v_hours_from_time,                           -- Total hours consumed
    v_amount_from_time + v_amount_from_expenses, -- Total amount consumed (time + expenses)
    v_hours_from_time,                           -- Hours from time entries
    v_amount_from_time,                          -- Amount from time entries
    0::NUMERIC,                                  -- Hours from services (not used)
    v_amount_from_expenses;                      -- Amount from expenses
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.compute_case_budget_consumption(UUID) IS 
'Computes budget consumption for a case based on case_finances table entries. 
Hours come from time entries (finance_type=time). 
Dollars come from both time entries and expenses.';
