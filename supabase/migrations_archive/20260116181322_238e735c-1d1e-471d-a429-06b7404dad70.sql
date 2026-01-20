-- =============================================================================
-- CASE REQUEST FEATURE - DATABASE SCHEMA
-- =============================================================================

-- =============================================================================
-- TABLE 1: case_request_forms
-- Configurable public intake forms for organizations
-- =============================================================================

CREATE TABLE public.case_request_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_name text NOT NULL,
  form_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  -- Branding
  logo_url text,
  organization_display_name text,
  organization_phone text,
  organization_website text,
  header_instructions text,
  primary_color text DEFAULT '#1a365d',
  success_message text DEFAULT 'Your case request has been submitted successfully.',
  -- Field Configuration
  field_config jsonb,
  -- Notification Settings
  send_confirmation_email boolean DEFAULT true,
  confirmation_email_subject text,
  confirmation_email_body text,
  notify_staff_on_submission boolean DEFAULT true,
  staff_notification_emails text[],
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- TABLE 2: case_requests
-- Main case request submissions from public forms
-- =============================================================================

CREATE TABLE public.case_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  
  -- Submitted Client Information
  submitted_client_name text,
  submitted_client_country text DEFAULT 'United States',
  submitted_client_address1 text,
  submitted_client_address2 text,
  submitted_client_address3 text,
  submitted_client_city text,
  submitted_client_state text,
  submitted_client_zip text,
  
  -- Submitted Contact Information
  submitted_contact_first_name text,
  submitted_contact_middle_name text,
  submitted_contact_last_name text,
  submitted_contact_email text,
  submitted_contact_office_phone text,
  submitted_contact_mobile_phone text,
  submitted_contact_mobile_carrier text,
  submitted_contact_home_phone text,
  
  -- Case Information
  case_type_id uuid REFERENCES public.case_types(id) ON DELETE SET NULL,
  case_services text[],
  claim_number text,
  budget_dollars decimal(10,2),
  budget_hours decimal(10,2),
  notes_instructions text,
  custom_fields jsonb DEFAULT '{}',
  
  -- Matching & Resolution (set during internal review)
  matched_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  matched_location_id uuid, -- No FK yet, for future client_locations table
  matched_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  client_match_action text CHECK (client_match_action IS NULL OR client_match_action IN ('existing', 'new')),
  contact_match_action text CHECK (contact_match_action IS NULL OR contact_match_action IN ('existing', 'new')),
  
  -- Approval Tracking
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decline_reason text,
  approved_case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  
  -- Metadata
  source_form_id uuid REFERENCES public.case_request_forms(id) ON DELETE SET NULL,
  source_ip inet,
  source_user_agent text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for request_number per organization
CREATE UNIQUE INDEX idx_case_requests_org_number ON public.case_requests(organization_id, request_number);

-- =============================================================================
-- TABLE 3: case_request_subjects
-- Subjects associated with a case request
-- =============================================================================

CREATE TABLE public.case_request_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_request_id uuid NOT NULL REFERENCES public.case_requests(id) ON DELETE CASCADE,
  subject_type_id uuid REFERENCES public.subject_types(id) ON DELETE SET NULL,
  is_primary boolean DEFAULT false,
  first_name text,
  middle_name text,
  last_name text,
  country text DEFAULT 'United States',
  address1 text,
  address2 text,
  address3 text,
  city text,
  state text,
  zip text,
  cell_phone text,
  alias text,
  date_of_birth date,
  age integer,
  height text,
  weight text,
  race text,
  sex text CHECK (sex IS NULL OR sex IN ('Male', 'Female', 'Unknown')),
  ssn text,
  email text,
  photo_url text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- TABLE 4: case_request_files
-- Files uploaded with case requests
-- =============================================================================

CREATE TABLE public.case_request_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_request_id uuid NOT NULL REFERENCES public.case_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- FUNCTION: generate_request_number
-- Generates sequential request numbers per organization with advisory lock
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_request_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  lock_key bigint;
BEGIN
  -- Generate a consistent lock key from the org_id
  lock_key := ('x' || substr(org_id::text, 1, 8))::bit(32)::bigint;
  
  -- Acquire advisory lock for this org (released at end of transaction)
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Get the next number
  SELECT COALESCE(MAX(
    CASE 
      WHEN request_number ~ '^REQ-[0-9]{5}$' 
      THEN substring(request_number from 5)::integer 
      ELSE 0 
    END
  ), 0) + 1
  INTO next_num
  FROM case_requests
  WHERE organization_id = org_id;
  
  RETURN 'REQ-' || lpad(next_num::text, 5, '0');
END;
$$;

