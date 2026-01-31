-- Migration to add missing columns to case_services table
-- This proactively fixes potential errors related to missing columns in case_services

ALTER TABLE public.case_services 
ADD COLUMN IF NOT EXISTS allow_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_category text,
ADD COLUMN IF NOT EXISTS billing_code text,
ADD COLUMN IF NOT EXISTS billing_description_template text,
ADD COLUMN IF NOT EXISTS budget_category text,
ADD COLUMN IF NOT EXISTS budget_unit text DEFAULT 'dollars',
ADD COLUMN IF NOT EXISTS case_types text[],
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS default_budget_amount numeric,
ADD COLUMN IF NOT EXISTS default_duration_minutes integer,
ADD COLUMN IF NOT EXISTS report_section_id uuid,
ADD COLUMN IF NOT EXISTS report_section_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS report_template_fields jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS requires_scheduling boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_mode text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS track_duration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS track_outcomes boolean DEFAULT false;

-- Add comment explaining the fix
COMMENT ON COLUMN public.case_services.budget_category IS 'Category used for budget tracking and reporting.';
