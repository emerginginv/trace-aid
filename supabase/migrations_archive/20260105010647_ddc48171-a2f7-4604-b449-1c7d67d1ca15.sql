-- Create attachment_preview_logs table for compliance tracking
CREATE TABLE public.attachment_preview_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'case',
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  preview_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_preview_logs_attachment ON attachment_preview_logs(attachment_id);
CREATE INDEX idx_preview_logs_user ON attachment_preview_logs(user_id);
CREATE INDEX idx_preview_logs_org_created ON attachment_preview_logs(organization_id, created_at DESC);

-- RLS policies
ALTER TABLE attachment_preview_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own preview logs
CREATE POLICY "Users can log their own previews"
  ON attachment_preview_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view logs for their organization
CREATE POLICY "Users can view org preview logs"
  ON attachment_preview_logs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));