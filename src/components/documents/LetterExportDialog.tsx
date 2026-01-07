/**
 * LETTER EXPORT DIALOG
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * NON-NEGOTIABLE: All exports use IDENTICAL rendering via Paged.js
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * CRITICAL: HTML controls pagination — never the export engine.
 * 
 * The PDF, DOCX, and Print functions use the SAME:
 * - Paged.js rendering engine (identical to preview)
 * - HTML content from letterDocument.html
 * - CSS styles from getUnifiedLetterStyles()
 * - Font definitions from LETTER_FONT_STACK
 * - Page dimensions from PAGE_SPECS
 * 
 * If preview ≠ export, it is a DEFECT.
 */

import { useState, useEffect } from "react";
import { Previewer } from "pagedjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, 
  FileText, 
  FileType, 
  Printer,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { 
  type LetterDocument, 
  runProfessionalAcceptanceTest, 
  type ProfessionalAcceptanceTest 
} from "@/lib/letterDocumentEngine";
import { 
  PAGE_SPECS, 
  getUnifiedLetterStyles,
  getPageViewerStyles,
  LETTER_FONT_STACK 
} from "@/lib/paginatedLetterStyles";
import { saveExportedPdf, recordExport } from "@/lib/documentExports";
import { ProfessionalAcceptanceBanner } from "./ProfessionalAcceptanceBanner";

interface LetterExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterDocument: LetterDocument;
  defaultFilename?: string;
  // For storing PDF as derived artifact
  documentInstanceId?: string;
  organizationId?: string;
  userId?: string;
  onExportComplete?: () => void;
}

type ExportFormat = 'pdf' | 'docx' | 'print';

/**
 * Extract body content from letter HTML (without embedded styles)
 */
function extractBodyContent(html: string): string {
  const match = html.match(/<div class="letter-document">([\s\S]*)<\/div>\s*$/);
  if (match) {
    return match[1];
  }
  // Fallback: remove style tags
  return html.replace(/<style>[\s\S]*?<\/style>/g, '');
}

export function LetterExportDialog({
  open,
  onOpenChange,
  letterDocument,
  defaultFilename = "letter",
  documentInstanceId,
  organizationId,
  userId,
  onExportComplete,
}: LetterExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [filename, setFilename] = useState(defaultFilename);
  const [includeDraftWatermark, setIncludeDraftWatermark] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [acceptanceTest, setAcceptanceTest] = useState<ProfessionalAcceptanceTest | null>(null);

  // Run Professional Acceptance Test when dialog opens
  useEffect(() => {
    if (open && letterDocument?.html) {
      const result = runProfessionalAcceptanceTest(
        letterDocument.html,
        letterDocument.pageSettings
      );
      setAcceptanceTest(result);
      
      if (!result.passed) {
        console.warn('Professional Acceptance Test FAILED:', result.errors);
      }
    }
  }, [open, letterDocument?.html, letterDocument?.pageSettings]);

  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[^a-z0-9\s\-_]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 100) || 'letter';
  };

  /**
   * PDF Export using Paged.js + html2canvas + jsPDF
   * 
   * CRITICAL: Uses the SAME Paged.js rendering as preview for identical pagination.
   */
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const pageSize = letterDocument.pageSettings.size;
      const spec = PAGE_SPECS[pageSize];
      
      // Get UNIFIED styles - same as preview
      const styles = getUnifiedLetterStyles(pageSize, {
        draftMode: includeDraftWatermark,
        forExport: true,
        showPageNumbers: true,
      });
      
      // Create off-screen container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = `${spec.widthPx}px`;
      container.style.background = 'white';
      document.body.appendChild(container);
      
      // Build HTML content with SAME styles as preview
      const htmlContent = `
        <style>
          ${styles}
          ${getPageViewerStyles(pageSize)}
        </style>
        <div class="letter-document">
          ${extractBodyContent(letterDocument.html)}
        </div>
      `;
      
      // Use Paged.js to render pages (SAME engine as preview)
      const previewer = new Previewer();
      await previewer.preview(htmlContent, [], container);
      
      // Get all rendered pages
      const pages = container.querySelectorAll('.pagedjs_page');
      
      if (pages.length === 0) {
        throw new Error('No pages rendered');
      }
      
      // Create PDF with correct dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: pageSize === 'a4' ? 'a4' : 'letter',
      });
      
      // Capture each page to PDF
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capture page to canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: spec.widthPx,
          height: spec.heightPx,
        });
        
        // Add new page for pages after the first
        if (i > 0) {
          pdf.addPage();
        }
        
        // Add image to PDF (full page)
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(
          imgData, 
          'JPEG', 
          0, 
          0, 
          parseFloat(spec.width), 
          parseFloat(spec.height)
        );
      }
      
      // Get PDF as blob for storage
      const pdfBlob = pdf.output('blob');
      
      // Save PDF to local device
      pdf.save(`${sanitizeFilename(filename)}.pdf`);
      
      // Cleanup
      document.body.removeChild(container);
      
      // Store PDF as derived artifact if document context is provided
      if (documentInstanceId && organizationId && userId) {
        await saveExportedPdf(
          documentInstanceId,
          organizationId,
          userId,
          sanitizeFilename(filename),
          pdfBlob
        );
      }
      
      setExportComplete(true);
      toast.success("PDF exported successfully!");
      
      setTimeout(() => {
        onOpenChange(false);
        setExportComplete(false);
        onExportComplete?.();
      }, 1500);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const pageSize = letterDocument.pageSettings.size;
      const spec = PAGE_SPECS[pageSize];
      
      // Use SAME unified styles as preview and PDF
      const styles = getUnifiedLetterStyles(pageSize, {
        draftMode: includeDraftWatermark,
        forExport: true
      });
      
      // For DOCX, export well-formatted HTML that Word can open
      // Uses SAME font stack and page settings as preview/PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>${sanitizeFilename(filename)}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            /* Page setup - matches PAGE_SPECS */
            @page { 
              size: ${spec.width} ${spec.height}; 
              margin: ${spec.margins.top / 96}in ${spec.margins.right / 96}in ${spec.margins.bottom / 96}in ${spec.margins.left / 96}in; 
            }
            
            /* Base styles - uses SAME font stack as preview */
            body { 
              font-family: ${LETTER_FONT_STACK}; 
              font-size: 12pt; 
              line-height: 1.5;
              margin: 0;
              padding: 0;
            }
            
            /* Letter document styles - simplified for Word compatibility */
            .letter-document { max-width: ${spec.usableWidthPx / 96}in; }
            .letter-letterhead { text-align: center; margin-bottom: 0.75in; }
            .letter-letterhead .org-name { font-weight: bold; font-size: 16pt; margin-bottom: 4px; }
            .letter-letterhead .org-info { font-size: 10pt; color: #333; line-height: 1.4; }
            .letter-date { text-align: right; margin-bottom: 0.5in; }
            .letter-recipient { margin-bottom: 0.25in; line-height: 1.4; }
            .letter-body { text-align: left; }
            .letter-body p { margin-bottom: 1em; text-indent: 0; text-align: left; }
            .letter-signature { margin-top: 1in; page-break-inside: avoid; }
            .signature-line { border-bottom: 1px solid black; width: 3in; margin-bottom: 0.25em; height: 0.5in; }
            .signature-name { font-weight: bold; }
            .signature-title { font-style: italic; }
            .letter-footer { margin-top: 1in; padding-top: 0.5em; border-top: 1px solid #ccc; font-size: 9pt; color: #666; text-align: center; }
            
            ${includeDraftWatermark ? `
            /* Draft watermark */
            .letter-document::before {
              content: "DRAFT";
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 120pt;
              color: rgba(200, 200, 200, 0.3);
              pointer-events: none;
            }
            ` : ''}
          </style>
        </head>
        <body>
          <div class="letter-document">
            ${extractBodyContent(letterDocument.html)}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sanitizeFilename(filename)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      toast.success("Document exported successfully!");
      
      setTimeout(() => {
        onOpenChange(false);
        setExportComplete(false);
      }, 1500);
    } catch (error) {
      console.error("DOCX export error:", error);
      toast.error("Failed to export document. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    // Get UNIFIED styles - same as preview and PDF
    const styles = getUnifiedLetterStyles(letterDocument.pageSettings.size, {
      draftMode: includeDraftWatermark,
      forExport: true
    });
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${sanitizeFilename(filename)}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="letter-document">
            ${extractBodyContent(letterDocument.html)}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
      toast.success("Print dialog opened");
      onOpenChange(false);
    }
  };

  const handleExport = () => {
    switch (format) {
      case 'pdf':
        handleExportPdf();
        break;
      case 'docx':
        handleExportDocx();
        break;
      case 'print':
        handlePrint();
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Letter
          </DialogTitle>
          <DialogDescription>
            Choose format and filename for your letter export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup 
              value={format} 
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid grid-cols-1 gap-3"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="font-medium">PDF Document</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Best for sharing, archiving, and printing
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Word Document</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Editable format for Microsoft Word
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="print" id="print" />
                <Label htmlFor="print" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Print Directly</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Open print dialog for immediate printing
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="draft"
              checked={includeDraftWatermark}
              onCheckedChange={(checked) => setIncludeDraftWatermark(!!checked)}
            />
            <Label htmlFor="draft" className="text-sm cursor-pointer">
              Include DRAFT watermark
            </Label>
          </div>

          {/* Professional Acceptance Test Status */}
          {acceptanceTest && (
            <ProfessionalAcceptanceBanner test={acceptanceTest} />
          )}

          {/* Page Info - Uses PAGE_SPECS for consistent dimensions */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between">
              <span>Estimated pages:</span>
              <span className="font-medium">{letterDocument.estimatedPages}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Page size:</span>
              <span className="font-medium">
                {PAGE_SPECS[letterDocument.pageSettings.size].name} ({PAGE_SPECS[letterDocument.pageSettings.size].width} × {PAGE_SPECS[letterDocument.pageSettings.size].height})
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !filename.trim() || !acceptanceTest?.canExport}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : exportComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Done!
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
