-- Create a view that enriches cases with computed budget consumption from case_finances
CREATE OR REPLACE VIEW public.cases_with_budget_summary AS
SELECT 
  c.*,
  COALESCE(cf_agg.consumed_hours, 0) as consumed_hours,
  COALESCE(cf_agg.consumed_dollars, 0) as consumed_dollars,
  COALESCE(c.budget_hours, 0) - COALESCE(cf_agg.consumed_hours, 0) as remaining_hours,
  COALESCE(c.budget_dollars, 0) - COALESCE(cf_agg.consumed_dollars, 0) as remaining_dollars,
  CASE WHEN COALESCE(c.budget_dollars, 0) > 0 
    THEN ROUND((COALESCE(cf_agg.consumed_dollars, 0) / c.budget_dollars) * 100, 1) 
    ELSE 0 
  END as dollars_utilization_pct,
  CASE WHEN COALESCE(c.budget_hours, 0) > 0 
    THEN ROUND((COALESCE(cf_agg.consumed_hours, 0) / c.budget_hours) * 100, 1) 
    ELSE 0 
  END as hours_utilization_pct
FROM public.cases c
LEFT JOIN (
  SELECT 
    case_id,
    COALESCE(SUM(hours), 0) as consumed_hours,
    COALESCE(SUM(CASE WHEN finance_type IN ('expense', 'time') THEN amount ELSE 0 END), 0) as consumed_dollars
  FROM public.case_finances
  WHERE status IS NULL OR status != 'rejected'
  GROUP BY case_id
) cf_agg ON cf_agg.case_id = c.id;