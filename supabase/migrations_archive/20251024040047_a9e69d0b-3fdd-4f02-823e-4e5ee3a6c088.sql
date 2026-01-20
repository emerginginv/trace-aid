-- Add color column to picklists table
ALTER TABLE public.picklists
ADD COLUMN color text DEFAULT '#6366f1';