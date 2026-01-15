-- Step 2: Migrate existing data to new status values
-- draft → pending
-- pending_review → pending
-- billed → paid (keeping approved, declined as-is)

UPDATE public.time_entries 
SET status = 'pending' 
WHERE status IN ('draft', 'pending_review');

UPDATE public.expense_entries 
SET status = 'pending' 
WHERE status IN ('draft', 'pending_review');

UPDATE public.time_entries 
SET status = 'paid' 
WHERE status = 'billed';

UPDATE public.expense_entries 
SET status = 'paid' 
WHERE status = 'billed';

-- Step 3: Update default to 'pending'
ALTER TABLE public.time_entries ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.expense_entries ALTER COLUMN status SET DEFAULT 'pending';

-- Step 4: Update RLS policies to use new status value
DROP POLICY IF EXISTS "Users can update time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update expense entries" ON public.expense_entries;

CREATE POLICY "Users can update time entries" ON public.time_entries
FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND (
    (user_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
);

CREATE POLICY "Users can update expense entries" ON public.expense_entries
FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND (
    (user_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
);