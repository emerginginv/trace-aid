-- =============================================
-- Comprehensive Enforcement & Audit Migration
-- =============================================

-- 1. Create enforcement_actions table for all blocked/allowed actions
CREATE TABLE IF NOT EXISTS public.enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL, -- 'activity_create', 'activity_update', 'service_create', 'invoice_generate', etc.
  enforcement_type TEXT NOT NULL, -- 'budget', 'tier', 'pricing', 'lock', 'permission'
  was_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  context JSONB DEFAULT '{}', -- Details about the action attempted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enforcement_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enforcement actions for their org"
  ON public.enforcement_actions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert enforcement actions for their org"
  ON public.enforcement_actions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_enforcement_actions_case ON public.enforcement_actions(case_id);
CREATE INDEX idx_enforcement_actions_org ON public.enforcement_actions(organization_id);
CREATE INDEX idx_enforcement_actions_created ON public.enforcement_actions(created_at DESC);
CREATE INDEX idx_enforcement_actions_type ON public.enforcement_actions(enforcement_type, action_type);

-- 2. Create comprehensive enforcement function
CREATE OR REPLACE FUNCTION public.enforce_budget_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_consumption RECORD;
  v_new_hours NUMERIC;
  v_new_amount NUMERIC;
  v_would_exceed BOOLEAN := false;
  v_block_reason TEXT;
  v_case_org_id UUID;
BEGIN
  -- Only check on INSERT or if hours/amount changed on UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Skip if nothing budget-related changed
    IF OLD.case_service_instance_id IS NOT DISTINCT FROM NEW.case_service_instance_id THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Get case organization
  SELECT organization_id INTO v_case_org_id FROM cases WHERE id = NEW.case_id;
  
  -- Get case budget
  SELECT * INTO v_budget
  FROM case_budgets
  WHERE case_id = NEW.case_id;
  
  -- No budget = no enforcement
  IF v_budget IS NULL OR v_budget.hard_cap = false THEN
    RETURN NEW;
  END IF;
  
  -- Calculate current consumption
  SELECT 
    COALESCE(SUM(
      CASE WHEN cf.hours IS NOT NULL THEN cf.hours ELSE 0 END
    ), 0) as total_hours,
    COALESCE(SUM(cf.amount), 0) as total_amount
  INTO v_consumption
  FROM case_finances cf
  WHERE cf.case_id = NEW.case_id
    AND cf.finance_type IN ('time', 'expense');
  
  -- Check hours limit
  IF v_budget.total_budget_hours IS NOT NULL THEN
    IF v_consumption.total_hours >= v_budget.total_budget_hours THEN
      v_would_exceed := true;
      v_block_reason := format('Hours budget exceeded: %s of %s hours used', 
        v_consumption.total_hours, v_budget.total_budget_hours);
    END IF;
  END IF;
  
  -- Check amount limit
  IF v_budget.total_budget_amount IS NOT NULL AND NOT v_would_exceed THEN
    IF v_consumption.total_amount >= v_budget.total_budget_amount THEN
      v_would_exceed := true;
      v_block_reason := format('Dollar budget exceeded: $%s of $%s used', 
        v_consumption.total_amount, v_budget.total_budget_amount);
    END IF;
  END IF;
  
  -- If would exceed with hard cap, block and log
  IF v_would_exceed THEN
    -- Log the enforcement action
    INSERT INTO enforcement_actions (
      case_id, organization_id, user_id, action_type, enforcement_type,
      was_blocked, block_reason, context
    ) VALUES (
      NEW.case_id, v_case_org_id, NEW.user_id, 'activity_create', 'budget',
      true, v_block_reason,
      jsonb_build_object(
        'activity_type', NEW.activity_type,
        'title', NEW.title,
        'hard_cap', v_budget.hard_cap
      )
    );
    
    -- Log budget violation
    INSERT INTO budget_violation_events (
      case_id, organization_id, user_id, violation_type, budget_scope,
      service_instance_id, hours_at_violation, amount_at_violation,
      hours_limit, amount_limit, action_attempted, action_blocked
    ) VALUES (
      NEW.case_id, v_case_org_id, NEW.user_id, 'hard_cap_exceeded', 'case',
      NEW.case_service_instance_id, v_consumption.total_hours, v_consumption.total_amount,
      v_budget.total_budget_hours, v_budget.total_budget_amount, 'create_activity', true
    );
    
    RAISE EXCEPTION 'Budget exceeded: This case has a hard budget cap that has been reached. %', v_block_reason;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to case_activities
DROP TRIGGER IF EXISTS trg_enforce_budget_on_activity ON case_activities;
CREATE TRIGGER trg_enforce_budget_on_activity
  BEFORE INSERT ON case_activities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_budget_on_activity();

