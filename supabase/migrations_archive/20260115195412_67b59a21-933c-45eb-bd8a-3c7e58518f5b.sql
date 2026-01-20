-- Phase 1: Drop all related triggers first (with explicit table names)
DROP TRIGGER IF EXISTS set_case_pricing_profile_trigger ON cases;
DROP TRIGGER IF EXISTS tr_prevent_default_profile_deletion ON pricing_profiles;
DROP TRIGGER IF EXISTS tr_prevent_last_default_rule_deletion ON service_pricing_rules;

-- Drop functions with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS set_case_pricing_profile() CASCADE;
DROP FUNCTION IF EXISTS prevent_default_profile_deletion() CASCADE;
DROP FUNCTION IF EXISTS prevent_last_default_rule_deletion() CASCADE;

-- Remove pricing_profile_id from cases
ALTER TABLE cases DROP COLUMN IF EXISTS pricing_profile_id;

-- Remove default_pricing_profile_id from accounts  
ALTER TABLE accounts DROP COLUMN IF EXISTS default_pricing_profile_id;

-- Remove pricing_profile_id from invoice_line_items (if exists)
ALTER TABLE invoice_line_items DROP COLUMN IF EXISTS pricing_profile_id;

-- Drop tables (CASCADE will remove FKs and policies)
DROP TABLE IF EXISTS service_pricing_rules CASCADE;
DROP TABLE IF EXISTS pricing_profiles CASCADE;

-- Clean up client_price_list - remove obsolete pricing_rule_id column
ALTER TABLE client_price_list DROP COLUMN IF EXISTS pricing_rule_id;