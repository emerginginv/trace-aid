-- Step 10: SOC-2 Framework - Complete with platform_staff

-- 1. Platform staff table (prerequisite)
CREATE TABLE IF NOT EXISTS public.platform_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role text NOT NULL DEFAULT 'platform_support' CHECK (role IN ('platform_admin', 'platform_support')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_staff ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage platform staff
CREATE POLICY "Platform staff can view themselves" ON public.platform_staff
  FOR SELECT USING (user_id = auth.uid());

-- 2. SOC-2 Controls table
CREATE TABLE IF NOT EXISTS public.soc2_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_code text NOT NULL UNIQUE,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  implementation_notes text,
  owner_role text DEFAULT 'platform_admin',
  frequency text DEFAULT 'continuous',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.soc2_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view controls" ON public.soc2_controls
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 3. Control evidence table
CREATE TABLE IF NOT EXISTS public.control_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid REFERENCES public.soc2_controls(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  description text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  file_path text,
  metadata jsonb DEFAULT '{}',
  collected_at timestamptz DEFAULT now(),
  collected_by uuid
);

ALTER TABLE public.control_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view evidence" ON public.control_evidence
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage evidence" ON public.control_evidence
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 4. Access reviews table
CREATE TABLE IF NOT EXISTS public.access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_type text DEFAULT 'quarterly',
  review_period_start timestamptz DEFAULT now() - interval '3 months',
  review_period_end timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  reviewer_id uuid,
  completed_by uuid,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view reviews" ON public.access_reviews
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage reviews" ON public.access_reviews
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 5. Access review items
CREATE TABLE IF NOT EXISTS public.access_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.access_reviews(id) ON DELETE CASCADE,
  user_id uuid,
  organization_id uuid REFERENCES public.organizations(id),
  user_role text NOT NULL,
  action_taken text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.access_review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view items" ON public.access_review_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage items" ON public.access_review_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 6. Change log
CREATE TABLE IF NOT EXISTS public.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  impact_level text DEFAULT 'low',
  ticket_reference text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view changes" ON public.change_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage changes" ON public.change_log
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 7. Security incidents
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text UNIQUE,
  severity text NOT NULL DEFAULT 'low',
  status text DEFAULT 'open',
  title text NOT NULL,
  description text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_summary text,
  reported_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view incidents" ON public.security_incidents
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage incidents" ON public.security_incidents
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 8. Compliance exports
CREATE TABLE IF NOT EXISTS public.compliance_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type text NOT NULL,
  file_path text,
  status text DEFAULT 'pending',
  requested_by uuid,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.compliance_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff view exports" ON public.compliance_exports
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

CREATE POLICY "Platform staff manage exports" ON public.compliance_exports
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_staff ps WHERE ps.user_id = auth.uid() AND ps.is_active = true));

-- 9. Seed controls
INSERT INTO public.soc2_controls (control_code, category, title, description, implementation_notes, frequency) VALUES
('CC6.1', 'Security', 'Logical Access Security', 'Access restricted via RBAC.', 'RLS policies and permissions.', 'continuous'),
('CC6.7', 'Security', 'Privileged Access', 'Privileged access monitored.', 'Platform staff table, impersonation audit.', 'continuous'),
('CC7.2', 'Security', 'Security Event Logging', 'Events are logged.', 'Audit_events table.', 'continuous'),
('CC8.1', 'Security', 'Change Management', 'Changes documented.', 'Change_log table.', 'continuous'),
('A1.3', 'Availability', 'Backup and Recovery', 'Data backed up.', 'Supabase automatic backups.', 'daily'),
('C1.1', 'Confidentiality', 'Data Segregation', 'Customer data segregated.', 'Multi-tenant RLS policies.', 'continuous'),
('C1.3', 'Confidentiality', 'Data Retention', 'Retention enforced.', 'Retention_days, retain_until fields.', 'continuous'),
('P1.1', 'Privacy', 'Data Subject Rights', 'DSR requests handled.', 'Data_subject_requests table.', 'continuous')
ON CONFLICT (control_code) DO NOTHING;

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_platform_staff_user ON platform_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_control_evidence_control ON control_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_access_reviews_status ON access_reviews(status);
CREATE INDEX IF NOT EXISTS idx_access_review_items_review ON access_review_items(review_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_change_log_created ON change_log(created_at);