-- Seed system report templates
-- Note: organization_id is NULL for system templates, user_id is a placeholder UUID

-- 1. Standard Investigation Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Standard Investigation Report',
  'General purpose investigation report with all key sections',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000001', 'Company Header', 'static_text', 1, '<div class="header"><h1>{{company_name}}</h1><p>{{company_address}}</p><p>{{company_phone}} | {{company_email}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000001', 'Case Information', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "claim_number", "assignment_date", "due_date"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000001', 'Client Information', 'case_variable_block', 3, NULL, '{"variables": ["client_list", "primary_client"], "layout": "list", "showLabels": true}'),
('00000000-0000-0000-0000-000000000001', 'Subject Details', 'case_variable_block', 4, NULL, '{"variables": ["primary_subject", "subject_list", "location_list"], "layout": "list", "showLabels": true}'),
('00000000-0000-0000-0000-000000000001', 'Investigation Summary', 'static_text', 5, '<h2>Investigation Summary</h2><p>[Enter investigation summary here]</p>', NULL),
('00000000-0000-0000-0000-000000000001', 'Case Updates', 'update_collection', 6, NULL, '{"sortBy": "created_at", "sortOrder": "desc", "limit": null}'),
('00000000-0000-0000-0000-000000000001', 'Conclusion', 'static_text', 7, '<h2>Conclusion</h2><p>[Enter conclusion here]</p><p>Report prepared by: {{case_manager}}</p>', NULL);

