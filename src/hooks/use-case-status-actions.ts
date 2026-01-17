import { useMemo } from "react";
import { STATUS_KEYS, StatusKey } from "./use-case-lifecycle-statuses";
import { useUserRole } from "./useUserRole";

/**
 * Interface defining what actions are allowed for a given case status.
 * This is the single source of truth for status-based behavior control.
 */
export interface CaseStatusActions {
  // Billing & Finance
  canAddTimeEntries: boolean;
  canAddExpenses: boolean;
  canCreateInvoice: boolean;

  // Activities & Events
  canAddEvents: boolean;
  canAddTasks: boolean;
  canEditActivities: boolean;

  // Updates & Notes
  canAddUpdates: boolean;
  canEditUpdates: boolean;

  // Case Management
  canEditCaseDetails: boolean;
  canAddSubjects: boolean;
  canAddAttachments: boolean;
  canChangeStatus: boolean;

  // Special
  canMatchToAccount: boolean; // Intake phase only
  canGenerateFinalReport: boolean; // Completed status
  isReadOnly: boolean; // Closed/Cancelled

  // Reason for restrictions (shown to users)
  restrictionReason: string | null;
}

/**
 * Status action rules matrix.
 * Defines what actions are allowed for each status key.
 */
const STATUS_ACTION_RULES: Record<StatusKey, Partial<CaseStatusActions>> = {
  // === INTAKE PHASE ===
  [STATUS_KEYS.REQUESTED]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: false,
    canEditUpdates: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: false,
    canCreateInvoice: false,
    canMatchToAccount: true,
    isReadOnly: false,
    restrictionReason: "Case is in intake phase - billing and activities disabled",
  },
  [STATUS_KEYS.UNDER_REVIEW]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: false,
    canEditUpdates: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: false,
    canCreateInvoice: false,
    canMatchToAccount: true,
    isReadOnly: false,
    restrictionReason: "Case is under review - billing and activities disabled",
  },
  [STATUS_KEYS.APPROVED]: {
    // Transitional status - case creation in progress
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: false,
    canEditUpdates: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: false,
    canCreateInvoice: false,
    canMatchToAccount: false,
    isReadOnly: true,
    restrictionReason: "Case is being created from approved request",
  },
  [STATUS_KEYS.DECLINED]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: false,
    canEditUpdates: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: false,
    canCreateInvoice: false,
    canMatchToAccount: false,
    isReadOnly: true,
    restrictionReason: "Request was declined - no case created",
  },

  // === EXECUTION PHASE ===
  [STATUS_KEYS.NEW]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: true,
    canAddTasks: true,
    canAddUpdates: true,
    canEditUpdates: true,
    canEditActivities: true,
    canEditCaseDetails: true,
    canAddSubjects: true,
    canAddAttachments: true,
    canCreateInvoice: false,
    isReadOnly: false,
    restrictionReason: "Case is new - time/expense tracking starts when Active",
  },
  [STATUS_KEYS.ASSIGNED]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: true,
    canAddTasks: true,
    canAddUpdates: true,
    canEditUpdates: true,
    canEditActivities: true,
    canEditCaseDetails: true,
    canAddSubjects: true,
    canAddAttachments: true,
    canCreateInvoice: false,
    isReadOnly: false,
    restrictionReason: "Case is assigned - time/expense tracking starts when Active",
  },
  [STATUS_KEYS.ACTIVE]: {
    // Full access for active cases
    canAddTimeEntries: true,
    canAddExpenses: true,
    canAddEvents: true,
    canAddTasks: true,
    canAddUpdates: true,
    canEditUpdates: true,
    canEditActivities: true,
    canEditCaseDetails: true,
    canAddSubjects: true,
    canAddAttachments: true,
    canCreateInvoice: true,
    canChangeStatus: true,
    isReadOnly: false,
    restrictionReason: null,
  },
  [STATUS_KEYS.ON_HOLD]: {
    // Limited access - no new billable work
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: true,
    canAddUpdates: true,
    canEditUpdates: true,
    canEditActivities: false,
    canEditCaseDetails: true,
    canAddSubjects: false,
    canAddAttachments: true,
    canCreateInvoice: false,
    isReadOnly: false,
    restrictionReason: "Case is on hold - time entries and events disabled",
  },
  [STATUS_KEYS.AWAITING_CLIENT]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: true,
    canAddUpdates: true,
    canEditUpdates: true,
    canEditActivities: false,
    canEditCaseDetails: true,
    canAddSubjects: false,
    canAddAttachments: true,
    canCreateInvoice: false,
    isReadOnly: false,
    restrictionReason: "Awaiting client response - time entries disabled",
  },
  [STATUS_KEYS.AWAITING_RECORDS]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: true,
    canAddUpdates: true,
    canEditUpdates: true,
    canEditActivities: false,
    canEditCaseDetails: true,
    canAddSubjects: false,
    canAddAttachments: true,
    canCreateInvoice: false,
    isReadOnly: false,
    restrictionReason: "Awaiting records - time entries disabled",
  },
  [STATUS_KEYS.COMPLETED]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: true, // For final notes
    canEditUpdates: false,
    canEditActivities: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: true, // For final reports
    canCreateInvoice: true,
    canGenerateFinalReport: true,
    isReadOnly: false,
    restrictionReason: "Case is completed - no new time entries or events",
  },
  [STATUS_KEYS.CLOSED]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: false,
    canEditUpdates: false,
    canEditActivities: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: false,
    canCreateInvoice: false,
    canChangeStatus: false,
    isReadOnly: true,
    restrictionReason: "Case is closed - read-only",
  },
  [STATUS_KEYS.CANCELLED]: {
    canAddTimeEntries: false,
    canAddExpenses: false,
    canAddEvents: false,
    canAddTasks: false,
    canAddUpdates: false,
    canEditUpdates: false,
    canEditActivities: false,
    canEditCaseDetails: false,
    canAddSubjects: false,
    canAddAttachments: false,
    canCreateInvoice: false,
    canChangeStatus: false,
    isReadOnly: true,
    restrictionReason: "Case is cancelled - read-only",
  },
};

