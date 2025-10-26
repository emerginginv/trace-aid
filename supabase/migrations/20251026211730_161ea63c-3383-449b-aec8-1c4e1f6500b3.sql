-- Backfill Missing Organization IDs for Orphaned Records

-- 1. Backfill contacts table
-- Link contacts to their organization via the user who created them
UPDATE contacts c
SET organization_id = om.organization_id
FROM organization_members om
WHERE c.organization_id IS NULL
  AND c.user_id = om.user_id;

-- 2. Backfill accounts table
-- Link accounts to their organization via the user who created them
UPDATE accounts a
SET organization_id = om.organization_id
FROM organization_members om
WHERE a.organization_id IS NULL
  AND a.user_id = om.user_id;

-- 3. Backfill organization_settings table
-- Link settings to their organization via the user who created them
UPDATE organization_settings os
SET organization_id = om.organization_id
FROM organization_members om
WHERE os.organization_id IS NULL
  AND os.user_id = om.user_id;

-- 4. Backfill picklists table (only for user-created picklists, not global ones)
-- Global picklists (system-wide) are allowed to have NULL organization_id
UPDATE picklists p
SET organization_id = om.organization_id
FROM organization_members om
WHERE p.organization_id IS NULL
  AND p.user_id = om.user_id
  AND p.user_id IS NOT NULL;

-- 5. Delete any remaining orphaned records that couldn't be linked
-- (These are records where the user_id doesn't exist in organization_members)

-- Delete orphaned contacts
DELETE FROM contacts
WHERE organization_id IS NULL
  AND user_id NOT IN (SELECT user_id FROM organization_members);

-- Delete orphaned accounts  
DELETE FROM accounts
WHERE organization_id IS NULL
  AND user_id NOT IN (SELECT user_id FROM organization_members);

-- Delete orphaned organization_settings
DELETE FROM organization_settings
WHERE organization_id IS NULL
  AND user_id NOT IN (SELECT user_id FROM organization_members);

-- 6. Add NOT NULL constraints to tables that should always have organization_id
-- (Skip picklists as it allows NULL for global values)

ALTER TABLE contacts 
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE accounts 
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE organization_settings 
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE case_subjects
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE subject_attachments
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE retainer_funds
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE invoice_payments
  ALTER COLUMN organization_id SET NOT NULL;

-- 7. Verify all critical indexes are in place (most already exist from previous migration)
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_user_id ON organization_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_picklists_user_id ON picklists(user_id);

-- 8. Add helpful comments
COMMENT ON COLUMN contacts.organization_id IS 'Required. Links contact to organization for data isolation.';
COMMENT ON COLUMN accounts.organization_id IS 'Required. Links account to organization for data isolation.';
COMMENT ON COLUMN organization_settings.organization_id IS 'Required. Links settings to organization for data isolation.';
COMMENT ON COLUMN picklists.organization_id IS 'Optional. NULL for global/system picklists, otherwise links to organization.';