// Column definitions for import functionality
// This file provides column mapping metadata for CSV imports

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'reference' | 'json';

export interface ColumnDefinition {
  name: string;
  label: string;
  key: string;
  required: boolean;
  type: ColumnType;
  description: string;
  example?: string;
  tips?: string;
}

export interface EntityDefinition {
  entityType: string;
  displayName: string;
  description: string;
  importOrder: number;
  fileName: string;
  dependsOn: string[];
  columns: ColumnDefinition[];
}

// Template columns for each entity type
export const TEMPLATE_COLUMNS: Record<string, EntityDefinition> = {
  organization: {
    entityType: 'organization',
    displayName: 'Organization',
    description: 'Your company or organization details',
    importOrder: 1,
    fileName: '01_Organization.csv',
    dependsOn: [],
    columns: [
      { name: 'company_name', label: 'Company Name', key: 'company_name', required: true, type: 'text', description: 'Your organization name', example: 'Acme Investigations' },
      { name: 'address', label: 'Address', key: 'address', required: false, type: 'text', description: 'Street address', example: '123 Main St' },
      { name: 'city', label: 'City', key: 'city', required: false, type: 'text', description: 'City', example: 'New York' },
      { name: 'state', label: 'State', key: 'state', required: false, type: 'text', description: 'State/Province', example: 'NY' },
      { name: 'zip_code', label: 'Zip Code', key: 'zip_code', required: false, type: 'text', description: 'Postal code', example: '10001' },
      { name: 'phone', label: 'Phone', key: 'phone', required: false, type: 'text', description: 'Main phone number', example: '555-123-4567' },
      { name: 'email', label: 'Email', key: 'email', required: false, type: 'text', description: 'Main email address', example: 'info@acme.com' }
    ]
  },
  accounts: {
    entityType: 'accounts',
    displayName: 'Clients',
    description: 'Client companies/accounts that request your services',
    importOrder: 2,
    fileName: '02_Clients.csv',
    dependsOn: ['organization'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID from your source system', example: 'CLIENT-001', tips: 'This ID links contacts and cases to this client' },
      { name: 'name', label: 'Account Name', key: 'name', required: true, type: 'text', description: 'Client company name', example: 'ABC Insurance' },
      { name: 'email', label: 'Email', key: 'email', required: false, type: 'text', description: 'Primary email', example: 'contact@abc.com' },
      { name: 'phone', label: 'Phone', key: 'phone', required: false, type: 'text', description: 'Primary phone', example: '555-987-6543' },
      { name: 'address', label: 'Address', key: 'address', required: false, type: 'text', description: 'Street address', example: '456 Oak Ave' },
      { name: 'city', label: 'City', key: 'city', required: false, type: 'text', description: 'City', example: 'Los Angeles' },
      { name: 'state', label: 'State', key: 'state', required: false, type: 'text', description: 'State/Province', example: 'CA' },
      { name: 'zip_code', label: 'Zip Code', key: 'zip_code', required: false, type: 'text', description: 'Postal code', example: '90001' },
      { name: 'industry', label: 'Industry', key: 'industry', required: false, type: 'text', description: 'Industry type', example: 'Insurance' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: 'VIP client' }
    ]
  },
  contacts: {
    entityType: 'contacts',
    displayName: 'Contacts',
    description: 'Individual contacts at client companies',
    importOrder: 3,
    fileName: '03_Contacts.csv',
    dependsOn: ['accounts'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID from your source system', example: 'CONTACT-001' },
      { name: 'external_account_id', label: 'Client External ID', key: 'external_account_id', required: false, type: 'reference', description: 'Links to client account', example: 'CLIENT-001' },
      { name: 'first_name', label: 'First Name', key: 'first_name', required: true, type: 'text', description: 'First name', example: 'John' },
      { name: 'last_name', label: 'Last Name', key: 'last_name', required: true, type: 'text', description: 'Last name', example: 'Smith' },
      { name: 'email', label: 'Email', key: 'email', required: false, type: 'text', description: 'Email address', example: 'john.smith@abc.com' },
      { name: 'phone', label: 'Phone', key: 'phone', required: false, type: 'text', description: 'Phone number', example: '555-111-2222' },
      { name: 'address', label: 'Address', key: 'address', required: false, type: 'text', description: 'Street address', example: '789 Pine St' },
      { name: 'city', label: 'City', key: 'city', required: false, type: 'text', description: 'City', example: 'Chicago' },
      { name: 'state', label: 'State', key: 'state', required: false, type: 'text', description: 'State/Province', example: 'IL' },
      { name: 'zip_code', label: 'Zip Code', key: 'zip_code', required: false, type: 'text', description: 'Postal code', example: '60601' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: 'Primary point of contact' }
    ]
  },
  cases: {
    entityType: 'cases',
    displayName: 'Cases',
    description: 'Investigation cases or matters',
    importOrder: 4,
    fileName: '04_Cases.csv',
    dependsOn: ['accounts', 'contacts'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID from your source system', example: 'CASE-001' },
      { name: 'case_number', label: 'Case Number', key: 'case_number', required: true, type: 'text', description: 'Your case/file number', example: '2024-INV-001' },
      { name: 'title', label: 'Title', key: 'title', required: true, type: 'text', description: 'Case title', example: 'Smith Workers Comp Investigation' },
      { name: 'external_account_id', label: 'Client External ID', key: 'external_account_id', required: false, type: 'reference', description: 'Links to client', example: 'CLIENT-001' },
      { name: 'external_contact_id', label: 'Contact External ID', key: 'external_contact_id', required: false, type: 'reference', description: 'Links to contact', example: 'CONTACT-001' },
      { name: 'external_parent_case_id', label: 'Parent Case External ID', key: 'external_parent_case_id', required: false, type: 'reference', description: 'Links to parent case', example: 'CASE-000' },
      { name: 'status', label: 'Status', key: 'status', required: false, type: 'text', description: 'Case status', example: 'Active' },
      { name: 'description', label: 'Description', key: 'description', required: false, type: 'text', description: 'Case description/notes', example: 'Surveillance investigation' },
      { name: 'due_date', label: 'Due Date', key: 'due_date', required: false, type: 'date', description: 'Target completion date', example: '2024-12-31' },
      { name: 'reference_number', label: 'Reference Number', key: 'reference_number', required: false, type: 'text', description: 'Client claim/reference #', example: 'CLM-123456' },
      { name: 'case_manager_email', label: 'Case Manager Email', key: 'case_manager_email', required: false, type: 'text', description: 'Email of case manager (must be a user)', example: 'manager@company.com' },
      { name: 'investigator_emails', label: 'Investigator Emails', key: 'investigator_emails', required: false, type: 'text', description: 'Comma-separated investigator emails', example: 'inv1@company.com,inv2@company.com' },
      { name: 'budget_hours', label: 'Budget Hours', key: 'budget_hours', required: false, type: 'number', description: 'Authorized hours', example: '40' },
      { name: 'budget_dollars', label: 'Budget Dollars', key: 'budget_dollars', required: false, type: 'number', description: 'Authorized budget', example: '5000' },
      { name: 'budget_notes', label: 'Budget Notes', key: 'budget_notes', required: false, type: 'text', description: 'Budget authorization notes', example: 'Initial authorization' }
    ]
  },
  subjects: {
    entityType: 'subjects',
    displayName: 'Subjects',
    description: 'Subject records (people, vehicles, etc.) linked to cases',
    importOrder: 5,
    fileName: '05_Subjects.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID from your source system', example: 'SUBJ-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case (required)', example: 'CASE-001' },
      { name: 'name', label: 'Name', key: 'name', required: true, type: 'text', description: 'Subject name', example: 'Jane Doe' },
      { name: 'subject_type', label: 'Type', key: 'subject_type', required: true, type: 'text', description: 'Type: person, vehicle, business, property', example: 'person' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: 'Primary claimant' },
      { name: 'profile_image_url', label: 'Profile Image URL', key: 'profile_image_url', required: false, type: 'text', description: 'URL to profile image', example: '' },
      { name: 'date_of_birth', label: 'Date of Birth', key: 'date_of_birth', required: false, type: 'date', description: 'For person subjects', example: '1985-06-15' },
      { name: 'ssn_last4', label: 'SSN Last 4', key: 'ssn_last4', required: false, type: 'text', description: 'Last 4 digits of SSN', example: '1234' },
      { name: 'address', label: 'Address', key: 'address', required: false, type: 'text', description: 'Subject address', example: '123 Main St' },
      { name: 'phone', label: 'Phone', key: 'phone', required: false, type: 'text', description: 'Subject phone', example: '555-123-4567' },
      { name: 'email', label: 'Email', key: 'email', required: false, type: 'text', description: 'Subject email', example: 'subject@email.com' },
      { name: 'employer', label: 'Employer', key: 'employer', required: false, type: 'text', description: 'For person subjects', example: 'Acme Corp' },
      { name: 'occupation', label: 'Occupation', key: 'occupation', required: false, type: 'text', description: 'For person subjects', example: 'Engineer' },
      { name: 'make', label: 'Vehicle Make', key: 'make', required: false, type: 'text', description: 'For vehicle subjects', example: 'Honda' },
      { name: 'model', label: 'Vehicle Model', key: 'model', required: false, type: 'text', description: 'For vehicle subjects', example: 'Accord' },
      { name: 'year', label: 'Vehicle Year', key: 'year', required: false, type: 'number', description: 'For vehicle subjects', example: '2020' },
      { name: 'color', label: 'Vehicle Color', key: 'color', required: false, type: 'text', description: 'For vehicle subjects', example: 'Silver' },
      { name: 'license_plate', label: 'License Plate', key: 'license_plate', required: false, type: 'text', description: 'For vehicle subjects', example: 'ABC-1234' },
      { name: 'vin', label: 'VIN', key: 'vin', required: false, type: 'text', description: 'For vehicle subjects', example: '1HGBH41JXMN109186' },
      { name: 'business_name', label: 'Business Name', key: 'business_name', required: false, type: 'text', description: 'For business subjects', example: 'Smith LLC' },
      { name: 'ein', label: 'EIN', key: 'ein', required: false, type: 'text', description: 'For business subjects', example: '12-3456789' },
      { name: 'website', label: 'Website', key: 'website', required: false, type: 'text', description: 'For business subjects', example: 'www.example.com' }
    ]
  },
  case_subjects: {
    entityType: 'case_subjects',
    displayName: 'Case Subjects',
    description: 'Links subjects to additional cases (subjects are auto-linked to their primary case)',
    importOrder: 6,
    fileName: '06_CaseSubjects.csv',
    dependsOn: ['cases', 'subjects'],
    columns: [
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'external_subject_id', label: 'Subject External ID', key: 'external_subject_id', required: true, type: 'reference', description: 'Links to subject', example: 'SUBJ-001' },
      { name: 'is_primary', label: 'Is Primary', key: 'is_primary', required: false, type: 'boolean', description: 'Primary subject?', example: 'true' }
    ]
  },
  case_updates: {
    entityType: 'case_updates',
    displayName: 'Updates',
    description: 'Case notes and updates',
    importOrder: 7,
    fileName: '07_Updates.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'UPD-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'title', label: 'Title', key: 'title', required: true, type: 'text', description: 'Update title', example: 'Initial Contact Made' },
      { name: 'description', label: 'Description', key: 'description', required: false, type: 'text', description: 'Update content', example: 'Spoke with claimant by phone...' },
      { name: 'update_type', label: 'Type', key: 'update_type', required: false, type: 'text', description: 'Update type', example: 'general' },
      { name: 'author_email', label: 'Author Email', key: 'author_email', required: false, type: 'text', description: 'Author email (must be a user)', example: 'inv1@company.com' },
      { name: 'created_at', label: 'Created Date', key: 'created_at', required: false, type: 'date', description: 'When update was created', example: '2024-01-15T14:30:00Z' }
    ]
  },
  case_activities: {
    entityType: 'case_activities',
    displayName: 'Events',
    description: 'Scheduled events, tasks, and activities',
    importOrder: 8,
    fileName: '08_Events.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'EVT-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'title', label: 'Title', key: 'title', required: true, type: 'text', description: 'Event title', example: 'Field Surveillance' },
      { name: 'activity_type', label: 'Type', key: 'activity_type', required: true, type: 'text', description: 'Event type', example: 'surveillance' },
      { name: 'description', label: 'Description', key: 'description', required: false, type: 'text', description: 'Event details', example: 'Morning surveillance at residence' },
      { name: 'due_date', label: 'Due Date', key: 'due_date', required: false, type: 'date', description: 'Scheduled date', example: '2024-02-01' },
      { name: 'status', label: 'Status', key: 'status', required: false, type: 'text', description: 'Status: to_do, in_progress, completed', example: 'to_do' },
      { name: 'completed', label: 'Completed', key: 'completed', required: false, type: 'boolean', description: 'Whether completed', example: 'false' },
      { name: 'completed_at', label: 'Completed At', key: 'completed_at', required: false, type: 'date', description: 'Completion timestamp', example: '2024-02-01T16:00:00Z' },
      { name: 'event_subtype', label: 'Subtype', key: 'event_subtype', required: false, type: 'text', description: 'Event subtype', example: 'Client Meeting' },
      { name: 'assigned_to_email', label: 'Assigned To Email', key: 'assigned_to_email', required: false, type: 'text', description: 'Assignee email (must be a user)', example: 'inv1@company.com' },
      { name: 'created_at', label: 'Created At', key: 'created_at', required: false, type: 'date', description: 'Creation timestamp', example: '2024-01-15T09:00:00Z' }
    ]
  },
  time_entries: {
    entityType: 'time_entries',
    displayName: 'Time Entries',
    description: 'Billable time records (finance_type auto-set to "time")',
    importOrder: 9,
    fileName: '09_TimeEntries.csv',
    dependsOn: ['cases', 'subjects'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'TIME-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'description', label: 'Description', key: 'description', required: true, type: 'text', description: 'Work description', example: '4 hours surveillance' },
      { name: 'date', label: 'Date', key: 'date', required: true, type: 'date', description: 'Date of work', example: '2024-01-20' },
      { name: 'hours', label: 'Hours', key: 'hours', required: true, type: 'number', description: 'Time in hours', example: '4' },
      { name: 'hourly_rate', label: 'Hourly Rate', key: 'hourly_rate', required: false, type: 'number', description: 'Rate per hour', example: '85' },
      { name: 'amount', label: 'Amount', key: 'amount', required: false, type: 'number', description: 'Total dollar amount', example: '340' },
      { name: 'external_subject_id', label: 'Subject External ID', key: 'external_subject_id', required: false, type: 'reference', description: 'Links to subject', example: 'SUBJ-001' },
      { name: 'external_activity_id', label: 'Activity External ID', key: 'external_activity_id', required: false, type: 'reference', description: 'Links to event/activity', example: 'EVT-001' },
      { name: 'start_date', label: 'Start Date', key: 'start_date', required: false, type: 'date', description: 'Work start date', example: '2024-01-20' },
      { name: 'end_date', label: 'End Date', key: 'end_date', required: false, type: 'date', description: 'Work end date', example: '2024-01-20' },
      { name: 'category', label: 'Category', key: 'category', required: false, type: 'text', description: 'Time category', example: 'Surveillance' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: '' },
      { name: 'author_email', label: 'Author Email', key: 'author_email', required: false, type: 'text', description: 'Author email (must be a user)', example: 'inv1@company.com' },
      { name: 'created_at', label: 'Created At', key: 'created_at', required: false, type: 'date', description: 'Creation timestamp', example: '2024-01-20T18:00:00Z' }
    ]
  },
  expenses: {
    entityType: 'expenses',
    displayName: 'Expenses',
    description: 'Case-related expenses (finance_type auto-set to "expense")',
    importOrder: 10,
    fileName: '10_Expenses.csv',
    dependsOn: ['cases', 'subjects'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'EXP-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'description', label: 'Description', key: 'description', required: true, type: 'text', description: 'Expense description', example: 'Mileage - 50 miles' },
      { name: 'date', label: 'Date', key: 'date', required: true, type: 'date', description: 'Date of expense', example: '2024-01-20' },
      { name: 'amount', label: 'Amount', key: 'amount', required: true, type: 'number', description: 'Dollar amount', example: '32.50' },
      { name: 'category', label: 'Category', key: 'category', required: false, type: 'text', description: 'Expense category', example: 'Mileage' },
      { name: 'quantity', label: 'Quantity', key: 'quantity', required: false, type: 'number', description: 'Quantity', example: '50' },
      { name: 'unit_price', label: 'Unit Price', key: 'unit_price', required: false, type: 'number', description: 'Price per unit', example: '0.65' },
      { name: 'external_subject_id', label: 'Subject External ID', key: 'external_subject_id', required: false, type: 'reference', description: 'Links to subject', example: 'SUBJ-001' },
      { name: 'external_activity_id', label: 'Activity External ID', key: 'external_activity_id', required: false, type: 'reference', description: 'Links to event/activity', example: 'EVT-001' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: '' },
      { name: 'author_email', label: 'Author Email', key: 'author_email', required: false, type: 'text', description: 'Author email (must be a user)', example: 'inv1@company.com' },
      { name: 'created_at', label: 'Created At', key: 'created_at', required: false, type: 'date', description: 'Creation timestamp', example: '2024-01-20T18:00:00Z' }
    ]
  },
  budgets: {
    entityType: 'budgets',
    displayName: 'Budgets',
    description: 'Case budget allocations (updates existing case budget fields)',
    importOrder: 11,
    fileName: '11_Budgets.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'BUD-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'budget_hours', label: 'Budget Hours', key: 'budget_hours', required: false, type: 'number', description: 'Authorized hours', example: '40' },
      { name: 'budget_dollars', label: 'Budget Dollars', key: 'budget_dollars', required: false, type: 'number', description: 'Authorized budget', example: '5000' },
      { name: 'budget_notes', label: 'Budget Notes', key: 'budget_notes', required: false, type: 'text', description: 'Budget notes', example: 'Initial authorization per client agreement' }
    ]
  },
  budget_adjustments: {
    entityType: 'budget_adjustments',
    displayName: 'Budget Adjustments',
    description: 'Budget modifications',
    importOrder: 12,
    fileName: '12_BudgetAdjustments.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'ADJ-001' },
      { name: 'external_case_id', label: 'Case External ID', key: 'external_case_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'adjustment_type', label: 'Type', key: 'adjustment_type', required: true, type: 'text', description: 'hours or dollars', example: 'hours' },
      { name: 'new_value', label: 'New Value', key: 'new_value', required: true, type: 'number', description: 'New budget value', example: '60' },
      { name: 'reason', label: 'Reason', key: 'reason', required: true, type: 'text', description: 'Reason for adjustment', example: 'Client approved additional hours' },
      { name: 'previous_value', label: 'Previous Value', key: 'previous_value', required: false, type: 'number', description: 'Previous budget value', example: '40' },
      { name: 'adjustment_amount', label: 'Adjustment Amount', key: 'adjustment_amount', required: false, type: 'number', description: 'Amount changed', example: '20' },
      { name: 'author_email', label: 'Author Email', key: 'author_email', required: false, type: 'text', description: 'Author email (must be a user)', example: 'manager@company.com' },
      { name: 'created_at', label: 'Created At', key: 'created_at', required: false, type: 'date', description: 'Adjustment timestamp', example: '2024-01-25T10:00:00Z' }
    ]
  }
};

// Helper functions
export function getEntityDefinition(entityType: string): EntityDefinition | undefined {
  return TEMPLATE_COLUMNS[entityType];
}

export function getAllEntitiesSorted(): EntityDefinition[] {
  return Object.values(TEMPLATE_COLUMNS).sort((a, b) => a.importOrder - b.importOrder);
}

export function getColumnDefinitions(entityType: string): ColumnDefinition[] {
  const entity = TEMPLATE_COLUMNS[entityType];
  return entity?.columns || [];
}

export function getRequiredColumns(entityType: string): string[] {
  const columns = getColumnDefinitions(entityType);
  return columns.filter(c => c.required).map(c => c.name);
}

// Legacy exports for backward compatibility with import components
export const IMPORT_COLUMN_DEFINITIONS = Object.entries(TEMPLATE_COLUMNS).map(([entityType, def]) => ({
  entityType,
  columns: def.columns.map(c => ({
    key: c.key,
    label: c.label,
    required: c.required,
    description: c.description
  }))
}));
