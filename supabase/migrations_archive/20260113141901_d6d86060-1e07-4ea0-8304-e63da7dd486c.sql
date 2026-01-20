-- =============================================
-- Invoice Guardrails Migration
-- =============================================

-- 1. Create invoice audit log table
CREATE TABLE public.invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL, -- 'created', 'finalized', 'voided', 'payment_added', 'line_item_added', 'attempted_double_bill', 'locked_edit_attempt'
  previous_status TEXT,
  new_status TEXT,
  affected_service_instance_ids UUID[],
  affected_activity_ids UUID[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view audit logs for their org"
  ON public.invoice_audit_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit logs for their org"
  ON public.invoice_audit_log
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Index for efficient queries
CREATE INDEX idx_invoice_audit_log_invoice ON public.invoice_audit_log(invoice_id);
CREATE INDEX idx_invoice_audit_log_created ON public.invoice_audit_log(created_at DESC);

-- 2. Add locked_at column to invoices to track when finalized
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- 3. Add locked flags to service instances and activities
ALTER TABLE public.case_service_instances 
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT;

ALTER TABLE public.case_activities 
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by_invoice_id UUID REFERENCES public.invoices(id);

-- 4. Create function to check if activity is already billed
CREATE OR REPLACE FUNCTION public.is_activity_billed(p_activity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_billed BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM invoice_line_items ili
    JOIN invoices inv ON inv.id = ili.invoice_id
    WHERE p_activity_id = ANY(ili.activity_ids)
      AND inv.status NOT IN ('voided', 'cancelled')
  ) INTO v_is_billed;
  
  RETURN v_is_billed;
END;
$$;

-- 5. Create function to check if service instance is already billed
CREATE OR REPLACE FUNCTION public.is_service_instance_billed(p_service_instance_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_billed BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM invoice_line_items ili
    JOIN invoices inv ON inv.id = ili.invoice_id
    WHERE ili.case_service_instance_id = p_service_instance_id
      AND inv.status NOT IN ('voided', 'cancelled')
  ) INTO v_is_billed;
  
  RETURN v_is_billed;
END;
$$;

-- 6. Create function to validate invoice status transition
CREATE OR REPLACE FUNCTION public.validate_invoice_status_transition(
  p_current_status TEXT,
  p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Valid transitions:
  -- draft -> sent (finalized)
  -- sent -> partial (partial payment)
  -- sent -> paid (fully paid)
  -- partial -> paid (fully paid)
  -- sent -> overdue (past due date)
  -- partial -> overdue
  -- Any -> voided (with void_reason)
  -- draft -> cancelled (before finalization)
  
  IF p_current_status = p_new_status THEN
    RETURN true;
  END IF;
  
  CASE p_current_status
    WHEN 'draft' THEN
      RETURN p_new_status IN ('sent', 'cancelled', 'voided');
    WHEN 'sent' THEN
      RETURN p_new_status IN ('partial', 'paid', 'overdue', 'voided');
    WHEN 'partial' THEN
      RETURN p_new_status IN ('paid', 'overdue', 'voided');
    WHEN 'overdue' THEN
      RETURN p_new_status IN ('partial', 'paid', 'voided');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 7. Create function to finalize invoice and lock related records
CREATE OR REPLACE FUNCTION public.finalize_invoice(
  p_invoice_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_service_ids UUID[];
  v_activity_ids UUID[];
  v_result JSONB;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice 
  FROM invoices 
  WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Check if already finalized
  IF v_invoice.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice is already finalized or cannot be finalized');
  END IF;
  
  -- Get all service instance IDs from line items
  SELECT ARRAY_AGG(DISTINCT ili.case_service_instance_id)
  INTO v_service_ids
  FROM invoice_line_items ili
  WHERE ili.invoice_id = p_invoice_id;
  
  -- Get all activity IDs from line items
  SELECT ARRAY_AGG(DISTINCT unnested_id)
  INTO v_activity_ids
  FROM invoice_line_items ili,
  LATERAL unnest(ili.activity_ids) AS unnested_id
  WHERE ili.invoice_id = p_invoice_id
    AND ili.activity_ids IS NOT NULL;
  
  -- Lock service instances
  UPDATE case_service_instances
  SET locked_at = now(),
      locked_reason = 'Invoiced: ' || v_invoice.invoice_number
  WHERE id = ANY(v_service_ids)
    AND locked_at IS NULL;
  
  -- Lock activities
  UPDATE case_activities
  SET locked_at = now(),
      locked_by_invoice_id = p_invoice_id
  WHERE id = ANY(v_activity_ids)
    AND locked_at IS NULL;
  
  -- Update invoice status to 'sent'
  UPDATE invoices
  SET status = 'sent',
      finalized_at = now(),
      finalized_by = p_user_id,
      updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Create audit log entry
  INSERT INTO invoice_audit_log (
    invoice_id,
    case_id,
    organization_id,
    user_id,
    action,
    previous_status,
    new_status,
    affected_service_instance_ids,
    affected_activity_ids,
    metadata
  ) VALUES (
    p_invoice_id,
    v_invoice.case_id,
    v_invoice.organization_id,
    p_user_id,
    'finalized',
    'draft',
    'sent',
    v_service_ids,
    v_activity_ids,
    jsonb_build_object(
      'invoice_number', v_invoice.invoice_number,
      'total', v_invoice.total,
      'services_locked', COALESCE(array_length(v_service_ids, 1), 0),
      'activities_locked', COALESCE(array_length(v_activity_ids, 1), 0)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invoice_number', v_invoice.invoice_number,
    'services_locked', COALESCE(array_length(v_service_ids, 1), 0),
    'activities_locked', COALESCE(array_length(v_activity_ids, 1), 0)
  );
END;
$$;

-- 8. Create function to void an invoice and unlock related records
CREATE OR REPLACE FUNCTION public.void_invoice(
  p_invoice_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_service_ids UUID[];
  v_activity_ids UUID[];
  v_old_status TEXT;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice 
  FROM invoices 
  WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Cannot void already voided or paid invoices
  IF v_invoice.status IN ('voided', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot void this invoice');
  END IF;
  
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Void reason is required');
  END IF;
  
  v_old_status := v_invoice.status;
  
  -- Get all service instance IDs from line items
  SELECT ARRAY_AGG(DISTINCT ili.case_service_instance_id)
  INTO v_service_ids
  FROM invoice_line_items ili
  WHERE ili.invoice_id = p_invoice_id;
  
  -- Get all activity IDs from line items
  SELECT ARRAY_AGG(DISTINCT unnested_id)
  INTO v_activity_ids
  FROM invoice_line_items ili,
  LATERAL unnest(ili.activity_ids) AS unnested_id
  WHERE ili.invoice_id = p_invoice_id
    AND ili.activity_ids IS NOT NULL;
  
  -- Unlock service instances (allow rebilling)
  UPDATE case_service_instances
  SET locked_at = NULL,
      locked_reason = NULL,
      billed_at = NULL,
      invoice_line_item_id = NULL
  WHERE id = ANY(v_service_ids);
  
  -- Unlock activities
  UPDATE case_activities
  SET locked_at = NULL,
      locked_by_invoice_id = NULL
  WHERE locked_by_invoice_id = p_invoice_id;
  
  -- Update invoice status
  UPDATE invoices
  SET status = 'voided',
      voided_at = now(),
      voided_by = p_user_id,
      void_reason = p_reason,
      updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Create audit log entry
  INSERT INTO invoice_audit_log (
    invoice_id,
    case_id,
    organization_id,
    user_id,
    action,
    previous_status,
    new_status,
    affected_service_instance_ids,
    affected_activity_ids,
    metadata
  ) VALUES (
    p_invoice_id,
    v_invoice.case_id,
    v_invoice.organization_id,
    p_user_id,
    'voided',
    v_old_status,
    'voided',
    v_service_ids,
    v_activity_ids,
    jsonb_build_object(
      'void_reason', p_reason,
      'invoice_number', v_invoice.invoice_number,
      'services_unlocked', COALESCE(array_length(v_service_ids, 1), 0),
      'activities_unlocked', COALESCE(array_length(v_activity_ids, 1), 0)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invoice_number', v_invoice.invoice_number,
    'services_unlocked', COALESCE(array_length(v_service_ids, 1), 0),
    'activities_unlocked', COALESCE(array_length(v_activity_ids, 1), 0)
  );
END;
$$;

-- 9. Create trigger to prevent editing locked service instances
CREATE OR REPLACE FUNCTION public.prevent_locked_service_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow if not locked
  IF OLD.locked_at IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow unlock operations (from void_invoice)
  IF NEW.locked_at IS NULL AND OLD.locked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Prevent quantity/completion changes on locked instances
  IF OLD.quantity_actual IS DISTINCT FROM NEW.quantity_actual OR
     OLD.completion_date IS DISTINCT FROM NEW.completion_date OR
     OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'Cannot modify locked service instance. This service has been invoiced.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_service_edit ON case_service_instances;
CREATE TRIGGER trg_prevent_locked_service_edit
  BEFORE UPDATE ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_service_edit();

-- 10. Create trigger to prevent editing locked activities
CREATE OR REPLACE FUNCTION public.prevent_locked_activity_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow if not locked
  IF OLD.locked_at IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow unlock operations
  IF NEW.locked_at IS NULL AND OLD.locked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Prevent changes on locked activities
  IF OLD.case_service_instance_id IS DISTINCT FROM NEW.case_service_instance_id OR
     OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    RAISE EXCEPTION 'Cannot modify locked activity. This activity has been invoiced.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_activity_edit ON case_activities;
CREATE TRIGGER trg_prevent_locked_activity_edit
  BEFORE UPDATE ON case_activities
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_activity_edit();

-- 11. Create trigger to prevent deleting locked records
CREATE OR REPLACE FUNCTION public.prevent_locked_record_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete locked record. This record has been invoiced.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_service_delete ON case_service_instances;
CREATE TRIGGER trg_prevent_locked_service_delete
  BEFORE DELETE ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_record_delete();

DROP TRIGGER IF EXISTS trg_prevent_locked_activity_delete ON case_activities;
CREATE TRIGGER trg_prevent_locked_activity_delete
  BEFORE DELETE ON case_activities
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_record_delete();

-- 12. Update generate_invoice_line_items to add audit logging
CREATE OR REPLACE FUNCTION public.generate_invoice_line_items(
  p_invoice_id UUID,
  p_service_instance_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_skipped_double_bill UUID[] := '{}';
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
  
  -- Process each service instance
  FOREACH v_instance_id IN ARRAY p_service_instance_ids
  LOOP
    -- Double-billing check: verify not already billed on a non-voided invoice
    IF is_service_instance_billed(v_instance_id) THEN
      v_skipped_double_bill := array_append(v_skipped_double_bill, v_instance_id);
      
      -- Log attempted double-billing
      INSERT INTO invoice_audit_log (
        invoice_id, case_id, organization_id, user_id, action,
        affected_service_instance_ids, metadata
      )
      SELECT 
        p_invoice_id, v_invoice.case_id, v_invoice.organization_id, v_invoice.user_id,
        'attempted_double_bill',
        ARRAY[v_instance_id],
        jsonb_build_object('service_instance_id', v_instance_id, 'reason', 'Already billed on another active invoice');
      
      CONTINUE;
    END IF;
    
    -- Check if service is billable and completed
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
              ORDER BY created_at DESC
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
  
  -- Log invoice creation/update
  INSERT INTO invoice_audit_log (
    invoice_id, case_id, organization_id, user_id, action,
    affected_service_instance_ids, metadata
  )
  SELECT 
    p_invoice_id, v_invoice.case_id, v_invoice.organization_id, v_invoice.user_id,
    'line_items_added',
    p_service_instance_ids,
    jsonb_build_object(
      'line_items_created', v_line_items_created,
      'total_amount', v_total,
      'skipped_double_bill', v_skipped_double_bill
    );
  
  RETURN jsonb_build_object(
    'success', true,
    'line_items_created', v_line_items_created,
    'total_amount', v_total,
    'skipped_double_bill_count', array_length(v_skipped_double_bill, 1)
  );
END;
$$;

-- 13. Create function to get invoice with lock status
CREATE OR REPLACE FUNCTION public.get_invoice_with_status(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_is_locked BOOLEAN;
  v_can_edit BOOLEAN;
  v_can_finalize BOOLEAN;
  v_can_void BOOLEAN;
  v_line_items_count INTEGER;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('error', 'Invoice not found');
  END IF;
  
  v_is_locked := v_invoice.status NOT IN ('draft');
  v_can_edit := v_invoice.status = 'draft';
  v_can_finalize := v_invoice.status = 'draft';
  v_can_void := v_invoice.status IN ('draft', 'sent', 'partial', 'overdue');
  
  SELECT COUNT(*) INTO v_line_items_count
  FROM invoice_line_items WHERE invoice_id = p_invoice_id;
  
  RETURN jsonb_build_object(
    'id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'status', v_invoice.status,
    'total', v_invoice.total,
    'is_locked', v_is_locked,
    'can_edit', v_can_edit,
    'can_finalize', v_can_finalize AND v_line_items_count > 0,
    'can_void', v_can_void,
    'finalized_at', v_invoice.finalized_at,
    'voided_at', v_invoice.voided_at,
    'void_reason', v_invoice.void_reason,
    'line_items_count', v_line_items_count
  );
END;
$$;