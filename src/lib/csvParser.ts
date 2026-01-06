/**
 * CaseWyze CSV Parser Utility
 * 
 * Parses, validates, and maps CSV files to CaseWyze import schemas.
 * CaseWyze is the source of truth - external systems must conform to our schema.
 */

import { parseDate, parseDateTime, normalizeEmail, normalizePhone, cleanString, parseBoolean, parseNumber, normalizeState } from './importUtils';

// Entity type to required/optional columns mapping
export const ENTITY_SCHEMAS: Record<string, { required: string[]; optional: string[] }> = {
  organization: {
    required: ['external_record_id', 'name'],
    optional: ['slug', 'logo_url', 'billing_email']
  },
  clients: {
    required: ['external_record_id', 'name'],
    optional: ['industry', 'phone', 'email', 'address', 'city', 'state', 'zip_code', 'notes']
  },
  contacts: {
    required: ['external_record_id', 'first_name', 'last_name'],
    optional: ['external_account_id', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'notes']
  },
  cases: {
    required: ['external_record_id', 'case_number', 'title'],
    optional: [
      'external_account_id', 'external_contact_id', 'external_parent_case_id',
      'claim_number', 'status', 'start_date', 'due_date', 'case_manager_email', 
      'investigator_emails', 'budget_hours', 'budget_dollars', 'budget_notes', 'description'
    ]
  },
  subjects: {
    required: ['external_record_id', 'name', 'subject_type'],
    optional: [
      'notes', 'profile_image_url', 'date_of_birth', 'ssn_last4', 'address',
      'phone', 'email', 'employer', 'occupation', 'make', 'model', 'year',
      'color', 'license_plate', 'vin', 'business_name', 'ein', 'website'
    ]
  },
  case_subjects: {
    required: ['external_record_id', 'external_case_id', 'external_subject_id'],
    optional: ['is_primary']
  },
  updates: {
    required: ['external_record_id', 'external_case_id', 'title', 'update_type'],
    optional: ['description', 'created_at', 'author_email']
  },
  events: {
    required: ['external_record_id', 'external_case_id', 'activity_type', 'title'],
    optional: [
      'description', 'status', 'due_date', 'completed', 'completed_at',
      'event_subtype', 'assigned_to_email', 'created_at'
    ]
  },
  time_entries: {
    required: ['external_record_id', 'external_case_id', 'date', 'hours', 'description'],
    optional: [
      'hourly_rate', 'amount', 'external_subject_id', 'external_activity_id',
      'start_date', 'end_date', 'category', 'notes', 'author_email', 'created_at'
    ]
  },
  expenses: {
    required: ['external_record_id', 'external_case_id', 'date', 'amount', 'description'],
    optional: [
      'category', 'quantity', 'unit_price', 'external_subject_id',
      'external_activity_id', 'notes', 'author_email', 'created_at'
    ]
  },
  budgets: {
    required: ['external_record_id', 'external_case_id'],
    optional: ['budget_hours', 'budget_dollars', 'budget_notes']
  },
  budget_adjustments: {
    required: ['external_record_id', 'external_case_id', 'adjustment_type', 'new_value', 'reason'],
    optional: ['previous_value', 'adjustment_amount', 'author_email', 'created_at']
  }
};

// File name pattern to entity type mapping
export const FILE_NAME_PATTERNS: Record<string, string> = {
  '01_organization': 'organization',
  '02_clients': 'clients',
  '03_contacts': 'contacts',
  '04_cases': 'cases',
  '05_subjects': 'subjects',
  '06_casesubjects': 'case_subjects',
  '07_updates': 'updates',
  '08_events': 'events',
  '09_timeentries': 'time_entries',
  '10_expenses': 'expenses',
  '11_budgets': 'budgets',
  '12_budgetadjustments': 'budget_adjustments'
};

// Import order for referential integrity
export const IMPORT_ORDER = [
  'organization',
  'clients',
  'contacts',
  'cases',
  'subjects',
  'case_subjects',
  'updates',
  'events',
  'time_entries',
  'expenses',
  'budgets',
  'budget_adjustments'
];

export interface ParseError {
  row?: number;
  column?: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ParsedCSV {
  fileName: string;
  entityType: string;
  headers: string[];
  rows: Record<string, string>[];
  errors: ParseError[];
  warnings: ParseError[];
  rowCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
}

export interface CrossFileValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
  referenceMap: Map<string, Set<string>>; // entityType -> Set of external_record_ids
}

