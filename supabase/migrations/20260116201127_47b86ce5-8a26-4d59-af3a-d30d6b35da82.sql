-- Add created_by to track internal submissions
ALTER TABLE public.case_requests 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add source_type to distinguish public vs internal submissions
ALTER TABLE public.case_requests 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'public';

-- Add check constraint for source_type
ALTER TABLE public.case_requests 
ADD CONSTRAINT case_requests_source_type_check 
CHECK (source_type IN ('public', 'internal'));