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
      { name: 'email', label: 'Email', key: 'email', required: false, type: 'text', description: 'Main email address', example: 'info@acme.com' },
    ],
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
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: 'VIP client' },
    ],
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
      { name: 'account_external_id', label: 'Client External ID', key: 'account_external_id', required: false, type: 'reference', description: 'Links to client account', example: 'CLIENT-001' },
      { name: 'first_name', label: 'First Name', key: 'first_name', required: true, type: 'text', description: 'First name', example: 'John' },
      { name: 'last_name', label: 'Last Name', key: 'last_name', required: true, type: 'text', description: 'Last name', example: 'Smith' },
      { name: 'email', label: 'Email', key: 'email', required: false, type: 'text', description: 'Email address', example: 'john.smith@abc.com' },
      { name: 'phone', label: 'Phone', key: 'phone', required: false, type: 'text', description: 'Phone number', example: '555-111-2222' },
      { name: 'address', label: 'Address', key: 'address', required: false, type: 'text', description: 'Street address', example: '789 Pine St' },
      { name: 'city', label: 'City', key: 'city', required: false, type: 'text', description: 'City', example: 'Chicago' },
      { name: 'state', label: 'State', key: 'state', required: false, type: 'text', description: 'State/Province', example: 'IL' },
      { name: 'zip_code', label: 'Zip Code', key: 'zip_code', required: false, type: 'text', description: 'Postal code', example: '60601' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: 'Primary point of contact' },
    ],
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
      { name: 'account_external_id', label: 'Client External ID', key: 'account_external_id', required: false, type: 'reference', description: 'Links to client', example: 'CLIENT-001' },
      { name: 'contact_external_id', label: 'Contact External ID', key: 'contact_external_id', required: false, type: 'reference', description: 'Links to contact', example: 'CONTACT-001' },
      { name: 'status', label: 'Status', key: 'status', required: false, type: 'text', description: 'Case status', example: 'Active' },
      { name: 'description', label: 'Description', key: 'description', required: false, type: 'text', description: 'Case description/notes', example: 'Surveillance investigation' },
      { name: 'due_date', label: 'Due Date', key: 'due_date', required: false, type: 'date', description: 'Target completion date', example: '2024-12-31' },
      { name: 'reference_number', label: 'Reference Number', key: 'reference_number', required: false, type: 'text', description: 'Client claim/reference #', example: 'CLM-123456' },
      { name: 'budget_hours', label: 'Budget Hours', key: 'budget_hours', required: false, type: 'number', description: 'Authorized hours', example: '40' },
      { name: 'budget_dollars', label: 'Budget Dollars', key: 'budget_dollars', required: false, type: 'number', description: 'Authorized budget', example: '5000' },
    ],
  },
  subjects: {
    entityType: 'subjects',
    displayName: 'Subjects',
    description: 'Subject records (people, vehicles, etc.)',
    importOrder: 5,
    fileName: '05_Subjects.csv',
    dependsOn: [],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID from your source system', example: 'SUBJ-001' },
      { name: 'name', label: 'Name', key: 'name', required: true, type: 'text', description: 'Subject name', example: 'Jane Doe' },
      { name: 'subject_type', label: 'Type', key: 'subject_type', required: true, type: 'text', description: 'Type: person, vehicle, business, property', example: 'person' },
      { name: 'notes', label: 'Notes', key: 'notes', required: false, type: 'text', description: 'Additional notes', example: 'Primary claimant' },
    ],
  },
  case_subjects: {
    entityType: 'case_subjects',
    displayName: 'Case-Subject Links',
    description: 'Links subjects to cases',
    importOrder: 6,
    fileName: '06_CaseSubjects.csv',
    dependsOn: ['cases', 'subjects'],
    columns: [
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'subject_external_id', label: 'Subject External ID', key: 'subject_external_id', required: true, type: 'reference', description: 'Links to subject', example: 'SUBJ-001' },
      { name: 'is_primary', label: 'Is Primary', key: 'is_primary', required: false, type: 'boolean', description: 'Primary subject?', example: 'true' },
    ],
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
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'title', label: 'Title', key: 'title', required: true, type: 'text', description: 'Update title', example: 'Initial Contact Made' },
      { name: 'description', label: 'Description', key: 'description', required: false, type: 'text', description: 'Update content', example: 'Spoke with claimant by phone...' },
      { name: 'update_type', label: 'Type', key: 'update_type', required: false, type: 'text', description: 'Update type', example: 'general' },
      { name: 'created_at', label: 'Created Date', key: 'created_at', required: false, type: 'date', description: 'When update was created', example: '2024-01-15' },
    ],
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
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'title', label: 'Title', key: 'title', required: true, type: 'text', description: 'Event title', example: 'Field Surveillance' },
      { name: 'activity_type', label: 'Type', key: 'activity_type', required: true, type: 'text', description: 'Event type', example: 'surveillance' },
      { name: 'description', label: 'Description', key: 'description', required: false, type: 'text', description: 'Event details', example: 'Morning surveillance at residence' },
      { name: 'due_date', label: 'Due Date', key: 'due_date', required: false, type: 'date', description: 'Scheduled date', example: '2024-02-01' },
      { name: 'status', label: 'Status', key: 'status', required: false, type: 'text', description: 'Status', example: 'scheduled' },
    ],
  },
  time_entries: {
    entityType: 'time_entries',
    displayName: 'Time Entries',
    description: 'Billable time records',
    importOrder: 9,
    fileName: '09_TimeEntries.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'TIME-001' },
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'description', label: 'Description', key: 'description', required: true, type: 'text', description: 'Work description', example: '4 hours surveillance' },
      { name: 'hours', label: 'Hours', key: 'hours', required: true, type: 'number', description: 'Time in hours', example: '4' },
      { name: 'amount', label: 'Amount', key: 'amount', required: true, type: 'number', description: 'Dollar amount', example: '400' },
      { name: 'date', label: 'Date', key: 'date', required: false, type: 'date', description: 'Date of work', example: '2024-01-20' },
      { name: 'category', label: 'Category', key: 'category', required: false, type: 'text', description: 'Time category', example: 'surveillance' },
    ],
  },
  expenses: {
    entityType: 'expenses',
    displayName: 'Expenses',
    description: 'Case-related expenses',
    importOrder: 10,
    fileName: '10_Expenses.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'EXP-001' },
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'description', label: 'Description', key: 'description', required: true, type: 'text', description: 'Expense description', example: 'Mileage - 50 miles' },
      { name: 'amount', label: 'Amount', key: 'amount', required: true, type: 'number', description: 'Dollar amount', example: '32.50' },
      { name: 'date', label: 'Date', key: 'date', required: false, type: 'date', description: 'Date of expense', example: '2024-01-20' },
      { name: 'category', label: 'Category', key: 'category', required: false, type: 'text', description: 'Expense category', example: 'mileage' },
    ],
  },
  budgets: {
    entityType: 'budgets',
    displayName: 'Budgets',
    description: 'Case budget allocations',
    importOrder: 11,
    fileName: '11_Budgets.csv',
    dependsOn: ['cases'],
    columns: [
      { name: 'external_record_id', label: 'External ID', key: 'external_record_id', required: true, type: 'text', description: 'Unique ID', example: 'BUD-001' },
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'budget_hours', label: 'Budget Hours', key: 'budget_hours', required: false, type: 'number', description: 'Authorized hours', example: '40' },
      { name: 'budget_dollars', label: 'Budget Dollars', key: 'budget_dollars', required: false, type: 'number', description: 'Authorized budget', example: '5000' },
    ],
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
      { name: 'case_external_id', label: 'Case External ID', key: 'case_external_id', required: true, type: 'reference', description: 'Links to case', example: 'CASE-001' },
      { name: 'adjustment_type', label: 'Type', key: 'adjustment_type', required: true, type: 'text', description: 'hours or dollars', example: 'hours' },
      { name: 'new_value', label: 'New Value', key: 'new_value', required: true, type: 'number', description: 'New budget value', example: '60' },
      { name: 'reason', label: 'Reason', key: 'reason', required: true, type: 'text', description: 'Reason for adjustment', example: 'Client approved additional hours' },
    ],
  },
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
    description: c.description,
  })),
}));