/**
 * Detect entity type from file name
 */
export function detectEntityType(fileName: string): string | null {
  const normalized = fileName.toLowerCase().replace(/\.csv$/, '').replace(/[^a-z0-9_]/g, '');
  
  for (const [pattern, entityType] of Object.entries(FILE_NAME_PATTERNS)) {
    if (normalized.includes(pattern.replace('_', ''))) {
      return entityType;
    }
  }
  
  // Try matching just the entity name
  const simplePatterns: Record<string, string> = {
    'organization': 'organization',
    'client': 'clients',
    'contact': 'contacts',
    'case': 'cases',
    'subject': 'subjects',
    'casesubject': 'case_subjects',
    'update': 'updates',
    'event': 'events',
    'timeentr': 'time_entries',
    'expense': 'expenses',
    'budget': 'budgets',
    'budgetadjust': 'budget_adjustments'
  };
  
  for (const [pattern, entityType] of Object.entries(simplePatterns)) {
    if (normalized.includes(pattern)) {
      return entityType;
    }
  }
  
  return null;
}

/**
 * Parse CSV content from string
 */
export function parseCSVContent(content: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
        currentLine += char;
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r') i++; // Skip \n in \r\n
    } else if (char === '\r' && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (!inQuotes) {
          inQuotes = true;
        } else if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  
  return { headers, rows };
}

/**
 * Parse a CSV file and validate structure
 */
export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  
  // Detect entity type from file name
  const entityType = detectEntityType(file.name);
  if (!entityType) {
    errors.push({
      message: `Unrecognized file name: "${file.name}". Use CaseWyze template naming (e.g., 02_Clients.csv)`,
      type: 'error'
    });
    return {
      fileName: file.name,
      entityType: 'unknown',
      headers: [],
      rows: [],
      errors,
      warnings,
      rowCount: 0
    };
  }
  
  // Read file content
  const content = await file.text();
  
  // Check encoding (basic UTF-8 check)
  if (content.charCodeAt(0) === 0xFEFF) {
    // BOM detected, that's fine
  }
  
  // Parse CSV
  const { headers, rows } = parseCSVContent(content);
  
  if (headers.length === 0) {
    errors.push({
      message: 'File is empty or has no header row',
      type: 'error'
    });
    return {
      fileName: file.name,
      entityType,
      headers: [],
      rows: [],
      errors,
      warnings,
      rowCount: 0
    };
  }
  
  // Normalize headers (trim whitespace, lowercase for comparison)
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  // Convert rows to objects
  const rowObjects: Record<string, string>[] = rows.map((row, idx) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      const normalizedHeader = header.trim().toLowerCase();
      obj[normalizedHeader] = row[i] || '';
    });
    return obj;
  });
  
  return {
    fileName: file.name,
    entityType,
    headers: normalizedHeaders,
    rows: rowObjects,
    errors,
    warnings,
    rowCount: rowObjects.length
  };
}

/**
 * Validate CSV structure against entity schema
 */