-- =============================================================================
-- TRIGGER: Auto-set request_number on INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_case_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := generate_request_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_set_case_request_number
  BEFORE INSERT ON public.case_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_case_request_number();

-- =============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- =============================================================================

CREATE TRIGGER update_case_requests_updated_at
  BEFORE UPDATE ON public.case_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_request_forms_updated_at
  BEFORE UPDATE ON public.case_request_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- case_requests indexes
CREATE INDEX idx_case_requests_org_status ON public.case_requests(organization_id, status);
CREATE INDEX idx_case_requests_org_submitted ON public.case_requests(organization_id, submitted_at DESC);
CREATE INDEX idx_case_requests_number ON public.case_requests(request_number);

-- case_request_subjects indexes
CREATE INDEX idx_case_request_subjects_request ON public.case_request_subjects(case_request_id);

-- case_request_files indexes
CREATE INDEX idx_case_request_files_request ON public.case_request_files(case_request_id);

-- case_request_forms indexes
CREATE INDEX idx_case_request_forms_org_active ON public.case_request_forms(organization_id, is_active);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.case_request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_files ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- case_request_forms Policies
-- -----------------------------------------------------------------------------

-- Public can read active, public forms
CREATE POLICY "Public can read active public forms"
  ON public.case_request_forms
  FOR SELECT
  USING (is_active = true AND is_public = true);

-- Org members can read all their org's forms
CREATE POLICY "Org members can read their forms"
  ON public.case_request_forms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_request_forms.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Only org admins can insert forms
CREATE POLICY "Org admins can create forms"
  ON public.case_request_forms
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_request_forms.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- Only org admins can update forms
CREATE POLICY "Org admins can update forms"
  ON public.case_request_forms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_request_forms.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- Only org admins can delete forms
CREATE POLICY "Org admins can delete forms"
  ON public.case_request_forms
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_request_forms.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- case_requests Policies
-- -----------------------------------------------------------------------------

-- Org members can view their org's requests
CREATE POLICY "Org members can view requests"
  ON public.case_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_requests.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Public can insert with valid source_form_id (form must be active and public)
CREATE POLICY "Public can submit requests via active forms"
  ON public.case_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_request_forms
      WHERE case_request_forms.id = case_requests.source_form_id
        AND case_request_forms.is_active = true
        AND case_request_forms.is_public = true
        AND case_request_forms.organization_id = case_requests.organization_id
    )
  );

-- Org admins and managers can update requests
CREATE POLICY "Org admins and managers can update requests"
  ON public.case_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_requests.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Only admins can delete requests
CREATE POLICY "Org admins can delete requests"
  ON public.case_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = case_requests.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- case_request_subjects Policies (follow parent request permissions)
-- -----------------------------------------------------------------------------

-- Can view subjects if can view parent request
CREATE POLICY "Can view subjects if can view request"
  ON public.case_request_subjects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.organization_members om ON om.organization_id = cr.organization_id
      WHERE cr.id = case_request_subjects.case_request_id
        AND om.user_id = auth.uid()
    )
  );

-- Can insert subjects with valid form submission
CREATE POLICY "Can insert subjects via form submission"
  ON public.case_request_subjects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.case_request_forms crf ON crf.id = cr.source_form_id
      WHERE cr.id = case_request_subjects.case_request_id
        AND crf.is_active = true
        AND crf.is_public = true
    )
  );

-- Org admins/managers can update subjects
CREATE POLICY "Org admins can update subjects"
  ON public.case_request_subjects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.organization_members om ON om.organization_id = cr.organization_id
      WHERE cr.id = case_request_subjects.case_request_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  );

-- Org admins can delete subjects
CREATE POLICY "Org admins can delete subjects"
  ON public.case_request_subjects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.organization_members om ON om.organization_id = cr.organization_id
      WHERE cr.id = case_request_subjects.case_request_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- case_request_files Policies (follow parent request permissions)
-- -----------------------------------------------------------------------------

-- Can view files if can view parent request
CREATE POLICY "Can view files if can view request"
  ON public.case_request_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.organization_members om ON om.organization_id = cr.organization_id
      WHERE cr.id = case_request_files.case_request_id
        AND om.user_id = auth.uid()
    )
  );

-- Can insert files with valid form submission
CREATE POLICY "Can insert files via form submission"
  ON public.case_request_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.case_request_forms crf ON crf.id = cr.source_form_id
      WHERE cr.id = case_request_files.case_request_id
        AND crf.is_active = true
        AND crf.is_public = true
    )
  );

-- Org admins can delete files
CREATE POLICY "Org admins can delete files"
  ON public.case_request_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.case_requests cr
      JOIN public.organization_members om ON om.organization_id = cr.organization_id
      WHERE cr.id = case_request_files.case_request_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );