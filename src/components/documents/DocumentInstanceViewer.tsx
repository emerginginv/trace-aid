/**
 * DOCUMENT INSTANCE VIEWER
 * 
 * Displays stored document instances with print-accurate pagination.
 * Uses PaginatedDocumentViewer for consistent rendering with exports.
 * 
 * HTML is the SINGLE SOURCE OF TRUTH - the same renderedHtml is used for:
 * - Preview (this viewer)
 * - PDF export
 * - DOCX export  
 * - Print
 */

import { useState } from "react";
import { ArrowLeft, Download, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DocumentInstance, updateDocumentExport, DOCUMENT_TYPE_LABELS } from "@/lib/documentTemplates";
import { format } from "date-fns";
import { PaginatedDocumentViewer } from "./PaginatedDocumentViewer";
import { getPdfExportOptions } from "@/lib/paginatedLetterStyles";

interface DocumentInstanceViewerProps {
  document: DocumentInstance;
  onBack: () => void;
}

/**
 * Extract body content from full HTML document
 * Removes outer wrappers like <style> tags and document containers
 */
function extractBodyContent(html: string): string {
  // If it already has letter-document wrapper, extract just the content
  const match = html.match(/<div class="letter-document"[^>]*>([\s\S]*?)<\/div>\s*$/i);
  if (match) {
    return match[1];
  }
  
  // If there's a letter-body, extract it
  const bodyMatch = html.match(/<div class="letter-body">([\s\S]*?)<\/div>/i);
  if (bodyMatch) {
    return bodyMatch[0];
  }
  
  // Otherwise return as-is (might already be just content)
  return html;
}

export function DocumentInstanceViewer({
  document: documentData,
  onBack,
}: DocumentInstanceViewerProps) {
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    // Use the SAME HTML that's being previewed
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documentData.title}</title>
        <style>
          @page { size: letter; margin: 1in; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${documentData.renderedHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create container with the SAME HTML that's being previewed
      const element = window.document.createElement('div');
      element.innerHTML = documentData.renderedHtml;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      window.document.body.appendChild(element);
      
      // Use shared export options for consistency
      const options = getPdfExportOptions(documentData.title);
      
      await html2pdf().set(options).from(element).save();
      
      window.document.body.removeChild(element);
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
    // Export the SAME HTML that's being previewed
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${documentData.title}</title>
      </head>
      <body>
        ${documentData.renderedHtml}
      </body>
      </html>
    `;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
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

  // Extract content for the paginated viewer
  const viewerContent = extractBodyContent(documentData.renderedHtml);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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

      {/* Paginated Document Preview - Uses SAME HTML as exports */}
      <div className="flex-1 min-h-0">
        <PaginatedDocumentViewer
          content={viewerContent}
          title={documentData.title}
          showHeader={false}
          className="h-full border-0 rounded-none"
        />
      </div>
    </div>
  );
}
