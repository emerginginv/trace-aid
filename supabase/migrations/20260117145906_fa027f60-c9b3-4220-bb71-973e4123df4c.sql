-- Create sync function for category transitions
CREATE OR REPLACE FUNCTION public.sync_case_category_transitions(
  p_organization_id UUID,
  p_override_existing BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_history RECORD;
  v_prev_category_id UUID := NULL;
  v_current_category_id UUID := NULL;
  v_cases_processed INTEGER := 0;
  v_transitions_created INTEGER := 0;
  v_transitions_deleted INTEGER := 0;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Process each case in the organization
  FOR v_case IN 
    SELECT id, organization_id 
    FROM cases 
    WHERE organization_id = p_organization_id
  LOOP
    v_cases_processed := v_cases_processed + 1;
    v_prev_category_id := NULL;
    v_current_category_id := NULL;
    
    -- If override mode, delete existing transitions for this case
    IF p_override_existing THEN
      DELETE FROM case_category_transition_log WHERE case_id = v_case.id;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
      v_transitions_deleted := v_transitions_deleted + v_deleted_count;
    END IF;
    
    -- Iterate through status history in chronological order
    FOR v_history IN 
      SELECT h.id, h.status_id, h.entered_at, h.exited_at,
             s.category_id, s.name as status_name
      FROM case_status_history h
      LEFT JOIN case_statuses s ON h.status_id = s.id
      WHERE h.case_id = v_case.id
      ORDER BY h.entered_at ASC
    LOOP
      -- Skip if no status_id or category_id (legacy records)
      IF v_history.category_id IS NULL THEN
        CONTINUE;
      END IF;
      
      -- Track current category for case update
      IF v_history.exited_at IS NULL THEN
        v_current_category_id := v_history.category_id;
      END IF;
      
      -- Detect category change
      IF v_prev_category_id IS DISTINCT FROM v_history.category_id THEN
        -- Check if transition already exists (for fill-missing mode)
        IF NOT p_override_existing THEN
          IF EXISTS (
            SELECT 1 FROM case_category_transition_log 
            WHERE case_id = v_case.id 
            AND to_category_id = v_history.category_id
            AND transitioned_at = v_history.entered_at
          ) THEN
            v_prev_category_id := v_history.category_id;
            CONTINUE;
          END IF;
        END IF;
        
        -- Insert category transition
        INSERT INTO case_category_transition_log (
          case_id, organization_id, 
          from_category_id, to_category_id, 
          transitioned_at, transitioned_by
        ) VALUES (
          v_case.id, v_case.organization_id,
          v_prev_category_id, v_history.category_id,
          v_history.entered_at, p_user_id
        );
        v_transitions_created := v_transitions_created + 1;
      END IF;
      
      v_prev_category_id := v_history.category_id;
    END LOOP;
    
    -- Update case's current_category_id from latest open history entry
    IF v_current_category_id IS NOT NULL THEN
      UPDATE cases SET
        current_category_id = v_current_category_id,
        category_entered_at = (
          SELECT h.entered_at 
          FROM case_status_history h
          JOIN case_statuses s ON h.status_id = s.id
          WHERE h.case_id = v_case.id 
          AND h.exited_at IS NULL
          AND s.category_id = v_current_category_id
          ORDER BY h.entered_at DESC 
          LIMIT 1
        )
      WHERE id = v_case.id;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'cases_processed', v_cases_processed,
    'transitions_created', v_transitions_created,
    'transitions_deleted', v_transitions_deleted,
    'override_mode', p_override_existing
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_case_category_transitions(UUID, BOOLEAN, UUID) TO authenticated;