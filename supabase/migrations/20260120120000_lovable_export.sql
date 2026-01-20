-- ============================================================
-- CASEWYZE DATABASE SCHEMA EXPORT
-- Generated: 2026-01-20
-- 
-- INSTRUCTIONS:
-- 1. Create a new Supabase project at https://supabase.com
-- 2. Go to SQL Editor in your Supabase dashboard
-- 3. Run this script in sections (enums first, then tables, then functions, etc.)
-- 4. After running, update your Lovable project to connect to the new Supabase project
--
-- NOTE: This exports SCHEMA only. Data must be exported separately using:
--   - Supabase CLI: supabase db dump
--   - Or manual CSV exports from the Table Editor
-- ============================================================

-- ============================================================
-- PART 1: ENUMS (Run this first)
-- ============================================================

-- App roles for user permissions
CREATE TYPE public.app_role AS ENUM ('admin', 'investigator', 'vendor', 'manager', 'owner', 'member');

-- Data regions for GDPR compliance
CREATE TYPE public.data_region AS ENUM ('us', 'eu', 'uk', 'au');

-- Backup types and statuses
CREATE TYPE public.backup_type AS ENUM ('full', 'incremental', 'differential');
CREATE TYPE public.backup_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Component status for service status page
CREATE TYPE public.component_status AS ENUM ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance');

-- Status trigger event types
CREATE TYPE public.status_trigger_event AS ENUM (
  'status_changed',
  'investigator_assigned',
  'investigator_confirmed',
  'invoice_created',
  'all_invoices_paid',
  'report_uploaded',
  'case_approved',
  'manual'
);

-- ============================================================
-- PART 3: CORE TABLES
-- ============================================================

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  username text UNIQUE,
  mobile_phone text,
  office_phone text,
  address text,
  city text,
  state text,
  zip_code text,
  department text,
  company_name text,
  color text,
  is_active boolean DEFAULT true,
  notification_email boolean DEFAULT true,
  notification_sms boolean DEFAULT false,
  notification_push boolean DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid,
  allowed_regions text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User roles (separate from profiles for security)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Organizations (tenants)
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  subdomain text NOT NULL UNIQUE,
  logo_url text,
  login_logo_url text,
  login_brand_name text,
  login_accent_color text,
  login_branding_enabled boolean DEFAULT false,
  custom_domain text,
  billing_email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_tier text DEFAULT 'free',
  subscription_status text DEFAULT 'inactive',
  subscription_product_id text,
  plan_key text DEFAULT 'solo',
  plan_features jsonb DEFAULT '{}'::jsonb,
  max_users integer DEFAULT 2,
  current_users_count integer DEFAULT 0,
  storage_used_gb numeric DEFAULT 0,
  trial_ends_at timestamptz,
  is_active boolean DEFAULT true,
  status text DEFAULT 'active',
  retention_days integer DEFAULT 30,
  default_retention_days integer DEFAULT 365,
  legal_hold boolean DEFAULT false,
  legal_hold_reason text,
  legal_hold_set_at timestamptz,
  legal_hold_set_by uuid,
  gdpr_enabled boolean DEFAULT false,
  data_region data_region DEFAULT 'us',
  region_locked boolean DEFAULT true,
  region_selected_at timestamptz,
  deleted_at timestamptz,
  deletion_scheduled_for timestamptz,
  case_number_format text DEFAULT '{{Case.series_number}}-{{Case.series_instance}}',
  case_series_counter integer DEFAULT 0,
  case_series_padding integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization members (user-org relationships)
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Platform staff (super admins)
CREATE TABLE public.platform_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_active boolean DEFAULT true,
  platform_role text NOT NULL,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Platform users (for multi-tenant admin access)
CREATE TABLE public.platform_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_active boolean DEFAULT true,
  platform_role text NOT NULL,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- ============================================================
-- PART 4: CASE MANAGEMENT TABLES
-- ============================================================

