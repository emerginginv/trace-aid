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
  reference_number?: string;
  status?: string;
  start_date?: string;
  due_date?: string;
  
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
export type ActivityStatus = 'to_do' | 'scheduled' | 'in_progress' | 'blocked' | 'done' | 'completed' | 'cancelled';

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
  /** Mapping configuration for type transformations */
  mappingConfig?: MappingConfig;
  /** Human-readable name for the source system */
  sourceSystemName?: string;
  /** Always preserve original values for audit */
  preserveOriginalValues?: boolean;
}

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  createMissingPicklists: true,
  skipOnError: true,
  dryRun: false,
  preserveOriginalValues: true,
};

// ============================================
// Mapping & Normalization Types
// ============================================

/**
 * Single type mapping from external value to CaseWyze value
 */
export interface TypeMapping {
  /** Value from external system */
  externalValue: string;
  /** Mapped CaseWyze picklist value */
  casewyzeValue: string;
  /** Create picklist value if doesn't exist */
  autoCreate: boolean;
}

/**
 * Complete mapping configuration for an import batch
 */
export interface MappingConfig {
  updateTypes: TypeMapping[];
  eventTypes: TypeMapping[];
  /** What to do with unmapped values */
  unmappedAction: 'skip' | 'use_original' | 'use_default';
  /** Default update type for unmapped values */
  defaultUpdateType?: string;
  /** Default event type for unmapped values */
  defaultEventType?: string;
}

export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  updateTypes: [],
  eventTypes: [],
  unmappedAction: 'use_original',
};

/**
 * Result of mapping resolution
 */
export interface MappingResult {
  /** Final CaseWyze value */
  value: string;
  /** Whether a new picklist was created */
  wasCreated: boolean;
  /** Original external value */
  originalValue: string;
  /** How the value was resolved */
  matchType: 'exact' | 'mapped' | 'fuzzy' | 'created' | 'default' | 'original';
}

/**
 * Single normalization change record
 */
export interface NormalizationChange {
  field: string;
  originalValue: unknown;
  normalizedValue: unknown;
  rule: string;
}

/**
 * Result of normalizing a value
 */
export interface NormalizationResult<T> {
  /** Normalized value */
  normalized: T;
  /** Original value before normalization */
  original: unknown;
  /** List of changes made */
  changes: NormalizationChange[];
}

/**
 * Summary of normalizations applied to a batch
 */
export interface NormalizationLog {
  datesNormalized: number;
  currenciesCleaned: number;
  textsTrimmed: number;
  emailsNormalized: number;
  phonesNormalized: number;
  statesNormalized: number;
  typesMapped: {
    update_type: number;
    event_type: number;
  };
  typesCreated: string[];
}

export const EMPTY_NORMALIZATION_LOG: NormalizationLog = {
  datesNormalized: 0,
  currenciesCleaned: 0,
  textsTrimmed: 0,
  emailsNormalized: 0,
  phonesNormalized: 0,
  statesNormalized: 0,
  typesMapped: { update_type: 0, event_type: 0 },
  typesCreated: [],
};

/**
 * Stored mapping configuration for reuse
 */