-- 3. Create enforcement function for service instances
CREATE OR REPLACE FUNCTION public.enforce_budget_on_service()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_service_limit RECORD;
  v_consumption JSONB;
  v_block_reason TEXT;
BEGIN
  -- Check service-level budget limit
  IF TG_OP = 'UPDATE' AND OLD.id IS NOT NULL THEN
    SELECT * INTO v_service_limit
    FROM case_service_budget_limits
    WHERE case_service_instance_id = NEW.id;
    
    IF v_service_limit IS NOT NULL THEN
      -- Get service consumption
      v_consumption := get_service_budget_status(NEW.id);
      
      -- Check if completing this service would exceed limits
      IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF (v_consumption->>'utilization_pct')::NUMERIC >= 100 THEN
          v_block_reason := 'Service budget limit reached';
          
          INSERT INTO enforcement_actions (
            case_id, organization_id, user_id, action_type, enforcement_type,
            was_blocked, block_reason, context
          ) VALUES (
            NEW.case_id, NEW.organization_id, COALESCE(NEW.created_by, auth.uid()), 
            'service_complete', 'budget',
            true, v_block_reason,
            jsonb_build_object(
              'service_instance_id', NEW.id,
              'consumption', v_consumption
            )
          );
          
          RAISE EXCEPTION 'Service budget limit reached. Cannot complete service.';
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_budget_on_service ON case_service_instances;
CREATE TRIGGER trg_enforce_budget_on_service
  BEFORE UPDATE ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION enforce_budget_on_service();

-- 4. Create enforcement function for pricing rule validation
CREATE OR REPLACE FUNCTION public.enforce_pricing_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_has_valid_rule BOOLEAN := false;
BEGIN
  -- Check if there's a valid pricing rule for this service
  SELECT EXISTS (
    SELECT 1 FROM pricing_rules pr
    WHERE pr.case_service_id = NEW.case_service_id
      AND pr.is_active = true
      AND (pr.effective_from IS NULL OR pr.effective_from <= CURRENT_DATE)
      AND (pr.effective_to IS NULL OR pr.effective_to >= CURRENT_DATE)
  ) INTO v_has_valid_rule;
  
  -- If billable but no pricing rule, log warning (don't block)
  IF NEW.billable = true AND NOT v_has_valid_rule THEN
    INSERT INTO enforcement_actions (
      case_id, organization_id, user_id, action_type, enforcement_type,
      was_blocked, block_reason, context
    ) VALUES (
      NEW.case_id, NEW.organization_id, COALESCE(NEW.created_by, auth.uid()),
      'service_create', 'pricing',
      false, 'No active pricing rule found for billable service',
      jsonb_build_object(
        'service_instance_id', NEW.id,
        'case_service_id', NEW.case_service_id,
        'billable', NEW.billable
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pricing_rules ON case_service_instances;
CREATE TRIGGER trg_enforce_pricing_rules
  AFTER INSERT ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION enforce_pricing_rules();

-- 5. Create trigger for tier enforcement on services
CREATE OR REPLACE FUNCTION public.enforce_tier_on_service_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_tier TEXT;
  v_service_count INTEGER;
  v_max_services INTEGER;
  v_case_org_id UUID;
BEGIN
  -- Get organization tier
  SELECT organization_id INTO v_case_org_id FROM cases WHERE id = NEW.case_id;
  
  SELECT subscription_tier INTO v_org_tier
  FROM organizations
  WHERE id = v_case_org_id;
  
  -- Define tier limits (can be moved to a config table)
  CASE v_org_tier
    WHEN 'free' THEN v_max_services := 5;
    WHEN 'starter' THEN v_max_services := 20;
    WHEN 'professional' THEN v_max_services := 100;
    WHEN 'enterprise' THEN v_max_services := NULL; -- unlimited
    ELSE v_max_services := 10;
  END CASE;
  
  -- Check current count
  IF v_max_services IS NOT NULL THEN
    SELECT COUNT(*) INTO v_service_count
    FROM case_service_instances
    WHERE case_id = NEW.case_id;
    
    IF v_service_count >= v_max_services THEN
      INSERT INTO enforcement_actions (
        case_id, organization_id, user_id, action_type, enforcement_type,
        was_blocked, block_reason, context
      ) VALUES (
        NEW.case_id, v_case_org_id, COALESCE(NEW.created_by, auth.uid()),
        'service_create', 'tier',
        true, format('Tier limit reached: %s services max for %s tier', v_max_services, v_org_tier),
        jsonb_build_object(
          'tier', v_org_tier,
          'current_count', v_service_count,
          'max_allowed', v_max_services
        )
      );
      
      RAISE EXCEPTION 'Service limit reached for your subscription tier (% services). Please upgrade to add more.', v_max_services;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tier_on_service ON case_service_instances;
CREATE TRIGGER trg_enforce_tier_on_service
  BEFORE INSERT ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION enforce_tier_on_service_count();

-- 6. Create comprehensive audit logging function
CREATE OR REPLACE FUNCTION public.log_enforcement_audit(
  p_case_id UUID,
  p_action_type TEXT,
  p_enforcement_type TEXT,
  p_was_blocked BOOLEAN,
  p_block_reason TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_id UUID;
BEGIN
  -- Get organization from case
  SELECT organization_id INTO v_org_id FROM cases WHERE id = p_case_id;
  v_user_id := auth.uid();
  
  INSERT INTO enforcement_actions (
    case_id, organization_id, user_id, action_type, enforcement_type,
    was_blocked, block_reason, context
  ) VALUES (
    p_case_id, v_org_id, v_user_id, p_action_type, p_enforcement_type,
    p_was_blocked, p_block_reason, p_context
  )
  RETURNING id INTO v_id;
  
  -- Also log to general audit_events for compliance
  INSERT INTO audit_events (
    organization_id, actor_user_id, action, metadata
  ) VALUES (
    v_org_id, v_user_id,
    CASE WHEN p_was_blocked THEN 'enforcement_blocked' ELSE 'enforcement_allowed' END,
    jsonb_build_object(
      'case_id', p_case_id,
      'action_type', p_action_type,
      'enforcement_type', p_enforcement_type,
      'block_reason', p_block_reason,
      'context', p_context
    )
  );
  
  RETURN v_id;
END;
$$;

-- 7. Create view for enforcement summary per case
CREATE OR REPLACE VIEW public.case_enforcement_summary AS
SELECT 
  ea.case_id,
  ea.organization_id,
  COUNT(*) FILTER (WHERE ea.was_blocked = true) as blocked_actions_count,
  COUNT(*) FILTER (WHERE ea.was_blocked = false) as allowed_actions_count,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'budget') as budget_enforcements,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'tier') as tier_enforcements,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'pricing') as pricing_enforcements,
  COUNT(*) FILTER (WHERE ea.enforcement_type = 'lock') as lock_enforcements,
  MAX(ea.created_at) as last_enforcement_at,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'action_type', sub.action_type,
      'block_reason', sub.block_reason,
      'created_at', sub.created_at
    ) ORDER BY sub.created_at DESC)
    FROM (
      SELECT action_type, block_reason, created_at
      FROM enforcement_actions
      WHERE case_id = ea.case_id AND was_blocked = true
      ORDER BY created_at DESC
      LIMIT 5
    ) sub
  ) as recent_blocked_actions
