import { useState, useRef } from "react";
import { ArrowLeft, Download, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DocumentInstance, updateDocumentExport, DOCUMENT_TYPE_LABELS } from "@/lib/documentTemplates";
import { format } from "date-fns";

interface DocumentInstanceViewerProps {
  document: DocumentInstance;
  onBack: () => void;
}

// Renamed to avoid conflict with global document object

export function DocumentInstanceViewer({
  document: documentData,
  onBack,
}: DocumentInstanceViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    printWindow.document.write(documentData.renderedHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      // Dynamic import for html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = window.document.createElement('div');
      element.innerHTML = documentData.renderedHtml;
      
      const opt = {
        margin: 0,
        filename: `${documentData.title}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(element).save();
      await updateDocumentExport(documentData.id, 'pdf');
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportHtml = () => {
    const blob = new Blob([documentData.renderedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${documentData.title}.html`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateDocumentExport(documentData.id, 'html');
    toast.success("HTML downloaded successfully");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-medium">{documentData.title}</h2>
            <p className="text-sm text-muted-foreground">
              {DOCUMENT_TYPE_LABELS[documentData.documentType as keyof typeof DOCUMENT_TYPE_LABELS] || documentData.documentType} •
              Generated {format(new Date(documentData.generatedAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "Exporting..." : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileText className="h-4 w-4 mr-2" />
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportHtml}>
                <FileText className="h-4 w-4 mr-2" />
                Download as HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 bg-muted/30">
        <div className="max-w-[8.5in] mx-auto bg-white shadow-lg">
          <div
            ref={contentRef}
            className="p-[1in]"
            dangerouslySetInnerHTML={{ __html: documentData.renderedHtml }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
