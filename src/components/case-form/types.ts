import * as z from "zod";

/**
 * Zod schema for case form validation
 */
export const caseFormSchema = z.object({
  title: z.string().max(200).optional(),
  case_number: z.string().min(1, "Case number is required").max(50),
  description: z.string().max(1000).optional(),
  status: z.string().min(1, "Status is required"),
  account_id: z.string().optional(),
  contact_id: z.string().optional(),
  due_date: z.date().optional(),
  use_primary_subject_as_title: z.boolean().default(false),
  budget_hours: z.coerce.number().min(0).optional().nullable(),
  budget_dollars: z.coerce.number().min(0).optional().nullable(),
  budget_notes: z.string().max(500).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  reference_number_2: z.string().max(100).optional().nullable(),
  reference_number_3: z.string().max(100).optional().nullable(),
  case_type_id: z.string().optional().nullable(),
});

export type CaseFormData = z.infer<typeof caseFormSchema>;

export interface CaseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingCase?: EditingCase;
}

export interface EditingCase {
  id: string;
  title: string;
  case_number: string;
  description: string | null;
  status: string;
  account_id: string | null;
  contact_id: string | null;
  due_date: string | null;
  use_primary_subject_as_title?: boolean;
  budget_hours?: number | null;
  budget_dollars?: number | null;
  budget_notes?: string | null;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
  case_type_id?: string | null;
  case_manager_id?: string | null;
  case_manager_2_id?: string | null;
  investigator_ids?: string[];
}

export interface Account {
  id: string;
  name: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  account_id: string | null;
}

export interface CaseStatus {
  id: string;
  value: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Budget configuration based on case type settings
 */
export interface BudgetConfig {
  showHours: boolean;
  showDollars: boolean;
  required: boolean;
  disabled: boolean;
}

/**
 * Pending due date change for conflict resolution
 */
export interface PendingDueDateChange {
  newCaseTypeId: string;
  newDueDate: Date;
  currentDueDate: Date | null;
  defaultDays: number;
  caseTypeName: string;
}

/**
 * Pending service conflict for resolution
 */
export interface PendingServiceConflict {
  newCaseTypeId: string;
  newCaseTypeName: string;
  conflictingServices: Array<{ id: string; name: string; code?: string | null }>;
}

/**
 * Pending budget conflict for resolution
 */
export interface PendingBudgetConflict {
  newCaseTypeId: string;
  newCaseTypeName: string;
  newStrategy: string;
  currentBudget: {
    budget_type: string;
    total_budget_hours: number | null;
    total_budget_amount: number | null;
  };
}

/**
 * Audit context for tracking case type changes
 */
export interface CaseTypeAuditContext {
  hadBudgetConflict: boolean;
  hadServiceConflict: boolean;
  servicesRemoved: string[];
  hadDueDateChange: boolean;
  previousCaseTypeId: string | null;
  previousCaseTypeName: string | null;
  previousBudgetStrategy: string | null;
}
