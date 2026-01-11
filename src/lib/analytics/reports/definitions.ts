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

export const revenueTrendsComparisonReport: ReportDefinition = {
  id: "revenue-trends-comparison",
  name: "Revenue Trends Comparison",
  description: "Year-over-year revenue comparison with billed vs collected analysis",
  category: "sales",
  sourceTable: "invoices",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "month", direction: "asc" },
  totals: [],
  relatedMetrics: ["financial.revenue_growth"],
};

// ============================================
// EXPENSE REPORTS
// ============================================

export const expenseDetailReport: ReportDefinition = {
  id: "expense-detail",
  name: "Expense Detail",
  description: "Detailed line-by-line view of expense entries with staff and invoice information",
  category: "expense",
  sourceTable: "case_finances",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "date", direction: "desc" },
  totals: [],
  relatedMetrics: ["financial.total_expenses"],
};

export const expenseDetailByStaffReport: ReportDefinition = {
  id: "expense-detail-by-staff",
  name: "Expense Detail by Staff",
  description: "Expense entries grouped by staff member with subtotals",
  category: "expense",
  sourceTable: "case_finances",
  columns: [], // Custom report - handled by its own component
  filters: [], // Custom report - handled by its own component
  defaultSort: { field: "staffName", direction: "asc" },
  totals: [],
  relatedMetrics: ["financial.total_expenses"],
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
  "revenue-trends-comparison": revenueTrendsComparisonReport,
  "expense-detail": expenseDetailReport,
  "expense-detail-by-staff": expenseDetailByStaffReport,
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
    reports: ["profit-trends", "profit-by-invoice", "income-distribution", "transaction-summary", "sales-trend-detail", "profit-distribution", "aging-by-client", "aging-detail", "revenue-trends-comparison"],
  },
  {
    id: "expense",
    name: "Expense Reports",
    description: "Expense tracking, detail, and analysis reports",
    icon: "Receipt",
    reports: ["expense-detail", "expense-detail-by-staff"],
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
