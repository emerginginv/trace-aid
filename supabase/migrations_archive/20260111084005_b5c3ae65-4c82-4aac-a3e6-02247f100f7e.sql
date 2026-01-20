-- Add case number format columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS case_number_format text DEFAULT '{{Case.series_number}}-{{Case.series_instance}}';

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS case_series_counter integer DEFAULT 0;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS case_series_padding integer DEFAULT 5;

-- Add series tracking columns to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS series_number integer;

ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS series_instance integer DEFAULT 1;

ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS case_type_tag text;

-- Add tag column to picklists for case type abbreviations
ALTER TABLE public.picklists 
ADD COLUMN IF NOT EXISTS tag text;

-- Create case number format audit log table
CREATE TABLE IF NOT EXISTS public.case_number_format_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.case_number_format_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit log
CREATE POLICY "Users can view audit logs for their organization"
ON public.case_number_format_audit_log
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert audit logs for their organization"
ON public.case_number_format_audit_log
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Create index for faster audit log queries
CREATE INDEX IF NOT EXISTS idx_case_number_format_audit_org 
ON public.case_number_format_audit_log(organization_id, created_at DESC);

-- Create function to atomically generate case numbers
CREATE OR REPLACE FUNCTION public.generate_next_case_number(
  p_organization_id uuid,
  p_parent_case_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_format text;
  v_series_number integer;
  v_series_instance integer;
  v_padding integer;
  v_case_number text;
  v_year_2 text;
  v_year_4 text;
  v_month text;
  v_case_type_tag text;
  v_padded_series text;
  v_padded_instance text;
BEGIN
  -- Lock the organization row for update
  SELECT 
    case_number_format,
    case_series_counter,
    case_series_padding
  INTO 
    v_org_format,
    v_series_number,
    v_padding
  FROM organizations
  WHERE id = p_organization_id
  FOR UPDATE;

  IF v_org_format IS NULL THEN
    v_org_format := '{{Case.series_number}}-{{Case.series_instance}}';
  END IF;
  
  IF v_padding IS NULL THEN
    v_padding := 5;
  END IF;

  -- Determine series_number and series_instance
  IF p_parent_case_id IS NOT NULL THEN
    -- Reopen: use parent's series_number, increment instance
    SELECT 
      series_number,
      COALESCE(MAX(series_instance), 0) + 1
    INTO 
      v_series_number,
      v_series_instance
    FROM cases
    WHERE (id = p_parent_case_id OR parent_case_id = p_parent_case_id)
      AND organization_id = p_organization_id
    GROUP BY series_number;
    
    -- If no series_number found on parent, this is an error
    IF v_series_number IS NULL THEN
      RAISE EXCEPTION 'Parent case does not have a series_number';
    END IF;
  ELSE
    -- New case: increment counter
    v_series_number := COALESCE(v_series_number, 0) + 1;
    v_series_instance := 1;
    
    -- Update the counter
    UPDATE organizations 
    SET case_series_counter = v_series_number
    WHERE id = p_organization_id;
  END IF;

  -- Build date parts
  v_year_4 := to_char(now(), 'YYYY');
  v_year_2 := to_char(now(), 'YY');
  v_month := to_char(now(), 'MM');
  
  -- Pad series number and instance
  v_padded_series := lpad(v_series_number::text, v_padding, '0');
  v_padded_instance := lpad(v_series_instance::text, 2, '0');

  -- Replace tokens in format
  v_case_number := v_org_format;
  v_case_number := replace(v_case_number, '{{Case.year_created_4}}', v_year_4);
  v_case_number := replace(v_case_number, '{{Case.year_created_2}}', v_year_2);
  v_case_number := replace(v_case_number, '{{Case.year_created_month}}', v_month);
  v_case_number := replace(v_case_number, '{{Case.series_number}}', v_padded_series);
  v_case_number := replace(v_case_number, '{{Case.series_instance}}', v_padded_instance);
  -- Note: case_type_tag is handled by the caller
  v_case_number := replace(v_case_number, '{{Case.case_type_tag}}', '');

  RETURN jsonb_build_object(
    'case_number', v_case_number,
    'series_number', v_series_number,
    'series_instance', v_series_instance,
    'format', v_org_format
  );
END;
$$;