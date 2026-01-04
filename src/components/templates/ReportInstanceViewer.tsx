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
import { FileText, Download, Clock, Hash, FileDown, Printer } from "lucide-react";
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

  const handlePrint = () => {
    // Create a new window with the report content for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${report.title}</title>
            <style>
              @media print {
                @page {
                  size: letter;
                  margin: 0.75in;
                }
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            ${report.renderedHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const element = document.createElement("div");
      element.innerHTML = report.renderedHtml;

      const options = {
        margin: 0,
        filename: `${report.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: { 
          unit: "in", 
          format: "letter", 
          orientation: "portrait" as const,
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.break-before',
          after: '.break-after',
          avoid: '.no-break',
        },
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
      // Extract plain text from HTML for DOCX with better formatting
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = report.renderedHtml;
      
      // Remove style tags
      const styles = tempDiv.querySelectorAll('style');
      styles.forEach(s => s.remove());
      
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

  // Count pages estimate based on content
  const estimatedPages = Math.max(1, Math.ceil((report.renderedHtml.length / 5000)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
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
          <Badge variant="outline">
            ~{estimatedPages} pages
          </Badge>
          {report.exportedAt && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Exported as {report.exportFormat?.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Report Content - Professional Preview */}
        <ScrollArea className="flex-1 border rounded-md bg-gray-100">
          <div className="p-4 min-h-full">
            <div 
              className="bg-white shadow-lg mx-auto"
              style={{ maxWidth: '8.5in' }}
              dangerouslySetInnerHTML={{ __html: report.renderedHtml }}
            />
          </div>
        </ScrollArea>

        {/* Export Actions */}
        <Separator />
        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground">
            Professional report with cover page and branded styling
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handlePrint}
              disabled={exporting}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
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
