-- Create invoice_line_items table for service-based invoicing
-- Each line item references a case_service_instance and captures a pricing snapshot at time of generation

CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  case_service_instance_id UUID NOT NULL REFERENCES public.case_service_instances(id) ON DELETE RESTRICT,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Frozen pricing snapshot at time of invoice generation
  service_name TEXT NOT NULL,
  service_code TEXT NULL,
  description TEXT NOT NULL,
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('hourly', 'flat', 'per_unit', 'retainer')),
  
  -- Quantity and rate (frozen at generation)
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_label TEXT NULL, -- e.g., 'hours', 'units', 'days'
  
  -- Calculated amount
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Linked activities (for audit trail)
  activity_ids UUID[] NULL,
  activity_count INTEGER NOT NULL DEFAULT 0,
  
  -- Pricing rule snapshot for audit
  pricing_rule_snapshot JSONB NULL,
  pricing_profile_id UUID NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate billing of same service instance
  CONSTRAINT invoice_line_items_service_unique UNIQUE (case_service_instance_id)
);

-- Enable RLS
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invoice line items in their organization"
ON public.invoice_line_items
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create invoice line items in their organization"
ON public.invoice_line_items
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update invoice line items in their organization"
ON public.invoice_line_items
FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete invoice line items in their organization"
ON public.invoice_line_items
FOR DELETE
USING (is_org_member(auth.uid(), organization_id));

-- Indexes for common queries
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_case_id ON public.invoice_line_items(case_id);
CREATE INDEX idx_invoice_line_items_service_instance ON public.invoice_line_items(case_service_instance_id);
CREATE INDEX idx_invoice_line_items_organization_id ON public.invoice_line_items(organization_id);

-- Update case_service_instances to track billing status
ALTER TABLE public.case_service_instances 
ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP WITH TIME ZONE NULL;

