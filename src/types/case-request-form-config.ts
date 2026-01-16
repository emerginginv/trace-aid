/**
 * Case Request Form Configuration Types
 * 
 * Defines the structure for case_request_forms.field_config JSONB column.
 * Controls which fields appear on public intake forms and their validation rules.
 */

/**
 * Base configuration for a single form field
 */
export interface FieldConfig {
  /** Whether to show the field on the form */
  visible: boolean;
  /** Whether the field is required for form submission */
  required: boolean;
  /** Custom label override (uses default if not provided) */
  label?: string;
  /** Help text shown below the field */
  helpText?: string;
}

/**
 * Complete form configuration structure
 * Organized by field categories matching the form sections
 */
export interface CaseRequestFormConfig {
  /** Case type selection - always visible and required */
  caseType: {
    caseTypeField: FieldConfig;
  };
  
  /** Client/company information fields */
  clientInformation: {
    companyName: FieldConfig;
    country: FieldConfig;
    /** Includes address1, address2, address3, city, state, zip */
    address: FieldConfig;
  };
  
  /** Contact person information */
  contactInformation: {
    /** First, middle, last name fields */
    contactName: FieldConfig;
    email: FieldConfig;
    officePhone: FieldConfig;
    mobilePhone: FieldConfig;
    homePhone: FieldConfig;
  };
  
  /** Case-specific details */
  caseDetails: {
    caseServices: FieldConfig;
    claimNumber: FieldConfig;
    budgetDollars: FieldConfig;
    budgetHours: FieldConfig;
    notesInstructions: FieldConfig;
    /** Shows case-type-specific custom fields */
    customFields: FieldConfig;
  };
  
  /** Subject information section */
  subjectInformation: {
    primarySubject: FieldConfig;
    additionalSubjects: FieldConfig;
    subjectPhoto: FieldConfig;
  };
  
  /** File upload configuration */
  supportingFiles: {
    fileUpload: FieldConfig;
    /** Maximum file size in bytes (default: 1GB) */
    maxFileSize: number;
    /** Allowed MIME types or extensions (['*'] for all) */
    allowedFileTypes: string[];
  };
}

/**
 * Default form configuration with sensible defaults
 * Used when creating new forms or merging partial configs
 */
export const DEFAULT_FORM_CONFIG: CaseRequestFormConfig = {
  caseType: {
    caseTypeField: { 
      visible: true, 
      required: true,
      label: 'Case Type'
    }
  },
  
  clientInformation: {
    companyName: { 
      visible: true, 
      required: true, 
      label: 'Company Name' 
    },
    country: { 
      visible: true, 
      required: false,
      label: 'Country'
    },
    address: { 
      visible: true, 
      required: false,
      label: 'Address'
    }
  },
  
  contactInformation: {
    contactName: { 
      visible: true, 
      required: true,
      label: 'Contact Name'
    },
    email: { 
      visible: true, 
      required: true,
      label: 'Email Address'
    },
    officePhone: { 
      visible: true, 
      required: false,
      label: 'Office Phone'
    },
    mobilePhone: { 
      visible: true, 
      required: false,
      label: 'Mobile Phone'
    },
    homePhone: { 
      visible: false, 
      required: false,
      label: 'Home Phone'
    }
  },
  
  caseDetails: {
    caseServices: { 
      visible: true, 
      required: false,
      label: 'Services Requested'
    },
    claimNumber: { 
      visible: true, 
      required: false,
      label: 'Claim/Reference Number'
    },
    budgetDollars: { 
      visible: true, 
      required: false,
      label: 'Budget (Dollars)'
    },
    budgetHours: { 
      visible: true, 
      required: false,
      label: 'Budget (Hours)'
    },
    notesInstructions: { 
      visible: true, 
      required: false,
      label: 'Notes & Instructions'
    },
    customFields: { 
      visible: true, 
      required: false,
      label: 'Additional Information'
    }
  },
  
  subjectInformation: {
    primarySubject: { 
      visible: true, 
      required: true,
      label: 'Primary Subject'
    },
    additionalSubjects: { 
      visible: true, 
      required: false,
      label: 'Additional Subjects'
    },
    subjectPhoto: { 
      visible: true, 
      required: false,
      label: 'Subject Photo'
    }
  },
  
  supportingFiles: {
    fileUpload: { 
      visible: true, 
      required: false,
      label: 'Supporting Documents'
    },
    maxFileSize: 1073741824, // 1GB in bytes
    allowedFileTypes: ['*'] // All file types allowed by default
  }
};

/**
 * Utility type for partial configuration updates
 * Allows deeply nested partial objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep merge utility for combining partial config with defaults
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (
        sourceValue !== null &&
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as DeepPartial<object>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Validates and completes a partial form configuration
 * Merges with defaults to ensure all required fields exist
 * 
 * @param config - Partial configuration to validate
 * @returns Complete, valid CaseRequestFormConfig
 */
export function validateFormConfig(
  config: DeepPartial<CaseRequestFormConfig> | null | undefined
): CaseRequestFormConfig {
  if (!config) {
    return { ...DEFAULT_FORM_CONFIG };
  }
  
  return deepMerge(DEFAULT_FORM_CONFIG, config);
}

/**
 * Checks if a field should be displayed based on its configuration
 */
export function isFieldVisible(
  config: CaseRequestFormConfig,
  category: keyof CaseRequestFormConfig,
  field: string
): boolean {
  const categoryConfig = config[category];
  if (!categoryConfig || typeof categoryConfig !== 'object') {
    return false;
  }
  
  const fieldConfig = (categoryConfig as Record<string, FieldConfig | number | string[]>)[field];
  if (!fieldConfig || typeof fieldConfig !== 'object' || !('visible' in fieldConfig)) {
    return false;
  }
  
  return (fieldConfig as FieldConfig).visible;
}

/**
 * Checks if a field is required based on its configuration
 */
export function isFieldRequired(
  config: CaseRequestFormConfig,
  category: keyof CaseRequestFormConfig,
  field: string
): boolean {
  const categoryConfig = config[category];
  if (!categoryConfig || typeof categoryConfig !== 'object') {
    return false;
  }
  
  const fieldConfig = (categoryConfig as Record<string, FieldConfig | number | string[]>)[field];
  if (!fieldConfig || typeof fieldConfig !== 'object' || !('required' in fieldConfig)) {
    return false;
  }
  
  return (fieldConfig as FieldConfig).required;
}

/**
 * Gets the label for a field, falling back to default
 */
export function getFieldLabel(
  config: CaseRequestFormConfig,
  category: keyof CaseRequestFormConfig,
  field: string
): string {
  const categoryConfig = config[category];
  if (!categoryConfig || typeof categoryConfig !== 'object') {
    return field;
  }
  
  const fieldConfig = (categoryConfig as Record<string, FieldConfig | number | string[]>)[field];
  if (!fieldConfig || typeof fieldConfig !== 'object' || !('label' in fieldConfig)) {
    return field;
  }
  
  return (fieldConfig as FieldConfig).label || field;
}

/**
 * Type guard to check if a value is a valid CaseRequestFormConfig
 */
export function isCaseRequestFormConfig(value: unknown): value is CaseRequestFormConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const config = value as Record<string, unknown>;
  
  // Check all required top-level categories exist
  const requiredCategories: (keyof CaseRequestFormConfig)[] = [
    'caseType',
    'clientInformation',
    'contactInformation',
    'caseDetails',
    'subjectInformation',
    'supportingFiles'
  ];
  
  return requiredCategories.every(
    category => typeof config[category] === 'object' && config[category] !== null
  );
}
