import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type BillingAuditAction = 
  | 'billing_prompt_shown'
  | 'time_confirmed'
  | 'billing_item_created'
  | 'expense_billing_item_created'
  | 'billing_skipped'
  | 'event_billing_blocked'
  | 'quick_bill_completed'
  | 'quick_bill_skipped';

export interface BillingAuditMetadata {
  updateId?: string;
  activityId?: string;
  eventId?: string;
  caseServiceInstanceId?: string;
  billingItemId?: string;
  caseId?: string;
  serviceName?: string;
  pricingModel?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  confirmedTimes?: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
  reason?: string;
  /** Source of the billing action (e.g., 'update_form', 'create_billing_later', 'quick_bill') */
  source?: string;
  /** Severity level for audit events */
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Expense-specific: category of the expense */
  expenseCategory?: string;
}

export interface BillingAuditLogEntry {
  action: BillingAuditAction;
  organizationId: string;
  metadata: BillingAuditMetadata;
}

/**
 * Log an audit entry for billing workflow actions
 * Creates an immutable, court-defensible record of billing-related actions
 * 
 * Per SYSTEM PROMPT 11 - Audit & Traceability:
 * - billing_prompt_shown: When billing eligibility detected and prompt shown
 * - time_confirmed: When user confirms times in the billing dialog
 * - billing_item_created: After billing item successfully inserted
 * - billing_skipped: When user declines to create billing item
 */
export const logBillingAudit = async (entry: BillingAuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Cannot log billing audit: No authenticated user');
      return;
    }
    
    const { error } = await supabase.from('audit_events').insert([{
      organization_id: entry.organizationId,
      actor_user_id: user.id,
      action: entry.action,
      metadata: entry.metadata as unknown as Json,
    }]);

    if (error) {
      console.error('Failed to log billing audit:', error);
    }
  } catch (error) {
    console.error('Error logging billing audit:', error);
  }
};
