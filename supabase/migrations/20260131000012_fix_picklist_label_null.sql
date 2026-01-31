-- Migration to fix the picklists label null constraint
-- The app uses 'value' but the DB has a NOT NULL 'label' field

-- 1. Make 'label' nullable since the app doesn't send it anymore
ALTER TABLE public.picklists ALTER COLUMN label DROP NOT NULL;

-- 2. Update the sync function to also handle 'label' from 'value'
CREATE OR REPLACE FUNCTION public.sync_picklist_type_category()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync 'category' and 'type' (legacy fix)
    IF (NEW.type IS NOT NULL AND NEW.category IS NULL) THEN
        NEW.category := NEW.type;
    ELSIF (NEW.category IS NOT NULL AND NEW.type IS NULL) THEN
        NEW.type := NEW.category;
    END IF;

    -- Sync 'label' and 'value' if one is missing
    IF (NEW.value IS NOT NULL AND NEW.label IS NULL) THEN
        NEW.label := NEW.value;
    ELSIF (NEW.label IS NOT NULL AND NEW.value IS NULL) THEN
        NEW.value := NEW.label;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Sync existing data for records with missing labels
UPDATE public.picklists SET label = value WHERE label IS NULL AND value IS NOT NULL;
UPDATE public.picklists SET value = label WHERE value IS NULL AND label IS NOT NULL;

COMMENT ON COLUMN public.picklists.label IS 'Display name for the picklist item. Synchronized with "value" if not provided.';
