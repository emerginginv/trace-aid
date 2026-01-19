-- Fix the seed_default_subject_types function to handle duplicates gracefully
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
    (NEW.id, 'person', 'Unknown', 'unknown', 'HelpCircle', '#6b7280', 5)
  ON CONFLICT (organization_id, category, code) DO NOTHING;

  -- Vehicle types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'vehicle', 'Car', 'car', 'Car', '#3b82f6', 0),
    (NEW.id, 'vehicle', 'Truck', 'truck', 'Truck', '#10b981', 1),
    (NEW.id, 'vehicle', 'Motorcycle', 'motorcycle', 'Bike', '#f59e0b', 2),
    (NEW.id, 'vehicle', 'Commercial', 'commercial', 'Bus', '#8b5cf6', 3),
    (NEW.id, 'vehicle', 'Other', 'other', 'CircleHelp', '#6b7280', 4)
  ON CONFLICT (organization_id, category, code) DO NOTHING;

  -- Location types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'location', 'Residential', 'residential', 'Home', '#3b82f6', 0),
    (NEW.id, 'location', 'Commercial', 'commercial', 'Building2', '#10b981', 1),
    (NEW.id, 'location', 'Medical', 'medical', 'Hospital', '#ef4444', 2),
    (NEW.id, 'location', 'Public', 'public', 'MapPin', '#f59e0b', 3),
    (NEW.id, 'location', 'Unknown', 'unknown', 'HelpCircle', '#6b7280', 4)
  ON CONFLICT (organization_id, category, code) DO NOTHING;

  -- Item types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'item', 'Phone', 'phone', 'Smartphone', '#3b82f6', 0),
    (NEW.id, 'item', 'Device', 'device', 'Laptop', '#8b5cf6', 1),
    (NEW.id, 'item', 'Bag', 'bag', 'Briefcase', '#10b981', 2),
    (NEW.id, 'item', 'Clothing', 'clothing', 'Shirt', '#f59e0b', 3),
    (NEW.id, 'item', 'Document', 'document', 'FileText', '#06b6d4', 4),
    (NEW.id, 'item', 'Tool', 'tool', 'Wrench', '#6b7280', 5),
    (NEW.id, 'item', 'Other', 'other', 'Package', '#9ca3af', 6)
  ON CONFLICT (organization_id, category, code) DO NOTHING;

  -- Business types
  INSERT INTO subject_types (organization_id, category, name, code, icon, color, display_order) VALUES
    (NEW.id, 'business', 'Insurance Company', 'insurance_company', 'Shield', '#3b82f6', 0),
    (NEW.id, 'business', 'Law Firm', 'law_firm', 'Scale', '#8b5cf6', 1),
    (NEW.id, 'business', 'Hospital', 'hospital', 'Hospital', '#ef4444', 2),
    (NEW.id, 'business', 'Employer', 'employer', 'Building', '#10b981', 3),
    (NEW.id, 'business', 'Other', 'other', 'Store', '#6b7280', 4)
  ON CONFLICT (organization_id, category, code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;