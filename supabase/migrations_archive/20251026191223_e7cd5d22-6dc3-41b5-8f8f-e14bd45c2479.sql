-- Add color field to profiles table for user color-coding
ALTER TABLE public.profiles 
ADD COLUMN color text DEFAULT '#6366f1';

-- Create a function to assign colors to existing profiles
DO $$
DECLARE
  colors text[] := ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
  profile_record RECORD;
  color_index int := 0;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles ORDER BY created_at LOOP
    UPDATE public.profiles 
    SET color = colors[(color_index % 8) + 1]
    WHERE id = profile_record.id;
    color_index := color_index + 1;
  END LOOP;
END $$;