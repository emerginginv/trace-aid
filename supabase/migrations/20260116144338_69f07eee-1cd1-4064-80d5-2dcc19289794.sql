-- Create function to check if a case has billing activity
-- This is used to determine if Case Type should be locked

CREATE OR REPLACE FUNCTION public.is_case_billed(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_billed BOOLEAN;
BEGIN
  -- Check if case has any non-voided/non-cancelled invoices
  SELECT EXISTS (
    SELECT 1 
    FROM invoices inv
    WHERE inv.case_id = p_case_id
      AND (inv.status IS NULL OR inv.status NOT IN ('voided', 'cancelled'))
  ) INTO v_is_billed;
  
  RETURN v_is_billed;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_case_billed(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_case_billed(UUID) IS 
'Checks if a case has any billing activity (non-voided/cancelled invoices). Used to lock Case Type changes after billing starts.';