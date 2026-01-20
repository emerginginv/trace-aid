-- Update get_budget_forecast to include 'pending_review' status
-- Per SYSTEM PROMPT 10: Pending billing items may trigger warnings but do NOT consume budget definitively

CREATE OR REPLACE FUNCTION public.get_budget_forecast(p_case_id UUID)
RETURNS TABLE (
  -- Actual consumption (approved items only)
  hours_consumed NUMERIC,
  amount_consumed NUMERIC,
  
  -- Pending billing items
  pending_hours NUMERIC,
  pending_amount NUMERIC,
  pending_count INTEGER,
  
  -- Forecast (actual + pending)
  hours_forecast NUMERIC,
  amount_forecast NUMERIC,
  
  -- Budget limits
  hours_authorized NUMERIC,
  amount_authorized NUMERIC,
  
  -- Utilization percentages (actual)
  hours_utilization_pct NUMERIC,
  amount_utilization_pct NUMERIC,
  
  -- Utilization percentages (forecast)
  hours_forecast_utilization_pct NUMERIC,
  amount_forecast_utilization_pct NUMERIC,
  
  -- Status flags (actual)
  is_warning BOOLEAN,
  is_exceeded BOOLEAN,
  
  -- Status flags (forecast) - Pending may trigger warnings
  is_forecast_warning BOOLEAN,
  is_forecast_exceeded BOOLEAN,
  
  -- Hard cap flag - May block approval later
  hard_cap BOOLEAN,
  
  -- Budget exists flag
  has_budget BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_hours_consumed NUMERIC := 0;
  v_amount_consumed NUMERIC := 0;
  v_pending_hours NUMERIC := 0;
  v_pending_amount NUMERIC := 0;
  v_pending_count INTEGER := 0;
  v_hours_forecast NUMERIC;
  v_amount_forecast NUMERIC;
  v_hours_auth NUMERIC := 0;
  v_amount_auth NUMERIC := 0;
  v_hours_util_pct NUMERIC := 0;
  v_amount_util_pct NUMERIC := 0;
  v_hours_forecast_util_pct NUMERIC := 0;
  v_amount_forecast_util_pct NUMERIC := 0;
BEGIN
  -- Get budget config
  SELECT * INTO v_budget FROM case_budgets WHERE case_id = p_case_id;
  
  -- If no budget exists, return empty row with has_budget = false
  IF v_budget IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC,  -- consumed
      0::NUMERIC, 0::NUMERIC, 0,  -- pending
      0::NUMERIC, 0::NUMERIC,  -- forecast
      0::NUMERIC, 0::NUMERIC,  -- authorized
      0::NUMERIC, 0::NUMERIC,  -- actual utilization
      0::NUMERIC, 0::NUMERIC,  -- forecast utilization
      FALSE, FALSE,  -- actual status
      FALSE, FALSE,  -- forecast status
      FALSE,  -- hard_cap
      FALSE;  -- has_budget
    RETURN;
  END IF;
  
  v_hours_auth := COALESCE(v_budget.total_budget_hours, 0);
  v_amount_auth := COALESCE(v_budget.total_budget_amount, 0);
  
  -- Calculate actual consumption from approved/completed finance items
  -- Exclude pending and pending_review billing items from actual consumption
  SELECT 
    COALESCE(SUM(CASE WHEN billing_type = 'time' OR hours IS NOT NULL THEN hours ELSE 0 END), 0),
    COALESCE(SUM(amount), 0)
  INTO v_hours_consumed, v_amount_consumed
  FROM case_finances
  WHERE case_id = p_case_id
    AND (
      -- Approved billing items
      (finance_type = 'billing_item' AND status = 'approved')
      -- Or other finance types (expenses, etc.) that are not pending billing items
      OR (finance_type != 'billing_item')
    )
    -- Exclude pending, pending_review, cancelled, voided from actual consumption
    AND (status IS NULL OR status NOT IN ('pending', 'pending_review', 'cancelled', 'voided'));
  
  -- Calculate pending billing items (includes both 'pending' and 'pending_review')
  -- Per SYSTEM PROMPT 10: NOT definitively consumed, but may trigger warnings
  SELECT 
    COALESCE(SUM(CASE WHEN billing_type = 'time' THEN COALESCE(hours, quantity) ELSE 0 END), 0),
    COALESCE(SUM(amount), 0),
    COUNT(*)::INTEGER
  INTO v_pending_hours, v_pending_amount, v_pending_count
  FROM case_finances
  WHERE case_id = p_case_id
    AND finance_type = 'billing_item'
    AND status IN ('pending', 'pending_review');
  
  -- Calculate forecast (actual + pending)
  v_hours_forecast := v_hours_consumed + v_pending_hours;
  v_amount_forecast := v_amount_consumed + v_pending_amount;
  
  -- Calculate utilization percentages
  IF v_hours_auth > 0 THEN
    v_hours_util_pct := ROUND((v_hours_consumed / v_hours_auth) * 100, 2);
    v_hours_forecast_util_pct := ROUND((v_hours_forecast / v_hours_auth) * 100, 2);
  END IF;
  
  IF v_amount_auth > 0 THEN
    v_amount_util_pct := ROUND((v_amount_consumed / v_amount_auth) * 100, 2);
    v_amount_forecast_util_pct := ROUND((v_amount_forecast / v_amount_auth) * 100, 2);
  END IF;
  
  -- Return comprehensive forecast data
  RETURN QUERY SELECT
    v_hours_consumed,
    v_amount_consumed,
    v_pending_hours,
    v_pending_amount,
    v_pending_count,
    v_hours_forecast,
    v_amount_forecast,
    v_hours_auth,
    v_amount_auth,
    -- Actual utilization
    v_hours_util_pct,
    v_amount_util_pct,
    -- Forecast utilization
    v_hours_forecast_util_pct,
    v_amount_forecast_util_pct,
    -- Actual status flags (80% = warning, 100% = exceeded)
    (v_hours_util_pct >= 80 OR v_amount_util_pct >= 80),
    (v_hours_util_pct >= 100 OR v_amount_util_pct >= 100),
    -- Forecast status flags - Pending may trigger warnings
    (v_hours_forecast_util_pct >= 80 OR v_amount_forecast_util_pct >= 80),
    (v_hours_forecast_util_pct >= 100 OR v_amount_forecast_util_pct >= 100),
    -- Hard cap - May block approval later
    COALESCE(v_budget.hard_cap, false),
    -- Has budget
    TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_budget_forecast(UUID) TO authenticated;