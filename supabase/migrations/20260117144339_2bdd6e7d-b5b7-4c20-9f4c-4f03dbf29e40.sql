-- Add edit_status_dates permission for authorized users
INSERT INTO public.permissions (role, feature_key, allowed) VALUES
  ('admin', 'edit_status_dates', true),
  ('manager', 'edit_status_dates', true),
  ('investigator', 'edit_status_dates', false),
  ('vendor', 'edit_status_dates', false),
  ('member', 'edit_status_dates', false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Create function to update status history dates with cascading recalculation
CREATE OR REPLACE FUNCTION public.update_status_history_dates(
  p_history_id UUID,
  p_entered_at TIMESTAMPTZ DEFAULT NULL,
  p_exited_at TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_next_entry RECORD;
  v_new_entered_at TIMESTAMPTZ;
  v_new_exited_at TIMESTAMPTZ;
  v_new_duration INTEGER;
BEGIN
  -- Permission check
  IF p_user_id IS NOT NULL AND NOT has_permission(p_user_id, 'edit_status_dates') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Get the entry being edited
  SELECT * INTO v_entry FROM case_status_history WHERE id = p_history_id;
  IF v_entry IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;
  
  -- Determine new values
  v_new_entered_at := COALESCE(p_entered_at, v_entry.entered_at);
  v_new_exited_at := COALESCE(p_exited_at, v_entry.exited_at);
  
  -- Validate: entered_at must be before exited_at (if exited_at set)
  IF v_new_exited_at IS NOT NULL AND v_new_entered_at >= v_new_exited_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry time must be before exit time');
  END IF;
  
  -- Calculate new duration
  IF v_new_exited_at IS NOT NULL THEN
    v_new_duration := EXTRACT(EPOCH FROM (v_new_exited_at - v_new_entered_at))::INTEGER;
  ELSE
    v_new_duration := NULL;
  END IF;
  
  -- Update the entry
  UPDATE case_status_history SET
    entered_at = v_new_entered_at,
    exited_at = v_new_exited_at,
    duration_seconds = v_new_duration,
    manual_override = true,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'date_edited_at', now(),
      'date_edited_by', p_user_id,
      'original_entered_at', v_entry.entered_at,
      'original_exited_at', v_entry.exited_at
    )
  WHERE id = p_history_id;
  
  -- If exited_at was changed, update next entry's entered_at to maintain continuity
  IF p_exited_at IS NOT NULL THEN
    SELECT * INTO v_next_entry 
    FROM case_status_history 
    WHERE case_id = v_entry.case_id 
      AND entered_at > v_entry.entered_at
    ORDER BY entered_at ASC
    LIMIT 1;
    
    IF v_next_entry IS NOT NULL THEN
      -- Cascade: set next entry's entered_at = this entry's exited_at
      UPDATE case_status_history SET
        entered_at = v_new_exited_at,
        duration_seconds = CASE 
          WHEN exited_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (exited_at - v_new_exited_at))::INTEGER
          ELSE NULL
        END
      WHERE id = v_next_entry.id;
    END IF;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;