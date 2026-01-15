-- Remove pricing_rule_id from employee_price_list since pricing profiles/rules have been removed
ALTER TABLE employee_price_list DROP COLUMN IF EXISTS pricing_rule_id;