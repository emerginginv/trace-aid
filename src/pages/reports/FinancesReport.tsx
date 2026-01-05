import { AnalyticsReportViewer } from "@/components/analytics/reports/AnalyticsReportViewer";

export default function FinancesReport() {
  return <AnalyticsReportViewer reportId="time-entries" />;
}

export function TimeEntriesReport() {
  return <AnalyticsReportViewer reportId="time-entries" />;
}

export function ExpenseEntriesReport() {
  return <AnalyticsReportViewer reportId="expense-entries" />;
}

export function InvoicesReport() {
  return <AnalyticsReportViewer reportId="invoices" />;
}
