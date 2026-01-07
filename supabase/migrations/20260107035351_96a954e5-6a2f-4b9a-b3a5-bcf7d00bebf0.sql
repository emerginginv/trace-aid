-- Add state metadata column to document_instances
ALTER TABLE document_instances 
ADD COLUMN IF NOT EXISTS state_code TEXT;

-- Add index for state-based queries
CREATE INDEX IF NOT EXISTS idx_document_instances_state 
ON document_instances(state_code) WHERE state_code IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN document_instances.state_code IS 
  'State code for records requests (e.g., CA, TX). NULL for non-state-specific documents.';

-- Table to track all exports as derived artifacts
CREATE TABLE document_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_instance_id UUID NOT NULL REFERENCES document_instances(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Export metadata
  export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'docx', 'html', 'print')),
  filename TEXT NOT NULL,
  
  -- PDF storage (derived artifact)
  storage_path TEXT,
  file_size_bytes INTEGER,
  content_hash TEXT,
  
  -- Audit trail
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_by_ip TEXT
);

-- RLS policies
ALTER TABLE document_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exports in their organization"
ON document_exports FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create exports for documents in their organization"
ON document_exports FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_document_exports_document ON document_exports(document_instance_id);
CREATE INDEX idx_document_exports_org ON document_exports(organization_id);
CREATE INDEX idx_document_exports_user ON document_exports(user_id);
CREATE INDEX idx_document_exports_date ON document_exports(exported_at);

-- Create storage bucket for PDF artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-exports', 'document-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY "Users can view their organization document exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'document-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload document exports to their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM organization_members 
    WHERE user_id = auth.uid()
  )
);