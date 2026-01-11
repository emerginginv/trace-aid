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

// ============================================
// REPORT REGISTRY
// ============================================

export const reportRegistry: Record<string, ReportDefinition> = {
  "profit-trends": profitTrendsReport,
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
    reports: ["profit-trends"],
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
