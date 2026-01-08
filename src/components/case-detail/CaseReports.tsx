import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCaseGeneratedReports, downloadGeneratedReport, deleteGeneratedReport, type GeneratedReport } from "@/lib/docxTemplateEngine";

interface CaseReportsProps {
  caseId: string;
  isClosedCase?: boolean;
  onGenerateReport?: () => void;
}

export function CaseReports({ caseId, isClosedCase, onGenerateReport }: CaseReportsProps) {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReports();
    fetchUserProfiles();
  }, [caseId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getCaseGeneratedReports(caseId);
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfiles = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const profiles: Record<string, string> = {};
      (data || []).forEach(p => {
        profiles[p.id] = p.full_name || p.email;
      });
      setUserProfiles(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleDownload = async (report: GeneratedReport) => {
    setDownloading(report.id);
    try {
      const blob = await downloadGeneratedReport(report.outputFilePath);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Report downloaded successfully",
        });
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (report: GeneratedReport) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    try {
      await deleteGeneratedReport(report.id, report.outputFilePath);
      setReports(prev => prev.filter(r => r.id !== report.id));
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Reports Generated</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Generate your first report using a DOCX template to create professional case documentation.
        </p>
        {onGenerateReport && (
          <Button onClick={onGenerateReport} disabled={isClosedCase}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Generated Reports</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{reports.length} reports</Badge>
          {onGenerateReport && (
            <Button onClick={onGenerateReport} disabled={isClosedCase} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Title</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Generated By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{report.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(report.generatedAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {userProfiles[report.userId] || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(report)}
                      disabled={downloading === report.id}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {downloading === report.id ? "Downloading..." : "Download"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
