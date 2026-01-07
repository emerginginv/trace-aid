import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import html2pdf from "html2pdf.js";
import * as pdfjsLib from "pdfjs-dist";
import { Skeleton } from "@/components/ui/skeleton";

// Configure PDF.js worker using new URL() pattern (most reliable for Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfReportPreviewProps {
  html: string;
  scale: number;
  onPageCountChange?: (count: number) => void;
  onActivePageChange?: (page: number) => void;
  className?: string;
}

export interface PdfReportPreviewRef {
  scrollToPage: (pageNumber: number) => void;
}

interface RenderedPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

const PAGE_GAP = 32;

export const PdfReportPreview = forwardRef<PdfReportPreviewRef, PdfReportPreviewProps>(
  ({ html, scale, onPageCountChange, onActivePageChange, className }, ref) => {
    const [pages, setPages] = useState<RenderedPage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const generationIdRef = useRef(0);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Expose scrollToPage method to parent
    useImperativeHandle(ref, () => ({
      scrollToPage: (pageNumber: number) => {
        const pageEl = pageRefs.current.get(pageNumber);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    }));

    // Generate PDF and render pages
    const generatePdfPages = useCallback(async (htmlContent: string, genId: number) => {
      if (!htmlContent) return;
      
      setIsGenerating(true);
      setError(null);

      try {
        // Create a temporary element with the HTML content
        // Must have explicit dimensions for html2pdf to paginate correctly
        const element = document.createElement("div");
        element.innerHTML = htmlContent;
        element.style.position = "absolute";
        element.style.left = "-9999px";
        element.style.top = "0";
        element.style.width = "8.5in"; // Letter page width for accurate pagination
        element.style.minHeight = "11in"; // Letter page height
        element.style.background = "white";
        element.style.overflow = "visible"; // Ensure content isn't clipped
        // CRITICAL: Explicit visibility enforcement for html2canvas
        element.style.visibility = "visible";
        element.style.opacity = "1";
        element.style.display = "block";
        element.style.color = "#000000";
        element.style.fontFamily = "Georgia, 'Times New Roman', serif";
        document.body.appendChild(element);

        // CRITICAL: Force the cover page to auto-height for capture
        const coverPage = element.querySelector('.report-cover-page') as HTMLElement;
        if (coverPage) {
          coverPage.style.height = 'auto';
          coverPage.style.minHeight = '11in';
          coverPage.style.display = 'flex';
          coverPage.style.flexDirection = 'column';
          coverPage.style.justifyContent = 'space-between';
          coverPage.style.background = '#ffffff';
          coverPage.style.padding = '72px';
        }

        // CRITICAL: Wait for browser to compute styles and complete layout
        // Double requestAnimationFrame ensures the render cycle completes
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        // Generate PDF as array buffer
        const options = {
          margin: 0,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 816,  // 8.5in at 96dpi
            windowWidth: 816,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "in",
            format: "letter",
            orientation: "portrait" as const,
          },
          pagebreak: {
            mode: ["avoid-all", "css", "legacy"],
            before: ".break-before",
            after: ".break-after",
            avoid: ".no-break",
          },
        };

        const pdfBlob = await html2pdf().from(element).set(options).outputPdf("blob");
        
        // Clean up temp element
        document.body.removeChild(element);

        // Check if this generation is still current
        if (genId !== generationIdRef.current) return;

        // Convert blob to array buffer
        const arrayBuffer = await pdfBlob.arrayBuffer();

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;

        // Check if this generation is still current
        if (genId !== generationIdRef.current) return;

        const numPages = pdfDoc.numPages;
        onPageCountChange?.(numPages);

        // Render each page
        const renderedPages: RenderedPage[] = [];

        for (let i = 1; i <= numPages; i++) {
          // Check if this generation is still current
          if (genId !== generationIdRef.current) return;

          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2 }); // Render at 2x for clarity

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          renderedPages.push({
            pageNumber: i,
            canvas,
            width: viewport.width / 2, // Display at 1x
            height: viewport.height / 2,
          });
        }

        // Check if this generation is still current
        if (genId !== generationIdRef.current) return;

        setPages(renderedPages);
      } catch (err) {
        console.error("Error generating PDF preview:", err);
        if (genId === generationIdRef.current) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(`Failed to generate preview: ${errorMessage}`);
        }
      } finally {
        if (genId === generationIdRef.current) {
          setIsGenerating(false);
        }
      }
    }, [onPageCountChange]);

    // Debounced PDF generation
    useEffect(() => {
      if (!html) {
        setPages([]);
        return;
      }

      // Cancel any pending generation
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Increment generation ID to cancel any in-progress generation
      generationIdRef.current += 1;
      const currentGenId = generationIdRef.current;

      // Debounce the generation
      debounceTimerRef.current = setTimeout(() => {
        generatePdfPages(html, currentGenId);
      }, 300);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [html, generatePdfPages]);

    // Track active page using IntersectionObserver
    useEffect(() => {
      if (!containerRef.current || pages.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
              const pageNum = parseInt(entry.target.getAttribute("data-page-number") || "1");
              onActivePageChange?.(pageNum);
            }
          });
        },
        {
          root: containerRef.current.closest('[data-radix-scroll-area-viewport]'),
          threshold: 0.3,
        }
      );

      pageRefs.current.forEach((el) => {
        observer.observe(el);
      });

      return () => observer.disconnect();
    }, [pages, onActivePageChange]);

    if (isGenerating && pages.length === 0) {
      return (
        <div className={className} ref={containerRef}>
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="w-[400px] h-[520px] rounded shadow-lg" />
              <span className="text-xs text-muted-foreground animate-pulse">
                Generating preview...
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={className} ref={containerRef}>
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      );
    }

    const scaledGap = PAGE_GAP * scale;

    return (
      <div className={className} ref={containerRef}>
        <div
          className="flex flex-col items-center"
          style={{ gap: `${scaledGap}px` }}
        >
          {pages.map((page) => {
            const scaledWidth = page.width * scale;
            const scaledHeight = page.height * scale;

            return (
              <div
                key={page.pageNumber}
                className="flex flex-col items-center"
                data-page-number={page.pageNumber}
                ref={(el) => {
                  if (el) pageRefs.current.set(page.pageNumber, el);
                }}
              >
                {/* Page card with professional shadow */}
                <div
                  className="relative bg-white transition-shadow overflow-hidden"
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    boxShadow:
                      "0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)",
                    borderRadius: `${Math.max(1, 2 * scale)}px`,
                    border: "1px solid rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <img
                    src={page.canvas.toDataURL("image/png")}
                    alt={`Page ${page.pageNumber}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* Subtle page indicator */}
                <div
                  className="mt-3 text-center"
                  style={{
                    fontSize: `${Math.max(10, 11 * scale)}px`,
                  }}
                >
                  <span className="text-muted-foreground/70 font-medium">
                    {page.pageNumber === 1 ? "Cover Page" : `Page ${page.pageNumber}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator when regenerating */}
        {isGenerating && pages.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg">
            <span className="text-xs text-muted-foreground animate-pulse">
              Updating preview...
            </span>
          </div>
        )}
      </div>
    );
  }
);

PdfReportPreview.displayName = "PdfReportPreview";
