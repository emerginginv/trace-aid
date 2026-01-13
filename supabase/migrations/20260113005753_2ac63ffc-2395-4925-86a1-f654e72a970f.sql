-- Create case_service_instances table to track services attached to cases
CREATE TABLE public.case_service_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  case_service_id UUID NOT NULL REFERENCES case_services(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unscheduled',
  scheduled_at TIMESTAMPTZ,
  unscheduled_at TIMESTAMPTZ,
  unscheduled_by UUID REFERENCES profiles(id),
  unscheduled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(case_id, case_service_id),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'unscheduled'))
);

-- Add case_service_instance_id to case_activities to link activities to service instances
ALTER TABLE case_activities 
ADD COLUMN case_service_instance_id UUID REFERENCES case_service_instances(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE case_service_instances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view case service instances in their organization"
  ON case_service_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert case service instances in their organization"
  ON case_service_instances FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update case service instances in their organization"
  ON case_service_instances FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete case service instances in their organization"
  ON case_service_instances FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_case_service_instances_updated_at
  BEFORE UPDATE ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_case_service_instances_case_id ON case_service_instances(case_id);
CREATE INDEX idx_case_service_instances_status ON case_service_instances(status);
CREATE INDEX idx_case_service_instances_org_id ON case_service_instances(organization_id);