export function validateCSVStructure(parsed: ParsedCSV): ValidationResult {
  const errors: ParseError[] = [...parsed.errors];
  const warnings: ParseError[] = [...parsed.warnings];
  
  const schema = ENTITY_SCHEMAS[parsed.entityType];
  if (!schema) {
    errors.push({
      message: `Unknown entity type: ${parsed.entityType}`,
      type: 'error'
    });
    return { valid: false, errors, warnings };
  }
  
  // Check for required columns
  for (const required of schema.required) {
    if (!parsed.headers.includes(required.toLowerCase())) {
      errors.push({
        column: required,
        message: `Missing required column: "${required}"`,
        type: 'error'
      });
    }
  }
  
  // Check for unknown columns
  const allKnownColumns = [...schema.required, ...schema.optional].map(c => c.toLowerCase());
  for (const header of parsed.headers) {
    if (!allKnownColumns.includes(header)) {
      warnings.push({
        column: header,
        message: `Unknown column will be ignored: "${header}"`,
        type: 'warning'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate row data types and required values
 */
export function validateRowData(parsed: ParsedCSV): ValidationResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  
  const schema = ENTITY_SCHEMAS[parsed.entityType];
  if (!schema) {
    return { valid: false, errors: [{ message: 'Unknown entity type', type: 'error' }], warnings };
  }
  
  const externalIds = new Set<string>();
  
  parsed.rows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2; // Account for header row, 1-indexed
    
    // Check required fields have values
    for (const required of schema.required) {
      const value = row[required.toLowerCase()];
      if (!value || value.trim() === '') {
        errors.push({
          row: rowNum,
          column: required,
          message: `Missing required value for "${required}"`,
          type: 'error'
        });
      }
    }
    
    // Check for duplicate external_record_id
    const externalId = row['external_record_id'];
    if (externalId) {
      if (externalIds.has(externalId)) {
        errors.push({
          row: rowNum,
          column: 'external_record_id',
          message: `Duplicate external_record_id: "${externalId}"`,
          type: 'error'
        });
      } else {
        externalIds.add(externalId);
      }
    }
    
    // Validate specific field types
    validateFieldTypes(row, rowNum, parsed.entityType, errors, warnings);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate field types for a row
 */
function validateFieldTypes(
  row: Record<string, string>,
  rowNum: number,
  entityType: string,
  errors: ParseError[],
  warnings: ParseError[]
) {
  // Email validation
  const emailFields = ['email', 'billing_email', 'case_manager_email', 'author_email', 'assigned_to_email'];
  for (const field of emailFields) {
    const value = row[field];
    if (value && value.trim()) {
      const normalized = normalizeEmail(value);
      if (!normalized || !normalized.includes('@')) {
        warnings.push({
          row: rowNum,
          column: field,
          message: `Invalid email format: "${value}"`,
          type: 'warning'
        });
      }
    }
  }
  
  // Date validation
  const dateFields = ['start_date', 'due_date', 'date', 'date_of_birth'];
  for (const field of dateFields) {
    const value = row[field];
    if (value && value.trim()) {
      const parsed = parseDate(value);
      if (!parsed) {
        errors.push({
          row: rowNum,
          column: field,
          message: `Invalid date format: "${value}". Use YYYY-MM-DD`,
          type: 'error'
        });
      }
    }
  }
  
  // DateTime validation
  const dateTimeFields = ['created_at', 'completed_at'];
  for (const field of dateTimeFields) {
    const value = row[field];
    if (value && value.trim()) {
      const parsed = parseDateTime(value);
      if (!parsed) {
        warnings.push({
          row: rowNum,
          column: field,
          message: `Invalid datetime format: "${value}". Use ISO 8601 format`,
          type: 'warning'
        });
      }
    }
  }
  
  // Number validation
  const numberFields = ['budget_hours', 'budget_dollars', 'hours', 'hourly_rate', 'amount', 'quantity', 'unit_price', 'new_value', 'previous_value', 'adjustment_amount', 'year'];
  for (const field of numberFields) {
    const value = row[field];
    if (value && value.trim()) {
      const parsed = parseNumber(value);
      if (parsed === null) {
        errors.push({
          row: rowNum,
          column: field,
          message: `Invalid number format: "${value}"`,
          type: 'error'
        });
      }
    }
  }
  
  // Subject type validation
  if (entityType === 'subjects') {
    const subjectType = row['subject_type'];
    if (subjectType && !['person', 'business', 'vehicle', 'property', 'other'].includes(subjectType.toLowerCase())) {
      warnings.push({
        row: rowNum,
        column: 'subject_type',
        message: `Unknown subject_type: "${subjectType}". Valid values: person, business, vehicle, property, other`,
        type: 'warning'
      });
    }
  }
  
  // Activity type validation
  if (entityType === 'events') {
    const activityType = row['activity_type'];
    if (activityType && !['task', 'event', 'call', 'meeting', 'deadline'].includes(activityType.toLowerCase())) {
      warnings.push({
        row: rowNum,
        column: 'activity_type',
        message: `Unknown activity_type: "${activityType}". Valid values: task, event, call, meeting, deadline`,
        type: 'warning'
      });
    }
  }
  
  // Adjustment type validation
  if (entityType === 'budget_adjustments') {
    const adjustmentType = row['adjustment_type'];
    if (adjustmentType && !['hours', 'dollars'].includes(adjustmentType.toLowerCase())) {
      errors.push({
        row: rowNum,
        column: 'adjustment_type',
        message: `Invalid adjustment_type: "${adjustmentType}". Must be "hours" or "dollars"`,
        type: 'error'
      });
    }
  }
  
  // Case status validation
  if (entityType === 'cases') {
    const status = row['status'];
    if (status && !['open', 'in_progress', 'on_hold', 'closed'].includes(status.toLowerCase())) {
      warnings.push({
        row: rowNum,
        column: 'status',
        message: `Unknown case status: "${status}". Valid values: open, in_progress, on_hold, closed`,
        type: 'warning'
      });
    }
  }
}

/**
 * Validate cross-file references
 */
export function validateCrossFileReferences(parsedFiles: ParsedCSV[]): CrossFileValidationResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const referenceMap = new Map<string, Set<string>>();
  
  // Build reference map
  for (const file of parsedFiles) {
    const ids = new Set<string>();
    for (const row of file.rows) {
      const externalId = row['external_record_id'];
      if (externalId) {
        ids.add(externalId);
      }
    }
    referenceMap.set(file.entityType, ids);
  }
  
  // Validate references
  for (const file of parsedFiles) {
    file.rows.forEach((row, rowIndex) => {
      const rowNum = rowIndex + 2;
      
      // Check account references
      const accountRef = row['external_account_id'];
      if (accountRef) {
        const clientIds = referenceMap.get('clients');
        if (clientIds && !clientIds.has(accountRef)) {
          warnings.push({
            row: rowNum,
            column: 'external_account_id',
            message: `Referenced client "${accountRef}" not found in import. May exist in database.`,
            type: 'warning'
          });
        }
      }
      
      // Check contact references
      const contactRef = row['external_contact_id'];
      if (contactRef) {
        const contactIds = referenceMap.get('contacts');
        if (contactIds && !contactIds.has(contactRef)) {
          warnings.push({
            row: rowNum,
            column: 'external_contact_id',
            message: `Referenced contact "${contactRef}" not found in import. May exist in database.`,
            type: 'warning'
          });
        }
      }
      
      // Check case references
      const caseRef = row['external_case_id'];
      if (caseRef) {
        const caseIds = referenceMap.get('cases');
        if (caseIds && !caseIds.has(caseRef)) {
          errors.push({
            row: rowNum,
            column: 'external_case_id',
            message: `Referenced case "${caseRef}" not found in import files.`,
            type: 'error'
          });
        }
      }
      
      // Check subject references
      const subjectRef = row['external_subject_id'];
      if (subjectRef) {
        const subjectIds = referenceMap.get('subjects');
        if (subjectIds && !subjectIds.has(subjectRef)) {
          errors.push({
            row: rowNum,
            column: 'external_subject_id',
            message: `Referenced subject "${subjectRef}" not found in import files.`,
            type: 'error'
          });
        }
      }
      
      // Check parent case references
      const parentCaseRef = row['external_parent_case_id'];
      if (parentCaseRef) {
        const caseIds = referenceMap.get('cases');
        if (caseIds && !caseIds.has(parentCaseRef)) {
          warnings.push({
            row: rowNum,
            column: 'external_parent_case_id',
            message: `Parent case "${parentCaseRef}" not found in import. May exist in database.`,
            type: 'warning'
          });
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    referenceMap
  };
}

/**
 * Sort parsed files by import order
 */
export function sortByImportOrder(files: ParsedCSV[]): ParsedCSV[] {
  return [...files].sort((a, b) => {
    const orderA = IMPORT_ORDER.indexOf(a.entityType);
    const orderB = IMPORT_ORDER.indexOf(b.entityType);
    return orderA - orderB;
  });
}

/**
 * Get entity display name
 */
export function getEntityDisplayName(entityType: string): string {
  const names: Record<string, string> = {
    organization: 'Organization',
    clients: 'Clients',
    contacts: 'Contacts',
    cases: 'Cases',
    subjects: 'Subjects',
    case_subjects: 'Case-Subject Links',
    updates: 'Updates',
    events: 'Events/Activities',
    time_entries: 'Time Entries',
    expenses: 'Expenses',
    budgets: 'Budgets',
    budget_adjustments: 'Budget Adjustments'
  };
  return names[entityType] || entityType;
}
