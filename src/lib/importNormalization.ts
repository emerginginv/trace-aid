/**
 * CaseWyze Import Normalization Layer
 * 
 * Normalizes external data to CaseWyze standards while preserving original values.
 * All normalization functions return both the normalized value and the original.
 */

import { NormalizationResult, NormalizationChange } from "@/types/import";

// ============================================\\
// Date Normalization
// ============================================\\

// Common date formats to try
const DATE_FORMATS = [
  // ISO formats
  /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/,           // 2024-01-15 or 2024-01-15T00:00:00
  /^(\d{4})\/(\d{2})\/(\d{2})$/,                 // 2024/01/15
  // US formats
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,             // 1/15/2024 or 01/15/2024
  /^(\d{1,2})-(\d{1,2})-(\d{4})$/,               // 1-15-2024 or 01-15-2024
  // EU formats (day first)
  /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,             // 15.01.2024
];

/**
 * Normalize a date value to ISO format (YYYY-MM-DD)
 */
export function normalizeImportDate(
  value: unknown, 
  fieldName: string
): NormalizationResult<string | null> {
  const original = value;
  const changes: NormalizationChange[] = [];
  
  if (value === null || value === undefined || value === '') {
    return { normalized: null, original, changes };
  }
  
  const strValue = String(value).trim();
  
  // Already in ISO format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
    return { normalized: strValue, original, changes };
  }
  
  // Check if it's an Excel serial date number
  const numValue = Number(strValue);
  if (!isNaN(numValue) && numValue > 1000 && numValue < 100000) {
    // Excel dates are days since 1900-01-01 (with a leap year bug)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
    const isoDate = date.toISOString().split('T')[0];
    
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: isoDate,
      rule: 'excel_serial_date'
    });
    
    return { normalized: isoDate, original, changes };
  }
  
  // Try parsing with common formats
  let parsed: Date | null = null;
  
  // Try ISO with time
  if (strValue.includes('T')) {
    parsed = new Date(strValue);
    if (!isNaN(parsed.getTime())) {
      const isoDate = parsed.toISOString().split('T')[0];
      if (strValue !== isoDate) {
        changes.push({
          field: fieldName,
          originalValue: original,
          normalizedValue: isoDate,
          rule: 'iso_datetime_to_date'
        });
      }
      return { normalized: isoDate, original, changes };
    }
  }
  
  // US format: MM/DD/YYYY or MM-DD-YYYY
  const usMatch = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: isoDate,
      rule: 'us_date_format'
    });
    
    return { normalized: isoDate, original, changes };
  }
  
  // EU format: DD.MM.YYYY
  const euMatch = strValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: isoDate,
      rule: 'eu_date_format'
    });
    
    return { normalized: isoDate, original, changes };
  }
  
  // Try native Date parsing as fallback
  parsed = new Date(strValue);
  if (!isNaN(parsed.getTime())) {
    const isoDate = parsed.toISOString().split('T')[0];
    
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: isoDate,
      rule: 'native_date_parse'
    });
    
    return { normalized: isoDate, original, changes };
  }
  
  // Could not parse - return null but log it
  changes.push({
    field: fieldName,
    originalValue: original,
    normalizedValue: null,
    rule: 'date_parse_failed'
  });
  
  return { normalized: null, original, changes };
}

/**
 * Normalize a datetime value to ISO format with timezone
 */
export function normalizeImportDateTime(
  value: unknown,
  fieldName: string
): NormalizationResult<string | null> {
  const dateResult = normalizeImportDate(value, fieldName);
  
  if (dateResult.normalized) {
    // If we have a time component, try to preserve it
    const strValue = String(value).trim();
    if (strValue.includes('T') || strValue.includes(' ')) {
      const parsed = new Date(strValue);
      if (!isNaN(parsed.getTime())) {
        return {
          normalized: parsed.toISOString(),
          original: dateResult.original,
          changes: dateResult.changes.map(c => ({
            ...c,
            normalizedValue: parsed.toISOString(),
            rule: c.rule.replace('date', 'datetime')
          }))
        };
      }
    }
    // No time component - add midnight UTC
    return {
      normalized: `${dateResult.normalized}T00:00:00.000Z`,
      original: dateResult.original,
      changes: dateResult.changes
    };
  }
  
  return dateResult as NormalizationResult<string | null>;
}

