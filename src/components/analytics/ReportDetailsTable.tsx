import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface TimeRangeProps {
  startDate: Date;
  endDate: Date;
}

interface ReportDetailsTableProps {
  timeRange: TimeRangeProps;
}

export function ReportDetailsTable({ timeRange }: ReportDetailsTableProps) {
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [exportFilter, setExportFilter] = useState<string>("all");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["report-details", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch reports with cases
      const { data, error } = await supabase
        .from("report_instances")
        .select(`
          id,
          title,
          generated_at,
          exported_at,
          export_format,
          template_snapshot,
          case_id,
          user_id,
          cases!inner(case_number, title)
        `)
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString())
        .order("generated_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(report => {
        const snapshot = report.template_snapshot as { name?: string } | null;
        const caseData = report.cases as { case_number: string; title: string } | null;
        const profile = profileMap.get(report.user_id);
        
        return {
          id: report.id,
          title: report.title,
          templateName: snapshot?.name || "Unknown",
          caseId: report.case_id,
          caseNumber: caseData?.case_number || "Unknown",
          caseTitle: caseData?.title || "Unknown",
          generatedBy: profile?.full_name || profile?.email || "Unknown",
          generatedAt: report.generated_at,
          exported: !!report.exported_at,
          exportFormat: report.export_format,
        };
      }) || [];
    },
    enabled: !!organization?.id,
  });

  // Get unique template names for filter
  const templateNames = [...new Set(reports?.map(r => r.templateName) || [])];

  // Apply filters
  const filteredReports = reports?.filter(report => {
    if (templateFilter !== "all" && report.templateName !== templateFilter) return false;
    if (exportFilter === "exported" && !report.exported) return false;
    if (exportFilter === "not_exported" && report.exported) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Generation Details
          </CardTitle>
          <CardDescription>All reports generated in the selected time period</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Generation Details
            </CardTitle>
            <CardDescription>All reports generated in the selected time period</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {templateNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exportFilter} onValueChange={setExportFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Export Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="exported">Exported</SelectItem>
                <SelectItem value="not_exported">Not Exported</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredReports || filteredReports.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No reports match the current filters
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Title</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead>Export Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={report.title}>
                      {report.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {report.templateName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/cases/${report.caseId}?tab=reports`)}
                        className="text-primary hover:underline text-left"
                      >
                        {report.caseNumber}
                      </button>
                    </TableCell>
                    <TableCell>{report.generatedBy}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(report.generatedAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      {report.exported ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          {report.exportFormat?.toUpperCase() || "Exported"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/cases/${report.caseId}?tab=reports`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {filteredReports && filteredReports.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredReports.length} of {reports?.length || 0} reports
          </div>
        )}
      </CardContent>
    </Card>
  );
}
