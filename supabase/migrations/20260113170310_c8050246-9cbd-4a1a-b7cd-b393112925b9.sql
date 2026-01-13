-- Fix compute_case_budget_consumption to use correct table name (service_pricing_rules instead of pricing_service_rates)
CREATE OR REPLACE FUNCTION public.compute_case_budget_consumption(p_case_id UUID)
RETURNS TABLE (
  hours_consumed NUMERIC,
  amount_consumed NUMERIC,
  hours_from_activities NUMERIC,
  amount_from_activities NUMERIC,
  hours_from_services NUMERIC,
  amount_from_services NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pricing_profile_id UUID;
  v_hours_activities NUMERIC := 0;
  v_amount_activities NUMERIC := 0;
  v_hours_services NUMERIC := 0;
  v_amount_services NUMERIC := 0;
BEGIN
  -- Get the pricing profile for this case
  SELECT pricing_profile_id INTO v_pricing_profile_id
  FROM cases WHERE id = p_case_id;

  -- Calculate hours from case_activities (time-based activities)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN ca.activity_type IN ('time_entry', 'field_work', 'research', 'surveillance') THEN
          COALESCE(
            EXTRACT(EPOCH FROM (ca.completed_at - ca.created_at)) / 3600,
            1
          )
        ELSE 0
      END
    ), 0)
  INTO v_hours_activities
  FROM case_activities ca
  WHERE ca.case_id = p_case_id
    AND ca.status != 'cancelled';

  -- Calculate amount from activities using service_pricing_rules (FIXED: was pricing_service_rates)
  SELECT COALESCE(SUM(
    CASE 
      WHEN csi.id IS NOT NULL AND cs.default_rate IS NOT NULL THEN
        COALESCE(csi.quantity_actual, 1) * cs.default_rate
      WHEN spr.rate IS NOT NULL THEN
        COALESCE(csi.quantity_actual, 1) * spr.rate
      ELSE
        COALESCE(cf.amount, 0)
    END
  ), 0)
  INTO v_amount_activities
  FROM case_activities ca
  LEFT JOIN case_service_instances csi ON ca.case_service_instance_id = csi.id
  LEFT JOIN case_services cs ON csi.case_service_id = cs.id
  LEFT JOIN service_pricing_rules spr ON spr.pricing_profile_id = v_pricing_profile_id 
    AND spr.case_service_id = cs.id
  LEFT JOIN case_finances cf ON cf.activity_id = ca.id
  WHERE ca.case_id = p_case_id
    AND ca.status != 'cancelled';

  -- Calculate from service instances directly using service_pricing_rules (FIXED: was pricing_service_rates)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN cs.track_duration = true THEN
          COALESCE(csi.quantity_actual, csi.quantity_estimated, 0) * 
          COALESCE(cs.default_duration_minutes, 60) / 60.0
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN spr.rate IS NOT NULL THEN
          COALESCE(csi.quantity_actual, csi.quantity_estimated, 1) * spr.rate
        WHEN cs.default_rate IS NOT NULL THEN
          COALESCE(csi.quantity_actual, csi.quantity_estimated, 1) * cs.default_rate
        ELSE 0
      END
    ), 0)
  INTO v_hours_services, v_amount_services
  FROM case_service_instances csi
  JOIN case_services cs ON csi.case_service_id = cs.id
  LEFT JOIN service_pricing_rules spr ON spr.pricing_profile_id = v_pricing_profile_id 
    AND spr.case_service_id = cs.id
  WHERE csi.case_id = p_case_id
    AND csi.status NOT IN ('cancelled', 'unscheduled');

  RETURN QUERY SELECT
    v_hours_activities + v_hours_services,
    v_amount_activities + v_amount_services,
    v_hours_activities,
    v_amount_activities,
    v_hours_services,
    v_amount_services;
END;
$$;

-- Sync existing case_budgets record with case data
UPDATE case_budgets 
SET 
  budget_type = 'both',
  total_budget_amount = 2500
WHERE case_id = 'e2a0785b-8278-4d24-b31d-b75ca1bf0c33'
  AND total_budget_amount IS NULL;