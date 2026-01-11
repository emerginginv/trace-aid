/**
 * Case Number Generator Utility
 * 
 * Provides format validation and preview generation for custom case number formats.
 * Actual number generation happens server-side via database function for atomicity.
 */

export interface CaseNumberVariable {
  token: string;
  label: string;
  description: string;
  example: string;
}

export const AVAILABLE_VARIABLES: CaseNumberVariable[] = [
  {
    token: '{{Case.year_created_2}}',
    label: 'Year Created (2-Digit)',
    description: 'Two-digit year when the case is created',
    example: '26',
  },
  {
    token: '{{Case.year_created_4}}',
    label: 'Year Created (4-Digit)',
    description: 'Four-digit year when the case is created',
    example: '2026',
  },
  {
    token: '{{Case.year_created_month}}',
    label: 'Month Created',
    description: 'Two-digit month when the case is created',
    example: '01',
  },
  {
    token: '{{Case.case_type_tag}}',
    label: 'Case Type Tag',
    description: 'Short abbreviation from case type (e.g., SRV for Surveillance)',
    example: 'SRV',
  },
  {
    token: '{{Case.series_number}}',
    label: 'Case Series Number',
    description: 'Auto-incrementing case sequence number',
    example: '00123',
  },
  {
    token: '{{Case.series_instance}}',
    label: 'Case Instance',
    description: 'Increments when a case is reopened (01 for original)',
    example: '01',
  },
];

export interface FormatValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a case number format template
 */
export function validateFormatTemplate(format: string): FormatValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!format || format.trim() === '') {
    errors.push('Format cannot be empty');
    return { valid: false, errors, warnings };
  }

  // Check for valid variable syntax
  const variablePattern = /\{\{[^}]+\}\}/g;
  const foundVariables = format.match(variablePattern) || [];
  const validTokens = AVAILABLE_VARIABLES.map(v => v.token);

  for (const variable of foundVariables) {
    if (!validTokens.includes(variable)) {
      errors.push(`Invalid variable: ${variable}. Must be one of the available variables.`);
    }
  }

  // Check for required series_number (recommended for unique numbering)
  if (!format.includes('{{Case.series_number}}')) {
    warnings.push('Consider including {{Case.series_number}} to ensure unique case numbers.');
  }

  // Check for invalid characters (allow alphanumeric, dashes, underscores, and variables)
  const formatWithoutVariables = format.replace(variablePattern, '');
  if (!/^[a-zA-Z0-9\-_]*$/.test(formatWithoutVariables)) {
    errors.push('Format can only contain letters, numbers, dashes (-), underscores (_), and valid variables.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface CaseNumberContext {
  seriesNumber?: number;
  seriesInstance?: number;
  caseTypeTag?: string;
  createdAt?: Date;
  padding?: number;
}

/**
 * Generates a preview of what a case number would look like
 */
export function generatePreview(
  format: string,
  context: CaseNumberContext = {}
): string {
  const {
    seriesNumber = 123,
    seriesInstance = 1,
    caseTypeTag = 'SRV',
    createdAt = new Date(),
    padding = 5,
  } = context;

  const year4 = createdAt.getFullYear().toString();
  const year2 = year4.slice(-2);
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const paddedSeries = String(seriesNumber).padStart(padding, '0');
  const paddedInstance = String(seriesInstance).padStart(2, '0');

  let result = format;
  result = result.replace(/\{\{Case\.year_created_4\}\}/g, year4);
  result = result.replace(/\{\{Case\.year_created_2\}\}/g, year2);
  result = result.replace(/\{\{Case\.year_created_month\}\}/g, month);
  result = result.replace(/\{\{Case\.case_type_tag\}\}/g, caseTypeTag);
  result = result.replace(/\{\{Case\.series_number\}\}/g, paddedSeries);
  result = result.replace(/\{\{Case\.series_instance\}\}/g, paddedInstance);

  return result;
}

/**
 * Default format if none is set
 */
export const DEFAULT_FORMAT = '{{Case.series_number}}-{{Case.series_instance}}';

/**
 * Common format presets
 */
export const FORMAT_PRESETS = [
  {
    name: 'Simple Sequential',
    format: '{{Case.series_number}}-{{Case.series_instance}}',
    description: 'Basic format: 00001-01',
  },
  {
    name: 'Year-Month-Sequential',
    format: '{{Case.year_created_4}}-{{Case.year_created_month}}-{{Case.series_number}}-{{Case.series_instance}}',
    description: 'Includes year and month: 2026-01-00001-01',
  },
  {
    name: 'With Case Type',
    format: '{{Case.year_created_2}}{{Case.case_type_tag}}{{Case.series_number}}-{{Case.series_instance}}',
    description: 'Includes type tag: 26SRV00001-01',
  },
  {
    name: 'CASE Prefix',
    format: 'CASE-{{Case.series_number}}',
    description: 'Classic format: CASE-00001',
  },
];
