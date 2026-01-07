/**
 * LETTER EXPORT DIALOG
 * 
 * NON-NEGOTIABLE: All exports derive from letterDocument.html
 * 
 * The PDF, DOCX, and Print functions receive the SAME HTML
 * that was displayed in the preview. No separate layout engine.
 * 
 * Page dimensions are defined in paginatedLetterStyles.ts
 */

import { useState } from "react";
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
import { type LetterDocument } from "@/lib/letterDocumentEngine";
import { getPdfExportOptions, PAGE_SPECS } from "@/lib/paginatedLetterStyles";

interface LetterExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterDocument: LetterDocument;
  defaultFilename?: string;
}

type ExportFormat = 'pdf' | 'docx' | 'print';

export function LetterExportDialog({
  open,
  onOpenChange,
  letterDocument,
  defaultFilename = "letter"
}: LetterExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [filename, setFilename] = useState(defaultFilename);
  const [includeDraftWatermark, setIncludeDraftWatermark] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[^a-z0-9\s\-_]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 100) || 'letter';
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a container for PDF generation
      const container = document.createElement('div');
      container.innerHTML = letterDocument.html;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const options = getPdfExportOptions(sanitizeFilename(filename));
      
      await html2pdf().set(options).from(container).save();
      
      document.body.removeChild(container);
      
      setExportComplete(true);
      toast.success("PDF exported successfully!");
      
      setTimeout(() => {
        onOpenChange(false);
        setExportComplete(false);
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
      // For DOCX, we'll export a well-formatted HTML that Word can open
      // This preserves formatting better than plain text
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
            @page { size: letter; margin: 1in; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt; 
              line-height: 1.5;
              margin: 0;
              padding: 0;
            }
            .letter-document { max-width: 6.5in; }
            .letter-letterhead { text-align: center; margin-bottom: 36pt; }
            .letter-date { text-align: right; margin-bottom: 24pt; }
            .letter-body p { margin-bottom: 12pt; text-align: justify; }
            .letter-signature { margin-top: 48pt; }
            .signature-line { border-bottom: 1px solid black; width: 3in; margin-bottom: 6pt; height: 24pt; }
          </style>
        </head>
        <body>
          ${letterDocument.html}
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${sanitizeFilename(filename)}</title>
          <style>
            @page { size: letter; margin: 1in; }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${letterDocument.html}
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
          {format !== 'print' && (
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
          <Button onClick={handleExport} disabled={isExporting || !filename.trim()}>
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
