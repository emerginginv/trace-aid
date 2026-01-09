import { useState, useRef, useEffect, useCallback } from "react";
import html2pdf from "html2pdf.js";
import { Loader2, FileDown, Printer, FileText, Check } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetchCaseSummaryData, type CaseSummaryData } from "@/lib/caseSummaryData";
import { CaseSummaryContent } from "./CaseSummaryContent";

// Base document width in pixels (8.5in at 96dpi)
const BASE_DOC_WIDTH = 816;
// Uniform viewport padding in pixels
const VIEWPORT_PADDING = 12;

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<CaseSummaryData | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
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

  // Fit-to-Width scaling: compute scale based on viewport width
  const computeScale = useCallback(() => {
    if (!viewportRef.current) return;
    const viewportWidth = viewportRef.current.clientWidth;
    const availableWidth = viewportWidth - (2 * VIEWPORT_PADDING);
    const newScale = Math.max(0.25, availableWidth / BASE_DOC_WIDTH);
    setPreviewScale(newScale);
  }, []);

  // ResizeObserver to recompute scale on viewport resize
  useEffect(() => {
    if (!open) return;
    
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Initial computation
    computeScale();

    const resizeObserver = new ResizeObserver(() => {
      computeScale();
    });
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [open, computeScale]);

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

    setGenerating(true);
    try {
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
      toast.error("Failed to generate PDF");
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Case Summary
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive PDF summary for case {caseNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Section Selection */}
          <div className="w-64 shrink-0">
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
                disabled={loading || generating || !data}
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

          <Separator orientation="vertical" />

          {/* Preview */}
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            <h3 className="font-medium text-sm mb-2">Preview</h3>
            
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
            
            {/* Viewport - scrollable container with uniform padding */}
            <div 
              ref={viewportRef}
              className="flex-1 min-h-0 border rounded-lg bg-white overflow-auto"
              style={{ padding: `${VIEWPORT_PADDING}px` }}
            >
              {loading || !data ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                /* Scaled preview content - uses CSS zoom for Fit-to-Width */
                <div 
                  style={{ 
                    zoom: previewScale,
                    width: `${BASE_DOC_WIDTH}px`,
                    transformOrigin: 'top left'
                  }}
                >
                  <CaseSummaryContent data={data} sections={sections} />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