FROM enforcement_actions ea
GROUP BY ea.case_id, ea.organization_id;

-- 8. Create function to get enforcement status for a case
CREATE OR REPLACE FUNCTION public.get_case_enforcement_status(p_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_budget_status JSONB;
  v_locked_services INTEGER;
  v_locked_activities INTEGER;
  v_blocked_count INTEGER;
  v_case RECORD;
BEGIN
  -- Get case info
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  IF v_case IS NULL THEN
    RETURN jsonb_build_object('error', 'Case not found');
  END IF;
  
  -- Get budget status
  SELECT jsonb_build_object(
    'has_budget', cb.id IS NOT NULL,
    'budget_type', cb.budget_type,
    'hard_cap', COALESCE(cb.hard_cap, false),
    'hours_limit', cb.total_budget_hours,
    'amount_limit', cb.total_budget_amount
  ) INTO v_budget_status
  FROM case_budgets cb
  WHERE cb.case_id = p_case_id;
  
  -- Count locked records
  SELECT COUNT(*) INTO v_locked_services
  FROM case_service_instances
  WHERE case_id = p_case_id AND locked_at IS NOT NULL;
  
  SELECT COUNT(*) INTO v_locked_activities
  FROM case_activities
  WHERE case_id = p_case_id AND locked_at IS NOT NULL;
  
  -- Count recent blocked actions
  SELECT COUNT(*) INTO v_blocked_count
  FROM enforcement_actions
  WHERE case_id = p_case_id 
    AND was_blocked = true
    AND created_at > now() - interval '7 days';
  
  RETURN jsonb_build_object(
    'case_id', p_case_id,
    'organization_id', v_case.organization_id,
    'budget', COALESCE(v_budget_status, jsonb_build_object('has_budget', false)),
    'locked_services', v_locked_services,
    'locked_activities', v_locked_activities,
    'blocked_actions_last_7_days', v_blocked_count,
    'has_active_enforcement', (
      v_budget_status IS NOT NULL AND (v_budget_status->>'hard_cap')::boolean = true
    ) OR v_locked_services > 0 OR v_locked_activities > 0
  );
END;
$$;