-- Function to approve billing item with budget hard cap check
CREATE OR REPLACE FUNCTION public.approve_billing_item(
  p_billing_item_id UUID,
  p_approver_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  budget_blocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_forecast RECORD;
BEGIN
  -- Get billing item details
  SELECT * INTO v_item FROM case_finances 
  WHERE id = p_billing_item_id AND finance_type = 'billing_item';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Billing item not found'::TEXT, false;
    RETURN;
  END IF;
  
  IF v_item.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Billing item is not pending'::TEXT, false;
    RETURN;
  END IF;
  
  -- Check budget forecast with hard cap
  SELECT * INTO v_forecast FROM get_budget_forecast(v_item.case_id);
  
  -- Hard caps block approval if forecast is exceeded
  IF v_forecast.hard_cap AND v_forecast.is_forecast_exceeded THEN
    RETURN QUERY SELECT false, 'Budget hard cap exceeded. Cannot approve this billing item.'::TEXT, true;
    RETURN;
  END IF;
  
  -- Approve the billing item
  UPDATE case_finances 
  SET status = 'approved', 
      updated_at = NOW()
  WHERE id = p_billing_item_id;
  
  RETURN QUERY SELECT true, NULL::TEXT, false;
END;
$$;

-- Function to reject billing item
CREATE OR REPLACE FUNCTION public.reject_billing_item(
  p_billing_item_id UUID,
  p_rejector_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_existing_notes TEXT;
BEGIN
  -- Get billing item details
  SELECT * INTO v_item FROM case_finances 
  WHERE id = p_billing_item_id AND finance_type = 'billing_item';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Billing item not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_item.status = 'rejected' THEN
    RETURN QUERY SELECT false, 'Billing item is already rejected'::TEXT;
    RETURN;
  END IF;
  
  -- Get existing notes
  v_existing_notes := COALESCE(v_item.notes, '');
  
  -- Reject the billing item and append rejection reason to notes
  UPDATE case_finances 
  SET status = 'rejected', 
      updated_at = NOW(),
      notes = CASE 
        WHEN p_reason IS NOT NULL THEN 
          CASE WHEN v_existing_notes = '' THEN '' ELSE v_existing_notes || E'\n' END || 
          '[Rejected: ' || p_reason || ']'
        ELSE v_existing_notes
      END
  WHERE id = p_billing_item_id;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;