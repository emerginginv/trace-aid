import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type CaseTypeAuditAction = 
  | 'case_type_assigned'        // Initial assignment (new case or first set)
  | 'case_type_changed'         // Changed from one type to another
  | 'case_type_removed'         // Removed case type (set to null)
  | 'case_type_change_blocked'; // Attempted change blocked due to billing

export interface CaseTypeAuditMetadata {
  caseId: string;
  caseNumber?: string;
  previousCaseTypeId?: string | null;
  previousCaseTypeName?: string | null;
  newCaseTypeId?: string | null;
  newCaseTypeName?: string | null;
  previousBudgetStrategy?: string | null;
  newBudgetStrategy?: string | null;
  budgetConflictResolved?: boolean;
  serviceConflictResolved?: boolean;
  servicesRemoved?: string[];
  dueDateRecalculated?: boolean;
  reason?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CaseTypeAuditLogEntry {
  action: CaseTypeAuditAction;
  organizationId: string;
  metadata: CaseTypeAuditMetadata;
}

/**
 * Logs a Case Type audit event to the audit_events table.
 * Used for tracking Case Type assignments, changes, removals, and blocked attempts.
 */
export const logCaseTypeAudit = async (entry: CaseTypeAuditLogEntry): Promise<void> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Cannot log audit: User not authenticated');
      return;
    }

    const auditPayload = {
      action: entry.action,
      actor_user_id: user.id,
      organization_id: entry.organizationId,
      metadata: entry.metadata as unknown as Json,
    };

    const { error } = await supabase
      .from('audit_events')
      .insert(auditPayload);

    if (error) {
      console.error('Failed to log case type audit:', error);
    } else {
      console.log(`Case type audit logged: ${entry.action} for case ${entry.metadata.caseId}`);
    }
  } catch (error) {
    console.error('Error logging case type audit:', error);
  }
};

/**
 * Determines the appropriate audit action based on previous and new case type IDs.
 */
export const determineCaseTypeAuditAction = (
  previousCaseTypeId: string | null | undefined,
  newCaseTypeId: string | null | undefined
): CaseTypeAuditAction | null => {
  if (!previousCaseTypeId && newCaseTypeId) {
    return 'case_type_assigned';
  }
  if (previousCaseTypeId && !newCaseTypeId) {
    return 'case_type_removed';
  }
  if (previousCaseTypeId && newCaseTypeId && previousCaseTypeId !== newCaseTypeId) {
    return 'case_type_changed';
  }
  // No change
  return null;
};