// ============================================\\
// Currency Normalization
// ============================================\\

/**
 * Normalize a currency value to a clean decimal number
 */
export function normalizeCurrency(
  value: unknown,
  fieldName: string
): NormalizationResult<number | null> {
  const original = value;
  const changes: NormalizationChange[] = [];
  
  if (value === null || value === undefined || value === '') {
    return { normalized: null, original, changes };
  }
  
  // Already a number?
  if (typeof value === 'number') {
    return { normalized: value, original, changes };
  }
  
  let strValue = String(value).trim();
  const isNegative = strValue.startsWith('-') || strValue.startsWith('(');
  
  // Remove currency symbols and formatting
  strValue = strValue
    .replace(/[$€£¥₹]/g, '')      // Currency symbols
    .replace(/[()]/g, '')          // Parentheses (negative notation)
    .replace(/,/g, '')             // Thousand separators
    .trim();
  
  const numValue = parseFloat(strValue);
  
  if (isNaN(numValue)) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: null,
      rule: 'currency_parse_failed'
    });
    return { normalized: null, original, changes };
  }
  
  const normalized = isNegative && numValue > 0 ? -numValue : numValue;
  
  if (original !== normalized) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: normalized,
      rule: 'currency_cleaned'
    });
  }
  
  return { normalized, original, changes };
}

// ============================================\\
// Text Normalization
// ============================================\\

/**
 * Normalize text by trimming, sanitizing, and normalizing whitespace
 */
export function normalizeText(
  value: unknown,
  fieldName: string
): NormalizationResult<string | null> {
  const original = value;
  const changes: NormalizationChange[] = [];
  
  if (value === null || value === undefined || value === '') {
    return { normalized: null, original, changes };
  }
  
  let strValue = String(value);
  
  // Track original for comparison
  const beforeTrim = strValue;
  
  // Trim leading/trailing whitespace
  strValue = strValue.trim();
  
  // Normalize multiple spaces to single space (but preserve newlines)
  strValue = strValue.replace(/[^\S\n]+/g, ' ');
  
  // Remove null bytes and other control characters (except newlines/tabs)
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize line endings to \n

  strValue = strValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  if (beforeTrim !== strValue) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: strValue,
      rule: 'text_normalized'
    });
  }
  
  return { normalized: strValue || null, original, changes };
}

// ============================================\\
// Email Normalization
// ============================================\\

/**
 * Normalize email addresses
 */
export function normalizeEmail(
  value: unknown,
  fieldName: string
): NormalizationResult<string | null> {
  const original = value;
  const changes: NormalizationChange[] = [];
  
  if (value === null || value === undefined || value === '') {
    return { normalized: null, original, changes };
  }
  
  let strValue = String(value).trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(strValue)) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: null,
      rule: 'invalid_email_format'
    });
    return { normalized: null, original, changes };
  }
  
  if (String(value).trim() !== strValue) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: strValue,
      rule: 'email_normalized'
    });
  }
  
  return { normalized: strValue, original, changes };
}

// ============================================\\
// Phone Normalization
// ============================================\\

/**
 * Normalize phone numbers to a consistent format
 */
export function normalizePhone(
  value: unknown,
  fieldName: string
): NormalizationResult<string | null> {
  const original = value;
  const changes: NormalizationChange[] = [];
  
  if (value === null || value === undefined || value === '') {
    return { normalized: null, original, changes };
  }
  
  let strValue = String(value).trim();
  
  // Extract just digits
  const digits = strValue.replace(/\D/g, '');
  
  // Handle US numbers
  if (digits.length === 10) {
    const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    
    if (strValue !== formatted) {
      changes.push({
        field: fieldName,
        originalValue: original,
        normalizedValue: formatted,
        rule: 'phone_formatted_us'
      });
    }
    
    return { normalized: formatted, original, changes };
  }
  
  // Handle US numbers with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    const formatted = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: formatted,
      rule: 'phone_formatted_us_intl'
    });
    
    return { normalized: formatted, original, changes };
  }
  
  // For other formats, just clean up but keep original structure
  const cleaned = strValue.replace(/\s+/g, ' ').trim();
  
  if (strValue !== cleaned) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: cleaned,
      rule: 'phone_whitespace_cleaned'
    });
  }
  
  return { normalized: cleaned, original, changes };
}

