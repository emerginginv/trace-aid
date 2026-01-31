-- Migration to fix case_status_categories schema
-- Adds sort_order column required by the application

ALTER TABLE public.case_status_categories 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Sync sort_order with display_order if display_order exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_status_categories' AND column_name='display_order') THEN
        UPDATE public.case_status_categories SET sort_order = display_order WHERE sort_order = 0;
    END IF;
END $$;

COMMENT ON COLUMN public.case_status_categories.sort_order IS 'Directional order for displaying categories in the UI.';
