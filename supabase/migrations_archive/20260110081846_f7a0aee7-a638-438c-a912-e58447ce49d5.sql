-- Step 20: Regional Data Residency & Geo-Controls (Fixed)
-- ==================================================

-- 1. Create data region enum (may already exist from partial migration)
DO $$ BEGIN
  CREATE TYPE public.data_region AS ENUM ('us', 'eu');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add regional columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS data_region public.data_region NOT NULL DEFAULT 'us',
ADD COLUMN IF NOT EXISTS region_locked boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS region_selected_at timestamptz,
ADD COLUMN IF NOT EXISTS custom_domain text;

-- 3. Add allowed_regions to profiles for admin/support access control
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allowed_regions text[] DEFAULT ARRAY['us', 'eu'];

-- 4. Create control plane table (lightweight tenant resolution - minimal data only)
CREATE TABLE IF NOT EXISTS public.control_plane_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data_region public.data_region NOT NULL,
  subdomain text,
  custom_domain text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'migrating')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS on control_plane_tenants
ALTER TABLE public.control_plane_tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (from partial migration)
DROP POLICY IF EXISTS "Control plane readable for resolution" ON public.control_plane_tenants;
DROP POLICY IF EXISTS "Platform admins can manage control plane" ON public.control_plane_tenants;
DROP POLICY IF EXISTS "Platform staff can manage control plane" ON public.control_plane_tenants;

-- RLS: Read-only for resolution
CREATE POLICY "Control plane readable for resolution"
  ON public.control_plane_tenants
  FOR SELECT
  USING (true);

-- Platform staff (admin role) can manage
CREATE POLICY "Platform staff can manage control plane"
  ON public.control_plane_tenants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_staff
      WHERE user_id = auth.uid() AND role = 'platform_admin' AND is_active = true
    )
  );

-- 5. Create regional access audit table
CREATE TABLE IF NOT EXISTS public.regional_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  requested_region text,
  org_region public.data_region,
  ip_address text,
  user_agent text,
  blocked boolean DEFAULT false,
  block_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regional_access_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Org admins can view regional access logs" ON public.regional_access_logs;
DROP POLICY IF EXISTS "Platform admins can view all regional logs" ON public.regional_access_logs;
DROP POLICY IF EXISTS "Platform staff can view all regional logs" ON public.regional_access_logs;

-- RLS: Org admins can view their logs
CREATE POLICY "Org admins can view regional access logs"
  ON public.regional_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = regional_access_logs.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Platform staff can view all
CREATE POLICY "Platform staff can view all regional logs"
  ON public.regional_access_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_staff
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 6. Create region migration requests table
CREATE TABLE IF NOT EXISTS public.region_migration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_region public.data_region NOT NULL,
  target_region public.data_region NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled')),
  requested_by uuid REFERENCES public.profiles(id),
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  completed_at timestamptz,
  contract_amendment_id uuid REFERENCES public.contracts(id),
  notes text,
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.region_migration_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Org admins can view migration requests" ON public.region_migration_requests;
DROP POLICY IF EXISTS "Org admins can create migration requests" ON public.region_migration_requests;
DROP POLICY IF EXISTS "Platform admins can manage migration requests" ON public.region_migration_requests;
DROP POLICY IF EXISTS "Platform staff can manage migration requests" ON public.region_migration_requests;

-- RLS: Org admins can view their requests
CREATE POLICY "Org admins can view migration requests"
  ON public.region_migration_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = region_migration_requests.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Org admins can create requests
CREATE POLICY "Org admins can create migration requests"
  ON public.region_migration_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = region_migration_requests.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Platform staff can manage all
CREATE POLICY "Platform staff can manage migration requests"
  ON public.region_migration_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_staff
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 7. Function to set organization region (only allowed during provisioning or by platform admin)
CREATE OR REPLACE FUNCTION public.set_organization_region(
  p_organization_id uuid,
  p_region public.data_region,
  p_force boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_platform_admin boolean;
  v_current_org RECORD;
BEGIN
  -- Check if platform admin
  SELECT EXISTS (
    SELECT 1 FROM platform_staff WHERE user_id = v_user_id AND role = 'platform_admin' AND is_active = true
  ) INTO v_is_platform_admin;

  -- Get current org state
  SELECT data_region, region_locked, region_selected_at
  INTO v_current_org
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- If region is already locked and not forcing (platform admin only)
  IF v_current_org.region_locked AND v_current_org.region_selected_at IS NOT NULL THEN
    IF NOT p_force OR NOT v_is_platform_admin THEN
      RAISE EXCEPTION 'Region is locked. Contact support for migration.';
    END IF;
  END IF;

  -- Update region
  UPDATE organizations
  SET 
    data_region = p_region,
    region_locked = true,
    region_selected_at = COALESCE(region_selected_at, now())
  WHERE id = p_organization_id;

  -- Update control plane
  INSERT INTO control_plane_tenants (organization_id, data_region, subdomain)
  SELECT p_organization_id, p_region, subdomain
  FROM organizations WHERE id = p_organization_id
  ON CONFLICT (organization_id) DO UPDATE
  SET data_region = p_region, updated_at = now();

  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (
    p_organization_id,
    v_user_id,
    'REGION_SET',
    jsonb_build_object(
      'region', p_region::text,
      'forced', p_force,
      'previous_region', v_current_org.data_region::text
    )
  );

  RETURN true;
END;
$$;

-- 8. Function to request region migration
CREATE OR REPLACE FUNCTION public.request_region_migration(
  p_organization_id uuid,
  p_target_region public.data_region,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_region public.data_region;
  v_request_id uuid;
BEGIN
  -- Verify user is org admin
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only org admins can request migration';
  END IF;

  -- Get current region
  SELECT data_region INTO v_current_region
  FROM organizations WHERE id = p_organization_id;

  IF v_current_region = p_target_region THEN
    RAISE EXCEPTION 'Organization is already in the requested region';
  END IF;

  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM region_migration_requests
    WHERE organization_id = p_organization_id
    AND status IN ('pending', 'approved', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'A migration request is already pending';
  END IF;

  -- Create request
  INSERT INTO region_migration_requests (
    organization_id,
    current_region,
    target_region,
    requested_by,
    notes
  )
  VALUES (
    p_organization_id,
    v_current_region,
    p_target_region,
    v_user_id,
    p_notes
  )
  RETURNING id INTO v_request_id;

  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (
    p_organization_id,
    v_user_id,
    'REGION_MIGRATION_REQUESTED',
    jsonb_build_object(
      'request_id', v_request_id,
      'current_region', v_current_region::text,
      'target_region', p_target_region::text
    )
  );

  RETURN v_request_id;
END;
$$;

-- 9. Function to check region access (for edge functions)
CREATE OR REPLACE FUNCTION public.check_region_access(
  p_organization_id uuid,
  p_request_region text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_region public.data_region;
  v_user_allowed_regions text[];
BEGIN
  -- Get org region
  SELECT data_region INTO v_org_region
  FROM organizations WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ORGANIZATION_NOT_FOUND');
  END IF;

  -- Check if request region matches org region
  IF p_request_region IS NOT NULL AND p_request_region != v_org_region::text THEN
    -- Log blocked access
    INSERT INTO regional_access_logs (
      organization_id, user_id, action, requested_region, 
      org_region, blocked, block_reason
    )
    VALUES (
      p_organization_id, v_user_id, 'API_ACCESS',
      p_request_region, v_org_region, true, 'REGION_MISMATCH'
    );

    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'REGION_MISMATCH',
      'org_region', v_org_region::text,
      'request_region', p_request_region
    );
  END IF;

  -- Check user's allowed regions
  SELECT allowed_regions INTO v_user_allowed_regions
  FROM profiles WHERE id = v_user_id;

  IF v_user_allowed_regions IS NOT NULL AND array_length(v_user_allowed_regions, 1) > 0 
     AND NOT (v_org_region::text = ANY(v_user_allowed_regions)) THEN
    -- Log blocked access
    INSERT INTO regional_access_logs (
      organization_id, user_id, action, requested_region, 
      org_region, blocked, block_reason
    )
    VALUES (
      p_organization_id, v_user_id, 'API_ACCESS',
      p_request_region, v_org_region, true, 'USER_REGION_RESTRICTED'
    );

    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'USER_REGION_RESTRICTED',
      'org_region', v_org_region::text,
      'user_allowed_regions', v_user_allowed_regions
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'region', v_org_region::text);
END;
$$;

-- 10. Function to get region info for UI
CREATE OR REPLACE FUNCTION public.get_organization_region_info(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_pending_migration RECORD;
BEGIN
  SELECT 
    data_region, region_locked, region_selected_at
  INTO v_org
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check for pending migration
  SELECT id, status, target_region, requested_at
  INTO v_pending_migration
  FROM region_migration_requests
  WHERE organization_id = p_organization_id
  AND status IN ('pending', 'approved', 'in_progress')
  ORDER BY requested_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'data_region', v_org.data_region::text,
    'region_locked', v_org.region_locked,
    'region_selected_at', v_org.region_selected_at,
    'region_display_name', CASE 
      WHEN v_org.data_region = 'us' THEN 'United States'
      WHEN v_org.data_region = 'eu' THEN 'European Union'
      ELSE v_org.data_region::text
    END,
    'pending_migration', CASE 
      WHEN v_pending_migration.id IS NOT NULL THEN jsonb_build_object(
        'id', v_pending_migration.id,
        'status', v_pending_migration.status,
        'target_region', v_pending_migration.target_region::text,
        'requested_at', v_pending_migration.requested_at
      )
      ELSE NULL
    END
  );
END;
$$;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_data_region ON public.organizations(data_region);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON public.organizations(custom_domain);
CREATE INDEX IF NOT EXISTS idx_control_plane_subdomain ON public.control_plane_tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_control_plane_custom_domain ON public.control_plane_tenants(custom_domain);
CREATE INDEX IF NOT EXISTS idx_regional_access_logs_org ON public.regional_access_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_region_migration_status ON public.region_migration_requests(organization_id, status);

-- 12. Trigger to sync control plane on org changes
CREATE OR REPLACE FUNCTION public.sync_control_plane_on_org_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO control_plane_tenants (organization_id, data_region, subdomain, custom_domain)
  VALUES (NEW.id, NEW.data_region, NEW.subdomain, NEW.custom_domain)
  ON CONFLICT (organization_id) DO UPDATE
  SET 
    data_region = NEW.data_region,
    subdomain = NEW.subdomain,
    custom_domain = NEW.custom_domain,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_control_plane_trigger ON public.organizations;
CREATE TRIGGER sync_control_plane_trigger
  AFTER INSERT OR UPDATE OF data_region, subdomain, custom_domain ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_control_plane_on_org_update();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_organization_region TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_region_migration TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_region_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_region_info TO authenticated;