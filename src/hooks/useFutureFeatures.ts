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
 */