-- Function to get effective pricing for a service instance
CREATE OR REPLACE FUNCTION public.get_service_instance_pricing(
  p_case_service_instance_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_instance RECORD;
  v_service RECORD;
  v_pricing_rule RECORD;
  v_case RECORD;
  v_pricing_profile_id UUID;
BEGIN
  -- Get service instance details
  SELECT csi.*, cs.name as service_name, cs.code as service_code, 
         cs.default_rate, cs.is_billable, cs.billing_description_template
  INTO v_instance
  FROM case_service_instances csi
  JOIN case_services cs ON cs.id = csi.case_service_id
  WHERE csi.id = p_case_service_instance_id;
  
  IF v_instance IS NULL THEN
    RETURN jsonb_build_object('error', 'Service instance not found');
  END IF;
  
  -- Get case and determine pricing profile
  SELECT c.*, 
         COALESCE(c.pricing_profile_id, a.default_pricing_profile_id) as effective_pricing_profile_id
  INTO v_case
  FROM cases c
  LEFT JOIN accounts a ON a.id = c.account_id
  WHERE c.id = v_instance.case_id;
  
  v_pricing_profile_id := v_case.effective_pricing_profile_id;
  
  -- Try to find a specific pricing rule for this service
  SELECT spr.*
  INTO v_pricing_rule
  FROM service_pricing_rules spr
  WHERE spr.case_service_id = v_instance.case_service_id
    AND spr.organization_id = v_instance.organization_id
    AND spr.is_active = true
    AND (spr.pricing_profile_id IS NULL OR spr.pricing_profile_id = v_pricing_profile_id)
  ORDER BY 
    CASE WHEN spr.pricing_profile_id = v_pricing_profile_id THEN 0 ELSE 1 END,
    spr.created_at DESC
  LIMIT 1;
  
  -- Build result with pricing information
  v_result := jsonb_build_object(
    'service_instance_id', v_instance.id,
    'service_name', v_instance.service_name,
    'service_code', v_instance.service_code,
    'is_billable', v_instance.billable,
    'pricing_profile_id', v_pricing_profile_id,
    'quantity_actual', COALESCE(v_instance.quantity_actual, 0),
    'quantity_estimated', v_instance.quantity_estimated,
    'has_pricing_rule', v_pricing_rule IS NOT NULL
  );
  
  IF v_pricing_rule IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'pricing_model', v_pricing_rule.pricing_model,
      'rate', v_pricing_rule.rate,
      'unit_label', v_pricing_rule.unit_label,
      'minimum_charge', v_pricing_rule.minimum_charge,
      'pricing_rule_id', v_pricing_rule.id,
      'pricing_rule_snapshot', row_to_json(v_pricing_rule)
    );
  ELSE
    -- Fall back to service default rate
    v_result := v_result || jsonb_build_object(
      'pricing_model', 'hourly',
      'rate', COALESCE(v_instance.default_rate, 0),
      'unit_label', 'hours',
      'minimum_charge', 0,
      'pricing_rule_id', NULL,
      'pricing_rule_snapshot', NULL
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate invoice line items from completed service instances
CREATE OR REPLACE FUNCTION public.generate_invoice_line_items(
  p_invoice_id UUID,
  p_service_instance_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_instance_id UUID;
  v_pricing JSONB;
  v_instance RECORD;
  v_activities UUID[];
  v_activity_count INTEGER;
  v_description TEXT;
  v_quantity NUMERIC;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_total NUMERIC := 0;
  v_line_items_created INTEGER := 0;
  v_invoice RECORD;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Process each service instance
  FOREACH v_instance_id IN ARRAY p_service_instance_ids
  LOOP
    -- Check if already billed
    SELECT * INTO v_instance 
    FROM case_service_instances 
    WHERE id = v_instance_id 
      AND billed_at IS NULL
      AND billable = true
      AND status = 'completed';
    
    IF v_instance IS NOT NULL THEN
      -- Get pricing
      v_pricing := get_service_instance_pricing(v_instance_id);
      
      IF NOT (v_pricing ? 'error') THEN
        -- Get linked activities
        SELECT ARRAY_AGG(ca.id), COUNT(*)
        INTO v_activities, v_activity_count
        FROM case_activities ca
        WHERE ca.case_service_instance_id = v_instance_id;
        
        -- Calculate quantities and amounts
        v_quantity := COALESCE(v_instance.quantity_actual, v_instance.quantity_estimated, 1);
        v_rate := COALESCE((v_pricing->>'rate')::NUMERIC, 0);
        v_amount := v_quantity * v_rate;
        
        -- Apply minimum charge if applicable
        IF (v_pricing->>'minimum_charge')::NUMERIC > v_amount THEN
          v_amount := (v_pricing->>'minimum_charge')::NUMERIC;
        END IF;
        
        -- Build description
        v_description := v_pricing->>'service_name';
        IF v_instance.notes IS NOT NULL AND v_instance.notes != '' THEN
          v_description := v_description || ': ' || v_instance.notes;
        END IF;
        
        -- Create line item with frozen pricing snapshot
        INSERT INTO invoice_line_items (
          invoice_id,
          case_service_instance_id,
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
          activity_ids,
          activity_count,
          pricing_rule_snapshot,
          pricing_profile_id
        ) VALUES (
          p_invoice_id,
          v_instance_id,
          v_instance.case_id,
          v_instance.organization_id,
          v_pricing->>'service_name',
          v_pricing->>'service_code',
          v_description,
          v_pricing->>'pricing_model',
          v_quantity,
          v_rate,
          v_pricing->>'unit_label',
          v_amount,
          v_activities,
          COALESCE(v_activity_count, 0),
          (v_pricing->'pricing_rule_snapshot'),
          (v_pricing->>'pricing_profile_id')::UUID
        );
        
        -- Mark service instance as billed
        UPDATE case_service_instances
        SET billed_at = now(),
            invoice_line_item_id = (
              SELECT id FROM invoice_line_items 
              WHERE case_service_instance_id = v_instance_id 
              LIMIT 1
            )
        WHERE id = v_instance_id;
        
        v_total := v_total + v_amount;
        v_line_items_created := v_line_items_created + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Update invoice total
  UPDATE invoices
  SET total = COALESCE(total, 0) + v_total,
      updated_at = now()
  WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'line_items_created', v_line_items_created,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get billable service instances for a case
CREATE OR REPLACE FUNCTION public.get_billable_service_instances(
  p_case_id UUID
) RETURNS TABLE (
  id UUID,
  service_name TEXT,
  service_code TEXT,
  status TEXT,
  quantity_actual NUMERIC,
  quantity_estimated NUMERIC,
  completion_date TIMESTAMPTZ,
  notes TEXT,
  pricing_model TEXT,
  rate NUMERIC,
  estimated_amount NUMERIC,
  activity_count BIGINT,
  is_billable BOOLEAN,
  billed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csi.id,
    cs.name as service_name,
    cs.code as service_code,
    csi.status,
    csi.quantity_actual,
    csi.quantity_estimated,
    csi.completion_date,
    csi.notes,
    COALESCE(spr.pricing_model, 'hourly') as pricing_model,
    COALESCE(spr.rate, cs.default_rate, 0) as rate,
    COALESCE(csi.quantity_actual, csi.quantity_estimated, 1) * COALESCE(spr.rate, cs.default_rate, 0) as estimated_amount,
    (SELECT COUNT(*) FROM case_activities ca WHERE ca.case_service_instance_id = csi.id) as activity_count,
    csi.billable as is_billable,
    csi.billed_at
  FROM case_service_instances csi
  JOIN case_services cs ON cs.id = csi.case_service_id
  LEFT JOIN service_pricing_rules spr ON spr.case_service_id = cs.id 
    AND spr.organization_id = csi.organization_id 
    AND spr.is_active = true
  LEFT JOIN cases c ON c.id = csi.case_id
  LEFT JOIN accounts a ON a.id = c.account_id
  WHERE csi.case_id = p_case_id
    AND csi.status = 'completed'
    AND csi.billable = true
    AND csi.billed_at IS NULL
  ORDER BY csi.completion_date DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;