-- 2. Surveillance Summary
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Surveillance Summary',
  'Focused on surveillance activities and observations',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000002', 'Header', 'static_text', 1, '<div class="header"><h1>Surveillance Report</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000002', 'Subject Information', 'case_variable_block', 2, NULL, '{"variables": ["primary_subject", "subject_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000002', 'Surveillance Period', 'case_variable_block', 3, NULL, '{"variables": ["surveillance_dates", "surveillance_start", "surveillance_end"], "layout": "inline", "showLabels": true}'),
('00000000-0000-0000-0000-000000000002', 'Activity Log', 'event_collection', 4, NULL, '{"sortBy": "due_date", "sortOrder": "asc", "limit": null, "filters": {"activity_type": "surveillance"}}'),
('00000000-0000-0000-0000-000000000002', 'Observations', 'static_text', 5, '<h2>Observations</h2><p>[Enter detailed observations here]</p>', NULL),
('00000000-0000-0000-0000-000000000002', 'Investigator Notes', 'static_text', 6, '<p>Investigator: {{investigator_list}}</p>', NULL);

-- 3. Client Status Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Client Status Report',
  'Brief status update for clients',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000003', 'Header', 'static_text', 1, '<div class="header"><h1>Case Status Report</h1><p>{{company_name}}</p><p>Date: {{current_date}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000003', 'Case Overview', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "claim_number", "primary_subject"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000003', 'Current Status', 'static_text', 3, '<h2>Current Status</h2><p>[Enter current case status here]</p>', NULL),
('00000000-0000-0000-0000-000000000003', 'Recent Updates', 'update_collection', 4, NULL, '{"sortBy": "created_at", "sortOrder": "desc", "limit": 5}'),
('00000000-0000-0000-0000-000000000003', 'Next Steps', 'static_text', 5, '<h2>Next Steps</h2><p>[Enter planned next steps here]</p>', NULL);

-- 4. Court-Ready Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Court-Ready Report',
  'Formal legal format suitable for court submission',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000004', 'Letterhead', 'static_text', 1, '<div class="letterhead"><h1>{{company_name}}</h1><p>{{company_address}}</p><p>License #: {{agency_license}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000004', 'Case Details', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "claim_number", "assignment_date"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000004', 'Subject Information', 'case_variable_block', 3, NULL, '{"variables": ["primary_subject", "subject_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000004', 'Evidence Summary', 'static_text', 4, '<h2>Evidence Summary</h2><p>[Enter evidence summary here]</p>', NULL),
('00000000-0000-0000-0000-000000000004', 'Detailed Findings', 'static_text', 5, '<h2>Findings</h2><p>[Enter detailed findings here]</p>', NULL),
('00000000-0000-0000-0000-000000000004', 'Certification', 'static_text', 6, '<div class="certification"><p>I, the undersigned investigator, hereby certify that the information contained in this report is true and accurate to the best of my knowledge.</p><p>Investigator: {{case_manager}}</p><p>Date: {{current_date}}</p></div>', NULL);

-- 5. Insurance Claim Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Insurance Claim Report',
  'Format tailored for insurance industry claims',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000005', 'Header', 'static_text', 1, '<div class="header"><h1>Insurance Investigation Report</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000005', 'Claim Information', 'case_variable_block', 2, NULL, '{"variables": ["claim_number", "case_number", "assignment_date", "client_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000005', 'Claimant Details', 'case_variable_block', 3, NULL, '{"variables": ["primary_subject", "subject_list", "location_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000005', 'Investigation Findings', 'static_text', 4, '<h2>Investigation Findings</h2><p>[Enter investigation findings here]</p>', NULL),
('00000000-0000-0000-0000-000000000005', 'Recommendations', 'static_text', 5, '<h2>Recommendations</h2><p>[Enter recommendations here]</p>', NULL);

-- 6. Executive Summary
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Executive Summary',
  'One-page high-level overview',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000006', 'Header', 'static_text', 1, '<div class="header"><h1>Executive Summary</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000006', 'Key Facts', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "primary_subject", "assignment_date", "surveillance_dates"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000006', 'Summary', 'static_text', 3, '<h2>Summary</h2><p>[Enter executive summary here]</p>', NULL),
('00000000-0000-0000-0000-000000000006', 'Conclusion', 'static_text', 4, '<h2>Conclusion</h2><p>[Enter conclusion here]</p>', NULL);

-- 7. Activity Log Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Activity Log Report',
  'Comprehensive listing of all case activities',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000007', 'Header', 'static_text', 1, '<div class="header"><h1>Activity Log</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000007', 'Case Information', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "primary_subject"], "layout": "inline", "showLabels": true}'),
('00000000-0000-0000-0000-000000000007', 'Complete Activity List', 'event_collection', 3, NULL, '{"sortBy": "due_date", "sortOrder": "asc", "limit": null}');

-- 8. Subject Profile Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000008',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Subject Profile Report',
  'Detailed subject-focused report',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000008', 'Header', 'static_text', 1, '<div class="header"><h1>Subject Profile</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000008', 'Subject Details', 'case_variable_block', 2, NULL, '{"variables": ["primary_subject", "subject_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000008', 'Associated Locations', 'case_variable_block', 3, NULL, '{"variables": ["location_list"], "layout": "list", "showLabels": true}'),
('00000000-0000-0000-0000-000000000008', 'Notes', 'static_text', 4, '<h2>Notes</h2><p>[Enter subject notes here]</p>', NULL);

-- 9. Financial Summary Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000009',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Financial Summary Report',
  'Expense and billing focused report',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000009', 'Header', 'static_text', 1, '<div class="header"><h1>Financial Summary</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000009', 'Case Information', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "client_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000009', 'Expenses Summary', 'static_text', 3, '<h2>Expenses</h2><p>[Expense breakdown will be inserted here]</p>', NULL),
('00000000-0000-0000-0000-000000000009', 'Hours Summary', 'static_text', 4, '<h2>Hours</h2><p>[Hours breakdown will be inserted here]</p>', NULL);

-- 10. Case Closure Report
INSERT INTO public.report_templates (id, organization_id, user_id, name, description, is_system_template, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  NULL,
  '00000000-0000-0000-0000-000000000000',
  'Case Closure Report',
  'Final wrap-up report for closed cases',
  true,
  true
);

INSERT INTO public.template_sections (template_id, title, section_type, display_order, content, variable_config) VALUES
('00000000-0000-0000-0000-000000000010', 'Header', 'static_text', 1, '<div class="header"><h1>Case Closure Report</h1><p>{{company_name}}</p></div>', NULL),
('00000000-0000-0000-0000-000000000010', 'Case Summary', 'case_variable_block', 2, NULL, '{"variables": ["case_title", "case_number", "claim_number", "assignment_date", "primary_subject", "client_list"], "layout": "table", "showLabels": true}'),
('00000000-0000-0000-0000-000000000010', 'Final Findings', 'static_text', 3, '<h2>Final Findings</h2><p>[Enter final findings here]</p>', NULL),
('00000000-0000-0000-0000-000000000010', 'All Updates', 'update_collection', 4, NULL, '{"sortBy": "created_at", "sortOrder": "asc", "limit": null}'),
('00000000-0000-0000-0000-000000000010', 'Closure Notes', 'static_text', 5, '<h2>Closure Notes</h2><p>[Enter closure notes here]</p><p>Case closed by: {{case_manager}}</p><p>Closure date: {{current_date}}</p>', NULL);