-- Migration to fix the picklists table schema conflict
-- The app uses 'type' but the DB has a NOT NULL 'category' field

-- 1. Make 'category' nullable since the app doesn't send it anymore
ALTER TABLE public.picklists ALTER COLUMN category DROP NOT NULL;

-- 2. Add a trigger to keep 'category' and 'type' in sync for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_picklist_type_category()
RETURNS TRIGGER AS $$
BEGIN
    -- If 'type' is provided but not 'category', sync it
    IF (NEW.type IS NOT NULL AND NEW.category IS NULL) THEN
        NEW.category := NEW.type;
    -- If 'category' is provided but not 'type', sync it
    ELSIF (NEW.category IS NOT NULL AND NEW.type IS NULL) THEN
        NEW.type := NEW.category;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_picklist_type_category ON public.picklists;
CREATE TRIGGER tr_sync_picklist_type_category
BEFORE INSERT OR UPDATE ON public.picklists
FOR EACH ROW EXECUTE FUNCTION public.sync_picklist_type_category();

-- 3. Sync existing data
UPDATE public.picklists SET category = type WHERE category IS NULL AND type IS NOT NULL;
UPDATE public.picklists SET type = category WHERE type IS NULL AND category IS NOT NULL;

-- 4. Ensure other expected columns are present (from types.ts)
ALTER TABLE public.picklists 
ADD COLUMN IF NOT EXISTS label text;

-- If 'label' is missing but needed by old logic, sync from 'value'
UPDATE public.picklists SET label = value WHERE label IS NULL;

COMMENT ON COLUMN public.picklists.category IS 'Deprecated: use "type" instead. Maintained for backward compatibility.';
