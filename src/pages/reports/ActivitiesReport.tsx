import { AnalyticsReportViewer } from "@/components/analytics/reports/AnalyticsReportViewer";

export default function ActivitiesReport() {
  return <AnalyticsReportViewer reportId="case-updates" />;
}

export function CaseUpdatesReport() {
  return <AnalyticsReportViewer reportId="case-updates" />;
}

export function TasksReport() {
  return <AnalyticsReportViewer reportId="tasks" />;
}

export function EventsReport() {
  return <AnalyticsReportViewer reportId="events" />;
}
