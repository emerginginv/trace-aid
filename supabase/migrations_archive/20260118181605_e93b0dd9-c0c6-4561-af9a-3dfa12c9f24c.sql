-- Fix search_path for the can_access_subject_case function
CREATE OR REPLACE FUNCTION public.can_access_subject_case(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.case_subjects cs
    JOIN public.cases c ON c.id = cs.case_id
    WHERE cs.id = p_subject_id
      AND c.organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
  );
$$;