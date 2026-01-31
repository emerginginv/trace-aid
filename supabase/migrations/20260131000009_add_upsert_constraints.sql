-- Migration to add unique constraints for upsert operations
-- Fixes error: there is no unique or exclusion constraint matching the ON CONFLICT specification for case_status_categories

-- Add unique constraint to case_status_categories
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='case_status_categories_org_id_name_key') THEN
        ALTER TABLE public.case_status_categories 
        ADD CONSTRAINT case_status_categories_org_id_name_key UNIQUE (organization_id, name);
    END IF;
END $$;

-- Proactively add unique constraint to case_statuses as well
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='case_statuses_org_id_name_key') THEN
        ALTER TABLE public.case_statuses 
        ADD CONSTRAINT case_statuses_org_id_name_key UNIQUE (organization_id, name);
    END IF;
END $$;

-- Proactively add unique constraint to picklists (type and value)
-- Note: we renamed category to type in a previous migration or the app expects 'type'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='picklists_org_id_type_value_key') THEN
        ALTER TABLE public.picklists 
        ADD CONSTRAINT picklists_org_id_type_value_key UNIQUE (organization_id, type, value);
    END IF;
END $$;

COMMENT ON CONSTRAINT case_status_categories_org_id_name_key ON public.case_status_categories IS 'Ensures category names are unique within an organization, required for upsert logic.';
