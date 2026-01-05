import { AnalyticsReportViewer } from "@/components/analytics/reports/AnalyticsReportViewer";

export default function CasesReport() {
  return <AnalyticsReportViewer reportId="all-cases" />;
}

export function OpenCasesReport() {
  return <AnalyticsReportViewer reportId="open-cases" />;
}

export function ClosedCasesReport() {
  return <AnalyticsReportViewer reportId="closed-cases" />;
}
