-- Add cover_image_url column to case_subjects table
ALTER TABLE public.case_subjects
ADD COLUMN cover_image_url text;