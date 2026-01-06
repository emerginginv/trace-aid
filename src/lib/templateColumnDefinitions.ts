/**
 * Column definitions for all CaseWyze import templates
 * Used to generate tooltips and help documentation
 */

export interface ColumnDefinition {
  name: string;
  required: boolean;
  type: 'text' | 'number' | 'date' | 'boolean' | 'reference' | 'json';
  description: string;
  example: string;
  tips?: string;
}

export interface EntityDefinition {
  entityType: string;
  displayName: string;
  description: string;
  fileName: string;
  importOrder: number;
  dependsOn: string[];
  columns: ColumnDefinition[];
}

export const TEMPLATE_COLUMNS: Record<string, EntityDefinition> = {
  organization: {
    entityType: 'organization',
    displayName: 'Organization',
    description: 'Your company or agency settings',
    fileName: '01_Organization.csv',
    importOrder: 1,
    dependsOn: [],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique identifier from your source system',
        example: 'ORG-001',
        tips: 'This should match the ID used in your current system'
      },
      {
        name: 'name',
        required: true,
        type: 'text',
        description: 'Organization or company name',
        example: 'Acme Investigations LLC'
      }
    ]
  },
  
  accounts: {
    entityType: 'accounts',
    displayName: 'Clients',
    description: 'Your customer accounts - companies or individuals who hire you',
    fileName: '02_Clients.csv',
    importOrder: 2,
    dependsOn: ['organization'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique identifier from your source system',
        example: 'CLT-001, ACCT-2024-001',
        tips: 'Must be unique across all clients. Use whatever ID your source system uses.'
      },
      {
        name: 'name',
        required: true,
        type: 'text',
        description: "Client's company or individual name",
        example: 'ABC Insurance, John Smith Law Firm',
        tips: 'This is the primary display name shown throughout CaseWyze'
      },
      {
        name: 'email',
        required: false,
        type: 'text',
        description: 'Primary contact email address',
        example: 'contact@abcinsurance.com'
      },
      {
        name: 'phone',
        required: false,
        type: 'text',
        description: 'Primary phone number',
        example: '(555) 123-4567',
        tips: 'Any format is accepted - we normalize phone numbers automatically'
      },
      {
        name: 'address',
        required: false,
        type: 'text',
        description: 'Street address',
        example: '123 Main Street, Suite 200'
      },
      {
        name: 'city',
        required: false,
        type: 'text',
        description: 'City name',
        example: 'Los Angeles'
      },
      {
        name: 'state',
        required: false,
        type: 'text',
        description: 'State or province',
        example: 'CA, California',
        tips: 'Abbreviations and full names both work'
      },
      {
        name: 'zip_code',
        required: false,
        type: 'text',
        description: 'Postal/ZIP code',
        example: '90210, 90210-1234'
      },
      {
        name: 'industry',
        required: false,
        type: 'text',
        description: 'Industry or business type',
        example: 'Insurance, Legal, Healthcare'
      },
      {
        name: 'notes',
        required: false,
        type: 'text',
        description: 'Additional notes about the client',
        example: 'Preferred contact method: email'
      }
    ]
  },
  
  contacts: {
    entityType: 'contacts',
    displayName: 'Contacts',
    description: 'Individual people associated with your clients',
    fileName: '03_Contacts.csv',
    importOrder: 3,
    dependsOn: ['accounts'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique identifier from your source system',
        example: 'CON-001'
      },
      {
        name: 'first_name',
        required: true,
        type: 'text',
        description: "Contact's first name",
        example: 'John'
      },
      {
        name: 'last_name',
        required: true,
        type: 'text',
        description: "Contact's last name",
        example: 'Smith'
      },
      {
        name: 'account_external_id',
        required: false,
        type: 'reference',
        description: 'Links this contact to a client',
        example: 'CLT-001',
        tips: 'Must match an external_record_id from your Clients file'
      },
      {
        name: 'email',
        required: false,
        type: 'text',
        description: 'Contact email address',
        example: 'john.smith@company.com'
      },
      {
        name: 'phone',
        required: false,
        type: 'text',
        description: 'Contact phone number',
        example: '(555) 987-6543'
      },
      {
        name: 'address',
        required: false,
        type: 'text',
        description: 'Street address',
        example: '456 Oak Avenue'
      },
      {
        name: 'city',
        required: false,
        type: 'text',
        description: 'City',
        example: 'Chicago'
      },
      {
        name: 'state',
        required: false,
        type: 'text',
        description: 'State or province',
        example: 'IL'
      },
      {
        name: 'zip_code',
        required: false,
        type: 'text',
        description: 'Postal/ZIP code',
        example: '60601'
      },
      {
        name: 'notes',
        required: false,
        type: 'text',
        description: 'Additional notes',
        example: 'Claims adjuster - primary contact'
      }
    ]
  },
  
  cases: {
    entityType: 'cases',
    displayName: 'Cases',
    description: 'Investigation cases or matters you work on',
    fileName: '04_Cases.csv',
    importOrder: 4,
    dependsOn: ['accounts', 'contacts'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique case identifier from your source system',
        example: 'CASE-2024-001'
      },
      {
        name: 'case_number',
        required: true,
        type: 'text',
        description: 'Your internal case/file number',
        example: '2024-INV-0042',
        tips: 'This becomes the primary case reference in CaseWyze'
      },
      {
        name: 'title',
        required: true,
        type: 'text',
        description: 'Case title or brief description',
        example: 'Smith Workers Comp Investigation'
      },
      {
        name: 'status',
        required: false,
        type: 'text',
        description: 'Current case status',
        example: 'Open, In Progress, Closed',
        tips: 'Common statuses are automatically recognized'
      },
      {
        name: 'account_external_id',
        required: false,
        type: 'reference',
        description: 'Links case to a client',
        example: 'CLT-001',
        tips: 'Must match an external_record_id from Clients'
      },
      {
        name: 'contact_external_id',
        required: false,
        type: 'reference',
        description: 'Links case to a contact person',
        example: 'CON-001',
        tips: 'Must match an external_record_id from Contacts'
      },
      {
        name: 'description',
        required: false,
        type: 'text',
        description: 'Detailed case description',
        example: 'Surveillance and background investigation...'
      },
      {
        name: 'reference_number',
        required: false,
        type: 'text',
        description: 'External reference number (e.g., insurance claim)',
        example: 'WC-2024-12345'
      },
      {
        name: 'start_date',
        required: false,
        type: 'date',
        description: 'When the case started',
        example: '2024-01-15',
        tips: 'Use YYYY-MM-DD format for best results'
      },
      {
        name: 'due_date',
        required: false,
        type: 'date',
        description: 'Case deadline or due date',
        example: '2024-02-15'
      },
      {
        name: 'budget_dollars',
        required: false,
        type: 'number',
        description: 'Authorized budget in dollars',
        example: '5000',
        tips: 'Enter numbers only - no currency symbols'
      },
      {
        name: 'budget_hours',
        required: false,
        type: 'number',
        description: 'Authorized hours budget',
        example: '40'
      }
    ]
  },
  
  subjects: {
    entityType: 'subjects',
    displayName: 'Subjects',
    description: 'Individuals or entities being investigated',
    fileName: '05_Subjects.csv',
    importOrder: 5,
    dependsOn: [],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique subject identifier',
        example: 'SUBJ-001'
      },
      {
        name: 'name',
        required: true,
        type: 'text',
        description: "Subject's full name",
        example: 'Jane Doe'
      },
      {
        name: 'subject_type',
        required: true,
        type: 'text',
        description: 'Type of subject',
        example: 'Individual, Company, Claimant',
        tips: 'Common types are automatically recognized'
      },
      {
        name: 'is_primary',
        required: false,
        type: 'boolean',
        description: 'Is this the primary subject?',
        example: 'true, false, yes, no',
        tips: 'Only one subject per case should be primary'
      },
      {
        name: 'notes',
        required: false,
        type: 'text',
        description: 'Additional subject notes',
        example: 'DOB: 1985-03-15, SSN last 4: 1234'
      }
    ]
  },
  
  case_subjects: {
    entityType: 'case_subjects',
    displayName: 'Case-Subject Links',
    description: 'Connect subjects to specific cases',
    fileName: '06_CaseSubjects.csv',
    importOrder: 6,
    dependsOn: ['cases', 'subjects'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique link identifier',
        example: 'CS-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001',
        tips: 'Must match an external_record_id from Cases'
      },
      {
        name: 'subject_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a subject',
        example: 'SUBJ-001',
        tips: 'Must match an external_record_id from Subjects'
      }
    ]
  },
  
  case_updates: {
    entityType: 'case_updates',
    displayName: 'Updates',
    description: 'Case notes, updates, and progress entries',
    fileName: '07_Updates.csv',
    importOrder: 7,
    dependsOn: ['cases'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique update identifier',
        example: 'UPD-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001'
      },
      {
        name: 'title',
        required: true,
        type: 'text',
        description: 'Update title or summary',
        example: 'Surveillance Day 1 Complete'
      },
      {
        name: 'description',
        required: false,
        type: 'text',
        description: 'Full update content',
        example: 'Subject observed leaving residence at 0800...'
      },
      {
        name: 'update_type',
        required: false,
        type: 'text',
        description: 'Type of update',
        example: 'Note, Status Change, Report',
        tips: 'Common types are automatically recognized'
      },
      {
        name: 'created_at',
        required: false,
        type: 'date',
        description: 'When the update was created',
        example: '2024-01-16',
        tips: 'Preserves original timestamps from your system'
      }
    ]
  },
  
  case_activities: {
    entityType: 'case_activities',
    displayName: 'Events',
    description: 'Tasks, appointments, and scheduled activities',
    fileName: '08_Events.csv',
    importOrder: 8,
    dependsOn: ['cases'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique event identifier',
        example: 'EVT-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001'
      },
      {
        name: 'title',
        required: true,
        type: 'text',
        description: 'Event title',
        example: 'Surveillance - Day 1'
      },
      {
        name: 'activity_type',
        required: true,
        type: 'text',
        description: 'Type of activity',
        example: 'Surveillance, Interview, Task',
        tips: 'Common types are automatically mapped'
      },
      {
        name: 'due_date',
        required: false,
        type: 'date',
        description: 'When the event is scheduled',
        example: '2024-01-20'
      },
      {
        name: 'status',
        required: false,
        type: 'text',
        description: 'Event status',
        example: 'Pending, Completed, Cancelled'
      },
      {
        name: 'description',
        required: false,
        type: 'text',
        description: 'Event details',
        example: 'Morning surveillance at residence'
      },
      {
        name: 'completed',
        required: false,
        type: 'boolean',
        description: 'Is the event complete?',
        example: 'true, false'
      }
    ]
  },
  
  time_entries: {
    entityType: 'time_entries',
    displayName: 'Time Entries',
    description: 'Billable time records',
    fileName: '09_TimeEntries.csv',
    importOrder: 9,
    dependsOn: ['cases'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique time entry identifier',
        example: 'TIME-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001'
      },
      {
        name: 'description',
        required: true,
        type: 'text',
        description: 'Description of work performed',
        example: 'Surveillance - 8 hours on location'
      },
      {
        name: 'hours',
        required: true,
        type: 'number',
        description: 'Hours worked',
        example: '8.5',
        tips: 'Decimals are supported (e.g., 2.25 for 2h 15m)'
      },
      {
        name: 'hourly_rate',
        required: false,
        type: 'number',
        description: 'Hourly billing rate',
        example: '75',
        tips: 'Numbers only - no currency symbols'
      },
      {
        name: 'date',
        required: false,
        type: 'date',
        description: 'Date of the work',
        example: '2024-01-16'
      }
    ]
  },
  
  expenses: {
    entityType: 'expenses',
    displayName: 'Expenses',
    description: 'Reimbursable expenses and costs',
    fileName: '10_Expenses.csv',
    importOrder: 10,
    dependsOn: ['cases'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique expense identifier',
        example: 'EXP-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001'
      },
      {
        name: 'description',
        required: true,
        type: 'text',
        description: 'Expense description',
        example: 'Mileage - 150 miles roundtrip'
      },
      {
        name: 'amount',
        required: true,
        type: 'number',
        description: 'Expense amount',
        example: '87.50',
        tips: 'Numbers only - no currency symbols'
      },
      {
        name: 'category',
        required: false,
        type: 'text',
        description: 'Expense category',
        example: 'Mileage, Meals, Equipment',
        tips: 'Common categories are automatically recognized'
      },
      {
        name: 'date',
        required: false,
        type: 'date',
        description: 'Date of expense',
        example: '2024-01-16'
      }
    ]
  },
  
  budgets: {
    entityType: 'budgets',
    displayName: 'Budgets',
    description: 'Case budget allocations',
    fileName: '11_Budgets.csv',
    importOrder: 11,
    dependsOn: ['cases'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique budget identifier',
        example: 'BUD-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001'
      },
      {
        name: 'budget_dollars',
        required: false,
        type: 'number',
        description: 'Dollar budget amount',
        example: '5000'
      },
      {
        name: 'budget_hours',
        required: false,
        type: 'number',
        description: 'Hours budget amount',
        example: '40'
      }
    ]
  },
  
  budget_adjustments: {
    entityType: 'budget_adjustments',
    displayName: 'Budget Adjustments',
    description: 'Budget changes and modifications',
    fileName: '12_BudgetAdjustments.csv',
    importOrder: 12,
    dependsOn: ['cases', 'budgets'],
    columns: [
      {
        name: 'external_record_id',
        required: true,
        type: 'text',
        description: 'Unique adjustment identifier',
        example: 'ADJ-001'
      },
      {
        name: 'case_external_id',
        required: true,
        type: 'reference',
        description: 'Links to a case',
        example: 'CASE-2024-001'
      },
      {
        name: 'adjustment_type',
        required: true,
        type: 'text',
        description: 'Type of adjustment',
        example: 'increase, decrease, override',
        tips: 'Common types: increase, decrease, override'
      },
      {
        name: 'new_value',
        required: true,
        type: 'number',
        description: 'New budget value after adjustment',
        example: '7500'
      },
      {
        name: 'reason',
        required: true,
        type: 'text',
        description: 'Reason for the adjustment',
        example: 'Client authorized additional surveillance'
      },
      {
        name: 'created_at',
        required: false,
        type: 'date',
        description: 'When the adjustment was made',
        example: '2024-01-20'
      }
    ]
  }
};

// Helper to get entity definition by type
export function getEntityDefinition(entityType: string): EntityDefinition | undefined {
  return TEMPLATE_COLUMNS[entityType];
}

// Get all entities sorted by import order
export function getAllEntitiesSorted(): EntityDefinition[] {
  return Object.values(TEMPLATE_COLUMNS).sort((a, b) => a.importOrder - b.importOrder);
}

// Get required columns for an entity
export function getRequiredColumns(entityType: string): ColumnDefinition[] {
  const entity = TEMPLATE_COLUMNS[entityType];
  return entity?.columns.filter(c => c.required) || [];
}

// Get optional columns for an entity
export function getOptionalColumns(entityType: string): ColumnDefinition[] {
  const entity = TEMPLATE_COLUMNS[entityType];
  return entity?.columns.filter(c => !c.required) || [];
}
