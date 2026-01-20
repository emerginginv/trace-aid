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
CREATE TYPE public.app_role AS ENUM ('admin', 'investigator', 'vendor', 'manager', 'owner');

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
/*
IMPORTANT STEPS AFTER RUNNING THIS SCRIPT:

1. DATA MIGRATION:
   - Export data from your Lovable Cloud project
   - Use the Supabase Table Editor to export CSVs
   - Import the CSVs into your new Supabase project
   
2. UPDATE LOVABLE PROJECT:
   - Go to your Lovable project settings
   - Disconnect from Lovable Cloud
   - Connect to your new external Supabase project
   - Update VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

3. EDGE FUNCTIONS:
   - Copy your edge functions from supabase/functions/
   - Deploy them to your new Supabase project using:
     supabase functions deploy <function-name>

4. SECRETS:
   - Set up any secrets your edge functions need:
     supabase secrets set KEY=value

5. AUTH SETTINGS:
   - Configure Site URL: https://caseinformation.app
   - Configure Redirect URLs: https://caseinformation.app/**, https://*.caseinformation.app/**
   - Enable email auto-confirm for development

This export includes the CORE schema. Some tables, views, and functions
may need to be added based on your specific implementation.
*/
