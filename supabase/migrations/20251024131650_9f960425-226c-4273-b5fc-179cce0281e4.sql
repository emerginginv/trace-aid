-- Add triggers to all case-related tables
CREATE TRIGGER ensure_update_organization
  BEFORE INSERT ON case_updates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_activity_organization
  BEFORE INSERT ON case_activities
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_finance_organization
  BEFORE INSERT ON case_finances
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_attachment_organization
  BEFORE INSERT ON case_attachments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_subject_attachment_organization
  BEFORE INSERT ON subject_attachments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_retainer_organization
  BEFORE INSERT ON retainer_funds
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_invoice_organization
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_invoice_payment_organization
  BEFORE INSERT ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

-- Fix existing records by setting organization_id from organization_members
UPDATE case_updates cu
SET organization_id = om.organization_id
FROM organization_members om
WHERE cu.user_id = om.user_id
  AND cu.organization_id IS NULL;

UPDATE case_activities ca
SET organization_id = om.organization_id
FROM organization_members om
WHERE ca.user_id = om.user_id
  AND ca.organization_id IS NULL;

UPDATE case_finances cf
SET organization_id = om.organization_id
FROM organization_members om
WHERE cf.user_id = om.user_id
  AND cf.organization_id IS NULL;

UPDATE case_attachments ca
SET organization_id = om.organization_id
FROM organization_members om
WHERE ca.user_id = om.user_id
  AND ca.organization_id IS NULL;

UPDATE subject_attachments sa
SET organization_id = om.organization_id
FROM organization_members om
WHERE sa.user_id = om.user_id
  AND sa.organization_id IS NULL;

UPDATE retainer_funds rf
SET organization_id = om.organization_id
FROM organization_members om
WHERE rf.user_id = om.user_id
  AND rf.organization_id IS NULL;

UPDATE invoices i
SET organization_id = om.organization_id
FROM organization_members om
WHERE i.user_id = om.user_id
  AND i.organization_id IS NULL;

UPDATE invoice_payments ip
SET organization_id = om.organization_id
FROM organization_members om
WHERE ip.user_id = om.user_id
  AND ip.organization_id IS NULL;