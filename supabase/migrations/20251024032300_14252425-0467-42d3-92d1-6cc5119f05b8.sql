-- Add case manager and investigators to cases table
ALTER TABLE public.cases
ADD COLUMN case_manager_id uuid REFERENCES public.profiles(id),
ADD COLUMN investigator_ids uuid[] DEFAULT '{}';

-- Add index for better query performance
CREATE INDEX idx_cases_case_manager ON public.cases(case_manager_id);
CREATE INDEX idx_cases_investigator_ids ON public.cases USING GIN(investigator_ids);