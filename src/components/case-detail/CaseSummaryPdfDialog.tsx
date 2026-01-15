import { useState, useRef, useEffect } from "react";
import { Loader2, FileDown, Printer, FileText, FileWarning } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { fetchCaseSummaryData, type CaseSummaryData } from "@/lib/caseSummaryData";
import { CaseSummaryContent } from "./CaseSummaryContent";
import { loadHtml2Pdf, isPreviewEnvironment } from "@/lib/dynamicImports";

// Base document width in pixels (8.5in at 96dpi)
const BASE_DOC_WIDTH = 816;

interface CaseSummaryPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
}

export function CaseSummaryPdfDialog({
  open,
  onOpenChange,
  caseId,
  caseNumber,
}: CaseSummaryPdfDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<CaseSummaryData | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [sections, setSections] = useState({
    generalInfo: true,
    clientContact: true,
    subjects: true,
    budget: true,
    financials: true,
    activities: true,
    updates: true,
    attachments: true,
    relatedCases: true,
  });

  // Check for preview environment
  useEffect(() => {
    setIsPreview(isPreviewEnvironment());
  }, []);

  const loadData = async () => {
    if (data) return; // Already loaded
    
    setLoading(true);
    try {
      const summaryData = await fetchCaseSummaryData(caseId);
      setData(summaryData);
    } catch (error) {
      console.error("Failed to load case data:", error);
      toast.error("Failed to load case data");
    } finally {
      setLoading(false);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open && !data && !loading) {
      loadData();
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setData(null);
    }
    onOpenChange(isOpen);
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSections({
      generalInfo: true,
      clientContact: true,
      subjects: true,
      budget: true,
      financials: true,
      activities: true,
      updates: true,
      attachments: true,
      relatedCases: true,
    });
  };

  const selectNone = () => {
    setSections({
      generalInfo: false,
      clientContact: false,
      subjects: false,
      budget: false,
      financials: false,
      activities: false,
      updates: false,
      attachments: false,
      relatedCases: false,
    });
  };

  const generatePdf = async () => {
    if (!contentRef.current || !data) return;

    // Check for preview environment
    if (isPreview) {
      toast.error("PDF export is available in production builds only.");
      return;
    }

    setGenerating(true);
    try {
      // Load html2pdf dynamically
      const html2pdf = await loadHtml2Pdf();

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `${caseNumber}-summary.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          allowTaint: true,
          logging: false,
        },
        jsPDF: { 
          unit: "in" as const, 
          format: "letter" as const, 
          orientation: "portrait" as const,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(contentRef.current).save();
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!contentRef.current) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${caseNumber} - Case Summary</title>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
            @media print {
              body { padding: 0; }
              .page-break-before { page-break-before: always; }
            }
          </style>
          <link rel="stylesheet" href="${window.location.origin}/src/index.css">
        </head>
        <body>
          ${contentRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const sectionLabels: Record<keyof typeof sections, string> = {
    generalInfo: "General Information",
    clientContact: "Client & Contact Details",
    subjects: "Subjects",
    budget: "Budget Summary",
    financials: "Financial Details",
    activities: "Activities",
    updates: "Notes & Updates",
    attachments: "Attachments",
    relatedCases: "Related Cases",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Case Summary
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive PDF summary for case {caseNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Preview environment warning */}
        {isPreview && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-md mb-2">
            <FileWarning className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              PDF download is available in production builds only. Print preview is still available.
            </p>
          </div>
        )}

        {/* Offscreen export DOM - unscaled, used by generatePdf and handlePrint */}
        {data && (
          <div 
            style={{ 
              position: 'fixed', 
              left: '-99999px', 
              top: 0, 
              width: `${BASE_DOC_WIDTH}px`,
              visibility: 'hidden',
              pointerEvents: 'none'
            }}
            aria-hidden="true"
          >
            <CaseSummaryContent ref={contentRef} data={data} sections={sections} />
          </div>
        )}

        {/* Section Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Include Sections</h3>
            <div className="flex gap-2 text-xs">
              <button 
                onClick={selectAll}
                className="text-primary hover:underline"
              >
                All
              </button>
              <span className="text-muted-foreground">|</span>
              <button 
                onClick={selectNone}
                className="text-primary hover:underline"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(sectionLabels).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={sections[key as keyof typeof sections]}
                  onCheckedChange={() => toggleSection(key as keyof typeof sections)}
                />
                <Label 
                  htmlFor={key} 
                  className="text-sm cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Button
              onClick={generatePdf}
              disabled={loading || generating || !data || isPreview}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={loading || !data}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
