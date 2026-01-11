-- Create subject audit log table for court-defensible tracking
CREATE TABLE public.subject_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'restored', 'deleted', 'cover_image_added', 'cover_image_removed', 'profile_image_added', 'profile_image_removed')),
  changes JSONB DEFAULT '{}'::jsonb,
  previous_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_subject_audit_logs_subject_id ON public.subject_audit_logs(subject_id);
CREATE INDEX idx_subject_audit_logs_case_id ON public.subject_audit_logs(case_id);
CREATE INDEX idx_subject_audit_logs_organization_id ON public.subject_audit_logs(organization_id);
CREATE INDEX idx_subject_audit_logs_created_at ON public.subject_audit_logs(created_at DESC);
CREATE INDEX idx_subject_audit_logs_actor ON public.subject_audit_logs(actor_user_id);

-- Enable RLS
ALTER TABLE public.subject_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (immutable - no UPDATE/DELETE for court defensibility)
CREATE POLICY "Users can insert audit logs for their org"
  ON public.subject_audit_logs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    ) AND actor_user_id = auth.uid()
  );

CREATE POLICY "Users can view audit logs for their org"
  ON public.subject_audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Create audit table for social link changes
CREATE TABLE public.subject_social_link_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_link_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  previous_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_social_link_audit_subject ON public.subject_social_link_audit_logs(subject_id);
CREATE INDEX idx_social_link_audit_org ON public.subject_social_link_audit_logs(organization_id);
CREATE INDEX idx_social_link_audit_created_at ON public.subject_social_link_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.subject_social_link_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (immutable - no UPDATE/DELETE)
CREATE POLICY "Users can insert social link audit logs for their org"
  ON public.subject_social_link_audit_logs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    ) AND actor_user_id = auth.uid()
  );

CREATE POLICY "Users can view social link audit logs for their org"
  ON public.subject_social_link_audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );