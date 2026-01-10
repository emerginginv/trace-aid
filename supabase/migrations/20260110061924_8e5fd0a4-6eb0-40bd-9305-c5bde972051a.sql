-- =====================================================
-- Step 6: Billing Enforcement + Feature Flags by Plan
-- =====================================================

-- 1. Create organization_usage table to track resource consumption
CREATE TABLE IF NOT EXISTS public.organization_usage (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  seats_used integer NOT NULL DEFAULT 0,
  cases_count integer NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_usage
CREATE POLICY "Org members can view their org usage"
ON public.organization_usage
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Only system/service role can update usage (via triggers/functions)
CREATE POLICY "Service role can manage usage"
ON public.organization_usage
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. Create organization_entitlements_overrides for custom enterprise contracts
CREATE TABLE IF NOT EXISTS public.organization_entitlements_overrides (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  overrides jsonb NOT NULL DEFAULT '{}',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_entitlements_overrides ENABLE ROW LEVEL SECURITY;

-- Only admins can view overrides for their org
CREATE POLICY "Org admins can view their entitlement overrides"
ON public.organization_entitlements_overrides
FOR SELECT
USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Service role manages overrides (set by support/sales)
CREATE POLICY "Service role can manage entitlement overrides"
ON public.organization_entitlements_overrides
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. Initialize usage records for existing organizations
INSERT INTO public.organization_usage (organization_id, seats_used, cases_count, storage_bytes)
SELECT 
  o.id,
  COALESCE((SELECT COUNT(*)::int FROM organization_members om WHERE om.organization_id = o.id), 0),
  COALESCE((SELECT COUNT(*)::int FROM cases c WHERE c.organization_id = o.id), 0),
  COALESCE(
    (SELECT COALESCE(SUM(ca.file_size), 0) + COALESCE((SELECT SUM(sa.file_size) FROM subject_attachments sa WHERE sa.organization_id = o.id), 0) 
     FROM case_attachments ca WHERE ca.organization_id = o.id), 
    0
  )
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM organization_usage ou WHERE ou.organization_id = o.id);

-- 4. Create function to get plan entitlements with product ID mapping
CREATE OR REPLACE FUNCTION public.get_plan_entitlements(p_product_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE p_product_id
    -- The Investigator - $12/month
    WHEN 'prod_TagUwxglXyq7Ls' THEN jsonb_build_object(
      'plan_name', 'The Investigator',
      'max_seats', 2,
      'max_cases', -1, -- unlimited
      'max_storage_bytes', 53687091200::bigint, -- 50 GB
      'custom_domains', false,
      'exports_pdf', true,
      'api_access', false,
      'advanced_analytics', false,
      'priority_support', false
    )
    -- The Agency - $39/month
    WHEN 'prod_TagbsPhNweUFpe' THEN jsonb_build_object(
      'plan_name', 'The Agency',
      'max_seats', 5,
      'max_cases', -1,
      'max_storage_bytes', 268435456000::bigint, -- 250 GB
      'custom_domains', false,
      'exports_pdf', true,
      'api_access', true,
      'advanced_analytics', true,
      'priority_support', false
    )
    -- The Enterprise - $69/month
    WHEN 'prod_Tagc0lPxc1XjVC' THEN jsonb_build_object(
      'plan_name', 'The Enterprise',
      'max_seats', 16,
      'max_cases', -1,
      'max_storage_bytes', 536870912000::bigint, -- 500 GB
      'custom_domains', true,
      'exports_pdf', true,
      'api_access', true,
      'advanced_analytics', true,
      'priority_support', true
    )
    -- Free/No subscription
    ELSE jsonb_build_object(
      'plan_name', 'Free',
      'max_seats', 1,
      'max_cases', 10,
      'max_storage_bytes', 1073741824::bigint, -- 1 GB
      'custom_domains', false,
      'exports_pdf', true,
      'api_access', false,
      'advanced_analytics', false,
      'priority_support', false
    )
  END;
END;
$$;

-- 5. Create function to get effective entitlements (base + overrides) for an org
CREATE OR REPLACE FUNCTION public.get_organization_entitlements(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_base_entitlements jsonb;
  v_overrides jsonb;
  v_usage RECORD;
  v_subscription_active boolean;
BEGIN
  -- Get org info
  SELECT subscription_product_id, subscription_status, subscription_tier
  INTO v_org
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;
  
  -- Determine subscription status
  v_subscription_active := v_org.subscription_status IN ('active', 'trialing');
  
  -- Get base entitlements from product ID
  v_base_entitlements := get_plan_entitlements(
    CASE WHEN v_subscription_active THEN v_org.subscription_product_id ELSE NULL END
  );
  
  -- Get any overrides
  SELECT overrides INTO v_overrides
  FROM organization_entitlements_overrides
  WHERE organization_id = p_organization_id;
  
  -- Merge overrides into base (overrides take precedence)
  IF v_overrides IS NOT NULL THEN
    v_base_entitlements := v_base_entitlements || v_overrides;
  END IF;
  
  -- Get current usage
  SELECT seats_used, cases_count, storage_bytes, updated_at
  INTO v_usage
  FROM organization_usage
  WHERE organization_id = p_organization_id;
  
  -- Return combined result
  RETURN jsonb_build_object(
    'organization_id', p_organization_id,
    'subscription_product_id', v_org.subscription_product_id,
    'subscription_status', v_org.subscription_status,
    'subscription_tier', v_org.subscription_tier,
    'subscription_active', v_subscription_active,
    'entitlements', v_base_entitlements,
    'usage', jsonb_build_object(
      'seats_used', COALESCE(v_usage.seats_used, 0),
      'cases_count', COALESCE(v_usage.cases_count, 0),
      'storage_bytes', COALESCE(v_usage.storage_bytes, 0),
      'updated_at', COALESCE(v_usage.updated_at, now())
    )
  );
END;
$$;

-- 6. Create enforcement function that checks entitlements before allowing actions
CREATE OR REPLACE FUNCTION public.enforce_entitlement(
  p_organization_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlements jsonb;
  v_limits jsonb;
  v_usage jsonb;
  v_max_seats int;
  v_max_cases int;
  v_max_storage bigint;
  v_seats_used int;
  v_cases_count int;
  v_storage_bytes bigint;
  v_new_storage bigint;
  v_custom_domains boolean;
  v_subscription_active boolean;
BEGIN
  -- Verify user is member of org
  IF NOT is_org_member(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error_code', 'ACCESS_DENIED',
      'message', 'You do not have access to this organization'
    );
  END IF;

  -- Get current entitlements
  v_entitlements := get_organization_entitlements(p_organization_id);
  
  IF v_entitlements ? 'error' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error_code', 'ORG_NOT_FOUND',
      'message', v_entitlements->>'error'
    );
  END IF;
  
  v_subscription_active := (v_entitlements->>'subscription_active')::boolean;
  v_limits := v_entitlements->'entitlements';
  v_usage := v_entitlements->'usage';
  
  -- Extract values
  v_max_seats := (v_limits->>'max_seats')::int;
  v_max_cases := (v_limits->>'max_cases')::int;
  v_max_storage := (v_limits->>'max_storage_bytes')::bigint;
  v_custom_domains := (v_limits->>'custom_domains')::boolean;
  
  v_seats_used := (v_usage->>'seats_used')::int;
  v_cases_count := (v_usage->>'cases_count')::int;
  v_storage_bytes := (v_usage->>'storage_bytes')::bigint;
  
  -- Check based on action type
  CASE p_action
    WHEN 'ADD_SEAT', 'INVITE_USER' THEN
      IF v_max_seats > 0 AND v_seats_used >= v_max_seats THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'PLAN_LIMIT_SEATS_REACHED',
          'message', format('Your plan allows %s seats. Upgrade to add more users.', v_max_seats),
          'current', v_seats_used,
          'limit', v_max_seats
        );
      END IF;
      
    WHEN 'CREATE_CASE' THEN
      IF v_max_cases > 0 AND v_cases_count >= v_max_cases THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'PLAN_LIMIT_CASES_REACHED',
          'message', format('Your plan allows %s cases. Upgrade for unlimited cases.', v_max_cases),
          'current', v_cases_count,
          'limit', v_max_cases
        );
      END IF;
      
    WHEN 'UPLOAD_ATTACHMENT' THEN
      v_new_storage := COALESCE((p_payload->>'file_size')::bigint, 0);
      IF v_max_storage > 0 AND (v_storage_bytes + v_new_storage) > v_max_storage THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'PLAN_LIMIT_STORAGE_REACHED',
          'message', format('Storage limit reached. Upgrade for more storage or purchase a storage add-on.'),
          'current_bytes', v_storage_bytes,
          'limit_bytes', v_max_storage,
          'requested_bytes', v_new_storage
        );
      END IF;
      
    WHEN 'REQUEST_CUSTOM_DOMAIN' THEN
      IF NOT v_subscription_active THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'SUBSCRIPTION_INACTIVE',
          'message', 'An active subscription is required to use custom domains.'
        );
      END IF;
      
      IF NOT v_custom_domains THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'PLAN_FEATURE_NOT_AVAILABLE',
          'message', 'Custom domains require The Enterprise plan.',
          'required_plan', 'The Enterprise'
        );
      END IF;
      
    WHEN 'ACCESS_API' THEN
      IF NOT (v_limits->>'api_access')::boolean THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'PLAN_FEATURE_NOT_AVAILABLE',
          'message', 'API access requires The Agency plan or higher.',
          'required_plan', 'The Agency'
        );
      END IF;
      
    WHEN 'ACCESS_ADVANCED_ANALYTICS' THEN
      IF NOT (v_limits->>'advanced_analytics')::boolean THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'error_code', 'PLAN_FEATURE_NOT_AVAILABLE',
          'message', 'Advanced analytics require The Agency plan or higher.',
          'required_plan', 'The Agency'
        );
      END IF;
      
    ELSE
      -- Unknown action - allow but log
      RETURN jsonb_build_object(
        'allowed', true,
        'warning', 'Unknown action type'
      );
  END CASE;
  
  -- Action allowed
  RETURN jsonb_build_object(
    'allowed', true,
    'entitlements', v_limits,
    'usage', v_usage
  );
END;
$$;

-- 7. Create trigger function to update usage counters
CREATE OR REPLACE FUNCTION public.update_organization_usage_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Determine organization_id based on table and operation
  IF TG_TABLE_NAME = 'organization_members' THEN
    v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME = 'cases' THEN
    v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME IN ('case_attachments', 'subject_attachments') THEN
    v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  END IF;
  
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Upsert usage record
  INSERT INTO organization_usage (organization_id, seats_used, cases_count, storage_bytes, updated_at)
  VALUES (
    v_org_id,
    (SELECT COUNT(*)::int FROM organization_members WHERE organization_id = v_org_id),
    (SELECT COUNT(*)::int FROM cases WHERE organization_id = v_org_id),
    (SELECT COALESCE(SUM(file_size), 0) FROM case_attachments WHERE organization_id = v_org_id) +
    (SELECT COALESCE(SUM(file_size), 0) FROM subject_attachments WHERE organization_id = v_org_id),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    seats_used = (SELECT COUNT(*)::int FROM organization_members WHERE organization_id = v_org_id),
    cases_count = (SELECT COUNT(*)::int FROM cases WHERE organization_id = v_org_id),
    storage_bytes = (SELECT COALESCE(SUM(file_size), 0) FROM case_attachments WHERE organization_id = v_org_id) +
                    (SELECT COALESCE(SUM(file_size), 0) FROM subject_attachments WHERE organization_id = v_org_id),
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. Create triggers to automatically update usage
DROP TRIGGER IF EXISTS trg_update_usage_on_member_change ON organization_members;
CREATE TRIGGER trg_update_usage_on_member_change
AFTER INSERT OR DELETE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION update_organization_usage_counters();

DROP TRIGGER IF EXISTS trg_update_usage_on_case_change ON cases;
CREATE TRIGGER trg_update_usage_on_case_change
AFTER INSERT OR DELETE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_organization_usage_counters();

DROP TRIGGER IF EXISTS trg_update_usage_on_attachment_change ON case_attachments;
CREATE TRIGGER trg_update_usage_on_attachment_change
AFTER INSERT OR DELETE ON case_attachments
FOR EACH ROW
EXECUTE FUNCTION update_organization_usage_counters();

DROP TRIGGER IF EXISTS trg_update_usage_on_subject_attachment_change ON subject_attachments;
CREATE TRIGGER trg_update_usage_on_subject_attachment_change
AFTER INSERT OR DELETE ON subject_attachments
FOR EACH ROW
EXECUTE FUNCTION update_organization_usage_counters();

-- 9. Audit events for plan-related actions
-- (audit_events table already exists from Step 4)

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_plan_entitlements(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_entitlements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_entitlement(uuid, text, jsonb) TO authenticated;