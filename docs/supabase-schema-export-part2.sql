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
CREATE TYPE public.component_status AS ENUM ('operational', 'degraded', 'partial_outage', 'major_outage');
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
