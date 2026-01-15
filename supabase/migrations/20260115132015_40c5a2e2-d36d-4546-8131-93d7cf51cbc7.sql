-- Update entry_status enum to match industry standards
-- Migration strategy: Add new values, migrate data, then deprecate old values

-- Step 1: Add new enum values (committed, voided, paid, pending)
-- PostgreSQL allows adding values to existing enums
ALTER TYPE public.entry_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.entry_status ADD VALUE IF NOT EXISTS 'committed';
ALTER TYPE public.entry_status ADD VALUE IF NOT EXISTS 'voided';
ALTER TYPE public.entry_status ADD VALUE IF NOT EXISTS 'paid';