-- Case status categories
CREATE TABLE public.case_status_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case statuses
CREATE TABLE public.case_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.case_status_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  notes text,
  rank_order integer DEFAULT 0,
  monitor_due_date boolean DEFAULT true,
  is_active boolean DEFAULT true,
  is_reopenable boolean DEFAULT true,
  is_read_only boolean DEFAULT false,
  is_first_status boolean DEFAULT false,
  workflows text[] DEFAULT ARRAY['standard'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case types
CREATE TABLE public.case_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  tag text,
  description text,
  color text DEFAULT '#6366f1',
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true,
  budget_strategy text DEFAULT 'both',
  allowed_service_ids uuid[],
  allowed_subject_types text[],
  default_subject_type text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cases (main entity)
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  case_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'New',
  status_id uuid REFERENCES public.case_statuses(id),
  due_date timestamptz,
  account_id uuid,
  contact_id uuid,
  case_type_id uuid REFERENCES public.case_types(id),
  case_type_tag text,
  case_manager_id uuid,
  case_manager_2_id uuid,
  budget_hours numeric,
  budget_dollars numeric,
  budget_notes text,
  use_primary_subject_as_title boolean DEFAULT false,
  reference_number text,
  reference_number_2 text,
  reference_number_3 text,
  parent_case_id uuid REFERENCES public.cases(id),
  instance_number integer DEFAULT 0,
  series_number integer,
  series_instance integer DEFAULT 0,
  source_request_id uuid,
  active_service_ids uuid[],
  retention_days integer,
  is_draft boolean DEFAULT false,
  closed_at timestamptz,
  closed_by_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Accounts (clients/companies)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  industry text,
  notes text,
  status text DEFAULT 'active',
  external_record_id text,
  external_system_name text,
  import_batch_id uuid,
  import_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  address text,
  city text,
  state text,
  zip_code text,
  title text,
  department text,
  notes text,
  is_primary boolean DEFAULT false,
  external_record_id text,
  external_system_name text,
  import_batch_id uuid,
  import_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case investigators (junction table)
CREATE TABLE public.case_investigators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  investigator_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  role text DEFAULT 'investigator',
  assigned_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- Case subjects
CREATE TABLE public.case_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  subject_type_id uuid,
  name text NOT NULL,
  category text DEFAULT 'person',
  date_of_birth date,
  gender text,
  ssn_last_four text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  employer text,
  occupation text,
  notes text,
  details jsonb DEFAULT '{}'::jsonb,
  profile_image_url text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 5: ACTIVITIES & UPDATES
-- ============================================================

-- Case activities (tasks, appointments, etc.)
CREATE TABLE public.case_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_user_id uuid,
  case_service_instance_id uuid,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  address text,
  status text DEFAULT 'pending',
  due_date date,
  start_time time,
  end_time time,
  end_date date,
  is_scheduled boolean DEFAULT false,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  locked_at timestamptz,
  locked_by_invoice_id uuid,
  external_record_id text,
  external_system_name text,
  import_batch_id uuid,
  import_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case updates (notes, reports, etc.)
CREATE TABLE public.case_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  case_service_instance_id uuid,
  subject_id uuid,
  update_type text NOT NULL,
  title text,
  content text,
  summary text,
  is_pinned boolean DEFAULT false,
  is_internal boolean DEFAULT false,
  visibility text DEFAULT 'all',
  date date DEFAULT CURRENT_DATE,
  start_time time,
  end_time time,
  address text,
  weather text,
  temperature text,
  status text DEFAULT 'draft',
  locked_at timestamptz,
  locked_by_invoice_id uuid,
  external_record_id text,
  external_system_name text,
  import_batch_id uuid,
  import_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 6: FINANCIAL TABLES
-- ============================================================

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text DEFAULT 'draft',
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  notes text,
  terms text,
  footer text,
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoice line items
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  billing_item_id uuid,
  billing_item_type text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Case finances (time entries, expenses)
CREATE TABLE public.case_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  account_id uuid REFERENCES public.accounts(id),
  invoice_id uuid REFERENCES public.invoices(id),
  activity_id uuid REFERENCES public.case_activities(id),
  update_id uuid REFERENCES public.case_updates(id),
  subject_id uuid REFERENCES public.case_subjects(id),
  case_service_instance_id uuid,
  expense_user_id uuid,
  finance_type text NOT NULL,
  description text NOT NULL,
  category text,
  amount numeric NOT NULL,
  hours numeric,
  hourly_rate numeric,
  quantity numeric,
  unit_price numeric,
  pricing_model text,
  pricing_snapshot jsonb,
  billing_type text,
  billing_frequency text,
  date date DEFAULT CURRENT_DATE,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  due_date date,
  status text,
  notes text,
  invoice_number text,
  invoiced boolean DEFAULT false,
  external_record_id text,
  external_system_name text,
  import_batch_id uuid,
  import_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case services (billable service types)
CREATE TABLE public.case_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  color text DEFAULT '#6366f1',
  default_rate numeric,
  rate_type text DEFAULT 'hourly',
  is_active boolean DEFAULT true,
  is_billable boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case service instances (services assigned to cases)
CREATE TABLE public.case_service_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  case_service_id uuid NOT NULL REFERENCES public.case_services(id),
  subject_id uuid REFERENCES public.case_subjects(id),
  status text DEFAULT 'active',
  budget_hours numeric,
  budget_amount numeric,
  hard_cap boolean DEFAULT false,
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 7: ATTACHMENTS & STORAGE
-- ============================================================

-- Attachment folders
CREATE TABLE public.attachment_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES public.attachment_folders(id),
  name text NOT NULL,
  color text DEFAULT '#6b7280',
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Case attachments
CREATE TABLE public.case_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  folder_id uuid REFERENCES public.attachment_folders(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  file_hash text,
  name text,
  description text,
  tags text[],
  ai_tags text[],
  preview_status text,
  preview_path text,
  preview_generated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Subject attachments
CREATE TABLE public.subject_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.case_subjects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  file_hash text,
  name text,
  description text,
  attachment_type text DEFAULT 'general',
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 8: NOTIFICATIONS & AUDIT
-- ============================================================

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Audit events
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  actor_user_id uuid,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Security audit log
CREATE TABLE public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid,
  target_user_id uuid,
  event_type text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 9: ORGANIZATION SETTINGS & CONFIG
-- ============================================================

-- Organization settings
CREATE TABLE public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  company_name text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  website text,
  logo_url text,
  square_logo_url text,
  timezone text DEFAULT 'America/New_York',
  date_format text DEFAULT 'MM/dd/yyyy',
  time_format text DEFAULT '12h',
  currency text DEFAULT 'USD',
  default_invoice_terms text,
  default_invoice_footer text,
  default_invoice_notes text,
  invoice_number_prefix text DEFAULT 'INV-',
  invoice_number_counter integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization invites
CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'investigator',
  token uuid DEFAULT gen_random_uuid() UNIQUE,
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Permissions
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  feature_key text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, role, feature_key)
);

