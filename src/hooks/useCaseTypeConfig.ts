import { useMemo } from 'react';
import { useCaseTypeQuery } from '@/hooks/queries/useCaseTypesQuery';
import { addDays } from 'date-fns';

export interface CaseTypeConfig {
  // Budget settings
  budgetStrategy: 'disabled' | 'hours_only' | 'money_only' | 'both' | null;
  budgetRequired: boolean;
  showBudgetHours: boolean;
  showBudgetDollars: boolean;
  budgetDisabled: boolean;
  
  // Due date settings
  dueDateRequired: boolean;
  defaultDueDays: number | null;
  
  // Allowed entities
  allowedServiceIds: string[];
  allowedSubjectTypes: string[];
  allowedTemplateIds: string[];
  allowedCaseFlags: string[];
  defaultSubjectType: string | null;
  
  // Reference labels
  referenceLabel1: string | null;
  referenceLabel2: string | null;
  referenceLabel3: string | null;
  
  // Helpers
  isServiceAllowed: (serviceId: string) => boolean;
  isSubjectTypeAllowed: (subjectType: string) => boolean;
  hasServiceRestrictions: boolean;
  hasSubjectTypeRestrictions: boolean;
  
  // Due date helper
  calculateDueDate: (fromDate?: Date) => Date | null;
}

/**
 * Hook to get Case Type configuration and enforcement rules.
 * Use this hook whenever you need to enforce Case Type rules in the UI.
 */
export function useCaseTypeConfig(caseTypeId: string | undefined | null): {
  config: CaseTypeConfig | null;
  isLoading: boolean;
  caseType: ReturnType<typeof useCaseTypeQuery>['data'];
} {
  const { data: caseType, isLoading } = useCaseTypeQuery(caseTypeId);
  
  const config = useMemo<CaseTypeConfig | null>(() => {
    if (!caseType) return null;
    
    const budgetStrategy = caseType.budget_strategy as CaseTypeConfig['budgetStrategy'] || null;
    const allowedServiceIds = caseType.allowed_service_ids || [];
    const allowedSubjectTypes = caseType.allowed_subject_types || [];
    const defaultDueDays = caseType.default_due_days || null;
    
    return {
      // Budget settings
      budgetStrategy,
      budgetRequired: caseType.budget_required || false,
      showBudgetHours: budgetStrategy === 'hours_only' || budgetStrategy === 'both',
      showBudgetDollars: budgetStrategy === 'money_only' || budgetStrategy === 'both',
      budgetDisabled: budgetStrategy === 'disabled',
      
      // Due date settings
      dueDateRequired: caseType.due_date_required || false,
      defaultDueDays,
      
      // Allowed entities
      allowedServiceIds,
      allowedSubjectTypes,
      allowedTemplateIds: [], // TODO: Add when implemented
      allowedCaseFlags: caseType.allowed_case_flags || [],
      defaultSubjectType: caseType.default_subject_type || null,
      
      // Reference labels
      referenceLabel1: caseType.reference_label_1 || null,
      referenceLabel2: caseType.reference_label_2 || null,
      referenceLabel3: caseType.reference_label_3 || null,
      
      // Helper functions
      isServiceAllowed: (serviceId: string) => {
        if (allowedServiceIds.length === 0) return true; // No restrictions
        return allowedServiceIds.includes(serviceId);
      },
      isSubjectTypeAllowed: (subjectType: string) => {
        if (allowedSubjectTypes.length === 0) return true; // No restrictions
        return allowedSubjectTypes.includes(subjectType);
      },
      hasServiceRestrictions: allowedServiceIds.length > 0,
      hasSubjectTypeRestrictions: allowedSubjectTypes.length > 0,
      
      // Due date helper
      calculateDueDate: (fromDate = new Date()) => {
        if (!defaultDueDays || defaultDueDays <= 0) {
          return null;
        }
        return addDays(fromDate, defaultDueDays);
      },
    };
  }, [caseType]);
  
  return { config, isLoading, caseType };
}

/**
 * Filter services based on Case Type allowed_service_ids.
 */
export function filterServicesByAllowed<T extends { id: string }>(
  services: T[],
  allowedServiceIds: string[] | undefined | null
): T[] {
  if (!allowedServiceIds || allowedServiceIds.length === 0) {
    return services; // No restrictions
  }
  return services.filter(s => allowedServiceIds.includes(s.id));
}

/**
 * Filter subject types based on Case Type allowed_subject_types.
 */
export function filterSubjectTypesByAllowed(
  subjectTypes: string[],
  allowedSubjectTypes: string[] | undefined | null
): string[] {
  if (!allowedSubjectTypes || allowedSubjectTypes.length === 0) {
    return subjectTypes; // No restrictions
  }
  return subjectTypes.filter(t => allowedSubjectTypes.includes(t));
}
