import { useState } from "react";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { FileText, Download, Clock, User, Hash, FileDown } from "lucide-react";
import type { ReportInstance } from "@/lib/reportEngine";
import { updateReportExport } from "@/lib/reportEngine";

interface ReportInstanceViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportInstance | null;
}

export function ReportInstanceViewer({
  open,
  onOpenChange,
  report,
}: ReportInstanceViewerProps) {
  const [exporting, setExporting] = useState(false);

  if (!report) return null;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const element = document.createElement("div");
      element.innerHTML = report.renderedHtml;

      const options = {
        margin: 0.75,
        filename: `${report.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" as const },
      };

      await html2pdf().from(element).set(options).save();
      await updateReportExport(report.id, 'pdf');

      toast({
        title: "Success",
        description: "Report exported as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      // Extract plain text from HTML for DOCX
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = report.renderedHtml;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      const blob = new Blob([plainText], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.doc`;
      a.click();
      URL.revokeObjectURL(url);

      await updateReportExport(report.id, 'docx');

      toast({
        title: "Success",
        description: "Report exported as DOCX",
      });
    } catch (error) {
      console.error("Error exporting DOCX:", error);
      toast({
        title: "Error",
        description: "Failed to export DOCX",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {report.title}
          </DialogTitle>
        </DialogHeader>

        {/* Metadata Bar */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground py-2 border-y">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Generated {format(report.generatedAt, "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            <span className="font-mono text-xs">{report.inputHash.slice(0, 12)}...</span>
          </div>
          <Badge variant="secondary">
            {report.renderedSections.length} sections
          </Badge>
          {report.exportedAt && (
            <Badge variant="outline">
              Exported as {report.exportFormat?.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Report Content */}
        <ScrollArea className="flex-1 border rounded-md bg-white">
          <div 
            className="p-6"
            dangerouslySetInnerHTML={{ __html: report.renderedHtml }}
          />
        </ScrollArea>

        {/* Export Actions */}
        <Separator />
        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground">
            This report is read-only and cannot be edited.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportDocx}
              disabled={exporting}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export DOCX
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