export interface SavedTypeMapping {
  id: string;
  organization_id: string;
  name: string;
  source_system: string;
  mapping_type: 'update_type' | 'event_type';
  mappings: TypeMapping[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Dry-Run Types
// ============================================

/**
 * Result of a dry-run import simulation
 */
export interface DryRunResult {
  /** Whether all records passed validation (no blocking errors) */
  success: boolean;
  /** Total number of records processed */
  totalRecords: number;
  /** Number of records that will be created */
  recordsToCreate: number;
  /** Number of records that will be updated */
  recordsToUpdate: number;
  /** Number of records that will be skipped due to errors */
  recordsToSkip: number;
  /** All validation errors found */
  errors: DryRunError[];
  /** All validation warnings found */
  warnings: DryRunWarning[];
  /** Detailed info for each record */
  details: DryRunRecordDetail[];
  /** Summary of normalizations that will be applied */
  normalizationLog: NormalizationLog;
  /** When the dry-run was performed */
  timestamp: string;
  /** How long the dry-run took in milliseconds */
  durationMs: number;
}

/**
 * Detailed info for a single record in the dry-run
 */
export interface DryRunRecordDetail {
  /** Entity type (client, case, etc.) */
  entityType: string;
  /** External record ID from the import file */
  externalRecordId: string;
  /** What operation will be performed */
  operation: 'create' | 'update' | 'skip';
  /** Data after normalization */
  normalizedData: Record<string, unknown>;
  /** Original data from the import file */
  originalData: Record<string, unknown>;
  /** List of field-level changes from normalization */
  fieldChanges: NormalizationChange[];
  /** List of mappings applied to this record */
  mappingsApplied: string[];
  /** Warning messages for this record */
  warnings: string[];
  /** If skipped, the reason why */
  skipReason?: string;
}

/**
 * A validation error that blocks import
 */
export interface DryRunError {
  /** Row number in the source file (1-based, includes header) */
  row: number;
  /** Entity type being validated */
  entityType: string;
  /** External record ID of the problematic record */
  externalRecordId: string;
  /** Field that has the error */
  field: string;
  /** Error message */
  message: string;
  /** Error severity - blocking errors prevent import */
  severity: 'error' | 'blocking';
  /** Optional suggestion for fixing */
  suggestion?: string;
}

/**
 * A validation warning that doesn't block import
 */
export interface DryRunWarning {
  /** Row number in the source file */
  row: number;
  /** Entity type being validated */
  entityType: string;
  /** External record ID of the record */
  externalRecordId: string;
  /** Field with the warning */
  field: string;
  /** Warning message */
  message: string;
  /** How the system will automatically resolve this */
  autoResolution?: string;
}

// ============================================
// Import Execution Engine Types
// ============================================

/**
 * Event types for import logging timeline
 */
export type ImportLogEventType = 
  | 'started' 
  | 'entity_started' 
  | 'entity_completed' 
  | 'record_success' 
  | 'record_failed' 
  | 'completed' 
  | 'failed' 
  | 'rolled_back';

/**
 * Error codes for categorizing import failures
 */
export type ImportErrorCode = 
  | 'VALIDATION_FAILED'
  | 'REFERENCE_NOT_FOUND'
  | 'DUPLICATE_RECORD'
  | 'DATABASE_ERROR'
  | 'CONSTRAINT_VIOLATION'
  | 'TRANSACTION_FAILED'
  | 'ROLLBACK_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Log entry for import timeline tracking
 */
export interface ImportLogEntry {
  id: string;
  batch_id: string;
  event_type: ImportLogEventType;
  entity_type?: ImportEntityType;
  external_record_id?: string;
  message: string;
  details?: Record<string, unknown>;
  created_at: string;
}

/**
 * Error entry for detailed failure tracking
 */
export interface ImportErrorEntry {
  id: string;
  batch_id: string;
  record_id?: string;
  entity_type: ImportEntityType;
  external_record_id?: string;
  error_code: ImportErrorCode;
  error_message: string;
  error_details?: Record<string, unknown>;
  created_at: string;
}

/**
 * Result of import execution
 */
export interface ImportExecutionResult {
  success: boolean;
  batchId: string;
  status: ImportBatchStatus;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  errors: ImportErrorEntry[];
  logs: ImportLogEntry[];
  rollbackPerformed: boolean;
  durationMs: number;
  referenceMap?: {
    clients: Record<string, string>;
    contacts: Record<string, string>;
    cases: Record<string, string>;
    subjects: Record<string, string>;
    activities: Record<string, string>;
  };
}

/**
 * Request payload for the execute-import edge function
 */
export interface ExecuteImportRequest {
  batchId: string;
  organizationId: string;
  userId: string;
  sourceSystemName: string;
  entities: ExecuteImportEntity[];
  mappingConfig: MappingConfig;
}

/**
 * Entity data for execution
 */
export interface ExecuteImportEntity {
  entityType: ImportEntityType;
  records: ExecuteImportRecord[];
}

/**
 * Individual record for execution
 */
export interface ExecuteImportRecord {
  externalRecordId: string;
  data: Record<string, unknown>;
  sourceData: Record<string, unknown>;
}

/**
 * Response from the execute-import edge function
 */
export interface ExecuteImportResponse {
  success: boolean;
  batchId: string;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{
    entityType: string;
    externalRecordId: string;
    errorCode: string;
    errorMessage: string;
    errorDetails?: Record<string, unknown>;
  }>;
  referenceMap: {
    clients: Record<string, string>;
    contacts: Record<string, string>;
    cases: Record<string, string>;
    subjects: Record<string, string>;
    activities: Record<string, string>;
  };
  rollbackPerformed: boolean;
}