// ============================================\\
// State Normalization
// ============================================\\

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
  'puerto rico': 'PR', 'guam': 'GU', 'virgin islands': 'VI'
};

const VALID_STATE_CODES = new Set(Object.values(STATE_ABBREVIATIONS));

/**
 * Normalize state to 2-letter code
 */
export function normalizeState(
  value: unknown,
  fieldName: string
): NormalizationResult<string | null> {
  const original = value;
  const changes: NormalizationChange[] = [];
  
  if (value === null || value === undefined || value === '') {
    return { normalized: null, original, changes };
  }
  
  const strValue = String(value).trim();
  const upperValue = strValue.toUpperCase();
  
  // Already a valid 2-letter code?
  if (strValue.length === 2 && VALID_STATE_CODES.has(upperValue)) {
    if (strValue !== upperValue) {
      changes.push({
        field: fieldName,
        originalValue: original,
        normalizedValue: upperValue,
        rule: 'state_uppercased'
      });
    }
    return { normalized: upperValue, original, changes };
  }
  
  // Try to match full state name
  const lowerValue = strValue.toLowerCase();
  const stateCode = STATE_ABBREVIATIONS[lowerValue];
  
  if (stateCode) {
    changes.push({
      field: fieldName,
      originalValue: original,
      normalizedValue: stateCode,
      rule: 'state_name_to_code'
    });
    return { normalized: stateCode, original, changes };
  }
  
  // Could not normalize - return original
  return { normalized: strValue, original, changes };
}

// ============================================\\
// Aggregate Normalization
// ============================================\\

/**
 * Apply all relevant normalizations to a record based on field type
 */
export function normalizeRecord(
  record: Record<string, unknown>,
  entityType: string
): { normalized: Record<string, unknown>; changes: NormalizationChange[] } {
  const normalized: Record<string, unknown> = { ...record };
  const allChanges: NormalizationChange[] = [];
  
  // Date fields
  const dateFields = ['date', 'start_date', 'end_date', 'due_date', 'created_at', 
    'completed_at'];
  
  // Currency fields
  const currencyFields = ['amount', 'hourly_rate', 'unit_price', 
    'budget_dollars', 'new_value', 'previous_value', 'adjustment_amount'];
  
  // Email fields
  const emailFields = ['email', 'author_email', 'case_manager_email', 'assigned_to_email'];
  
  // Phone fields
  const phoneFields = ['phone'];
  
  // State fields
  const stateFields = ['state'];
  
  for (const [key, value] of Object.entries(record)) {
    if (dateFields.includes(key)) {
      const result = normalizeImportDate(value, key);
      normalized[key] = result.normalized;
      allChanges.push(...result.changes);
    } else if (currencyFields.includes(key)) {
      const result = normalizeCurrency(value, key);
      normalized[key] = result.normalized;
      allChanges.push(...result.changes);
    } else if (emailFields.includes(key)) {
      const result = normalizeEmail(value, key);
      normalized[key] = result.normalized;
      allChanges.push(...result.changes);
    } else if (phoneFields.includes(key)) {
      const result = normalizePhone(value, key);
      normalized[key] = result.normalized;
      allChanges.push(...result.changes);
    } else if (stateFields.includes(key)) {
      const result = normalizeState(value, key);
      normalized[key] = result.normalized;
      allChanges.push(...result.changes);
    } else if (typeof value === 'string') {
      const result = normalizeText(value, key);
      normalized[key] = result.normalized;
      allChanges.push(...result.changes);
    }
  }
  
  return { normalized, changes: allChanges };
}
