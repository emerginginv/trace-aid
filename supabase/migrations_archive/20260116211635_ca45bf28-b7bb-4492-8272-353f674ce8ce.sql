-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Create case_finances_view for backwards compatibility
-- ═══════════════════════════════════════════════════════════════════════════════
-- This view provides a unified interface combining time_entries and expense_entries
-- with the same column structure as the deprecated case_finances table.
-- This enables gradual migration of code without breaking existing queries.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.case_finances_view AS
SELECT 
  te.id,
  te.case_id,
  te.user_id,
  te.organization_id,
  'time' as finance_type,
  te.created_at::date as date,
  te.hours,
  te.rate as hourly_rate,
  te.total as amount,
  1 as quantity,
  te.rate as unit_price,
  te.item_type as category,
  te.status::text as status,
  te.notes,
  NULL::text as description,
  te.event_id as activity_id,
  te.update_id,
  te.finance_item_id,
  te.invoice_rate,
  te.created_at,
  te.updated_at,
  NULL::uuid as subject_id,
  NULL::uuid as account_id,
  NULL::uuid as invoice_id,
  NULL::uuid as case_service_instance_id,
  false as invoiced,
  NULL::text as billing_type,
  NULL::text as pricing_model,
  NULL::jsonb as pricing_snapshot,
  NULL::uuid as expense_user_id
FROM public.time_entries te

UNION ALL

SELECT 
  ee.id,
  ee.case_id,
  ee.user_id,
  ee.organization_id,
  'expense' as finance_type,
  ee.created_at::date as date,
  NULL as hours,
  ee.rate as hourly_rate,
  ee.total as amount,
  ee.quantity,
  ee.rate as unit_price,
  ee.item_type as category,
  ee.status::text as status,
  ee.notes,
  NULL::text as description,
  ee.event_id as activity_id,
  ee.update_id,
  ee.finance_item_id,
  ee.invoice_rate,
  ee.created_at,
  ee.updated_at,
  NULL::uuid as subject_id,
  NULL::uuid as account_id,
  NULL::uuid as invoice_id,
  NULL::uuid as case_service_instance_id,
  false as invoiced,
  NULL::text as billing_type,
  NULL::text as pricing_model,
  NULL::jsonb as pricing_snapshot,
  NULL::uuid as expense_user_id
FROM public.expense_entries ee;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.case_finances_view IS 'Unified view combining time_entries and expense_entries for backwards compatibility during migration from deprecated case_finances table';