-- Add secondary case manager column to cases table
ALTER TABLE public.cases 
ADD COLUMN case_manager_2_id uuid REFERENCES public.profiles(id);

-- Add comment for clarity
COMMENT ON COLUMN public.cases.case_manager_2_id IS 'Secondary case manager (optional)';