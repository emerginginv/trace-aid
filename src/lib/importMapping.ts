/**
 * CaseWyze Import Mapping Layer
 * 
 * Maps external type values to CaseWyze picklist values.
 * Supports explicit mappings, fuzzy matching, and auto-creation.
 */

import { MappingConfig, MappingResult, TypeMapping } from "@/types/import";

// ============================================
// String Similarity (Levenshtein Distance)
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio (0-1, where 1 is identical)
 */
function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / maxLen;
}

// ============================================
// Type Mapping Resolution
// ============================================

/**
 * Find best matching picklist value using fuzzy matching
 */
function findFuzzyMatch(
  value: string,
  picklistValues: string[],
  threshold: number = 0.7
): { match: string | null; similarity: number } {
  let bestMatch: string | null = null;
  let bestSimilarity = 0;
  
  const normalizedValue = value.toLowerCase().trim();
  
  for (const picklistValue of picklistValues) {
    const similarity = similarityRatio(normalizedValue, picklistValue.toLowerCase());
    if (similarity > bestSimilarity && similarity >= threshold) {
      bestMatch = picklistValue;
      bestSimilarity = similarity;
    }
  }
  
  return { match: bestMatch, similarity: bestSimilarity };
}

/**
 * Resolve an update type from external value to CaseWyze value
 */
export function resolveUpdateType(
  externalValue: string,
  mappingConfig: MappingConfig,
  picklistValues: string[]
): MappingResult {
  return resolveType(
    externalValue,
    mappingConfig.updateTypes,
    picklistValues,
    mappingConfig.unmappedAction,
    mappingConfig.defaultUpdateType
  );
}

/**
 * Resolve an event type from external value to CaseWyze value
 */
export function resolveEventType(
  externalValue: string,
  mappingConfig: MappingConfig,
  picklistValues: string[]
): MappingResult {
  return resolveType(
    externalValue,
    mappingConfig.eventTypes,
    picklistValues,
    mappingConfig.unmappedAction,
    mappingConfig.defaultEventType
  );
}

/**
 * Generic type resolution logic
 */
function resolveType(
  externalValue: string,
  typeMappings: TypeMapping[],
  picklistValues: string[],
  unmappedAction: 'skip' | 'use_original' | 'use_default',
  defaultValue?: string
): MappingResult {
  const trimmedValue = externalValue?.trim() || '';
  
  if (!trimmedValue) {
    return {
      value: defaultValue || '',
      wasCreated: false,
      originalValue: externalValue,
      matchType: 'default'
    };
  }
  
  // 1. Check explicit mappings first
  const explicitMapping = typeMappings.find(
    m => m.externalValue.toLowerCase() === trimmedValue.toLowerCase()
  );
  
  if (explicitMapping) {
    return {
      value: explicitMapping.casewyzeValue,
      wasCreated: explicitMapping.autoCreate && !picklistValues.includes(explicitMapping.casewyzeValue),
      originalValue: externalValue,
      matchType: 'mapped'
    };
  }
  
  // 2. Exact match against existing picklist values (case-insensitive)
  const exactMatch = picklistValues.find(
    pv => pv.toLowerCase() === trimmedValue.toLowerCase()
  );
  
  if (exactMatch) {
    return {
      value: exactMatch,
      wasCreated: false,
      originalValue: externalValue,
      matchType: 'exact'
    };
  }
  
  // 3. Fuzzy match against existing picklist values
  const { match: fuzzyMatch, similarity } = findFuzzyMatch(trimmedValue, picklistValues);
  
  if (fuzzyMatch && similarity >= 0.8) {
    return {
      value: fuzzyMatch,
      wasCreated: false,
      originalValue: externalValue,
      matchType: 'fuzzy'
    };
  }
  
  // 4. Handle unmapped value based on configuration
  switch (unmappedAction) {
    case 'use_default':
      return {
        value: defaultValue || trimmedValue,
        wasCreated: !defaultValue,
        originalValue: externalValue,
        matchType: 'default'
      };
    
    case 'use_original':
      return {
        value: trimmedValue,
        wasCreated: true,
        originalValue: externalValue,
        matchType: 'created'
      };
    
    case 'skip':
    default:
      return {
        value: '',
        wasCreated: false,
        originalValue: externalValue,
        matchType: 'original'
      };
  }
}

// ============================================
// Mapping Detection
// ============================================

/**
 * Extract unique values from a field across all records
 */
export function extractUniqueValues(
  records: Record<string, unknown>[],
  fieldName: string
): string[] {
  const uniqueSet = new Set<string>();
  
  for (const record of records) {
    const value = record[fieldName];
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        uniqueSet.add(trimmed);
      }
    }
  }
  
  return Array.from(uniqueSet).sort();
}

/**
 * Auto-suggest mappings based on fuzzy matching
 */
export function suggestMappings(
  externalValues: string[],
  picklistValues: string[]
): TypeMapping[] {
  const suggestions: TypeMapping[] = [];
  
  for (const externalValue of externalValues) {
    // Check for exact match
    const exactMatch = picklistValues.find(
      pv => pv.toLowerCase() === externalValue.toLowerCase()
    );
    
    if (exactMatch) {
      suggestions.push({
        externalValue,
        casewyzeValue: exactMatch,
        autoCreate: false
      });
      continue;
    }
    
    // Check for fuzzy match
    const { match, similarity } = findFuzzyMatch(externalValue, picklistValues, 0.6);
    
    if (match) {
      suggestions.push({
        externalValue,
        casewyzeValue: match,
        autoCreate: false
      });
    } else {
      // No match found - suggest using original value
      suggestions.push({
        externalValue,
        casewyzeValue: externalValue,
        autoCreate: true
      });
    }
  }
  
  return suggestions;
}

// ============================================
// Mapping Validation
// ============================================

export interface MappingValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  mappedCount: number;
  unmappedCount: number;
  willCreate: string[];
}

/**
 * Validate a mapping configuration
 */
export function validateMappingConfig(
  config: MappingConfig,
  updateTypePicklist: string[],
  eventTypePicklist: string[]
): MappingValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const willCreate: string[] = [];
  let mappedCount = 0;
  let unmappedCount = 0;
  
  // Check update type mappings
  for (const mapping of config.updateTypes) {
    if (!mapping.casewyzeValue) {
      errors.push(`Update type "${mapping.externalValue}" has no target value`);
    } else if (mapping.autoCreate && !updateTypePicklist.includes(mapping.casewyzeValue)) {
      willCreate.push(`Update Type: ${mapping.casewyzeValue}`);
    }
    
    if (mapping.casewyzeValue) {
      mappedCount++;
    } else {
      unmappedCount++;
    }
  }
  
  // Check event type mappings
  for (const mapping of config.eventTypes) {
    if (!mapping.casewyzeValue) {
      errors.push(`Event type "${mapping.externalValue}" has no target value`);
    } else if (mapping.autoCreate && !eventTypePicklist.includes(mapping.casewyzeValue)) {
      willCreate.push(`Event Type: ${mapping.casewyzeValue}`);
    }
    
    if (mapping.casewyzeValue) {
      mappedCount++;
    } else {
      unmappedCount++;
    }
  }
  
  // Warn about auto-creations
  if (willCreate.length > 0) {
    warnings.push(`${willCreate.length} new picklist value(s) will be created`);
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    mappedCount,
    unmappedCount,
    willCreate
  };
}
