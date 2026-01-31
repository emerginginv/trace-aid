-- Migration to add missing columns to case_requests table
-- Based on the current application types and expected schema

ALTER TABLE public.case_requests 
ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS submitted_client_name text,
ADD COLUMN IF NOT EXISTS submitted_client_address1 text,
ADD COLUMN IF NOT EXISTS submitted_client_address2 text,
ADD COLUMN IF NOT EXISTS submitted_client_address3 text,
ADD COLUMN IF NOT EXISTS submitted_client_city text,
ADD COLUMN IF NOT EXISTS submitted_client_state text,
ADD COLUMN IF NOT EXISTS submitted_client_zip text,
ADD COLUMN IF NOT EXISTS submitted_client_country text,
ADD COLUMN IF NOT EXISTS submitted_contact_first_name text,
ADD COLUMN IF NOT EXISTS submitted_contact_middle_name text,
ADD COLUMN IF NOT EXISTS submitted_contact_last_name text,
ADD COLUMN IF NOT EXISTS submitted_contact_email text,
ADD COLUMN IF NOT EXISTS submitted_contact_mobile_phone text,
ADD COLUMN IF NOT EXISTS submitted_contact_office_phone text,
ADD COLUMN IF NOT EXISTS submitted_contact_home_phone text,
ADD COLUMN IF NOT EXISTS submitted_contact_mobile_carrier text,
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS decline_reason text,
ADD COLUMN IF NOT EXISTS approved_case_id uuid REFERENCES public.cases(id),
ADD COLUMN IF NOT EXISTS case_services text[],
ADD COLUMN IF NOT EXISTS claim_number text,
ADD COLUMN IF NOT EXISTS budget_dollars numeric,
ADD COLUMN IF NOT EXISTS budget_hours numeric,
ADD COLUMN IF NOT EXISTS notes_instructions text,
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS matched_account_id uuid REFERENCES public.accounts(id),
ADD COLUMN IF NOT EXISTS matched_contact_id uuid REFERENCES public.contacts(id),
ADD COLUMN IF NOT EXISTS matched_location_id uuid,
ADD COLUMN IF NOT EXISTS source_form_id uuid REFERENCES public.case_request_forms(id),
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS source_ip inet,
ADD COLUMN IF NOT EXISTS source_user_agent text,
ADD COLUMN IF NOT EXISTS status_key text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Update submitted_at from created_at for existing records
UPDATE public.case_requests SET submitted_at = created_at WHERE submitted_at IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.case_requests.submitted_at IS 'The timestamp when the request was actually submitted by the client/form.';
COMMENT ON COLUMN public.case_requests.submitted_client_name IS 'Captured client name at time of submission.';
