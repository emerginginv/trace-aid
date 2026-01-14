-- ═══════════════════════════════════════════════════════════════════════════════
-- REFACTOR: Invoice generation from APPROVED BILLING ITEMS, not service instances
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- CHANGE SUMMARY:
-- 1. generate_invoice_line_items now accepts billing_item_ids instead of service_instance_ids
-- 2. Invoices are generated from APPROVED case_finances records only
-- 3. Services become descriptive (context), not authoritative (source of truth)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create new function that generates from approved billing items
CREATE OR REPLACE FUNCTION public.generate_invoice_from_billing_items(
  p_invoice_id UUID,
  p_billing_item_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item_id UUID;
  v_billing_item RECORD;
  v_service_name TEXT;
  v_description TEXT;
  v_total NUMERIC := 0;
  v_line_items_created INTEGER := 0;
  v_invoice RECORD;
  v_skipped UUID[] := '{}';
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Invoice must be in draft status
  IF v_invoice.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only add line items to draft invoices');
  END IF;
  
  -- Process each billing item
  FOREACH v_item_id IN ARRAY p_billing_item_ids
  LOOP
    -- Fetch the billing item - must be approved and not already invoiced
    SELECT cf.*, 
           csi.id as service_instance_id,
           cs.name as service_name,
           cs.code as service_code
    INTO v_billing_item
    FROM case_finances cf
    LEFT JOIN case_service_instances csi ON cf.case_service_instance_id = csi.id
    LEFT JOIN case_services cs ON csi.case_service_id = cs.id
    WHERE cf.id = v_item_id
      AND cf.status = 'approved'
      AND cf.invoice_id IS NULL
      AND cf.finance_type IN ('time', 'expense', 'billing_item');
    
    IF v_billing_item IS NULL THEN
      -- Skip items that are not approved, already invoiced, or wrong type
      v_skipped := array_append(v_skipped, v_item_id);
      CONTINUE;
    END IF;
    
    -- Build description from billing item
    v_service_name := COALESCE(v_billing_item.service_name, 'Service');
    v_description := COALESCE(v_billing_item.description, v_service_name);
    
    -- Create line item from the APPROVED billing item
    INSERT INTO invoice_line_items (
      invoice_id,
      case_service_instance_id,
      billing_item_id,
      case_id,
      organization_id,
      service_name,
      service_code,
      description,
      pricing_model,
      quantity,
      rate,
      unit_label,
      amount,
      pricing_rule_snapshot
    ) VALUES (
      p_invoice_id,
      v_billing_item.service_instance_id,
      v_billing_item.id,
      v_billing_item.case_id,
      v_billing_item.organization_id,
      v_service_name,
      v_billing_item.service_code,
      v_description,
      COALESCE(v_billing_item.pricing_model, 'hourly'),
      COALESCE(v_billing_item.quantity, 1),
      COALESCE(v_billing_item.unit_price, v_billing_item.hourly_rate, 0),
      CASE 
        WHEN v_billing_item.pricing_model = 'hourly' THEN 'hour'
        WHEN v_billing_item.pricing_model = 'daily' THEN 'day'
        ELSE 'unit'
      END,
      v_billing_item.amount,
      v_billing_item.pricing_snapshot
    );
    
    -- Mark the billing item as invoiced
    UPDATE case_finances
    SET invoice_id = p_invoice_id,
        invoiced = true,
        updated_at = now()
    WHERE id = v_item_id;
    
    v_total := v_total + v_billing_item.amount;
    v_line_items_created := v_line_items_created + 1;
  END LOOP;
  
  -- Update invoice total
  UPDATE invoices
  SET total = v_total,
      updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Log the invoice generation
  INSERT INTO invoice_audit_log (
    invoice_id, case_id, organization_id, user_id, action,
    metadata
  )
  SELECT 
    p_invoice_id, v_invoice.case_id, v_invoice.organization_id, v_invoice.user_id,
    'line_items_generated_from_billing',
    jsonb_build_object(
      'billing_item_ids', p_billing_item_ids,
      'line_items_created', v_line_items_created,
      'total_amount', v_total,
      'skipped_items', v_skipped
    );
  
  RETURN jsonb_build_object(
    'success', true,
    'line_items_created', v_line_items_created,
    'total_amount', v_total,
    'skipped_items', v_skipped
  );
END;
$function$;

-- Add billing_item_id column to invoice_line_items if not exists
ALTER TABLE public.invoice_line_items 
ADD COLUMN IF NOT EXISTS billing_item_id UUID REFERENCES case_finances(id);

-- Create index for billing item lookups
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_billing_item_id 
ON public.invoice_line_items(billing_item_id) 
WHERE billing_item_id IS NOT NULL;

-- Add comment documenting the change
COMMENT ON FUNCTION public.generate_invoice_from_billing_items(uuid, uuid[]) IS 
'Generates invoice line items from APPROVED billing items (case_finances).
This is the NEW invoice generation pathway.
Services are descriptive context only - billing items are the source of truth.
Only approved, uninvoiced billing items of type time/expense/billing_item are processed.';