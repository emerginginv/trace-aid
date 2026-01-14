-- ============================================
-- CASE TYPES TABLE - Central configuration for investigation types
-- ============================================

CREATE TABLE public.case_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Reference Labels (up to 3 custom labels per case type)
  reference_label_1 TEXT,
  reference_label_2 TEXT,
  reference_label_3 TEXT,
  
  -- Budget Strategy
  budget_strategy TEXT DEFAULT 'both' CHECK (budget_strategy IN ('disabled', 'hours_only', 'money_only', 'both')),
  budget_required BOOLEAN DEFAULT false,
  
  -- Default Due Date
  default_due_days INTEGER,
  due_date_required BOOLEAN DEFAULT false,
  
  -- Linked Services (which services are available for this case type)
  allowed_service_ids UUID[] DEFAULT '{}',
  
  -- Linked Subject Types
  allowed_subject_types TEXT[] DEFAULT '{}',
  default_subject_type TEXT,
  
  -- Linked Document Templates
  allowed_template_ids UUID[] DEFAULT '{}',
  
  -- Linked Case Flags
  allowed_case_flags TEXT[] DEFAULT '{}',
  
  -- Public Visibility
  allow_on_public_form BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: name per org
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view case types in their organization"
  ON case_types FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert case types"
  ON case_types FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins can update case types"
  ON case_types FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins can delete case types"
  ON case_types FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Index for organization queries
CREATE INDEX idx_case_types_org ON case_types(organization_id);
CREATE INDEX idx_case_types_active ON case_types(organization_id, is_active);

-- Updated_at trigger
CREATE TRIGGER update_case_types_updated_at
  BEFORE UPDATE ON case_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD case_type_id TO CASES TABLE
-- ============================================
ALTER TABLE cases ADD COLUMN case_type_id UUID REFERENCES case_types(id);
CREATE INDEX idx_cases_case_type_id ON cases(case_type_id);

-- ============================================
-- TRIGGER: Seed default case types for new organizations
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_default_case_types()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO case_types (organization_id, name, tag, description, budget_strategy, display_order, color)
  VALUES 
    (NEW.id, 'Insurance - Workers Comp', 'WC', 'Workers compensation investigations', 'both', 0, '#3b82f6'),
    (NEW.id, 'Insurance - Liability', 'LI', 'General liability investigations', 'both', 1, '#8b5cf6'),
    (NEW.id, 'Domestic', 'DOM', 'Domestic and family matters', 'hours_only', 2, '#ec4899'),
    (NEW.id, 'Corporate', 'CORP', 'Corporate investigations and due diligence', 'both', 3, '#14b8a6'),
    (NEW.id, 'Background Check', 'BG', 'Background investigations', 'money_only', 4, '#f59e0b'),
    (NEW.id, 'General Investigation', 'GEN', 'General investigative work', 'both', 5, '#6366f1');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_seed_default_case_types
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_case_types();

-- ============================================
-- ONE-TIME SEED: Create default case types for existing organization
-- ============================================
DO $$
DECLARE
  v_org_id UUID := 'd76c9a66-790e-445a-a090-817229943cf5';
BEGIN
  INSERT INTO case_types (organization_id, name, tag, description, budget_strategy, display_order, color, reference_label_1, reference_label_2)
  VALUES 
    (v_org_id, 'Insurance - Workers Comp', 'WC', 'Workers compensation claims and investigations', 'both', 0, '#3b82f6', 'Claim Number', 'SIU Number'),
    (v_org_id, 'Insurance - Liability', 'LI', 'General liability investigations', 'both', 1, '#8b5cf6', 'Claim Number', 'Policy Number'),
    (v_org_id, 'Domestic', 'DOM', 'Domestic and family matters', 'hours_only', 2, '#ec4899', 'Client Reference', NULL),
    (v_org_id, 'Corporate', 'CORP', 'Corporate investigations and due diligence', 'both', 3, '#14b8a6', 'Project Number', 'Department'),
    (v_org_id, 'Background Check', 'BG', 'Pre-employment and background investigations', 'money_only', 4, '#f59e0b', 'Applicant ID', NULL),
    (v_org_id, 'General Investigation', 'GEN', 'General investigative work', 'both', 5, '#6366f1', 'Reference Number', NULL)
  ON CONFLICT (organization_id, name) DO NOTHING;
END $$;