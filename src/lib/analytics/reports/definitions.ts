import { ReportDefinition, ReportCategoryInfo } from "./types";

// ============================================
// SALES REPORTS
// ============================================

// Profit Trends is a custom report with its own component
// It doesn't use the standard ReportDefinition structure
// but we register it here for the category listing
export const profitTrendsReport: ReportDefinition = {
  id: "profit-trends",
  name: "Profit Trends",
  description: "Monthly expensed vs invoiced comparison with profit margins",
  category: "sales",
  sourceTable: "case_finances", // Primary source, also uses invoices
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "date", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.profit_margin"],
};

export const profitByInvoiceReport: ReportDefinition = {
  id: "profit-by-invoice",
  name: "Profit By Invoice",
  description: "Invoice-level profit analysis with client and status filtering",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "date", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.profit_margin"],
};

export const incomeDistributionReport: ReportDefinition = {
  id: "income-distribution",
  name: "Income Distribution",
  description: "Payment totals grouped by client or salesperson with visual breakdown",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "total", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.total_revenue"],
};

export const transactionSummaryReport: ReportDefinition = {
  id: "transaction-summary",
  name: "Transaction Summary",
  description: "Client transaction totals including retainers, payments, and invoicing",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "name", direction: "asc" },
  totals: [],
  relatedMetrics: ["financial.total_revenue"],
};

export const salesTrendDetailReport: ReportDefinition = {
  id: "sales-trend-detail",
  name: "Sales Trend Detail",
  description: "Period-over-period sales trends with change indicators by client",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "avgChange", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.revenue_growth"],
};

export const profitDistributionReport: ReportDefinition = {
  id: "profit-distribution",
  name: "Profit Distribution",
  description: "Profit breakdown by client with expense analysis and visual charts",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "profit", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.profit_margin"],
};

export const agingByClientReport: ReportDefinition = {
  id: "aging-by-client",
  name: "Aging by Client",
  description: "Accounts receivable aging grouped by client with 30/60/90+ day buckets",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "total", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.accounts_receivable"],
};

export const agingDetailReport: ReportDefinition = {
  id: "aging-detail",
  name: "Aging Detail",
  description: "Detailed line-by-line view of outstanding invoices with days aging",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "daysOutstanding", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.accounts_receivable"],
};

// ============================================
// REPORT REGISTRY
// ============================================

export const reportRegistry: Record<string, ReportDefinition> = {
  "profit-trends": profitTrendsReport,
  "profit-by-invoice": profitByInvoiceReport,
  "income-distribution": incomeDistributionReport,
  "transaction-summary": transactionSummaryReport,
  "sales-trend-detail": salesTrendDetailReport,
  "profit-distribution": profitDistributionReport,
  "aging-by-client": agingByClientReport,
  "aging-detail": agingDetailReport,
};

// ============================================
// REPORT CATEGORIES
// ============================================

export const reportCategories: ReportCategoryInfo[] = [
  {
    id: "sales",
    name: "Sales Reports",
    description: "Revenue, profit trends, and sales analytics",
    icon: "TrendingUp",
    reports: ["profit-trends", "profit-by-invoice", "income-distribution", "transaction-summary", "sales-trend-detail", "profit-distribution", "aging-by-client", "aging-detail"],
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getReport(reportId: string): ReportDefinition | undefined {
  return reportRegistry[reportId];
}

export function getReportsByCategory(categoryId: string): ReportDefinition[] {
  const category = reportCategories.find((c) => c.id === categoryId);
  if (!category) return [];
  return category.reports
    .map((reportId) => reportRegistry[reportId])
    .filter(Boolean);
}
