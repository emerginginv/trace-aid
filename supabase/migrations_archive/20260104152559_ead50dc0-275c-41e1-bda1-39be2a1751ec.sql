-- =============================================
-- CASE BUDGET DATA MODEL & LOGIC
-- Budget is an authorization limit (hours/dollars)
-- Budget is NOT a retainer, payment, or trust balance
-- =============================================

-- Part 1: Add budget fields to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS budget_hours numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS budget_dollars numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS budget_notes text DEFAULT NULL;

-- Add comments to clarify budget vs retainer
COMMENT ON COLUMN cases.budget_hours IS 'Authorization limit for hours - NOT a retainer or payment';
COMMENT ON COLUMN cases.budget_dollars IS 'Authorization limit for dollars - NOT a retainer or payment';
COMMENT ON COLUMN cases.budget_notes IS 'Notes about the budget authorization';

-- Part 2: Create immutable budget adjustments log table
CREATE TABLE IF NOT EXISTS case_budget_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('hours', 'dollars')),
  previous_value numeric,
  new_value numeric NOT NULL,
  adjustment_amount numeric GENERATED ALWAYS AS (COALESCE(new_value, 0) - COALESCE(previous_value, 0)) STORED,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment to clarify purpose
COMMENT ON TABLE case_budget_adjustments IS 'Immutable log of budget authorization changes. Budget is NOT a retainer, payment, or trust balance - it is an authorization limit.';

-- Part 3: Prevent updates and deletes (immutable log)
CREATE OR REPLACE FUNCTION prevent_budget_adjustment_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Budget adjustments are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_budget_adjustment_update ON case_budget_adjustments;
CREATE TRIGGER prevent_budget_adjustment_update
  BEFORE UPDATE ON case_budget_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_budget_adjustment_modification();

DROP TRIGGER IF EXISTS prevent_budget_adjustment_delete ON case_budget_adjustments;
CREATE TRIGGER prevent_budget_adjustment_delete
  BEFORE DELETE ON case_budget_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_budget_adjustment_modification();

-- Part 4: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_budget_adjustments_case_id ON case_budget_adjustments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_budget_adjustments_org ON case_budget_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_case_budget_adjustments_created ON case_budget_adjustments(created_at DESC);

-- Part 5: Enable RLS on budget adjustments
ALTER TABLE case_budget_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget adjustments
CREATE POLICY "Users can view budget adjustments in their organization"
  ON case_budget_adjustments FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users with modify_case_budget permission can insert"
  ON case_budget_adjustments FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) 
    AND has_permission(auth.uid(), 'modify_case_budget')
  );

-- Part 6: Computed totals function
CREATE OR REPLACE FUNCTION get_case_budget_summary(p_case_id uuid)
RETURNS TABLE (
  budget_hours_authorized numeric,
  budget_dollars_authorized numeric,
  hours_consumed numeric,
  dollars_consumed numeric,
  hours_remaining numeric,
  dollars_remaining numeric,
  hours_utilization_pct numeric,
  dollars_utilization_pct numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH case_budget AS (
    SELECT 
      COALESCE(c.budget_hours, 0) as auth_hours,
      COALESCE(c.budget_dollars, 0) as auth_dollars
    FROM cases c
    WHERE c.id = p_case_id
  ),
  consumed AS (
    SELECT 
      COALESCE(SUM(cf.hours), 0) as total_hours,
      COALESCE(SUM(CASE WHEN cf.finance_type IN ('expense', 'time') THEN cf.amount ELSE 0 END), 0) as total_dollars
    FROM case_finances cf
    WHERE cf.case_id = p_case_id
      AND (cf.status IS NULL OR cf.status != 'rejected')
  )
  SELECT 
    cb.auth_hours,
    cb.auth_dollars,
    co.total_hours,
    co.total_dollars,
    cb.auth_hours - co.total_hours,
    cb.auth_dollars - co.total_dollars,
    CASE WHEN cb.auth_hours > 0 
      THEN ROUND((co.total_hours / cb.auth_hours) * 100, 2) 
      ELSE 0 END,
    CASE WHEN cb.auth_dollars > 0 
      THEN ROUND((co.total_dollars / cb.auth_dollars) * 100, 2) 
      ELSE 0 END
  FROM case_budget cb, consumed co;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Part 7: Permission - Modify Case Budget
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'modify_case_budget', true),
  ('manager', 'modify_case_budget', true),
  ('investigator', 'modify_case_budget', false),
  ('vendor', 'modify_case_budget', false),
  ('member', 'modify_case_budget', false)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Part 8: Trigger to auto-log budget changes from cases table
CREATE OR REPLACE FUNCTION log_case_budget_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log hours change
  IF OLD.budget_hours IS DISTINCT FROM NEW.budget_hours THEN
    INSERT INTO case_budget_adjustments (
      case_id, user_id, organization_id, 
      adjustment_type, previous_value, new_value, reason
    ) VALUES (
      NEW.id, auth.uid(), NEW.organization_id,
      'hours', OLD.budget_hours, NEW.budget_hours,
      COALESCE(NEW.budget_notes, 'Budget hours updated')
    );
  END IF;
  
  -- Log dollars change
  IF OLD.budget_dollars IS DISTINCT FROM NEW.budget_dollars THEN
    INSERT INTO case_budget_adjustments (
      case_id, user_id, organization_id,
      adjustment_type, previous_value, new_value, reason
    ) VALUES (
      NEW.id, auth.uid(), NEW.organization_id,
      'dollars', OLD.budget_dollars, NEW.budget_dollars,
      COALESCE(NEW.budget_notes, 'Budget dollars updated')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS case_budget_change_trigger ON cases;
CREATE TRIGGER case_budget_change_trigger
  AFTER UPDATE OF budget_hours, budget_dollars ON cases
  FOR EACH ROW
  EXECUTE FUNCTION log_case_budget_change();

-- Part 9: Add comment to retainer_funds to clarify distinction
COMMENT ON TABLE retainer_funds IS 'Trust/retainer fund deposits and applications. This is actual money received, NOT a budget authorization limit.';