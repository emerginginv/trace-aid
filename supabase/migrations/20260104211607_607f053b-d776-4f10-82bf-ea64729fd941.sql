-- ============================================
-- Import Execution Engine Tables
-- ============================================

-- Create import_logs table for event-based timeline tracking
CREATE TABLE public.import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text,
  external_record_id text,
  message text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_logs
CREATE POLICY "Admins can manage import logs"
  ON public.import_logs
  FOR ALL
  USING (
    batch_id IN (
      SELECT id FROM import_batches
      WHERE is_org_member(auth.uid(), organization_id) 
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    batch_id IN (
      SELECT id FROM import_batches
      WHERE is_org_member(auth.uid(), organization_id) 
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Users can view import logs for their org batches"
  ON public.import_logs
  FOR SELECT
  USING (
    batch_id IN (
      SELECT id FROM import_batches
      WHERE is_org_member(auth.uid(), organization_id)
    )
  );

-- Create indexes for import_logs
CREATE INDEX idx_import_logs_batch_id ON public.import_logs(batch_id);
CREATE INDEX idx_import_logs_event_type ON public.import_logs(event_type);
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at);

-- ============================================
-- Import Errors Table
-- ============================================

CREATE TABLE public.import_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  record_id uuid REFERENCES public.import_records(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  external_record_id text,
  error_code text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_errors
CREATE POLICY "Admins can manage import errors"
  ON public.import_errors
  FOR ALL
  USING (
    batch_id IN (
      SELECT id FROM import_batches
      WHERE is_org_member(auth.uid(), organization_id) 
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    batch_id IN (
      SELECT id FROM import_batches
      WHERE is_org_member(auth.uid(), organization_id) 
        AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Users can view import errors for their org batches"
  ON public.import_errors
  FOR SELECT
  USING (
    batch_id IN (
      SELECT id FROM import_batches
      WHERE is_org_member(auth.uid(), organization_id)
    )
  );

-- Create indexes for import_errors
CREATE INDEX idx_import_errors_batch_id ON public.import_errors(batch_id);
CREATE INDEX idx_import_errors_error_code ON public.import_errors(error_code);

-- ============================================
-- Add Import Tracking Columns to Entity Tables
-- ============================================

-- Add columns to accounts table
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to contacts table
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to cases table
ALTER TABLE public.cases 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to case_subjects table
ALTER TABLE public.case_subjects 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to case_updates table
ALTER TABLE public.case_updates 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to case_activities table
ALTER TABLE public.case_activities 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to case_finances table
ALTER TABLE public.case_finances 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Add columns to case_budget_adjustments table
ALTER TABLE public.case_budget_adjustments 
  ADD COLUMN IF NOT EXISTS external_system_name text,
  ADD COLUMN IF NOT EXISTS import_timestamp timestamp with time zone;

-- Create indexes for efficient querying by import batch
CREATE INDEX IF NOT EXISTS idx_accounts_import_batch ON public.accounts(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_import_batch ON public.contacts(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_import_batch ON public.cases(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_subjects_import_batch ON public.case_subjects(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_updates_import_batch ON public.case_updates(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_activities_import_batch ON public.case_activities(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_finances_import_batch ON public.case_finances(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_budget_adjustments_import_batch ON public.case_budget_adjustments(import_batch_id) WHERE import_batch_id IS NOT NULL;