-- ============================================================
-- PART 10: CASE REQUESTS (Public intake forms)
-- ============================================================

-- Case request forms
CREATE TABLE public.case_request_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_name text NOT NULL,
  form_slug text UNIQUE,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false,
  logo_url text,
  organization_display_name text,
  organization_website text,
  organization_phone text,
  primary_color text,
  header_instructions text,
  success_message text,
  field_config jsonb,
  send_confirmation_email boolean DEFAULT false,
  confirmation_email_subject text,
  confirmation_email_body text,
  notify_staff_on_submission boolean DEFAULT true,
  staff_notification_emails text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case requests (submissions)
CREATE TABLE public.case_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_id uuid REFERENCES public.case_request_forms(id),
  request_number text NOT NULL,
  status text DEFAULT 'pending',
  priority text DEFAULT 'normal',
  case_type_id uuid,
  requester_name text,
  requester_email text,
  requester_phone text,
  requester_company text,
  subject_data jsonb,
  services_requested uuid[],
  notes text,
  internal_notes text,
  assigned_to uuid,
  converted_case_id uuid REFERENCES public.cases(id),
  converted_at timestamptz,
  converted_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 2: HELPER FUNCTIONS (Run before tables with RLS)
-- ============================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Check organization membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = _user_id 
      AND organization_id = _org_id
  )
$$;

-- Get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT p.allowed
      FROM public.permissions p
      JOIN public.organization_members om ON om.role = p.role
      WHERE om.user_id = _user_id
        AND p.feature_key = _feature_key
      ORDER BY om.created_at ASC
      LIMIT 1
    ),
    false
  )
$$;

-- Check if user is admin of any org
CREATE OR REPLACE FUNCTION public.is_admin_of_any_org(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.role = 'admin'
  )
$$;

-- Check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = p_user_id 
      AND role IN ('admin', 'manager')
  )
$$;

-- Check if user is platform staff
CREATE OR REPLACE FUNCTION public.is_platform_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_staff
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 11: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_investigators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_service_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 12: RLS POLICIES (Core tables)
-- ============================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Organizations policies
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (is_org_member(auth.uid(), id));

CREATE POLICY "Admins can update their organization" ON public.organizations
  FOR UPDATE USING (is_org_member(auth.uid(), id) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_member(auth.uid(), id) AND has_role(auth.uid(), 'admin'::app_role));

-- Organization members policies
CREATE POLICY "Users can view members of their organization" ON public.organization_members
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage organization members" ON public.organization_members
  FOR ALL USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Cases policies
CREATE POLICY "Users can view cases in their organization" ON public.cases
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create cases in their organization" ON public.cases
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update cases in their organization" ON public.cases
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete cases" ON public.cases
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Accounts policies (permission-based)
CREATE POLICY "Permission-based view accounts" ON public.accounts
  FOR SELECT USING (is_org_member(auth.uid(), organization_id) AND has_permission(auth.uid(), 'view_accounts'));

CREATE POLICY "Permission-based insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_permission(auth.uid(), 'add_accounts'));

CREATE POLICY "Permission-based update accounts" ON public.accounts
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id) AND has_permission(auth.uid(), 'edit_accounts'));

CREATE POLICY "Permission-based delete accounts" ON public.accounts
  FOR DELETE USING (is_org_member(auth.uid(), organization_id) AND has_permission(auth.uid(), 'delete_accounts'));

-- Similar policies for other tables following the same pattern...
-- (Contacts, Case Activities, Case Updates, Invoices, etc.)

-- ============================================================
-- PART 13: TRIGGERS
-- ============================================================

