-- Create report_instances table for storing generated reports
CREATE TABLE IF NOT EXISTS public.report_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  
  -- Report metadata
  title text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Input snapshot (for determinism verification)
  input_hash text NOT NULL,
  
  -- Rendered content (read-only snapshot)
  rendered_html text NOT NULL,
  rendered_sections jsonb NOT NULL,
  
  -- Source data snapshots (for audit/reference)
  org_profile_snapshot jsonb NOT NULL,
  case_variables_snapshot jsonb NOT NULL,
  template_snapshot jsonb NOT NULL,
  
  -- Export tracking
  export_format text,
  exported_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_report_instances_org_id ON report_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_case_id ON report_instances(case_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_template_id ON report_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_generated_at ON report_instances(generated_at DESC);

-- Enable Row Level Security
ALTER TABLE report_instances ENABLE ROW LEVEL SECURITY;

-- RLS policies - Reports are viewable by org members
CREATE POLICY "Users can view org reports"
  ON report_instances FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Users can create reports in their org
CREATE POLICY "Users can create reports"
  ON report_instances FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- No UPDATE policy - reports are immutable
-- No DELETE policy - reports are permanent records