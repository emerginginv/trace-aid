/**
 * FUTURE HOOKS - Declared but not implemented
 * 
 * These types and hooks define the shape of future features.
 * Implementation is pending business requirements finalization.
 */

// ============================================
// 1. REVENUE ANALYTICS BY SERVICE
// ============================================

export interface ServiceRevenueMetrics {
  serviceId: string;
  serviceName: string;
  serviceCode: string | null;
  totalRevenue: number;
  totalHours: number;
  averageRate: number;
  invoiceCount: number;
  instanceCount: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    hours: number;
  }>;
  revenueByPricingModel: Record<string, number>;
  topClients: Array<{
    accountId: string;
    accountName: string;
    revenue: number;
  }>;
}

export interface ServiceRevenueAnalyticsParams {
  organizationId: string;
  dateFrom?: Date;
  dateTo?: Date;
  serviceIds?: string[];
  accountIds?: string[];
}

/**
 * @future Revenue analytics by service
 * Tracks revenue generation across different service types
 */
export function useServiceRevenueAnalytics(_params: ServiceRevenueAnalyticsParams) {
  // TODO: Implement when analytics infrastructure is ready
  console.warn('useServiceRevenueAnalytics is not yet implemented');
  
  return {
    data: null as ServiceRevenueMetrics[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// 2. INVESTIGATOR PERFORMANCE METRICS
// ============================================

export interface InvestigatorPerformanceMetrics {
  investigatorId: string;
  investigatorName: string;
  investigatorEmail: string;
  
  // Activity metrics
  casesAssigned: number;
  casesCompleted: number;
  caseCompletionRate: number;
  
  // Time metrics
  totalHoursBilled: number;
  averageHoursPerCase: number;
  utilizationRate: number; // billed hours / available hours
  
  // Financial metrics
  revenueGenerated: number;
  averageRevenuePerCase: number;
  
  // Service metrics
  serviceInstancesCompleted: number;
  servicesBreakdown: Array<{
    serviceId: string;
    serviceName: string;
    completedCount: number;
    totalHours: number;
  }>;
  
  // Quality metrics (future)
  budgetAdherenceRate: number; // % of cases within budget
  onTimeCompletionRate: number;
  
  // Trend data
  performanceByMonth: Array<{
    month: string;
    casesCompleted: number;
    hoursBilled: number;
    revenue: number;
  }>;
}

export interface InvestigatorPerformanceParams {
  organizationId: string;
  investigatorIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  includeInactive?: boolean;
}

/**
 * @future Investigator performance metrics
 * Tracks productivity, utilization, and revenue generation per investigator
 */
export function useInvestigatorPerformance(_params: InvestigatorPerformanceParams) {
  // TODO: Implement when performance tracking is prioritized
  console.warn('useInvestigatorPerformance is not yet implemented');
  
  return {
    data: null as InvestigatorPerformanceMetrics[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Individual investigator performance
 */
export function useInvestigatorPerformanceDetail(_investigatorId: string, _params?: Omit<InvestigatorPerformanceParams, 'investigatorIds'>) {
  console.warn('useInvestigatorPerformanceDetail is not yet implemented');
  
  return {
    data: null as InvestigatorPerformanceMetrics | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// 3. CLIENT PROFITABILITY REPORTS
// ============================================

export interface ClientProfitabilityMetrics {
  accountId: string;
  accountName: string;
  industry: string | null;
  
  // Revenue metrics
  totalRevenue: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  
  // Cost metrics (requires cost tracking implementation)
  estimatedCost: number; // Based on hours * internal cost rate
  grossProfit: number;
  profitMargin: number;
  
  // Activity metrics
  totalCases: number;
  activeCases: number;
  completedCases: number;
  averageCaseValue: number;
  
  // Payment behavior
  averagePaymentDays: number;
  onTimePaymentRate: number;
  
  // Lifetime value
  clientSinceDate: string;
  lifetimeValue: number;
  projectedAnnualValue: number;
  
  // Service mix
  servicesUsed: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    instanceCount: number;
  }>;
  
  // Trend data
  revenueByQuarter: Array<{
    quarter: string;
    revenue: number;
    caseCount: number;
  }>;
}

export interface ClientProfitabilityParams {
  organizationId: string;
  accountIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minimumRevenue?: number;
  sortBy?: 'revenue' | 'profit' | 'margin' | 'cases';
  limit?: number;
}

/**
 * @future Client profitability reports
 * Analyzes revenue, costs, and profitability per client
 */
export function useClientProfitability(_params: ClientProfitabilityParams) {
  // TODO: Implement when cost tracking is available
  console.warn('useClientProfitability is not yet implemented');
  
  return {
    data: null as ClientProfitabilityMetrics[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Individual client profitability
 */
export function useClientProfitabilityDetail(_accountId: string, _params?: Omit<ClientProfitabilityParams, 'accountIds'>) {
  console.warn('useClientProfitabilityDetail is not yet implemented');
  
  return {
    data: null as ClientProfitabilityMetrics | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// 4. AUTOMATED RETAINER DRAWDOWNS
// ============================================

export interface RetainerDrawdownConfig {
  id: string;
  caseId: string;
  organizationId: string;
  
  // Trigger configuration
  triggerType: 'invoice_finalized' | 'monthly' | 'threshold_reached' | 'manual';
  triggerThreshold?: number; // For threshold_reached: apply when invoice exceeds this
  
  // Application rules
  applyPercentage: number; // 0-100, percentage of retainer to apply
  maxApplyAmount?: number; // Cap on amount to apply per drawdown
  minRetainerBalance?: number; // Don't draw below this balance
  
  // Status
  isActive: boolean;
  lastDrawdownAt: string | null;
  totalDrawdownAmount: number;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RetainerDrawdownEvent {
  id: string;
  configId: string;
  caseId: string;
  invoiceId: string;
  
  // Amounts
  amountApplied: number;
  retainerBalanceBefore: number;
  retainerBalanceAfter: number;
  invoiceBalanceBefore: number;
  invoiceBalanceAfter: number;
  
  // Trigger info
  triggerType: RetainerDrawdownConfig['triggerType'];
  triggeredAt: string;
  triggeredBy: string | null; // null for automatic
  
  // Status
  status: 'pending' | 'applied' | 'failed' | 'reversed';
  failureReason?: string;
}

export interface AutomatedRetainerDrawdownParams {
  caseId: string;
}

/**
 * @future Get retainer drawdown configuration for a case
 */
export function useRetainerDrawdownConfig(_params: AutomatedRetainerDrawdownParams) {
  // TODO: Implement when retainer automation is prioritized
  console.warn('useRetainerDrawdownConfig is not yet implemented');
  
  return {
    data: null as RetainerDrawdownConfig | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Create/update retainer drawdown configuration
 */
export function useCreateRetainerDrawdownConfig() {
  console.warn('useCreateRetainerDrawdownConfig is not yet implemented');
  
  return {
    mutate: (_config: Omit<RetainerDrawdownConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastDrawdownAt' | 'totalDrawdownAmount'>) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_config: Omit<RetainerDrawdownConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastDrawdownAt' | 'totalDrawdownAmount'>) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Get retainer drawdown history for a case
 */
export function useRetainerDrawdownHistory(_caseId: string) {
  console.warn('useRetainerDrawdownHistory is not yet implemented');
  
  return {
    data: null as RetainerDrawdownEvent[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Trigger manual retainer drawdown
 */
export function useTriggerRetainerDrawdown() {
  console.warn('useTriggerRetainerDrawdown is not yet implemented');
  
  return {
    mutate: (_params: { caseId: string; invoiceId: string; amount?: number }) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: { caseId: string; invoiceId: string; amount?: number }) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}


// ============================================
// 5. BATCH BILLING APPROVALS
// ============================================

export interface BatchApprovalItem {
  billingItemId: string;
  caseId: string;
  caseNumber: string;
  description: string;
  amount: number;
  hours?: number;
  serviceName?: string;
  investigatorName?: string;
  createdAt: string;
}

export interface BatchApprovalResult {
  totalItems: number;
  approved: number;
  rejected: number;
  budgetBlocked: number;
  results: Array<{
    billingItemId: string;
    success: boolean;
    error?: string;
    budgetBlocked?: boolean;
  }>;
}

export interface BatchApprovalParams {
  organizationId: string;
  billingItemIds: string[];
  approverNotes?: string;
}

/**
 * @future Get pending billing items for batch approval
 * Returns all pending billing items across cases for bulk review
 */
export function usePendingBillingItemsForApproval(_organizationId: string) {
  console.warn('usePendingBillingItemsForApproval is not yet implemented');
  
  return {
    data: null as BatchApprovalItem[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Batch approve multiple billing items
 * Approves multiple billing items in a single operation with budget checks
 */
export function useBatchApproveBillingItems() {
  console.warn('useBatchApproveBillingItems is not yet implemented');
  
  return {
    mutate: (_params: BatchApprovalParams) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: BatchApprovalParams): Promise<BatchApprovalResult> => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Batch reject multiple billing items
 * Rejects multiple billing items with a common reason
 */
export function useBatchRejectBillingItems() {
  console.warn('useBatchRejectBillingItems is not yet implemented');
  
  return {
    mutate: (_params: BatchApprovalParams & { rejectionReason: string }) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: BatchApprovalParams & { rejectionReason: string }): Promise<BatchApprovalResult> => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}


// ============================================
// 6. AUTO-APPROVAL THRESHOLDS
// ============================================

export interface AutoApprovalRule {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  
  // Threshold conditions (all must be met)
  maxAmount?: number;           // Auto-approve if amount <= this
  maxHours?: number;            // Auto-approve if hours <= this
  serviceCodes?: string[];      // Only for specific services
  investigatorIds?: string[];   // Only for specific investigators
  budgetUtilizationMax?: number; // Only if budget utilization <= this %
  
  // Behavior
  requireBudgetCheck: boolean;
  skipIfHardCap: boolean;
  
  priority: number; // Lower = higher priority
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AutoApprovalEvaluation {
  billingItemId: string;
  wouldAutoApprove: boolean;
  matchedRuleId?: string;
  matchedRuleName?: string;
  blockingReason?: string;
}

/**
 * @future Get auto-approval rules for organization
 */
export function useAutoApprovalRules(_organizationId: string) {
  console.warn('useAutoApprovalRules is not yet implemented');
  
  return {
    data: null as AutoApprovalRule[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Create auto-approval rule
 */
export function useCreateAutoApprovalRule() {
  console.warn('useCreateAutoApprovalRule is not yet implemented');
  
  return {
    mutate: (_rule: Omit<AutoApprovalRule, 'id' | 'createdAt' | 'updatedAt'>) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_rule: Omit<AutoApprovalRule, 'id' | 'createdAt' | 'updatedAt'>) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Update auto-approval rule
 */
export function useUpdateAutoApprovalRule() {
  console.warn('useUpdateAutoApprovalRule is not yet implemented');
  
  return {
    mutate: (_params: { ruleId: string; updates: Partial<AutoApprovalRule> }) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: { ruleId: string; updates: Partial<AutoApprovalRule> }) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Delete auto-approval rule
 */
export function useDeleteAutoApprovalRule() {
  console.warn('useDeleteAutoApprovalRule is not yet implemented');
  
  return {
    mutate: (_ruleId: string) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_ruleId: string) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Evaluate if billing items would auto-approve
 * Preview which items would be auto-approved based on current rules
 */
export function useEvaluateAutoApproval(_billingItemIds: string[]) {
  console.warn('useEvaluateAutoApproval is not yet implemented');
  
  return {
    data: null as AutoApprovalEvaluation[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// 7. CLIENT BILLING SUMMARIES
// ============================================

export interface ClientBillingSummary {
  accountId: string;
  accountName: string;
  
  // Date range
  periodStart: string;
  periodEnd: string;
  
  // Invoice summary
  invoicesIssued: number;
  invoicesPaid: number;
  invoicesOutstanding: number;
  
  // Amounts
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalRetainerApplied: number;
  
  // Activity summary
  casesActive: number;
  casesClosed: number;
  totalHoursBilled: number;
  totalExpenses: number;
  
  // Breakdown by case
  caseBreakdown: Array<{
    caseId: string;
    caseNumber: string;
    caseTitle: string;
    status: string;
    amountBilled: number;
    amountPaid: number;
    hoursBilled: number;
  }>;
  
  // Breakdown by service
  serviceBreakdown: Array<{
    serviceId: string;
    serviceName: string;
    instanceCount: number;
    totalAmount: number;
    totalHours: number;
  }>;
  
  // Payment history
  recentPayments: Array<{
    paymentId: string;
    invoiceNumber: string;
    amount: number;
    date: string;
    method?: string;
  }>;
}

export interface ClientBillingSummaryParams {
  accountId: string;
  periodStart?: Date;
  periodEnd?: Date;
  includeCaseBreakdown?: boolean;
  includeServiceBreakdown?: boolean;
  includePaymentHistory?: boolean;
}

/**
 * @future Get billing summary for a client
 * Aggregates invoices, payments, and activity for a specific account
 */
export function useClientBillingSummary(_params: ClientBillingSummaryParams) {
  console.warn('useClientBillingSummary is not yet implemented');
  
  return {
    data: null as ClientBillingSummary | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Generate PDF billing summary for client
 */
export function useGenerateClientBillingSummaryPdf() {
  console.warn('useGenerateClientBillingSummaryPdf is not yet implemented');
  
  return {
    mutate: (_params: ClientBillingSummaryParams) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: ClientBillingSummaryParams): Promise<{ pdfUrl: string }> => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Email billing summary to client
 */
export function useEmailClientBillingSummary() {
  console.warn('useEmailClientBillingSummary is not yet implemented');
  
  return {
    mutate: (_params: ClientBillingSummaryParams & { recipientEmails: string[]; subject?: string; message?: string }) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: ClientBillingSummaryParams & { recipientEmails: string[]; subject?: string; message?: string }): Promise<{ sent: boolean }> => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}


// ============================================
// 8. MULTIPLE UPDATES PER ACTIVITY
// ============================================

export interface ActivityUpdateLink {
  updateId: string;
  updateType: string;
  content: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  billingItemId?: string; // If billing was created for this update
  billedAmount?: number;
  billedHours?: number;
}

export interface MultiUpdateActivity {
  activityId: string;
  activityType: 'task' | 'event';
  activityTitle: string;
  caseId: string;
  caseNumber: string;
  updates: ActivityUpdateLink[];
  totalUpdates: number;
  totalBilledHours: number;
  totalBilledAmount: number;
}

export interface MultiUpdateActivityParams {
  activityId: string;
  includeArchived?: boolean;
}

/**
 * @future Get all updates linked to a single activity
 * Enables multiple updates per task/event
 */
export function useActivityUpdates(_params: MultiUpdateActivityParams) {
  console.warn('useActivityUpdates is not yet implemented');
  
  return {
    data: null as MultiUpdateActivity | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Create an additional update for an existing activity
 * Allows adding updates to activities that already have updates
 */
export function useCreateLinkedUpdate() {
  console.warn('useCreateLinkedUpdate is not yet implemented');
  
  return {
    mutate: (_params: { activityId: string; caseId: string; updateType: string; content: string }) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: { activityId: string; caseId: string; updateType: string; content: string }) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Get billing summary across all updates for an activity
 */
export function useActivityBillingSummary(_activityId: string) {
  console.warn('useActivityBillingSummary is not yet implemented');
  
  return {
    data: null as { totalHours: number; totalAmount: number; billingItemCount: number } | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// 9. EXPENSE BILLING FROM UPDATES
// ============================================

export type ExpenseType = 'mileage' | 'materials' | 'filing_fee' | 'service_fee' | 'court_fee' | 'other';

export interface ExpenseBillingFromUpdate {
  updateId: string;
  expenseType: ExpenseType;
  description: string;
  amount: number;
  quantity?: number;
  unitCost?: number;
  receiptUrl?: string;
  isReimbursable: boolean;
  vendorName?: string;
  expenseDate?: string;
}

export interface OrganizationExpenseType {
  id: string;
  code: string;
  name: string;
  description?: string;
  defaultUnitCost?: number;
  requiresReceipt: boolean;
  isActive: boolean;
}

export interface ExpenseBillingParams {
  updateId: string;
  caseId: string;
  caseServiceInstanceId: string;
  expense: Omit<ExpenseBillingFromUpdate, 'updateId'>;
}

/**
 * @future Create expense billing item from an update
 * Enables expense-type billing (not just time) from case updates
 */
export function useCreateExpenseBillingItem() {
  console.warn('useCreateExpenseBillingItem is not yet implemented');
  
  return {
    mutate: (_params: ExpenseBillingParams) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: ExpenseBillingParams) => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Get available expense types for organization
 */
export function useOrganizationExpenseTypes(_organizationId: string) {
  console.warn('useOrganizationExpenseTypes is not yet implemented');
  
  return {
    data: null as OrganizationExpenseType[] | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Check if update can have expense billing created
 */
export function useExpenseBillingEligibility(_updateId: string) {
  console.warn('useExpenseBillingEligibility is not yet implemented');
  
  return {
    data: null as { isEligible: boolean; reason?: string } | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// 10. BATCH BILLING FROM UPDATES
// ============================================

export interface BatchBillingUpdateItem {
  updateId: string;
  caseId: string;
  activityId: string;
  caseServiceInstanceId: string;
  billingType: 'time' | 'expense';
  // Time fields
  startTime?: string;
  endTime?: string;
  hours?: number;
  hourlyRate?: number;
  // Expense fields
  expenseType?: ExpenseType;
  amount?: number;
  description?: string;
}

export interface BatchBillingUpdateResult {
  updateId: string;
  billingItemId?: string;
  success: boolean;
  error?: string;
  budgetWarning?: boolean;
  budgetMessage?: string;
}

export interface BatchBillingFromUpdatesResult {
  totalItems: number;
  successCount: number;
  failureCount: number;
  budgetWarnings: number;
  totalAmount: number;
  totalHours: number;
  results: BatchBillingUpdateResult[];
}

export interface BatchBillingFromUpdatesParams {
  organizationId: string;
  items: BatchBillingUpdateItem[];
  skipBudgetCheck?: boolean;
  createAsDraft?: boolean;
}

/**
 * @future Get updates that don't have billing items yet
 * For a given case, returns updates eligible for batch billing
 */
export function usePendingUpdatesForBilling(_caseId: string) {
  console.warn('usePendingUpdatesForBilling is not yet implemented');
  
  return {
    data: null as Array<{ updateId: string; activityId: string; updateType: string; createdAt: string }> | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}

/**
 * @future Create billing items for multiple updates in one operation
 * Batch creates billing items with consolidated budget checking
 */
export function useBatchCreateBillingFromUpdates() {
  console.warn('useBatchCreateBillingFromUpdates is not yet implemented');
  
  return {
    mutate: (_params: BatchBillingFromUpdatesParams) => {
      throw new Error('Not implemented');
    },
    mutateAsync: async (_params: BatchBillingFromUpdatesParams): Promise<BatchBillingFromUpdatesResult> => {
      throw new Error('Not implemented');
    },
    isPending: false,
    error: null,
  };
}

/**
 * @future Pre-validate batch billing items before creation
 * Checks budget limits, service validity, and returns warnings
 */
export function useValidateBatchBilling(_items: BatchBillingUpdateItem[]) {
  console.warn('useValidateBatchBilling is not yet implemented');
  
  return {
    data: null as {
      isValid: boolean;
      errors: Array<{ updateId: string; error: string }>;
      warnings: Array<{ updateId: string; warning: string }>;
    } | null,
    isLoading: false,
    error: new Error('Not implemented'),
  };
}


// ============================================
// FUTURE DATABASE TABLES (Reference Only)
// ============================================

/**
 * These tables will need to be created when implementing the above features:
 * 
 * 1. investigator_performance_snapshots
 *    - Periodic snapshots of investigator metrics
 *    - Enables trend analysis without expensive recalculation
 * 
 * 2. client_profitability_snapshots  
 *    - Monthly/quarterly profitability snapshots per client
 *    - Caches expensive calculations
 * 
 * 3. retainer_drawdown_configs
 *    - Stores automation rules for retainer application
 * 
 * 4. retainer_drawdown_events
 *    - Audit log of all automated and manual drawdowns
 * 
 * 5. internal_cost_rates
 *    - Internal cost per hour by role/investigator
 *    - Required for true profitability calculations
 * 
 * 6. auto_approval_rules
 *    - Organization-level rules for automatic billing approval
 *    - Conditions based on amount, hours, service, investigator
 * 
 * 7. auto_approval_logs
 *    - Audit log of auto-approved items and which rule matched
 * 
 * 8. client_billing_summary_cache
 *    - Cached billing summaries for performance
 * 
 * 9. update_activity_links
 *    - Join table for multiple updates per activity
 *    - Enables tracking multiple updates for a single task/event
 * 
 * 10. expense_types
 *    - Organization-configurable expense categories
 *    - Supports custom expense types with default rates
 * 
 * 11. update_billing_batch_jobs
 *    - Track batch billing operations from updates
 *    - Audit trail for batch-created billing items
 */
