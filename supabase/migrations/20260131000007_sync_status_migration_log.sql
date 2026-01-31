-- Migration to fix case_status_migration_log schema
-- The existing table has a different structure than what the app expects

ALTER TABLE public.case_status_migration_log 
ADD COLUMN IF NOT EXISTS migration_step text,
ADD COLUMN IF NOT EXISTS records_affected integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS executed_by uuid REFERENCES auth.users(id);

-- If migration_step is null (for old records), fill it with migration_batch
UPDATE public.case_status_migration_log 
SET migration_step = migration_batch, started_at = created_at 
WHERE migration_step IS NULL;

-- Make migration_step NOT NULL after backfill
ALTER TABLE public.case_status_migration_log ALTER COLUMN migration_step SET NOT NULL;

COMMENT ON TABLE public.case_status_migration_log IS 'Logs for status migration steps and batches.';
