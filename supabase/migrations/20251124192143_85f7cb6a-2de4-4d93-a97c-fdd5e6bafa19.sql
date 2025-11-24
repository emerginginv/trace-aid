-- Add fields for case instance tracking and related cases
ALTER TABLE cases
ADD COLUMN parent_case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
ADD COLUMN instance_number integer NOT NULL DEFAULT 1;

-- Add index for faster queries on related cases
CREATE INDEX idx_cases_parent_case_id ON cases(parent_case_id);

-- Add comment explaining the fields
COMMENT ON COLUMN cases.parent_case_id IS 'References the original case in a series of reopened cases';
COMMENT ON COLUMN cases.instance_number IS 'The instance number in a series of related cases (1, 2, 3, etc.)';

-- Function to get all related cases in a series
CREATE OR REPLACE FUNCTION get_related_cases(case_id uuid)
RETURNS TABLE (
  id uuid,
  case_number text,
  title text,
  status text,
  instance_number integer,
  created_at timestamptz,
  closed_at timestamptz
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE case_series AS (
    -- Get the root case (parent of all instances)
    SELECT 
      c.id,
      c.case_number,
      c.title,
      c.status,
      c.instance_number,
      c.created_at,
      c.closed_at,
      COALESCE(c.parent_case_id, c.id) as root_id
    FROM cases c
    WHERE c.id = case_id
    
    UNION
    
    -- Get all cases with the same root
    SELECT 
      c2.id,
      c2.case_number,
      c2.title,
      c2.status,
      c2.instance_number,
      c2.created_at,
      c2.closed_at,
      COALESCE(c2.parent_case_id, c2.id) as root_id
    FROM cases c2
    INNER JOIN case_series cs ON (
      c2.parent_case_id = cs.root_id OR 
      c2.id = cs.root_id OR 
      (c2.parent_case_id IS NULL AND c2.id = cs.root_id)
    )
    WHERE c2.id != cs.id
  )
  SELECT DISTINCT
    cs.id,
    cs.case_number,
    cs.title,
    cs.status,
    cs.instance_number,
    cs.created_at,
    cs.closed_at
  FROM case_series cs
  ORDER BY cs.instance_number;
$$;