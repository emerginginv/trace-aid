-- Create AI Import Sessions table for tracking AI-guided imports
CREATE TABLE public.ai_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_system text,
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'analyzing', 'reviewed', 'importing', 'completed', 'failed')),
  files_metadata jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis jsonb,
  user_mappings jsonb,
  user_exclusions jsonb,
  import_batch_id uuid REFERENCES import_batches(id),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.ai_import_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for organization members
CREATE POLICY "Users can view their org AI import sessions"
  ON public.ai_import_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = ai_import_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create AI import sessions in their org"
  ON public.ai_import_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = ai_import_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own AI import sessions"
  ON public.ai_import_sessions
  FOR UPDATE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = ai_import_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own AI import sessions"
  ON public.ai_import_sessions
  FOR DELETE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = ai_import_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_ai_import_sessions_updated_at
  BEFORE UPDATE ON public.ai_import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_ai_import_sessions_organization ON public.ai_import_sessions(organization_id);
CREATE INDEX idx_ai_import_sessions_user ON public.ai_import_sessions(user_id);
CREATE INDEX idx_ai_import_sessions_status ON public.ai_import_sessions(status);