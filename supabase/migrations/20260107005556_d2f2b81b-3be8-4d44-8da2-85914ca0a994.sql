-- Recreate the cases_with_budget_summary view with SECURITY INVOKER
-- This ensures the view respects RLS policies of the querying user, not the view owner

DROP VIEW IF EXISTS public.cases_with_budget_summary;

CREATE VIEW public.cases_with_budget_summary 
WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.user_id,
    c.case_number,
    c.title,
    c.description,
    c.status,
    c.account_id,
    c.contact_id,
    c.due_date,
    c.created_at,
    c.updated_at,
    c.case_manager_id,
    c.investigator_ids,
    c.organization_id,
    c.closed_by_user_id,
    c.closed_at,
    c.parent_case_id,
    c.instance_number,
    c.use_primary_subject_as_title,
    c.budget_hours,
    c.budget_dollars,
    c.budget_notes,
    c.reference_number,
    c.external_record_id,
    c.import_batch_id,
    c.external_system_name,
    c.import_timestamp,
    COALESCE(c.budget_hours, 0::numeric) AS budget_hours_authorized,
    COALESCE(c.budget_dollars, 0::numeric) AS budget_dollars_authorized,
    COALESCE(consumed.total_hours, 0::numeric) AS hours_consumed,
    COALESCE(consumed.total_dollars, 0::numeric) AS dollars_consumed,
    COALESCE(c.budget_hours, 0::numeric) - COALESCE(consumed.total_hours, 0::numeric) AS hours_remaining,
    COALESCE(c.budget_dollars, 0::numeric) - COALESCE(consumed.total_dollars, 0::numeric) AS dollars_remaining,
    CASE
        WHEN COALESCE(c.budget_hours, 0::numeric) > 0::numeric 
        THEN round(COALESCE(consumed.total_hours, 0::numeric) / c.budget_hours * 100::numeric, 2)
        ELSE 0::numeric
    END AS hours_utilization_pct,
    CASE
        WHEN COALESCE(c.budget_dollars, 0::numeric) > 0::numeric 
        THEN round(COALESCE(consumed.total_dollars, 0::numeric) / c.budget_dollars * 100::numeric, 2)
        ELSE 0::numeric
    END AS dollars_utilization_pct
FROM cases c
LEFT JOIN (
    SELECT 
        case_finances.case_id,
        COALESCE(sum(case_finances.hours), 0::numeric) AS total_hours,
        COALESCE(sum(
            CASE
                WHEN case_finances.finance_type = ANY (ARRAY['expense'::text, 'time'::text]) 
                THEN case_finances.amount
                ELSE 0::numeric
            END
        ), 0::numeric) AS total_dollars
    FROM case_finances
    WHERE case_finances.status IS NULL OR case_finances.status <> 'rejected'::text
    GROUP BY case_finances.case_id
) consumed ON c.id = consumed.case_id;

-- Grant access to authenticated users (view will respect RLS on underlying tables)
GRANT SELECT ON public.cases_with_budget_summary TO authenticated;