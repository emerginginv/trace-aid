-- =====================================================
-- FUTURE-READY HOOKS: Reserved columns for planned features
-- DO NOT IMPLEMENT - These are placeholders only
-- =====================================================

-- ===================
-- 1. BUDGET LINKAGE
-- ===================
ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  budget_category TEXT DEFAULT NULL;
  -- FUTURE: 'hourly' | 'fixed' | 'expense'

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  default_budget_amount NUMERIC DEFAULT NULL;
  -- FUTURE: default hours or dollars per service

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  budget_unit TEXT DEFAULT NULL;
  -- FUTURE: 'hours' | 'dollars'

-- ===================
-- 2. BILLING LINKAGE
-- ===================
ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  billing_code TEXT DEFAULT NULL;
  -- FUTURE: GL code or billing category

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  default_rate NUMERIC DEFAULT NULL;
  -- FUTURE: hourly rate or fixed fee

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  is_billable BOOLEAN DEFAULT TRUE;
  -- FUTURE: whether service generates invoice line

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  billing_description_template TEXT DEFAULT NULL;
  -- FUTURE: template for invoice line description

-- Reserved FK for instance-level billing
ALTER TABLE case_service_instances ADD COLUMN IF NOT EXISTS 
  invoice_line_item_id UUID DEFAULT NULL;
  -- FUTURE: FK to invoice_line_items when billing is implemented

-- =============================
-- 3. REPORT SECTION MAPPING
-- =============================
ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  report_section_id TEXT DEFAULT NULL;
  -- FUTURE: section key for report templates

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  report_section_order INTEGER DEFAULT NULL;
  -- FUTURE: order within report section

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  report_template_fields JSONB DEFAULT NULL;
  -- FUTURE: field mappings for report generation

-- =============================
-- 4. ANALYTICS BY SERVICE TYPE
-- =============================
ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  analytics_category TEXT DEFAULT NULL;
  -- FUTURE: grouping for analytics dashboards

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  track_duration BOOLEAN DEFAULT TRUE;
  -- FUTURE: whether to track time spent on service

ALTER TABLE case_services ADD COLUMN IF NOT EXISTS 
  track_outcomes BOOLEAN DEFAULT FALSE;
  -- FUTURE: whether to track success/failure metrics

-- Add comment to table documenting future hooks
COMMENT ON TABLE case_services IS 'Case services with reserved columns for future budget, billing, reporting, and analytics integrations';