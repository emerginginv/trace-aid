-- ═══════════════════════════════════════════════════════════════════════════════
-- BACKFILL: Create synthetic updates for legacy billing entries linked to events
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- For existing case_finances rows where:
--   - activity_id references an event (activity_type = 'event')
--   - update_id IS NULL
-- 
-- Create a synthetic case_update:
--   - Title: "Legacy Billing Entry"
--   - Read-only flag: is_legacy_billing = true (new column)
--   - Auto-linked to the original event via linked_activity_id
-- 
-- Then update the case_finances row to point to this new update.
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 1: Add is_legacy_billing column to case_updates for read-only flag
ALTER TABLE public.case_updates 
ADD COLUMN IF NOT EXISTS is_legacy_billing BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.case_updates.is_legacy_billing IS 
'Marks auto-generated updates for legacy billing entries. These are read-only and should not be edited.';

-- Step 2: Create synthetic updates and link billing items using a DO block
DO $$
DECLARE
  rec RECORD;
  new_update_id UUID;
BEGIN
  -- Loop through each legacy billing entry that needs backfilling
  FOR rec IN 
    SELECT 
      cf.id as finance_id,
      cf.case_id,
      cf.activity_id,
      cf.organization_id,
      cf.user_id,
      cf.created_at as finance_created_at,
      ca.title as activity_title
    FROM case_finances cf
    JOIN case_activities ca ON cf.activity_id = ca.id
    WHERE ca.activity_type = 'event'
      AND cf.update_id IS NULL
  LOOP
    -- Create synthetic update
    INSERT INTO case_updates (
      id,
      case_id,
      user_id,
      organization_id,
      title,
      description,
      update_type,
      linked_activity_id,
      is_legacy_billing,
      created_at
    ) VALUES (
      gen_random_uuid(),
      rec.case_id,
      rec.user_id,
      rec.organization_id,
      'Legacy Billing Entry',
      'This update was auto-generated to link a legacy billing item to its event. Original event: ' || COALESCE(rec.activity_title, 'Unknown'),
      'note',
      rec.activity_id,
      TRUE,
      rec.finance_created_at  -- Use the original billing item creation date
    )
    RETURNING id INTO new_update_id;
    
    -- Link the billing item to this new update
    UPDATE case_finances
    SET update_id = new_update_id
    WHERE id = rec.finance_id;
    
    RAISE NOTICE 'Created synthetic update % for finance record %', new_update_id, rec.finance_id;
  END LOOP;
END $$;

-- Step 3: Add index for efficient legacy billing queries
CREATE INDEX IF NOT EXISTS idx_case_updates_is_legacy_billing 
ON public.case_updates(is_legacy_billing) 
WHERE is_legacy_billing = TRUE;