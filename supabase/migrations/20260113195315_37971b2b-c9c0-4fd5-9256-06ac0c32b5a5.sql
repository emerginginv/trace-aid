-- SYSTEM PROMPT 11: Invoice Generation Rules
-- 1. Add pricing_snapshot column to case_finances for approval-time pricing
ALTER TABLE case_finances 
ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

-- 2. Add billing_item_id to invoice_line_items for traceability and double-inclusion prevention
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS billing_item_id uuid REFERENCES case_finances(id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_billing_item 
ON invoice_line_items(billing_item_id);

-- 3. Update approve_billing_item to freeze pricing snapshot on approval
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
  v_pricing_snapshot JSONB;
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
  
  -- SYSTEM PROMPT 9: Hard caps may block approval
  IF v_forecast.hard_cap AND v_forecast.is_forecast_exceeded THEN
    RETURN QUERY SELECT false, 'Budget hard cap exceeded. Cannot approve this billing item.'::TEXT, true;
    RETURN;
  END IF;
  
  -- SYSTEM PROMPT 11: Freeze pricing at approval time
  v_pricing_snapshot := jsonb_build_object(
    'pricing_model', v_item.pricing_model,
    'unit_price', v_item.unit_price,
    'quantity', v_item.quantity,
    'hours', v_item.hours,
    'hourly_rate', v_item.hourly_rate,
    'amount', v_item.amount,
    'approved_at', NOW(),
    'approved_by', p_approver_id
  );
  
  -- Approve the billing item with pricing snapshot
  UPDATE case_finances 
  SET status = 'approved', 
      pricing_snapshot = v_pricing_snapshot,
      updated_at = NOW()
  WHERE id = p_billing_item_id;
  
  RETURN QUERY SELECT true, NULL::TEXT, false;
END;
$$;

-- 4. Create function to generate invoice from billing items only
CREATE OR REPLACE FUNCTION public.generate_invoice_from_billing_items(
  p_invoice_id UUID,
  p_billing_item_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_item RECORD;
  v_total NUMERIC := 0;
  v_line_items_created INTEGER := 0;
  v_skipped_not_approved UUID[] := '{}';
  v_skipped_already_invoiced UUID[] := '{}';
  v_service_name TEXT;
BEGIN
  -- Process each billing item
  FOR v_billing_item IN 
    SELECT cf.*, cs.name as service_name 
    FROM case_finances cf
    LEFT JOIN case_service_instances csi ON cf.case_service_instance_id = csi.id
    LEFT JOIN case_services cs ON csi.case_service_id = cs.id
    WHERE cf.id = ANY(p_billing_item_ids)
      AND cf.finance_type = 'billing_item'
  LOOP
    -- Rule: Only approved billing items may be invoiced
    IF v_billing_item.status != 'approved' THEN
      v_skipped_not_approved := array_append(v_skipped_not_approved, v_billing_item.id);
      CONTINUE;
    END IF;
    
    -- Rule: Prevent double inclusion
    IF v_billing_item.invoice_id IS NOT NULL THEN
      v_skipped_already_invoiced := array_append(v_skipped_already_invoiced, v_billing_item.id);
      CONTINUE;
    END IF;
    
    -- Get service name
    v_service_name := COALESCE(v_billing_item.service_name, v_billing_item.category, 'Service');
    
    -- Create line item using ALREADY CALCULATED values from billing item
    -- Rule: Never calculate quantities (use what's stored)
    -- Rule: Snapshot pricing at approval time (already frozen in billing item)
    INSERT INTO invoice_line_items (
      invoice_id,
      case_service_instance_id,
      case_id,
      organization_id,
      service_name,
      description,
      pricing_model,
      quantity,
      rate,
      amount,
      billing_item_id
    ) VALUES (
      p_invoice_id,
      v_billing_item.case_service_instance_id,
      v_billing_item.case_id,
      v_billing_item.organization_id,
      v_service_name,
      v_billing_item.description,
      COALESCE(v_billing_item.pricing_model, 'fixed'),
      COALESCE(v_billing_item.quantity, 1),
      COALESCE(v_billing_item.unit_price, v_billing_item.hourly_rate, v_billing_item.amount),
      v_billing_item.amount,
      v_billing_item.id
    );
    
    -- Mark billing item as invoiced
    UPDATE case_finances 
    SET invoice_id = p_invoice_id,
        updated_at = NOW()
    WHERE id = v_billing_item.id;
    
    v_total := v_total + COALESCE(v_billing_item.amount, 0);
    v_line_items_created := v_line_items_created + 1;
  END LOOP;
  
  -- Update invoice total
  UPDATE invoices 
  SET total = COALESCE(total, 0) + v_total,
      updated_at = NOW()
  WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'line_items_created', v_line_items_created,
    'total_amount', v_total,
    'skipped_not_approved', v_skipped_not_approved,
    'skipped_already_invoiced', v_skipped_already_invoiced
  );
END;
$$;