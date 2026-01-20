-- Drop the view that depends on surveillance columns
DROP VIEW IF EXISTS public.cases_with_budget_summary;

-- Drop surveillance date columns from cases table
ALTER TABLE public.cases DROP COLUMN IF EXISTS surveillance_start_date;
ALTER TABLE public.cases DROP COLUMN IF EXISTS surveillance_end_date;

-- Recreate the view without surveillance columns
CREATE OR REPLACE VIEW public.cases_with_budget_summary AS
SELECT c.id,
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
    c.claim_number,
    c.external_record_id,
    c.import_batch_id,
    c.external_system_name,
    c.import_timestamp,
    COALESCE(cf_agg.consumed_hours, 0::numeric) AS consumed_hours,
    COALESCE(cf_agg.consumed_dollars, 0::numeric) AS consumed_dollars,
    COALESCE(c.budget_hours, 0::numeric) - COALESCE(cf_agg.consumed_hours, 0::numeric) AS remaining_hours,
    COALESCE(c.budget_dollars, 0::numeric) - COALESCE(cf_agg.consumed_dollars, 0::numeric) AS remaining_dollars,
    CASE
        WHEN COALESCE(c.budget_dollars, 0::numeric) > 0::numeric THEN round(COALESCE(cf_agg.consumed_dollars, 0::numeric) / c.budget_dollars * 100::numeric, 1)
        ELSE 0::numeric
    END AS dollars_utilization_pct,
    CASE
        WHEN COALESCE(c.budget_hours, 0::numeric) > 0::numeric THEN round(COALESCE(cf_agg.consumed_hours, 0::numeric) / c.budget_hours * 100::numeric, 1)
        ELSE 0::numeric
    END AS hours_utilization_pct
FROM cases c
LEFT JOIN (
    SELECT case_finances.case_id,
        COALESCE(sum(case_finances.hours), 0::numeric) AS consumed_hours,
        COALESCE(sum(
            CASE
                WHEN case_finances.finance_type = ANY (ARRAY['expense'::text, 'time'::text]) THEN case_finances.amount
                ELSE 0::numeric
            END), 0::numeric) AS consumed_dollars
    FROM case_finances
    WHERE case_finances.status IS NULL OR case_finances.status <> 'rejected'::text
    GROUP BY case_finances.case_id
) cf_agg ON cf_agg.case_id = c.id;