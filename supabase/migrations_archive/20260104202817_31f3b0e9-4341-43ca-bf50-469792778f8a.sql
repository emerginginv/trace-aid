-- Import Batches: tracks each import operation
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')),
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Import Records: individual records within a batch
CREATE TABLE public.import_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'contact', 'case', 'subject', 'update', 'activity', 'time_entry', 'expense', 'budget_adjustment')),
  external_record_id TEXT NOT NULL,
  source_data JSONB NOT NULL,
  casewyze_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'imported', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for import_batches
CREATE INDEX idx_import_batches_org ON public.import_batches(organization_id);
CREATE INDEX idx_import_batches_status ON public.import_batches(status);

-- Indexes for import_records
CREATE INDEX idx_import_records_batch ON public.import_records(batch_id);
CREATE INDEX idx_import_records_entity_external ON public.import_records(entity_type, external_record_id);
CREATE INDEX idx_import_records_status ON public.import_records(status);

-- Enable RLS
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_batches
CREATE POLICY "Users can view import batches in their organization"
  ON public.import_batches FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage import batches"
  ON public.import_batches FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for import_records
CREATE POLICY "Users can view import records for their org batches"
  ON public.import_records FOR SELECT
  USING (batch_id IN (
    SELECT id FROM public.import_batches WHERE is_org_member(auth.uid(), organization_id)
  ));

CREATE POLICY "Admins can manage import records"
  ON public.import_records FOR ALL
  USING (batch_id IN (
    SELECT id FROM public.import_batches 
    WHERE is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role)
  ))
  WITH CHECK (batch_id IN (
    SELECT id FROM public.import_batches 
    WHERE is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role)
  ));