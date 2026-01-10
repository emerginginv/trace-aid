import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { 
  FileText, Download, Calendar as CalendarIcon, Clock, 
  Shield, FileCheck, AlertTriangle, CreditCard, Package,
  Loader2, Lock, CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  report_type: string;
  title: string;
  status: string;
  filters: { date_from?: string; date_to?: string };
  requested_by: string;
  requester_name: string;
  expires_at: string;
  created_at: string;
  generated_at: string | null;
}

const reportTypes = [
  { value: "security", label: "Security & Access Report", icon: Shield, description: "Users, roles, access changes, SSO status" },
  { value: "audit_logs", label: "Audit Log Report", icon: FileCheck, description: "All audit events within date range" },
  { value: "compliance", label: "Compliance Report", icon: FileText, description: "Retention, DSRs, compliance exports" },
  { value: "vulnerabilities", label: "Vulnerability Summary", icon: AlertTriangle, description: "Pen tests, vulnerabilities, SLA compliance" },
  { value: "billing", label: "Billing & Contract Summary", icon: CreditCard, description: "Plan, usage, contracts, DPAs" },
];

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  generating: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ready: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function ReportsExportsTab() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const isEnterprise = organization?.plan === "enterprise";

  // Fetch existing reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["organization-reports", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase.rpc("get_organization_reports", {
        p_organization_id: organization.id,
      });
      if (error) throw error;
      return (data || []) as Report[];
    },
    enabled: !!organization?.id && isEnterprise,
    refetchInterval: 10000, // Poll for status updates
  });

  // Request report mutation
  const requestReport = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !selectedType) throw new Error("Missing data");
      const reportConfig = reportTypes.find(r => r.value === selectedType);
      const { data, error } = await supabase.rpc("request_report", {
        p_organization_id: organization.id,
        p_report_type: selectedType,
        p_title: reportConfig?.label || selectedType,
        p_filters: { date_from: dateFrom.toISOString(), date_to: dateTo.toISOString() },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Report requested successfully");
      queryClient.invalidateQueries({ queryKey: ["organization-reports"] });
      setSelectedType("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Generate report content mutation
  const generateReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.rpc("generate_report_content", {
        p_report_id: reportId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Log download
      supabase.rpc("log_report_download", { p_report_id: data.report_id }).catch(console.error);
      
      toast.success("Report downloaded");
      queryClient.invalidateQueries({ queryKey: ["organization-reports"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Generate audit bundle mutation
  const generateBundle = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase.rpc("generate_audit_bundle", {
        p_organization_id: organization.id,
        p_date_from: dateFrom.toISOString(),
        p_date_to: dateTo.toISOString(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-bundle-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit bundle generated and downloaded");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!isEnterprise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Enterprise Reports & Exports
          </CardTitle>
          <CardDescription>
            Generate auditor-ready reports and compliance bundles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Enterprise reporting is available on the Enterprise plan. Upgrade to access
              security reports, audit logs, compliance documentation, and audit bundles.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generate Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </CardTitle>
          <CardDescription>
            Create time-scoped, organization-isolated reports for audits and compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  {reportTypes.find(r => r.value === selectedType)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
                  </PopoverContent>
                </Popover>
                <span className="self-center text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Button
            onClick={() => requestReport.mutate()}
            disabled={!selectedType || requestReport.isPending}
          >
            {requestReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Report
          </Button>
        </CardContent>
      </Card>

      {/* Audit Bundle Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Full Audit Bundle
          </CardTitle>
          <CardDescription>
            Generate a comprehensive audit pack containing all reports for the selected date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Audit bundles contain sensitive organizational data. Links expire after 7 days.
              All downloads are logged for compliance.
            </AlertDescription>
          </Alert>
          <Button
            variant="secondary"
            onClick={() => generateBundle.mutate()}
            disabled={generateBundle.isPending}
          >
            {generateBundle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Full Audit Bundle
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Report History
          </CardTitle>
          <CardDescription>
            Previously generated reports (expires after 7 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reports generated yet</p>
          ) : (
            <div className="space-y-3">
              {reports?.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{report.title}</span>
                      <Badge className={cn("text-xs", statusColors[report.status])}>
                        {report.status === "ready" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
                      {report.requester_name && ` by ${report.requester_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {format(new Date(report.expires_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {report.status === "queued" && (
                    <Button
                      size="sm"
                      onClick={() => generateReport.mutate(report.id)}
                      disabled={generateReport.isPending}
                    >
                      {generateReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate
                    </Button>
                  )}
                  {report.status === "ready" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateReport.mutate(report.id)}
                      disabled={generateReport.isPending}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}