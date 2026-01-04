/**
 * CaseWyze Canonical Import Schema - v1.0
 * 
 * This file defines the canonical import schema for migrating data from external systems.
 * CaseWyze is the source of truth - all external systems must conform to this schema.
 */

// ============================================
// Import Batch & Record Types
// ============================================

export type ImportBatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
export type ImportRecordStatus = 'pending' | 'validated' | 'imported' | 'failed' | 'skipped';
export type ImportEntityType = 
  | 'client' 
  | 'contact' 
  | 'case' 
  | 'subject' 
  | 'update' 
  | 'activity' 
  | 'time_entry' 
  | 'expense' 
  | 'budget_adjustment';

export interface ImportBatch {
  id: string;
  organization_id: string;
  user_id: string;
  source_system: string;
  status: ImportBatchStatus;
  total_records: number;
  processed_records: number;
  failed_records: number;
  started_at: string | null;
  completed_at: string | null;
  error_log: ImportError[];
  created_at: string;
}

export interface ImportRecord {
  id: string;
  batch_id: string;
  entity_type: ImportEntityType;
  external_record_id: string;
  source_data: Record<string, unknown>;
  casewyze_id: string | null;
  status: ImportRecordStatus;
  error_message: string | null;
  created_at: string;
}

export interface ImportError {
  row?: number;
  entity_type?: ImportEntityType;
  external_record_id?: string;
  field?: string;
  message: string;
  timestamp: string;
}

// ============================================
// Entity Import Schemas
// ============================================

/**
 * Organization Import (Optional)
 * Used when importing data for a new organization.
 */
export interface OrganizationImport {
  // Required
  external_record_id: string;
  name: string;
  
  // Optional
  slug?: string;
  logo_url?: string;
  billing_email?: string;
}

/**
 * Client Import (maps to accounts table)
 */
export interface ClientImport {
  // Required
  external_record_id: string;
  name: string;
  
  // Optional
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
}

/**
 * Contact Import (links to Clients)
 */
export interface ContactImport {
  // Required
  external_record_id: string;
  first_name: string;
  last_name: string;
  
  // Relational (use external_record_id for linking)
  external_account_id?: string;
  
  // Optional
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
}

/**
 * Case Import
 */
export interface CaseImport {
  // Required
  external_record_id: string;
  case_number: string;
  title: string;
  
  // Relational (use external_record_id for linking)
  external_account_id?: string;
  external_contact_id?: string;
  external_parent_case_id?: string;
  
  // Case Variables
  claim_number?: string;
  status?: string;
  start_date?: string;
  due_date?: string;
  surveillance_start_date?: string;
  surveillance_end_date?: string;
  
  // Team Assignment (by email)
  case_manager_email?: string;
  investigator_emails?: string[];
  
  // Budget (Initial)
  budget_hours?: number;
  budget_dollars?: number;
  budget_notes?: string;
  
  // Optional
  description?: string;
}

/**
 * Subject Details - flexible structure for different subject types
 */
export interface SubjectDetails {
  // Person
  date_of_birth?: string;
  ssn_last4?: string;
  address?: string;
  phone?: string;
  email?: string;
  employer?: string;
  occupation?: string;
  
  // Vehicle
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  
  // Business
  business_name?: string;
  ein?: string;
  website?: string;
  
  // Allow any additional fields
  [key: string]: unknown;
}

export type SubjectType = 'person' | 'business' | 'vehicle' | 'property' | 'other';

/**
 * Subject Import (maps to case_subjects)
 */
export interface SubjectImport {
  // Required
  external_record_id: string;
  external_case_id: string;
  name: string;
  subject_type: SubjectType;
  
  // Optional
  is_primary?: boolean;
  notes?: string;
  profile_image_url?: string;
  details?: SubjectDetails;
}

/**
 * Update Import (maps to case_updates)
 */
export interface UpdateImport {
  // Required
  external_record_id: string;
  external_case_id: string;
  title: string;
  update_type: string;
  
  // Optional
  description?: string;
  created_at?: string;
  author_email?: string;
}

export type ActivityType = 'task' | 'event' | 'call' | 'meeting' | 'deadline';
export type ActivityStatus = 'to_do' | 'in_progress' | 'completed';

/**
 * Activity Import (maps to case_activities)
 */
export interface ActivityImport {
  // Required
  external_record_id: string;
  external_case_id: string;
  activity_type: ActivityType;
  title: string;
  
  // Optional
  description?: string;
  status?: ActivityStatus;
  due_date?: string;
  completed?: boolean;
  completed_at?: string;
  event_subtype?: string;
  assigned_to_email?: string;
  created_at?: string;
}

/**
 * Time Entry Import (maps to case_finances with finance_type='time')
 */
export interface TimeEntryImport {
  // Required
  external_record_id: string;
  external_case_id: string;
  date: string;
  hours: number;
  description: string;
  
  // Optional
  hourly_rate?: number;
  amount?: number;
  external_subject_id?: string;
  external_activity_id?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  notes?: string;
  author_email?: string;
  created_at?: string;
}

/**
 * Expense Import (maps to case_finances with finance_type='expense')
 */
export interface ExpenseImport {
  // Required
  external_record_id: string;
  external_case_id: string;
  date: string;
  amount: number;
  description: string;
  
  // Optional
  category?: string;
  quantity?: number;
  unit_price?: number;
  external_subject_id?: string;
  external_activity_id?: string;
  notes?: string;
  author_email?: string;
  created_at?: string;
}

export type BudgetAdjustmentType = 'hours' | 'dollars';

/**
 * Budget Adjustment Import (maps to case_budget_adjustments)
 */
export interface BudgetAdjustmentImport {
  // Required
  external_record_id: string;
  external_case_id: string;
  adjustment_type: BudgetAdjustmentType;
  new_value: number;
  reason: string;
  
  // Optional
  previous_value?: number;
  adjustment_amount?: number;
  author_email?: string;
  created_at?: string;
}

// ============================================
// Import File Structure
// ============================================

/**
 * Complete import file structure (JSON format)
 */
export interface ImportFile {
  source_system: string;
  organization?: OrganizationImport;
  clients?: ClientImport[];
  contacts?: ContactImport[];
  cases?: CaseImport[];
  subjects?: SubjectImport[];
  updates?: UpdateImport[];
  activities?: ActivityImport[];
  time_entries?: TimeEntryImport[];
  expenses?: ExpenseImport[];
  budget_adjustments?: BudgetAdjustmentImport[];
}

// ============================================
// Import Processing Types
// ============================================

export interface ImportValidationResult {
  valid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
}

export interface ImportProcessingResult {
  batch_id: string;
  status: ImportBatchStatus;
  total_records: number;
  processed_records: number;
  failed_records: number;
  errors: ImportError[];
}

/**
 * Reference resolution map - maps external IDs to CaseWyze UUIDs
 */
export interface ReferenceMap {
  clients: Map<string, string>;
  contacts: Map<string, string>;
  cases: Map<string, string>;
  subjects: Map<string, string>;
  activities: Map<string, string>;
  users: Map<string, string>; // email -> user_id
}

/**
 * Import configuration options
 */
export interface ImportConfig {
  /** Create new picklist values if they don't exist */
  createMissingPicklists: boolean;
  /** Skip records with validation errors instead of failing entire batch */
  skipOnError: boolean;
  /** Dry run - validate only, don't insert */
  dryRun: boolean;
  /** Default hourly rate for time entries without rate */
  defaultHourlyRate?: number;
}

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  createMissingPicklists: true,
  skipOnError: true,
  dryRun: false,
};
