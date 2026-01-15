-- Comprehensive cleanup migration (fixed FK order + correct trigger name)
-- Keep only organization: d76c9a66-790e-445a-a090-817229943cf5 (Emerging Investigations)

DO $$
DECLARE
  keep_org_id uuid := 'd76c9a66-790e-445a-a090-817229943cf5';
BEGIN
  -- Temporarily disable trigger that prevents default profile deletion
  ALTER TABLE pricing_profiles DISABLE TRIGGER tr_prevent_default_profile_deletion;
  
  -- Phase 1: Delete from all organization-scoped tables (child tables first)
  
  -- Case finances FIRST (references case_updates, case_activities, etc.)
  DELETE FROM case_finances WHERE organization_id != keep_org_id;
  
  -- Case-related child tables
  DELETE FROM case_budget_adjustments WHERE organization_id != keep_org_id;
  DELETE FROM case_service_budget_limits WHERE organization_id != keep_org_id;
  DELETE FROM budget_violation_events WHERE organization_id != keep_org_id;
  DELETE FROM case_service_instances WHERE organization_id != keep_org_id;
  DELETE FROM case_services WHERE organization_id != keep_org_id;
  DELETE FROM entity_activity_photos WHERE organization_id != keep_org_id;
  DELETE FROM entity_activities WHERE organization_id != keep_org_id;
  DELETE FROM subject_attachments WHERE organization_id != keep_org_id;
  DELETE FROM subject_social_links WHERE organization_id != keep_org_id;
  DELETE FROM subject_references WHERE organization_id != keep_org_id;
  DELETE FROM subject_links WHERE organization_id != keep_org_id;
  DELETE FROM case_subjects WHERE organization_id != keep_org_id;
  DELETE FROM attachment_folders WHERE organization_id != keep_org_id;
  DELETE FROM case_attachments WHERE organization_id != keep_org_id;
  DELETE FROM case_activities WHERE organization_id != keep_org_id;
  DELETE FROM case_updates WHERE organization_id != keep_org_id;
  DELETE FROM case_budgets WHERE organization_id != keep_org_id;
  
  -- Invoice-related tables
  DELETE FROM invoice_line_items WHERE organization_id != keep_org_id;
  DELETE FROM invoice_payments WHERE organization_id != keep_org_id;
  DELETE FROM invoice_audit_log WHERE organization_id != keep_org_id;
  DELETE FROM invoices WHERE organization_id != keep_org_id;
  
  -- Document/report tables
  DELETE FROM generated_reports WHERE organization_id != keep_org_id;
  DELETE FROM document_instances WHERE organization_id != keep_org_id;
  DELETE FROM document_templates WHERE organization_id != keep_org_id;
  DELETE FROM docx_templates WHERE organization_id != keep_org_id;
  DELETE FROM letter_templates WHERE organization_id != keep_org_id;
  DELETE FROM template_header_footer_config WHERE organization_id != keep_org_id;
  DELETE FROM reports WHERE organization_id != keep_org_id;
  
  -- Notifications and audit
  DELETE FROM notifications WHERE organization_id != keep_org_id;
  DELETE FROM audit_events WHERE organization_id != keep_org_id;
  DELETE FROM case_number_format_audit_log WHERE organization_id != keep_org_id;
  DELETE FROM subject_audit_logs WHERE organization_id != keep_org_id;
  DELETE FROM subject_social_link_audit_logs WHERE organization_id != keep_org_id;
  DELETE FROM security_audit_log WHERE organization_id != keep_org_id;
  
  -- Billing and contracts
  DELETE FROM billing_events WHERE organization_id != keep_org_id;
  DELETE FROM contract_notifications WHERE contract_id IN (SELECT id FROM contracts WHERE organization_id != keep_org_id);
  DELETE FROM contracts WHERE organization_id != keep_org_id;
  
  -- Contacts and accounts
  DELETE FROM contacts WHERE organization_id != keep_org_id;
  DELETE FROM accounts WHERE organization_id != keep_org_id;
  
  -- Financial tables
  DELETE FROM retainer_funds WHERE organization_id != keep_org_id;
  DELETE FROM credit_memos WHERE organization_id != keep_org_id;
  DELETE FROM slas WHERE organization_id != keep_org_id;
  DELETE FROM service_pricing_rules WHERE organization_id != keep_org_id;
  DELETE FROM pricing_profiles WHERE organization_id != keep_org_id;
  DELETE FROM tax_rates WHERE organization_id != keep_org_id;
  
  -- Configuration tables
  DELETE FROM picklists WHERE organization_id != keep_org_id;
  DELETE FROM case_types WHERE organization_id != keep_org_id;
  DELETE FROM subject_types WHERE organization_id != keep_org_id;
  
  -- Import tables
  DELETE FROM ai_import_sessions WHERE organization_id != keep_org_id;
  DELETE FROM import_type_mappings WHERE organization_id != keep_org_id;
  DELETE FROM import_batches WHERE organization_id != keep_org_id;
  
  -- Attachment tables
  DELETE FROM attachment_access WHERE organization_id != keep_org_id;
  DELETE FROM attachment_preview_logs WHERE organization_id != keep_org_id;
  
  -- Access review tables
  DELETE FROM access_review_items WHERE organization_id != keep_org_id;
  DELETE FROM access_reviews WHERE organization_id != keep_org_id;
  
  -- Data/compliance tables
  DELETE FROM data_subject_requests WHERE organization_id != keep_org_id;
  DELETE FROM regional_access_logs WHERE organization_id != keep_org_id;
  DELETE FROM region_migration_requests WHERE organization_id != keep_org_id;
  
  -- Integration tables
  DELETE FROM integration_api_keys WHERE organization_id != keep_org_id;
  DELETE FROM control_plane_tenants WHERE organization_id != keep_org_id;
  DELETE FROM customer_health_snapshots WHERE organization_id != keep_org_id;
  
  -- SSO/SCIM tables
  DELETE FROM scim_provisioning_logs WHERE organization_id != keep_org_id;
  DELETE FROM sso_role_mappings WHERE organization_id != keep_org_id;
  DELETE FROM organization_sso_configs WHERE organization_id != keep_org_id;
  DELETE FROM organization_scim_configs WHERE organization_id != keep_org_id;
  
  -- Cases (after all case-related data is deleted)
  DELETE FROM cases WHERE organization_id != keep_org_id;
  
  -- Organization-level tables
  DELETE FROM organization_invites WHERE organization_id != keep_org_id;
  DELETE FROM organization_settings WHERE organization_id != keep_org_id;
  DELETE FROM organization_domains WHERE organization_id != keep_org_id;
  DELETE FROM organization_integrations WHERE organization_id != keep_org_id;
  DELETE FROM organization_exports WHERE organization_id != keep_org_id;
  DELETE FROM organization_usage WHERE organization_id != keep_org_id;
  DELETE FROM organization_entitlements_overrides WHERE organization_id != keep_org_id;
  DELETE FROM organization_deletions WHERE organization_id != keep_org_id;
  
  -- Organization members (before deleting orgs)
  DELETE FROM organization_members WHERE organization_id != keep_org_id;
  
  -- Finally delete the organizations
  DELETE FROM organizations WHERE id != keep_org_id;
  
  -- Re-enable the trigger
  ALTER TABLE pricing_profiles ENABLE TRIGGER tr_prevent_default_profile_deletion;
  
  -- Phase 2: Clean up orphaned user data
  DELETE FROM user_roles 
  WHERE user_id NOT IN (
    SELECT user_id FROM organization_members WHERE organization_id = keep_org_id
  );
  
  DELETE FROM profiles 
  WHERE id NOT IN (
    SELECT user_id FROM organization_members WHERE organization_id = keep_org_id
  );
  
END $$;