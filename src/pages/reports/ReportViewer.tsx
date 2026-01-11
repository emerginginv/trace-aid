import { useParams, Navigate } from "react-router-dom";
import { AnalyticsReportViewer } from "@/components/analytics/reports/AnalyticsReportViewer";
import { getReport } from "@/lib/analytics/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProfitTrendsReport from "./ProfitTrendsReport";

// Custom reports that have their own components (not using AnalyticsReportViewer)
const CUSTOM_REPORTS: Record<string, React.ComponentType> = {
  "profit-trends": ProfitTrendsReport,
};

export default function ReportViewer() {
  const { reportId } = useParams<{ reportId: string }>();
  
  if (!reportId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report Not Found</CardTitle>
          <CardDescription>No report ID provided.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Check for custom reports first
  const CustomReportComponent = CUSTOM_REPORTS[reportId];
  if (CustomReportComponent) {
    return <CustomReportComponent />;
  }
  
  const report = getReport(reportId);
  
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report Not Found</CardTitle>
          <CardDescription>The report "{reportId}" could not be found.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/reports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Reports
          </Link>
        </Button>
      </div>
      
      <AnalyticsReportViewer reportId={reportId} />
    </div>
  );
}
