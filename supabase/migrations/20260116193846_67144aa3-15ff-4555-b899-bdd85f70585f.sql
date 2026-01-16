-- Add source_request_id column to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS source_request_id uuid REFERENCES public.case_requests(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cases_source_request_id ON public.cases(source_request_id);