/**
 * Default actions - all blocked until explicitly allowed
 */
const DEFAULT_ACTIONS: CaseStatusActions = {
  canAddTimeEntries: false,
  canAddExpenses: false,
  canCreateInvoice: false,
  canAddEvents: false,
  canAddTasks: false,
  canEditActivities: false,
  canAddUpdates: false,
  canEditUpdates: false,
  canEditCaseDetails: false,
  canAddSubjects: false,
  canAddAttachments: false,
  canChangeStatus: true,
  canMatchToAccount: false,
  canGenerateFinalReport: false,
  isReadOnly: true,
  restrictionReason: "Status not recognized",
};

/**
 * Hook to get allowed actions based on case status.
 * This is the centralized source of truth for status-authoritative behavior.
 * 
 * @param statusKey - The status_key of the case (from case_lifecycle_statuses)
 * @returns CaseStatusActions object with all permission flags
 * 
 * @example
 * const { canAddTimeEntries, restrictionReason } = useCaseStatusActions(caseData.status_key);
 * 
 * if (!canAddTimeEntries) {
 *   // Show disabled state or toast with restrictionReason
 * }
 */
export function useCaseStatusActions(statusKey: string | null | undefined): CaseStatusActions {
  const { isAdmin } = useUserRole();

  return useMemo(() => {
    // No status = fully restricted
    if (!statusKey) {
      return { ...DEFAULT_ACTIONS, restrictionReason: "No status available" };
    }

    // Get rules for this status
    const rules = STATUS_ACTION_RULES[statusKey as StatusKey];
    if (!rules) {
      return { ...DEFAULT_ACTIONS, restrictionReason: `Unknown status: ${statusKey}` };
    }

    // Merge rules with defaults
    const actions: CaseStatusActions = { ...DEFAULT_ACTIONS, ...rules };

    // Admin override for closed/cancelled (can still make edits)
    if (isAdmin && (statusKey === STATUS_KEYS.CLOSED || statusKey === STATUS_KEYS.CANCELLED)) {
      return {
        ...actions,
        canEditCaseDetails: true,
        canEditUpdates: true,
        canChangeStatus: true,
        canAddAttachments: true,
        restrictionReason: "Case is closed/cancelled - admin override active",
      };
    }

    return actions;
  }, [statusKey, isAdmin]);
}

/**
 * Helper to check if a status allows any billing activity
 */
export function canBill(statusKey: string | null | undefined): boolean {
  if (!statusKey) return false;
  const rules = STATUS_ACTION_RULES[statusKey as StatusKey];
  return rules?.canAddTimeEntries === true || rules?.canAddExpenses === true;
}

/**
 * Helper to check if a status is in the intake phase
 */
export function isIntakePhaseStatus(statusKey: string | null | undefined): boolean {
  return statusKey === STATUS_KEYS.REQUESTED || 
         statusKey === STATUS_KEYS.UNDER_REVIEW || 
         statusKey === STATUS_KEYS.APPROVED || 
         statusKey === STATUS_KEYS.DECLINED;
}

/**
 * Helper to check if a status allows work to be performed
 */
export function isWorkableStatus(statusKey: string | null | undefined): boolean {
  if (!statusKey) return false;
  const rules = STATUS_ACTION_RULES[statusKey as StatusKey];
  return rules?.canAddEvents === true || rules?.canAddTasks === true;
}
