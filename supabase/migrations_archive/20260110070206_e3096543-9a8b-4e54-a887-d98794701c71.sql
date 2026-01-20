-- Step 12: Customer Trust Center

-- 1. Trust Center configuration table
CREATE TABLE IF NOT EXISTS public.trust_center_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL UNIQUE,
  title text NOT NULL,
  content_markdown text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  last_reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.trust_center_config ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies - Public read, Platform staff write
CREATE POLICY "Anyone can view visible trust center content"
  ON public.trust_center_config FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Platform staff can view all trust center content"
  ON public.trust_center_config FOR SELECT
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update trust center content"
  ON public.trust_center_config FOR UPDATE
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can insert trust center content"
  ON public.trust_center_config FOR INSERT
  WITH CHECK (public.is_platform_staff(auth.uid()));

-- 4. Seed initial content
INSERT INTO public.trust_center_config (section, title, content_markdown, display_order, is_visible) VALUES
('security', 'Security Overview', '## Data Protection

CaseWyze implements comprehensive security measures to protect your data:

- **Tenant Isolation**: All customer data is logically isolated using row-level security policies. Organizations cannot access each other''s data.
- **Authentication**: All access requires authentication. We support secure password policies and session management.
- **Authorization**: Role-based access controls (RBAC) ensure users only access what they need.
- **Audit Logging**: All significant actions are logged with timestamps, actors, and outcomes.
- **Support Access**: Platform support access is time-limited (30 minutes), requires documented reason, and is fully audited.

## Encryption

- **In Transit**: All data is encrypted using TLS 1.2+ between clients and servers.
- **At Rest**: Database and file storage use provider-managed encryption at rest.', 1, true),

('compliance', 'Compliance & Standards', '## SOC 2 Readiness

CaseWyze has implemented controls aligned with SOC 2 Trust Service Criteria:

- **Security**: Logical access controls, audit logging, incident response
- **Availability**: Backup and recovery procedures, disaster recovery planning
- **Confidentiality**: Data classification, access restrictions, encryption

Status: **SOC 2 Readiness Program Active**

## Privacy Regulations

- **GDPR Support**: Data subject access requests (DSAR) supported
- **Data Portability**: Export your organization''s data on request
- **Right to Erasure**: Request data deletion (subject to legal holds)
- **Privacy by Design**: Security and privacy built into architecture', 2, true),

('data_handling', 'Data Handling & Privacy', '## What Data We Store

- **Case Information**: Cases, subjects, updates, activities, attachments
- **Financial Records**: Time entries, expenses, invoices, budgets
- **User Data**: Names, emails, role assignments, activity logs
- **Organization Data**: Settings, configurations, team members

## Who Can Access Your Data

- **Your Team**: Based on roles you assign (Admin, Manager, Investigator, Viewer)
- **CaseWyze Support**: Only with your permission, time-limited, and fully logged
- **No Third Parties**: We do not sell or share your data with third parties

## Data Retention

- **Active Data**: Retained while your account is active
- **Configurable Retention**: Set organization-level retention policies
- **Legal Holds**: Suspend deletion for legal preservation requirements
- **Upon Termination**: Data deleted per your retention settings or on request

## Your Rights

- Request a copy of your data
- Request correction of inaccurate data
- Request deletion (subject to legal holds)
- Export data in standard formats

Contact support@casewyze.com for data requests.', 3, true),

('availability', 'Availability & Resilience', '## Backup Strategy

- **Frequency**: Daily automated backups
- **Retention**: 30 days backup retention
- **Geographic**: Backups stored in separate locations

## Recovery Objectives

- **RPO (Recovery Point Objective)**: 24 hours
- **RTO (Recovery Time Objective)**: 4 hours

## Restore Testing

- **Quarterly Testing**: Restore procedures validated quarterly
- **Validation Checklist**: Schema integrity, data accessibility, access controls

## Disaster Recovery

- Documented disaster recovery procedures
- Incident declaration and recovery tracking
- Lessons learned incorporated after events', 4, true),

('subprocessors', 'Subprocessors', '## Infrastructure & Hosting

| Provider | Purpose | Data Accessed |
|----------|---------|---------------|
| Supabase | Database & Authentication | All application data |
| Vercel | Application Hosting | Application code, static assets |

## Third-Party Services

| Provider | Purpose | Data Accessed |
|----------|---------|---------------|
| Stripe | Payment Processing | Billing information, subscription data |
| Resend | Transactional Email | Email addresses, notification content |

## Data Processing

All subprocessors are bound by data processing agreements and maintain appropriate security certifications.

We evaluate subprocessor security practices and may update this list as our infrastructure evolves.', 5, true),

('incidents', 'Incident Response', '## How We Handle Incidents

1. **Detection**: Automated monitoring and manual review identify potential incidents
2. **Assessment**: Severity classified (Low, Medium, High, Critical)
3. **Containment**: Immediate steps to limit impact
4. **Resolution**: Root cause analysis and fix implementation
5. **Communication**: Affected customers notified per severity
6. **Review**: Post-incident review and prevention measures

## Notification

- **Critical Incidents**: Email notification within 24 hours
- **Security Breaches**: Notification per applicable regulations
- **Updates**: Via email and in-app notifications

## Reporting Security Issues

If you discover a security vulnerability, please report it to security@casewyze.com.

We appreciate responsible disclosure and will acknowledge receipt within 48 hours.', 6, true);

-- 5. RPC: Update trust center section
CREATE OR REPLACE FUNCTION public.update_trust_center_section(
  p_section text,
  p_title text DEFAULT NULL,
  p_content_markdown text DEFAULT NULL,
  p_is_visible boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE trust_center_config
  SET
    title = COALESCE(p_title, title),
    content_markdown = COALESCE(p_content_markdown, content_markdown),
    is_visible = COALESCE(p_is_visible, is_visible),
    last_reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE section = p_section;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'TRUST_CENTER_UPDATED',
    auth.uid(),
    jsonb_build_object('section', p_section)
  );
END;
$$;

-- 6. RPC: Get all trust center content (including hidden for admins)
CREATE OR REPLACE FUNCTION public.get_trust_center_admin()
RETURNS TABLE (
  id uuid,
  section text,
  title text,
  content_markdown text,
  display_order integer,
  is_visible boolean,
  last_reviewed_at timestamptz,
  reviewed_by_name text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    tc.id,
    tc.section,
    tc.title,
    tc.content_markdown,
    tc.display_order,
    tc.is_visible,
    tc.last_reviewed_at,
    p.full_name as reviewed_by_name,
    tc.updated_at
  FROM trust_center_config tc
  LEFT JOIN profiles p ON tc.reviewed_by = p.id
  ORDER BY tc.display_order;
END;
$$;