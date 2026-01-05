import { AnalyticsReportViewer } from "@/components/analytics/reports/AnalyticsReportViewer";

export default function BudgetsReport() {
  return <AnalyticsReportViewer reportId="budget-status" />;
}

export function BudgetStatusReport() {
  return <AnalyticsReportViewer reportId="budget-status" />;
}

export function BudgetAdjustmentsReport() {
  return <AnalyticsReportViewer reportId="budget-adjustments" />;
}
