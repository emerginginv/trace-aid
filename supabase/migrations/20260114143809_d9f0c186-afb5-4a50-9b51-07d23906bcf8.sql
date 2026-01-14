-- ============================================
-- SUBJECT TYPES CONFIGURATION TABLE
-- Organization-wide configurable subject types
-- ============================================

-- Create subject_types table
CREATE TABLE public.subject_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Person", "Vehicle", "Location", "Item", "Business"
  code TEXT NOT NULL,                    -- Internal code: "person", "vehicle", "location", "item", "business"
  description TEXT,                      -- Optional description
  icon TEXT DEFAULT 'user',              -- Icon name (lucide icon)
  color TEXT DEFAULT '#6366f1',          -- Color for UI display
  is_active BOOLEAN DEFAULT true,        -- Active/Inactive toggle
  display_order INTEGER DEFAULT 0,       -- For ordering in UI
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint per organization
  CONSTRAINT unique_subject_type_name UNIQUE (organization_id, name),
  CONSTRAINT unique_subject_type_code UNIQUE (organization_id, code)
);

-- Enable RLS
ALTER TABLE public.subject_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view subject types in their organization"
  ON subject_types FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage subject types"
  ON subject_types FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Index for organization queries
CREATE INDEX idx_subject_types_org ON subject_types(organization_id);
CREATE INDEX idx_subject_types_code ON subject_types(organization_id, code);

-- ============================================
-- TRIGGER: Seed default subject types for new organizations
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_default_subject_types()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subject_types (organization_id, name, code, description, icon, display_order)
  VALUES 
    (NEW.id, 'Person', 'person', 'Individual subjects of investigation', 'user', 0),
    (NEW.id, 'Vehicle', 'vehicle', 'Cars, trucks, motorcycles, and other vehicles', 'car', 1),
    (NEW.id, 'Location', 'location', 'Addresses, properties, and places of interest', 'map-pin', 2),
    (NEW.id, 'Item', 'item', 'Physical evidence and objects', 'package', 3),
    (NEW.id, 'Business', 'business', 'Companies, organizations, and entities', 'building-2', 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_seed_default_subject_types
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_subject_types();

-- ============================================
-- ONE-TIME: Seed default subject types for existing organizations
-- ============================================
INSERT INTO subject_types (organization_id, name, code, description, icon, display_order)
SELECT 
  o.id,
  s.name,
  s.code,
  s.description,
  s.icon,
  s.display_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Person', 'person', 'Individual subjects of investigation', 'user', 0),
    ('Vehicle', 'vehicle', 'Cars, trucks, motorcycles, and other vehicles', 'car', 1),
    ('Location', 'location', 'Addresses, properties, and places of interest', 'map-pin', 2),
    ('Item', 'item', 'Physical evidence and objects', 'package', 3),
    ('Business', 'business', 'Companies, organizations, and entities', 'building-2', 4)
) AS s(name, code, description, icon, display_order)
ON CONFLICT (organization_id, code) DO NOTHING;

-- ============================================
-- Add subject_type_id to case_subjects (optional FK, preserves legacy data)
-- ============================================
ALTER TABLE case_subjects ADD COLUMN IF NOT EXISTS subject_type_id UUID REFERENCES subject_types(id);

-- Create index for subject_type_id
CREATE INDEX IF NOT EXISTS idx_case_subjects_type_id ON case_subjects(subject_type_id);

-- ============================================
-- Update timestamp trigger
-- ============================================
CREATE TRIGGER update_subject_types_updated_at
  BEFORE UPDATE ON subject_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();