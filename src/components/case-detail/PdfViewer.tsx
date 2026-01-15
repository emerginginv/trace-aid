import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, FileWarning } from "lucide-react";
import { loadPdfJs, isPreviewEnvironment } from "@/lib/dynamicImports";
import type * as PdfJsLib from "pdfjs-dist";

interface PdfViewerProps {
  pdfData: ArrayBuffer;
  fileName: string;
  onDownload?: () => void;
}

export function PdfViewer({ pdfData, fileName, onDownload }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfjsLib, setPdfjsLib] = useState<typeof PdfJsLib | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfJsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  // Check for preview environment and load PDF.js
  useEffect(() => {
    if (isPreviewEnvironment()) {
      setIsPreview(true);
      setLoading(false);
      return;
    }

    loadPdfJs()
      .then(setPdfjsLib)
      .catch((err) => {
        console.error("Failed to load PDF.js:", err);
        setError(err.message || "Failed to load PDF viewer");
        setLoading(false);
      });
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!pdfjsLib) return;
    
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Make a copy of the ArrayBuffer since PDF.js transfers it to a worker
        // and it becomes detached (unusable) after transfer
        const pdfDataCopy = pdfData.slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: pdfDataCopy });
        const doc = await loadingTask.promise;

        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);

        // Create blob URL for "Open in new tab"
        const blob = new Blob([pdfData], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        console.error("Error loading PDF:", err);
        if (!cancelled) {
          setError("Failed to load PDF document");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [pdfjsLib, pdfData]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale((s) => Math.min(s + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  };

  const openInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Preview environment message
  if (isPreview) {
    return (
      <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
        <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">PDF Preview Unavailable</p>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          PDF preview is available in production builds only.
        </p>
        {onDownload && (
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
        <p className="text-lg font-medium mb-2 text-destructive">{error}</p>
        {onDownload && (
          <Button onClick={onDownload} className="mt-4">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full max-w-full overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/50 rounded-t border-b">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs sm:text-sm min-w-[60px] sm:min-w-[80px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs sm:text-sm min-w-[40px] sm:min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={openInNewTab} className="hidden sm:flex">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button variant="outline" size="sm" onClick={openInNewTab} className="sm:hidden">
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onDownload && (
            <>
              <Button variant="outline" size="sm" onClick={onDownload} className="hidden sm:flex">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={onDownload} className="sm:hidden">
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4 w-full max-w-full"
        style={{ maxHeight: "65vh" }}
      >
        <canvas ref={canvasRef} className="shadow-lg max-w-full h-auto" />
      </div>
    </div>
  );
}
