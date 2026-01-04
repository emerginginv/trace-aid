/**
 * Utility functions for CaseWyze Import System
 */

import { parse, isValid, format } from 'date-fns';

// ============================================
// Date Parsing
// ============================================

const DATE_FORMATS = [
  'yyyy-MM-dd',      // ISO: 2024-01-15
  'MM/dd/yyyy',      // US: 01/15/2024
  'dd/MM/yyyy',      // EU: 15/01/2024
  'MM-dd-yyyy',      // US alt: 01-15-2024
  'dd-MM-yyyy',      // EU alt: 15-01-2024
  'M/d/yyyy',        // US short: 1/5/2024
  'd/M/yyyy',        // EU short: 5/1/2024
];

const DATETIME_FORMATS = [
  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",  // ISO with ms
  "yyyy-MM-dd'T'HH:mm:ss'Z'",       // ISO
  "yyyy-MM-dd'T'HH:mm:ss",          // ISO without Z
  'yyyy-MM-dd HH:mm:ss',            // Common
  ...DATE_FORMATS,
];

/**
 * Parse a date string in various formats to ISO date (YYYY-MM-DD)
 */
export function parseDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }
  
  // Try native Date parsing as fallback
  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed)) {
    return format(nativeParsed, 'yyyy-MM-dd');
  }
  
  return null;
}

/**
 * Parse a datetime string in various formats to ISO datetime
 */
export function parseDateTime(dateStr: string | undefined | null): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  for (const fmt of DATETIME_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) {
      return parsed.toISOString();
    }
  }
  
  // Try native Date parsing as fallback
  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed)) {
    return nativeParsed.toISOString();
  }
  
  return null;
}

// ============================================
// Email Normalization
// ============================================

/**
 * Normalize email address (lowercase, trim)
 */
export function normalizeEmail(email: string | undefined | null): string | null {
  if (!email || email.trim() === '') return null;
  return email.trim().toLowerCase();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// Phone Normalization
// ============================================

/**
 * Normalize phone number (remove non-digits except leading +)
 */
export function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone || phone.trim() === '') return null;
  
  const trimmed = phone.trim();
  
  // Preserve leading + for international numbers
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  
  if (digitsOnly.length === 0) return null;
  
  // Format as (XXX) XXX-XXXX for 10-digit US numbers
  if (digitsOnly.length === 10 && !hasPlus) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  // Format as +1 (XXX) XXX-XXXX for 11-digit US numbers
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  // Return with + prefix for other international numbers
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

// ============================================
// String Utilities
// ============================================

/**
 * Clean and trim string, return null if empty
 */
export function cleanString(str: string | undefined | null): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Convert string to boolean
 */
export function parseBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  
  const lower = value.toString().toLowerCase().trim();
  return ['true', 'yes', '1', 'y', 'on'].includes(lower);
}

/**
 * Parse number from string
 */
export function parseNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  
  const cleaned = value.toString().replace(/[,$]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// ============================================
// US State Normalization
// ============================================

const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

const VALID_STATE_CODES = new Set(Object.values(STATE_ABBREVIATIONS));

/**
 * Normalize state to 2-letter code
 */
export function normalizeState(state: string | undefined | null): string | null {
  if (!state || state.trim() === '') return null;
  
  const trimmed = state.trim();
  const upper = trimmed.toUpperCase();
  
  // Already a valid 2-letter code
  if (upper.length === 2 && VALID_STATE_CODES.has(upper)) {
    return upper;
  }
  
  // Try to match full state name
  const lower = trimmed.toLowerCase();
  if (STATE_ABBREVIATIONS[lower]) {
    return STATE_ABBREVIATIONS[lower];
  }
  
  // Return as-is if not recognized
  return trimmed;
}

// ============================================
// CSV Parsing Utilities
// ============================================

/**
 * Parse CSV header row and return column indices
 */
export function parseCSVHeaders(headerRow: string[]): Map<string, number> {
  const headers = new Map<string, number>();
  headerRow.forEach((header, index) => {
    // Normalize header: lowercase, trim, replace spaces with underscores
    const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
    headers.set(normalized, index);
  });
  return headers;
}

/**
 * Get value from CSV row by column name
 */
export function getCSVValue(
  row: string[], 
  headers: Map<string, number>, 
  columnName: string
): string | undefined {
  const index = headers.get(columnName.toLowerCase());
  if (index === undefined) return undefined;
  const value = row[index];
  return value?.trim() || undefined;
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Check if external reference ID is unique within a collection
 */
export function validateUniqueExternalIds<T extends { external_record_id: string }>(
  records: T[],
  entityType: string
): { valid: boolean; duplicates: string[] } {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  
  for (const record of records) {
    if (seen.has(record.external_record_id)) {
      duplicates.push(record.external_record_id);
    }
    seen.add(record.external_record_id);
  }
  
  return {
    valid: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Count records by entity type
 */
export function countImportRecords(importFile: Record<string, unknown[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  const entityKeys = [
    'clients', 'contacts', 'cases', 'subjects', 'updates',
    'activities', 'time_entries', 'expenses', 'budget_adjustments'
  ];
  
  for (const key of entityKeys) {
    const records = importFile[key];
    if (Array.isArray(records)) {
      counts[key] = records.length;
    }
  }
  
  return counts;
}
