-- Migration to fix case_status_triggers schema and relationships
-- This fixes the PGRST200 error for case_status_triggers join

-- Add missing columns or rename if necessary
ALTER TABLE public.case_status_triggers 
ADD COLUMN IF NOT EXISTS target_status_id uuid REFERENCES public.case_statuses(id),
ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_override_manual boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS workflow text DEFAULT 'standard';

-- Sync target_status_id from to_status_id if to_status_id exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_status_triggers' AND column_name='to_status_id') THEN
        UPDATE public.case_status_triggers SET target_status_id = to_status_id WHERE target_status_id IS NULL;
    END IF;
END $$;

-- Add foreign key constraint if not already present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='case_status_triggers_target_status_id_fkey') THEN
        ALTER TABLE public.case_status_triggers 
        ADD CONSTRAINT case_status_triggers_target_status_id_fkey 
        FOREIGN KEY (target_status_id) REFERENCES public.case_statuses(id);
    END IF;
END $$;

-- Add foreign key for created_by
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='case_status_triggers_created_by_fkey') THEN
        ALTER TABLE public.case_status_triggers 
        ADD CONSTRAINT case_status_triggers_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id);
    END IF;
END $$;

-- Fix enabled column if it was misnamed as is_active
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_status_triggers' AND column_name='is_active') THEN
        UPDATE public.case_status_triggers SET enabled = is_active WHERE enabled IS TRUE;
    END IF;
END $$;

COMMENT ON COLUMN public.case_status_triggers.target_status_id IS 'The status to transition to when the trigger event occurs.';
COMMENT ON COLUMN public.case_status_triggers.workflow IS 'The workflow identifier this trigger belongs to (e.g., standard).';
