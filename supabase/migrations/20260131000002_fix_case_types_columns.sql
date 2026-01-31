-- Migration to add missing columns to case_types table
-- This fixes the error: column case_types.allow_on_public_form does not exist

ALTER TABLE public.case_types 
ADD COLUMN IF NOT EXISTS allow_on_public_form boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_case_flags text[],
ADD COLUMN IF NOT EXISTS allowed_template_ids uuid[],
ADD COLUMN IF NOT EXISTS budget_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS default_due_days integer,
ADD COLUMN IF NOT EXISTS due_date_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reference_label_1 text,
ADD COLUMN IF NOT EXISTS reference_label_2 text,
ADD COLUMN IF NOT EXISTS reference_label_3 text;

-- Add comment explaining the fix
COMMENT ON COLUMN public.case_types.allow_on_public_form IS 'Determines if this case type is available to be selected on public intake forms.';