-- Profile updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Organization updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Case updated_at trigger
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART 14: STORAGE BUCKETS
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('case-attachments', 'case-attachments', false, 52428800, NULL),
  ('subject-attachments', 'subject-attachments', false, 52428800, NULL),
  ('organization-logos', 'organization-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('profile-avatars', 'profile-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('report-templates', 'report-templates', false, 10485760, NULL),
  ('case-request-files', 'case-request-files', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for case-attachments
CREATE POLICY "Users can upload case attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'case-attachments' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view case attachments in their org" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'case-attachments'
    AND auth.role() = 'authenticated'
  );

-- Storage policies for organization logos
CREATE POLICY "Anyone can view organization logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'organization-logos');

CREATE POLICY "Admins can upload organization logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'organization-logos'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- PART 15: SIGNUP/AUTH TRIGGER
-- ============================================================

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  base_subdomain text;
  final_subdomain text;
  counter integer := 0;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Generate unique subdomain
  base_subdomain := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  IF length(base_subdomain) < 3 THEN
    base_subdomain := 'org' || base_subdomain;
  END IF;
  
  final_subdomain := base_subdomain;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE subdomain = final_subdomain) LOOP
    counter := counter + 1;
    final_subdomain := base_subdomain || counter::text;
  END LOOP;

  -- Create organization
  INSERT INTO public.organizations (name, subdomain)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '''s Organization'),
    final_subdomain
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- ============================================================
-- NOTES FOR MIGRATION
-- ============================================================

-- ============================================================
-- CASEWYZE DATABASE SCHEMA EXPORT - PART 2
-- Additional Tables Not Included in Part 1
-- Generated: 2026-01-20
-- ============================================================

-- ============================================================
-- ADDITIONAL ENUMS
-- ============================================================

CREATE TYPE public.pentest_type AS ENUM ('external', 'internal', 'web_app', 'mobile_app', 'api', 'social_engineering');
CREATE TYPE public.pentest_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.risk_level AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE public.vulnerability_status AS ENUM ('open', 'in_progress', 'resolved', 'accepted', 'false_positive');
CREATE TYPE public.incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');
CREATE TYPE public.incident_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE public.disaster_severity AS ENUM ('minor', 'major', 'critical');

CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'pending_signature', 'signed', 'active', 'expired', 'terminated', 'superseded');
CREATE TYPE public.contract_type AS ENUM ('msa', 'sow', 'order_form', 'dpa', 'nda', 'other');
CREATE TYPE public.health_risk_level AS ENUM ('healthy', 'watch', 'at_risk');
CREATE TYPE public.entry_status AS ENUM ('draft', 'pending_review', 'approved', 'declined', 'billed', 'pending', 'committed', 'voided', 'paid');
CREATE TYPE public.finance_item_rate_type AS ENUM ('hourly', 'fixed', 'variable');
CREATE TYPE public.integration_auth_type AS ENUM ('oauth', 'api_key', 'webhook');
CREATE TYPE public.integration_category AS ENUM ('communications', 'storage', 'analytics', 'legal', 'payments', 'productivity', 'security');
CREATE TYPE public.integration_status AS ENUM ('installed', 'disabled', 'error');
CREATE TYPE public.sla_status AS ENUM ('active', 'paused', 'breached', 'met', 'cancelled');
CREATE TYPE public.case_status_trigger_event AS ENUM ('investigator_assigned', 'investigator_confirmed', 'invoice_created', 'all_invoices_paid', 'report_uploaded', 'case_approved');

-- ============================================================
-- ACCESS REVIEW TABLES
-- ============================================================

CREATE TABLE public.access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_type text DEFAULT 'quarterly',
  review_period_start timestamptz DEFAULT (now() - interval '3 months'),
  review_period_end timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  reviewer_id uuid,
  completed_by uuid,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.access_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.access_reviews(id) ON DELETE CASCADE,
  user_id uuid,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_role text NOT NULL,
  action_taken text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- AI IMPORT TABLES
-- ============================================================

CREATE TABLE public.ai_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_system text,
  status text NOT NULL DEFAULT 'uploading',
  files_metadata jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis jsonb,
  user_mappings jsonb,
  user_exclusions jsonb,
  import_batch_id uuid,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ATTACHMENT TABLES
-- ============================================================

CREATE TABLE public.attachment_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL,
  attachment_type text NOT NULL,
  access_token text NOT NULL DEFAULT gen_random_uuid()::text,
  created_by_user_id uuid NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.attachment_preview_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL,
  attachment_type text DEFAULT 'case_attachment',
  user_id uuid NOT NULL,
  preview_type text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- BACKUP & DISASTER RECOVERY TABLES
-- ============================================================

CREATE TABLE public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type backup_type NOT NULL,
  status backup_status NOT NULL DEFAULT 'pending',
  location text NOT NULL,
  size_bytes bigint,
  checksum text,
  description text,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  retention_expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.disaster_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity disaster_severity NOT NULL,
  description text NOT NULL,
  affected_systems text[],
  started_at timestamptz NOT NULL,
  resolved_at timestamptz,
  resolution_notes text,
  rto_target_hours integer,
  rto_actual_hours numeric,
  rpo_target_hours integer,
  rpo_actual_hours numeric,
  declared_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.recovery_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name text NOT NULL,
  rto_hours integer NOT NULL,
  rpo_hours integer NOT NULL,
  priority integer NOT NULL,
  recovery_procedure text,
  dependencies text[],
  tested_at timestamptz,
  test_result text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.restore_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id uuid REFERENCES public.backups(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  success boolean,
  data_integrity_verified boolean,
  restoration_time_seconds integer,
  notes text,
  performed_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- BILLING & FINANCE TABLES
-- ============================================================

CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.budget_violation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  service_instance_id uuid,
  user_id uuid NOT NULL,
  violation_type text NOT NULL,
  budget_scope text NOT NULL,
  hours_limit numeric,
  hours_at_violation numeric,
  amount_limit numeric,
  amount_at_violation numeric,
  action_attempted text,
  action_blocked boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.credit_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid,
  credit_memo_number text NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  notes text,
  status text DEFAULT 'draft',
  applied_at timestamptz,
  applied_to_invoice_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.retainer_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid,
  case_id uuid,
  amount numeric NOT NULL,
  balance numeric NOT NULL,
  notes text,
  status text DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid,
  finance_item_id uuid,
  amount numeric NOT NULL,
  reason text NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.client_price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  service_id uuid,
  item_name text NOT NULL,
  rate numeric NOT NULL,
  rate_type finance_item_rate_type DEFAULT 'hourly',
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.employee_price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  service_id uuid,
  item_name text NOT NULL,
  rate numeric NOT NULL,
  rate_type finance_item_rate_type DEFAULT 'hourly',
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  receipt_url text,
  status entry_status DEFAULT 'draft',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  expense_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.finance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  default_rate numeric,
  rate_type finance_item_rate_type DEFAULT 'hourly',
  is_taxable boolean DEFAULT false,
  is_active boolean DEFAULT true,
  billing_code text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  service_instance_id uuid,
  activity_id uuid,
  hours numeric NOT NULL,
  hourly_rate numeric,
  description text NOT NULL,
  entry_date date NOT NULL,
  start_time time,
  end_time time,
  status entry_status DEFAULT 'draft',
  approved_by uuid,
  approved_at timestamptz,
  billable boolean DEFAULT true,
  invoiced boolean DEFAULT false,
  invoice_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid NOT NULL,
  performed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  payment_reference text,
  payment_date date NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CASE STATUS & WORKFLOW TABLES
-- ============================================================

CREATE TABLE public.case_budget_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  adjustment_type text NOT NULL,
  previous_value numeric,
  new_value numeric NOT NULL,
  adjustment_amount numeric,
  reason text NOT NULL,
  external_record_id text,
  external_system_name text,
  import_batch_id uuid,
  import_timestamp timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  budget_type text NOT NULL,
  total_budget_hours numeric,
  total_budget_amount numeric,
  hard_cap boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_category_transition_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  from_category_id uuid,
  to_category_id uuid NOT NULL,
  transitioned_by uuid,
  transitioned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_lifecycle_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_key text NOT NULL,
  display_name text NOT NULL,
  description text,
  phase text NOT NULL,
  phase_order integer NOT NULL,
  status_type text DEFAULT 'standard',
  color text,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_number_format_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_service_budget_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  case_service_instance_id uuid NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  max_hours numeric,
  max_amount numeric,
  warning_threshold numeric DEFAULT 0.8,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status_id uuid,
  from_status text,
  from_status_key text,
  to_status text NOT NULL,
  to_status_key text,
  change_reason text,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  entered_at timestamptz DEFAULT now(),
  exited_at timestamptz,
  duration_seconds integer,
  trigger_id uuid,
  manual_override boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_status_migration_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  old_status text,
  old_status_id uuid,
  migration_batch text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_status_migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  old_status text,
  old_status_id uuid,
  new_status_id uuid,
  migration_batch text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_status_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  event_type case_status_trigger_event NOT NULL,
  from_status_id uuid,
  to_status_id uuid NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_status_trigger_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  trigger_id uuid,
  event_type text NOT NULL,
  from_status_id uuid,
  to_status_id uuid,
  success boolean DEFAULT true,
  error_message text,
  executed_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_status_id uuid NOT NULL,
  to_status_id uuid NOT NULL,
  is_allowed boolean DEFAULT true,
  requires_reason boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CASE REQUEST TABLES
-- ============================================================

CREATE TABLE public.case_request_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_request_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  storage_path text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_request_id uuid NOT NULL,
  action text NOT NULL,
  description text,
  performed_by uuid,
  metadata jsonb,
  performed_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_request_id uuid NOT NULL,
  from_status text,
  from_status_key text,
  to_status text NOT NULL,
  to_status_key text,
  change_reason text,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  entered_at timestamptz DEFAULT now(),
  exited_at timestamptz,
  duration_seconds integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.case_request_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_request_id uuid NOT NULL,
  subject_type_id uuid,
  first_name text,
  middle_name text,
  last_name text,
  alias text,
  date_of_birth date,
  age integer,
  sex text,
  race text,
  height text,
  weight text,
  ssn text,
  email text,
  cell_phone text,
  address1 text,
  address2 text,
  address3 text,
  city text,
  state text,
  zip text,
  country text,
  photo_url text,
  custom_fields jsonb,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CHANGE LOG & AUDIT TABLES
-- ============================================================

CREATE TABLE public.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE TABLE public.subject_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  performed_by uuid NOT NULL,
  performed_at timestamptz DEFAULT now(),
  ip_address text
);

CREATE TABLE public.subject_social_link_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  social_link_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid NOT NULL,
  performed_at timestamptz DEFAULT now(),
  ip_address text
);

-- ============================================================
-- COMPLIANCE & SECURITY TABLES
-- ============================================================

CREATE TABLE public.compliance_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  format text NOT NULL,
  date_range_start date,
  date_range_end date,
  filters jsonb,
  file_path text,
  file_size_bytes bigint,
  status text DEFAULT 'pending',
  error_message text,
  requested_by uuid NOT NULL,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  subject_email text NOT NULL,
  subject_name text,
  verification_token text,
  verified_at timestamptz,
  status text DEFAULT 'pending',
  assigned_to uuid,
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.soc2_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  criteria text NOT NULL,
  implementation_status text DEFAULT 'not_started',
  implementation_notes text,
  evidence_required text[],
  last_tested_at timestamptz,
  last_tested_by uuid,
  test_result text,
  next_review_date date,
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.control_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.soc2_controls(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  description text NOT NULL,
  file_path text,
  collected_at timestamptz NOT NULL,
  collected_by uuid NOT NULL,
  valid_from date,
  valid_to date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.penetration_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  test_type pentest_type NOT NULL,
  scope text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  report_file_path text,
  overall_risk risk_level,
  findings_count_critical integer DEFAULT 0,
  findings_count_high integer DEFAULT 0,
  findings_count_medium integer DEFAULT 0,
  findings_count_low integer DEFAULT 0,
  findings_count_info integer DEFAULT 0,
  status pentest_status NOT NULL DEFAULT 'planned',
  notes text,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pentest_id uuid REFERENCES public.penetration_tests(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  severity risk_level NOT NULL,
  cvss_score numeric,
  cve_id text,
  affected_systems text[],
  remediation_steps text,
  status vulnerability_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  due_date date,
  resolved_at timestamptz,
  resolved_by uuid,
  verified_at timestamptz,
  verified_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.vulnerability_sla_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity risk_level NOT NULL UNIQUE,
  remediation_days integer NOT NULL,
  escalation_days integer NOT NULL,
  notify_on_breach boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'investigating',
  detected_at timestamptz NOT NULL,
  reported_by uuid,
  assigned_to uuid,
  affected_systems text[],
  root_cause text,
  resolution text,
  lessons_learned text,
  resolved_at timestamptz,
  post_mortem_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid NOT NULL,
  file_path text,
  summary jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.enforcement_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL,
  enforced_by uuid NOT NULL,
  enforced_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTRACT TABLES
-- ============================================================

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid,
  contract_type contract_type NOT NULL,
  contract_number text NOT NULL,
  title text NOT NULL,
  description text,
  status contract_status NOT NULL DEFAULT 'draft',
  effective_date date,
  expiration_date date,
  auto_renew boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 30,
  value numeric,
  file_path text,
  signed_by_client text,
  signed_by_client_at timestamptz,
  signed_by_us text,
  signed_by_us_at timestamptz,
  parent_contract_id uuid REFERENCES public.contracts(id),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.contract_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  scheduled_for date NOT NULL,
  sent_at timestamptz,
  recipient_emails text[],
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CUSTOMER & SLA TABLES
-- ============================================================

CREATE TABLE public.customer_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  health_score integer,
  risk_level health_risk_level,
  active_cases_count integer DEFAULT 0,
  open_invoices_count integer DEFAULT 0,
  outstanding_amount numeric DEFAULT 0,
  avg_payment_days integer,
  last_activity_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid,
  name text NOT NULL,
  description text,
  response_time_hours integer NOT NULL,
  resolution_time_hours integer,
  availability_percentage numeric,
  status sla_status DEFAULT 'active',
  effective_from date NOT NULL,
  effective_to date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.sla_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sla_id uuid NOT NULL REFERENCES public.slas(id) ON DELETE CASCADE,
  measurement_date date NOT NULL,
  response_time_actual_hours numeric,
  resolution_time_actual_hours numeric,
  availability_actual numeric,
  within_sla boolean,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sla_id uuid NOT NULL REFERENCES public.slas(id) ON DELETE CASCADE,
  case_id uuid,
  breach_type text NOT NULL,
  breached_at timestamptz NOT NULL,
  expected_value numeric,
  actual_value numeric,
  root_cause text,
  corrective_action text,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- DOCUMENT TABLES
-- ============================================================

CREATE TABLE public.document_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_instance_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  export_format text NOT NULL,
  filename text NOT NULL,
  storage_path text,
  file_size_bytes integer,
  content_hash text,
  exported_at timestamptz DEFAULT now(),
  exported_by_ip text
);

CREATE TABLE public.document_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  template_id uuid,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  document_type text NOT NULL,
  rendered_html text NOT NULL,
  org_profile_snapshot jsonb,
  case_variables_snapshot jsonb,
  state_code text,
  export_format text,
  exported_at timestamptz,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  document_type text NOT NULL,
  template_content text NOT NULL,
  template_style text,
  variables jsonb DEFAULT '[]'::jsonb,
  category text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.docx_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes integer,
  available_variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  subject text,
  body_html text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid,
  report_type text NOT NULL,
  title text NOT NULL,
  file_path text,
  file_size_bytes bigint,
  format text NOT NULL,
  parameters jsonb,
  generated_by uuid NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  download_count integer DEFAULT 0,
  last_downloaded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  report_type text NOT NULL,
  content text,
  status text DEFAULT 'draft',
  file_path text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.template_header_footer_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  header_html text,
  footer_html text,
  header_height_mm integer DEFAULT 20,
  footer_height_mm integer DEFAULT 15,
  show_page_numbers boolean DEFAULT true,
  page_number_position text DEFAULT 'footer-right',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENTITY ACTIVITY TABLES
-- ============================================================

CREATE TABLE public.entity_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  subject_id uuid,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  description text,
  outcome text,
  notes text,
  is_billable boolean DEFAULT true,
  duration_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.entity_activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_activity_id uuid NOT NULL REFERENCES public.entity_activities(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text,
  caption text,
  taken_at timestamptz,
  gps_latitude numeric,
  gps_longitude numeric,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- HELP & SUPPORT TABLES
-- ============================================================

CREATE TABLE public.help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.help_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  summary text,
  tags text[],
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  author_id uuid,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- IMPORT TABLES
-- ============================================================

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_system text,
  import_type text NOT NULL,
  file_name text,
  status text DEFAULT 'pending',
  total_records integer DEFAULT 0,
  processed_records integer DEFAULT 0,
  success_records integer DEFAULT 0,
  error_records integer DEFAULT 0,
  error_log jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number integer,
  field_name text,
  error_type text NOT NULL,
  error_message text NOT NULL,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  log_level text NOT NULL,
  message text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.import_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  external_id text,
  status text DEFAULT 'pending',
  raw_data jsonb NOT NULL,
  processed_data jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.import_type_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_type text NOT NULL,
  source_field text NOT NULL,
  target_field text NOT NULL,
  transformation text,
  default_value text,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INCIDENT & STATUS PAGE TABLES
-- ============================================================

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'investigating',
  affected_components uuid[],
  started_at timestamptz NOT NULL,
  resolved_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  status incident_status NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.service_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status component_status NOT NULL DEFAULT 'operational',
  display_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  group_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.status_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  verified_at timestamptz,
  verification_token text,
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trust_center_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_logo_url text,
  primary_color text,
  custom_domain text,
  show_compliance_badges boolean DEFAULT true,
  show_security_practices boolean DEFAULT true,
  show_subprocessors boolean DEFAULT true,
  custom_css text,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INTEGRATION TABLES
-- ============================================================

CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category integration_category NOT NULL,
  auth_type integration_auth_type NOT NULL,
  config_schema jsonb,
  logo_url text,
  documentation_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.organization_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  status integration_status NOT NULL DEFAULT 'installed',
  config jsonb,
  credentials_encrypted text,
  last_sync_at timestamptz,
  last_error text,
  installed_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, integration_id)
);

CREATE TABLE public.integration_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  permissions text[] DEFAULT ARRAY['read'],
  expires_at timestamptz,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  failure_count integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  duration_ms integer,
  success boolean,
  error_message text,
  attempt_number integer DEFAULT 1,
  next_retry_at timestamptz,
  delivered_at timestamptz DEFAULT now()
);

-- ============================================================
-- ORGANIZATION MANAGEMENT TABLES
-- ============================================================

CREATE TABLE public.organization_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  reason text,
  initiated_by uuid NOT NULL,
  cancelled_at timestamptz,
  cancelled_by uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  verified_at timestamptz,
  verification_token text,
  is_primary boolean DEFAULT false,
  auto_join_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.organization_entitlements_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  max_users_override integer,
  max_cases_override integer,
  max_storage_gb_override integer,
  features_override jsonb,
  reason text,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.organization_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  status text DEFAULT 'pending',
  file_path text,
  file_size_bytes bigint,
  error_message text,
  requested_by uuid NOT NULL,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.organization_usage (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  seats_used integer NOT NULL DEFAULT 0,
  cases_count integer NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.region_migration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_region data_region NOT NULL,
  to_region data_region NOT NULL,
  status text DEFAULT 'pending',
  requested_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.regional_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  access_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  source_region text,
  target_region text,
  allowed boolean NOT NULL,
  denial_reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SSO & SCIM TABLES
-- ============================================================

CREATE TABLE public.organization_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  provider text NOT NULL,
  entity_id text NOT NULL,
  sso_url text NOT NULL,
  certificate text NOT NULL,
  is_enabled boolean DEFAULT false,
  enforce_sso boolean DEFAULT false,
  auto_provision_users boolean DEFAULT true,
  default_role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.sso_role_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sso_config_id uuid NOT NULL REFERENCES public.organization_sso_configs(id) ON DELETE CASCADE,
  sso_group text NOT NULL,
  app_role app_role NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.organization_scim_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  is_enabled boolean DEFAULT false,
  bearer_token_hash text,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.scim_provisioning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  operation text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  request_body jsonb,
  response_body jsonb,
  status_code integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- USER MANAGEMENT TABLES
-- ============================================================

CREATE TABLE public.email_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_email text NOT NULL,
  new_email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason text NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  actions_log jsonb DEFAULT '[]'::jsonb
);

-- ============================================================
-- SUBJECT TABLES
-- ============================================================

CREATE TABLE public.subject_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text DEFAULT 'person',
  fields_config jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subject_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  linked_subject_id uuid NOT NULL,
  relationship_type text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.subject_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  reference_type text NOT NULL,
  reference_value text NOT NULL,
  notes text,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subject_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  username text,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.update_attachment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL,
  attachment_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PICKLIST TABLE
-- ============================================================

CREATE TABLE public.picklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  parent_id uuid REFERENCES public.picklists(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTROL PLANE TABLE
-- ============================================================

CREATE TABLE public.control_plane_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  tenant_id text NOT NULL UNIQUE,
  environment text NOT NULL DEFAULT 'production',
  status text DEFAULT 'active',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.reserved_subdomains (
  subdomain text PRIMARY KEY,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_preview_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_violation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainer_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_budget_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_category_transition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_lifecycle_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_number_format_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_service_budget_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_migration_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_trigger_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_social_link_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penetration_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docx_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_header_footer_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_center_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_entitlements_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_migration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_scim_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_provisioning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_attachment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_plane_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserved_subdomains ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (Sample - customize based on your needs)
-- ============================================================

-- Access Reviews
CREATE POLICY "Platform staff manage reviews" ON public.access_reviews
  FOR ALL USING (EXISTS (SELECT 1 FROM platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage items" ON public.access_review_items
  FOR ALL USING (EXISTS (SELECT 1 FROM platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- AI Import Sessions
CREATE POLICY "Users can view their org AI import sessions" ON public.ai_import_sessions
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create AI import sessions in their org" ON public.ai_import_sessions
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their own AI import sessions" ON public.ai_import_sessions
  FOR UPDATE USING (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their own AI import sessions" ON public.ai_import_sessions
  FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id));

-- Attachment Access
CREATE POLICY "Users can view org attachment access links" ON public.attachment_access
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create access links in their org" ON public.attachment_access
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id) AND created_by_user_id = auth.uid());

CREATE POLICY "Users can revoke access links in their org" ON public.attachment_access
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id));

-- Backups
CREATE POLICY "Platform staff can view backups" ON public.backups
  FOR SELECT USING (is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can insert backups" ON public.backups
  FOR INSERT WITH CHECK (is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update backups" ON public.backups
  FOR UPDATE USING (is_platform_staff(auth.uid()));

-- Billing Events
CREATE POLICY "Org admins can view billing events" ON public.billing_events
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Budget Violations
CREATE POLICY "Users can view budget violations in their organization" ON public.budget_violation_events
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create budget violation events" ON public.budget_violation_events
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Case Budgets
CREATE POLICY "Users can view budgets in their organization" ON public.case_budgets
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and managers can create budgets" ON public.case_budgets
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_permission(auth.uid(), 'modify_case_budget')));

CREATE POLICY "Admins and managers can update budgets" ON public.case_budgets
  FOR UPDATE USING (is_org_member(auth.uid(), organization_id) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_permission(auth.uid(), 'modify_case_budget')));

-- Standard org member policies (apply to most tables)
-- These are templates - each table needs specific policies based on requirements

-- Example for document_templates
CREATE POLICY "Users can view org document templates" ON public.document_templates
  FOR SELECT USING (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create document templates in their org" ON public.document_templates
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their own templates" ON public.document_templates
  FOR UPDATE USING (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id));

-- Help articles (public read)
CREATE POLICY "Anyone can view active help articles" ON public.help_articles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active help categories" ON public.help_categories
  FOR SELECT USING (is_active = true);

-- Integrations (public read for catalog)
CREATE POLICY "Anyone can view active integrations" ON public.integrations
  FOR SELECT USING (is_active = true);

-- Organization-scoped policies template
-- Apply similar patterns to remaining tables based on their access requirements

-- ============================================================
-- END OF PART 2
-- ============================================================
