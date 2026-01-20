-- Drop the existing subject_types table and recreate with correct structure
DROP TABLE IF EXISTS subject_types CASCADE;

-- Create subject_types table with category column
-- Categories are hardcoded (person, vehicle, location, item, business)
-- Types are configurable per category
CREATE TABLE public.subject_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Which hardcoded category this type belongs to
  category TEXT NOT NULL CHECK (category IN ('person', 'vehicle', 'location', 'item', 'business')),
  
  -- The configurable type name
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  
  -- Display settings
  icon TEXT DEFAULT 'Circle',
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: no duplicate codes per org+category
  UNIQUE(organization_id, category, code)
);

-- Enable RLS
ALTER TABLE public.subject_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view subject types in their organization"
  ON public.subject_types FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage subject types"
  ON public.subject_types FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create function to seed default subject types for new organizations
CREATE OR REPLACE FUNCTION seed_default_subject_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Person types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'person', 'Claimant', 'claimant', 'User', '#3b82f6', 0),
    (NEW.id, 'person', 'Subject', 'subject', 'UserSearch', '#8b5cf6', 1),
    (NEW.id, 'person', 'Witness', 'witness', 'Eye', '#10b981', 2),
    (NEW.id, 'person', 'Associate', 'associate', 'Users', '#f59e0b', 3),
    (NEW.id, 'person', 'Investigator', 'investigator', 'Search', '#06b6d4', 4),
    (NEW.id, 'person', 'Unknown', 'unknown', 'HelpCircle', '#6b7280', 5);

  -- Vehicle types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'vehicle', 'Car', 'car', 'Car', '#3b82f6', 0),
    (NEW.id, 'vehicle', 'Truck', 'truck', 'Truck', '#10b981', 1),
    (NEW.id, 'vehicle', 'Motorcycle', 'motorcycle', 'Bike', '#f59e0b', 2),
    (NEW.id, 'vehicle', 'Commercial', 'commercial', 'Bus', '#8b5cf6', 3),
    (NEW.id, 'vehicle', 'Other', 'other', 'CircleHelp', '#6b7280', 4);

  -- Location types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'location', 'Residential', 'residential', 'Home', '#3b82f6', 0),
    (NEW.id, 'location', 'Commercial', 'commercial', 'Building2', '#10b981', 1),
    (NEW.id, 'location', 'Medical', 'medical', 'Hospital', '#ef4444', 2),
    (NEW.id, 'location', 'Public', 'public', 'MapPin', '#f59e0b', 3),
    (NEW.id, 'location', 'Unknown', 'unknown', 'HelpCircle', '#6b7280', 4);

  -- Item types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'item', 'Phone', 'phone', 'Smartphone', '#3b82f6', 0),
    (NEW.id, 'item', 'Device', 'device', 'Laptop', '#8b5cf6', 1),
    (NEW.id, 'item', 'Bag', 'bag', 'Briefcase', '#10b981', 2),
    (NEW.id, 'item', 'Clothing', 'clothing', 'Shirt', '#f59e0b', 3),
    (NEW.id, 'item', 'Document', 'document', 'FileText', '#06b6d4', 4),
    (NEW.id, 'item', 'Tool', 'tool', 'Wrench', '#6b7280', 5),
    (NEW.id, 'item', 'Other', 'other', 'Package', '#9ca3af', 6);

  -- Business types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'business', 'Insurance Company', 'insurance_company', 'Shield', '#3b82f6', 0),
    (NEW.id, 'business', 'Law Firm', 'law_firm', 'Scale', '#8b5cf6', 1),
    (NEW.id, 'business', 'Hospital', 'hospital', 'Hospital', '#ef4444', 2),
    (NEW.id, 'business', 'Employer', 'employer', 'Building', '#10b981', 3),
    (NEW.id, 'business', 'Other', 'other', 'Store', '#6b7280', 4);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to seed subject types for new organizations
DROP TRIGGER IF EXISTS seed_subject_types_on_org_create ON organizations;
CREATE TRIGGER seed_subject_types_on_org_create
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_subject_types();

-- Seed subject types for existing organizations
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'person', 'Claimant', 'claimant', 'User', '#3b82f6', 0 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'person', 'Subject', 'subject', 'UserSearch', '#8b5cf6', 1 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'person', 'Witness', 'witness', 'Eye', '#10b981', 2 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'person', 'Associate', 'associate', 'Users', '#f59e0b', 3 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'person', 'Investigator', 'investigator', 'Search', '#06b6d4', 4 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'person', 'Unknown', 'unknown', 'HelpCircle', '#6b7280', 5 FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'vehicle', 'Car', 'car', 'Car', '#3b82f6', 0 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'vehicle', 'Truck', 'truck', 'Truck', '#10b981', 1 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'vehicle', 'Motorcycle', 'motorcycle', 'Bike', '#f59e0b', 2 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'vehicle', 'Commercial', 'commercial', 'Bus', '#8b5cf6', 3 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'vehicle', 'Other', 'other', 'CircleHelp', '#6b7280', 4 FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'location', 'Residential', 'residential', 'Home', '#3b82f6', 0 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'location', 'Commercial', 'commercial', 'Building2', '#10b981', 1 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'location', 'Medical', 'medical', 'Hospital', '#ef4444', 2 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'location', 'Public', 'public', 'MapPin', '#f59e0b', 3 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'location', 'Unknown', 'unknown', 'HelpCircle', '#6b7280', 4 FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Phone', 'phone', 'Smartphone', '#3b82f6', 0 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Device', 'device', 'Laptop', '#8b5cf6', 1 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Bag', 'bag', 'Briefcase', '#10b981', 2 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Clothing', 'clothing', 'Shirt', '#f59e0b', 3 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Document', 'document', 'FileText', '#06b6d4', 4 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Tool', 'tool', 'Wrench', '#6b7280', 5 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'item', 'Other', 'other', 'Package', '#9ca3af', 6 FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'business', 'Insurance Company', 'insurance_company', 'Shield', '#3b82f6', 0 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'business', 'Law Firm', 'law_firm', 'Scale', '#8b5cf6', 1 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'business', 'Hospital', 'hospital', 'Hospital', '#ef4444', 2 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'business', 'Employer', 'employer', 'Building', '#10b981', 3 FROM organizations o
ON CONFLICT DO NOTHING;
INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order)
SELECT o.id, 'business', 'Other', 'other', 'Store', '#6b7280', 4 FROM organizations o
ON CONFLICT DO NOTHING;