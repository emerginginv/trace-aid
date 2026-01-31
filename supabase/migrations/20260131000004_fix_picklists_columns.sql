-- Migration to align picklists table with application requirements
-- This fixes the error: Could not find the 'color' column of 'picklists'

-- First, check if columns exist and add them
ALTER TABLE public.picklists 
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS status_type text,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tag text;

-- If 'category' exists and 'type' is empty, we might want to migrate data
-- But based on the error, the application is trying to INSERT/SELECT 'type'
-- Let's make sure 'type' is NOT NULL if that's what's expected, but start with nullable for safety
-- The types.ts says type is string (not null) in Row.

-- If we have category but not type, copy category to type
UPDATE public.picklists SET type = category WHERE type IS NULL AND category IS NOT NULL;

-- Remove columns that are no longer in types.ts (optional, but keep for now to avoid data loss)
-- label, description, is_default, parent_id, metadata

-- Update existing records to have a user_id if needed (though organization-wide picklists might not have one)
-- RLS should be handled but we're focusing on the schema error first.

COMMENT ON COLUMN public.picklists.type IS 'The category or type of picklist (e.g., case_status, priority).';
COMMENT ON COLUMN public.picklists.color IS 'hex color code for UI display.';
