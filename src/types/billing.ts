/**
 * Billing Types
 * 
 * Centralized type definitions for the billing observability system.
 */

/**
 * Structured diagnostics for billing eligibility evaluation.
 * Collected during every billing evaluation and exposed to admins only.
 */
export interface BillingEvaluationDiagnostics {
  /** Whether the update/activity is linked to a task or event */
  has_linked_activity: boolean;
  
  /** Whether the linked activity has a case service instance */
  has_service_instance: boolean;
  
  /** Whether the service is marked as billable */
  service_billable: boolean;
  
  /** Whether a pricing rule was found for the service */
  pricing_rule_found: boolean;
  
  /** Whether this activity has already produced a billing item */
  already_billed: boolean;
  
  /** Final eligibility result */
  eligible_for_billing: boolean;
  
  /** Reason for ineligibility if not eligible */
  failure_reason?: string;
  
  /** Timestamp when evaluation occurred */
  evaluated_at: string;
  
  /** Additional context data */
  context?: {
    updateId?: string;
    activityId?: string;
    serviceInstanceId?: string;
    serviceName?: string;
    pricingModel?: string;
    activityType?: 'task' | 'event';
  };
}

/**
 * Status values for billing items
 */
export type BillingItemStatus = 'pending_review' | 'approved' | 'rejected' | 'invoiced';

/**
 * Billing item in the review queue
 */
export interface BillingReviewItem {
  id: string;
  case_id: string;
  account_id: string | null;
  case_service_instance_id: string | null;
  activity_id: string | null;
  update_id: string | null;
  billing_type: string;
  description: string;
  quantity: number | null;
  hourly_rate: number | null;
  amount: number;
  status: string;
  created_at: string;
  notes: string | null;
  
  // Joined data
  case_number?: string;
  case_title?: string;
  account_name?: string;
  service_name?: string;
  activity_title?: string;
}
