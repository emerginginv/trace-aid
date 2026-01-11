-- Fix the get_organization_sla_summary function with corrected SQL
CREATE OR REPLACE FUNCTION public.get_organization_sla_summary(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_authorized boolean;
  v_result jsonb;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is admin or manager in the organization
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id 
      AND organization_id = p_organization_id 
      AND role IN ('admin', 'manager')
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to view SLA summary for this organization';
  END IF;

  -- Build the summary JSON
  SELECT jsonb_build_object(
    'slas', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'metric', s.metric,
          'target_value', s.target_value,
          'measurement_period', s.measurement_period,
          'is_active', s.is_active,
          'latest_measurement', (
            SELECT jsonb_build_object(
              'measured_value', sm.measured_value,
              'is_met', sm.is_met,
              'measured_at', sm.measured_at
            )
            FROM sla_measurements sm
            WHERE sm.sla_id = s.id
            ORDER BY sm.measured_at DESC
            LIMIT 1
          )
        )
      ), '[]'::jsonb)
      FROM slas s
      WHERE s.organization_id = p_organization_id
        AND s.is_active = true
    ),
    'recent_breaches', (
      SELECT COALESCE(jsonb_agg(breach_data), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', sb.id,
          'sla_id', sb.sla_id,
          'metric', s.metric,
          'target_value', s.target_value,
          'actual_value', sb.actual_value,
          'breach_start', sb.breach_start,
          'breach_end', sb.breach_end,
          'resolved', sb.resolved,
          'created_at', sb.created_at
        ) AS breach_data
        FROM sla_breaches sb
        JOIN slas s ON s.id = sb.sla_id
        WHERE s.organization_id = p_organization_id
        ORDER BY sb.created_at DESC
        LIMIT 10
      ) sub
    ),
    'account_health', (
      SELECT jsonb_build_object(
        'risk_level', COALESCE(chs.risk_level, 'low'),
        'active_users_count', COALESCE(chs.active_users_count, 0),
        'cases_created', COALESCE(chs.cases_created, 0),
        'feature_adoption_score', COALESCE(chs.feature_adoption_score, 0)
      )
      FROM customer_health_snapshots chs
      WHERE chs.organization_id = p_organization_id
      ORDER BY chs.created_at DESC
      LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;