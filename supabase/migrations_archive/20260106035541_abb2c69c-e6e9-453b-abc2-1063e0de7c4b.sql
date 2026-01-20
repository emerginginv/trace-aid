-- Drop the view that depends on claim_number
DROP VIEW IF EXISTS cases_with_budget_summary;

-- Rename the column from claim_number to reference_number
ALTER TABLE public.cases RENAME COLUMN claim_number TO reference_number;

-- Recreate the view with the new column name
CREATE VIEW cases_with_budget_summary AS
SELECT 
  c.*,
  COALESCE(c.budget_hours, 0) as budget_hours_authorized,
  COALESCE(c.budget_dollars, 0) as budget_dollars_authorized,
  COALESCE(consumed.total_hours, 0) as hours_consumed,
  COALESCE(consumed.total_dollars, 0) as dollars_consumed,
  COALESCE(c.budget_hours, 0) - COALESCE(consumed.total_hours, 0) as hours_remaining,
  COALESCE(c.budget_dollars, 0) - COALESCE(consumed.total_dollars, 0) as dollars_remaining,
  CASE WHEN COALESCE(c.budget_hours, 0) > 0 
    THEN ROUND((COALESCE(consumed.total_hours, 0) / c.budget_hours) * 100, 2) 
    ELSE 0 END as hours_utilization_pct,
  CASE WHEN COALESCE(c.budget_dollars, 0) > 0 
    THEN ROUND((COALESCE(consumed.total_dollars, 0) / c.budget_dollars) * 100, 2) 
    ELSE 0 END as dollars_utilization_pct
FROM cases c
LEFT JOIN (
  SELECT 
    case_id,
    COALESCE(SUM(hours), 0) as total_hours,
    COALESCE(SUM(CASE WHEN finance_type IN ('expense', 'time') THEN amount ELSE 0 END), 0) as total_dollars
  FROM case_finances
  WHERE status IS NULL OR status != 'rejected'
  GROUP BY case_id
) consumed ON c.id = consumed.case_id;