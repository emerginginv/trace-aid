-- Add missing foreign key relationships for case requests
-- This fixes the PGRST200 error when querying case_requests with joined tables

-- Fix case_request_subjects
ALTER TABLE public.case_request_subjects
ADD CONSTRAINT case_request_subjects_case_request_id_fkey
FOREIGN KEY (case_request_id)
REFERENCES public.case_requests(id)
ON DELETE CASCADE;

ALTER TABLE public.case_request_subjects
ADD CONSTRAINT case_request_subjects_subject_type_id_fkey
FOREIGN KEY (subject_type_id)
REFERENCES public.subject_types(id)
ON DELETE SET NULL;

-- Fix case_request_files
ALTER TABLE public.case_request_files
ADD CONSTRAINT case_request_files_case_request_id_fkey
FOREIGN KEY (case_request_id)
REFERENCES public.case_requests(id)
ON DELETE CASCADE;

-- Fix case_request_history
ALTER TABLE public.case_request_history
ADD CONSTRAINT case_request_history_case_request_id_fkey
FOREIGN KEY (case_request_id)
REFERENCES public.case_requests(id)
ON DELETE CASCADE;

ALTER TABLE public.case_request_history
ADD CONSTRAINT case_request_history_performed_by_fkey
FOREIGN KEY (performed_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Fix case_request_status_history
ALTER TABLE public.case_request_status_history
ADD CONSTRAINT case_request_status_history_case_request_id_fkey
FOREIGN KEY (case_request_id)
REFERENCES public.case_requests(id)
ON DELETE CASCADE;

ALTER TABLE public.case_request_status_history
ADD CONSTRAINT case_request_status_history_changed_by_fkey
FOREIGN KEY (changed_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Fix case_requests user references
ALTER TABLE public.case_requests
ADD CONSTRAINT case_requests_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

ALTER TABLE public.case_requests
ADD CONSTRAINT case_requests_converted_by_fkey
FOREIGN KEY (converted_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Add comments explaining the fix
COMMENT ON TABLE public.case_request_subjects IS 'Subjects associated with a case request. Linked via case_request_id.';
COMMENT ON CONSTRAINT case_request_subjects_case_request_id_fkey ON public.case_request_subjects IS 'Explicit relationship to case_requests enabling PostgREST joins.';
