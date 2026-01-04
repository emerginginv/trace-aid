-- Add external reference columns to existing tables for import tracking

-- Accounts (Clients)
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_external_id ON public.accounts(external_record_id) WHERE external_record_id IS NOT NULL;

-- Contacts
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON public.contacts(external_record_id) WHERE external_record_id IS NOT NULL;

-- Cases
ALTER TABLE public.cases 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cases_external_id ON public.cases(external_record_id) WHERE external_record_id IS NOT NULL;

-- Case Subjects
ALTER TABLE public.case_subjects 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_subjects_external_id ON public.case_subjects(external_record_id) WHERE external_record_id IS NOT NULL;

-- Case Updates
ALTER TABLE public.case_updates 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_updates_external_id ON public.case_updates(external_record_id) WHERE external_record_id IS NOT NULL;

-- Case Activities
ALTER TABLE public.case_activities 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_activities_external_id ON public.case_activities(external_record_id) WHERE external_record_id IS NOT NULL;

-- Case Finances (Time Entries + Expenses)
ALTER TABLE public.case_finances 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_finances_external_id ON public.case_finances(external_record_id) WHERE external_record_id IS NOT NULL;

-- Case Budget Adjustments
ALTER TABLE public.case_budget_adjustments 
  ADD COLUMN IF NOT EXISTS external_record_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_budget_adjustments_external_id ON public.case_budget_adjustments(external_record_id) WHERE external_record_id IS NOT NULL;