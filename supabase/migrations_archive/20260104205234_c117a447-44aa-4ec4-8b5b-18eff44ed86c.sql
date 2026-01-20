-- Add mapping and normalization columns to import_batches
ALTER TABLE public.import_batches
ADD COLUMN IF NOT EXISTS mapping_config jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source_system_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS normalization_log jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.import_batches.mapping_config IS 'Type mappings configuration used for this batch (update types, event types)';
COMMENT ON COLUMN public.import_batches.source_system_name IS 'Human-readable name of the source system';
COMMENT ON COLUMN public.import_batches.normalization_log IS 'Summary of all normalizations applied during import';

-- Create import_type_mappings table for reusable mapping configurations
CREATE TABLE IF NOT EXISTS public.import_type_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_system text NOT NULL,
  mapping_type text NOT NULL CHECK (mapping_type IN ('update_type', 'event_type')),
  mappings jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_import_type_mappings_org_source 
  ON public.import_type_mappings(organization_id, source_system);

-- Create unique constraint for default mappings per org/source/type
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_type_mappings_default 
  ON public.import_type_mappings(organization_id, source_system, mapping_type) 
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.import_type_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_type_mappings
CREATE POLICY "Users can view mappings in their organization"
  ON public.import_type_mappings
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and managers can create mappings"
  ON public.import_type_mappings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update mappings"
  ON public.import_type_mappings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete mappings"
  ON public.import_type_mappings
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_import_type_mappings_updated_at
  BEFORE UPDATE ON public.import_type_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();