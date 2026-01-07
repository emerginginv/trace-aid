// Paginated Document Viewer - True print-accurate preview with real page breaks
// Uses Paged.js for CSS Paged Media polyfill

import { useState, useEffect, useRef, useCallback } from "react";
import { Previewer } from "pagedjs";
import { ZoomIn, ZoomOut, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPagedMediaStyles, getPageViewerStyles } from "@/lib/paginatedLetterStyles";

interface PaginatedDocumentViewerProps {
  content: string;
  title?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  compact?: boolean;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

export function PaginatedDocumentViewer({
  content,
  title = "Document Preview",
  zoom: externalZoom,
  onZoomChange,
  className = "",
  showHeader = true,
  showFooter = true,
  compact = false,
}: PaginatedDocumentViewerProps) {
  const [internalZoom, setInternalZoom] = useState(100);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<Previewer | null>(null);

  const zoom = externalZoom ?? internalZoom;
  const setZoom = onZoomChange ?? setInternalZoom;

  // Render content with Paged.js
  const renderPages = useCallback(async () => {
    if (!content) {
      setIsRendering(false);
      return;
    }
    
    // Wait for container to be mounted
    if (!containerRef.current) {
      // Retry on next frame when container is mounted
      requestAnimationFrame(() => renderPages());
      return;
    }

    setIsRendering(true);
    setError(null);

    // Clear previous content
    containerRef.current.innerHTML = "";

    try {
      // Create the Paged.js previewer
      const previewer = new Previewer();
      previewerRef.current = previewer;

      // Build the HTML content with styles
      const htmlContent = `
        <style>
          ${getPagedMediaStyles()}
        </style>
        <div class="letter-document">
          ${content}
        </div>
      `;

      // Render pages
      const flow = await previewer.preview(
        htmlContent,
        [], // stylesheet URLs (we embed styles inline)
        containerRef.current
      );

      // Get page count from rendered flow
      const pages = containerRef.current.querySelectorAll(".pagedjs_page");
      setPageCount(pages.length);

      // Add page numbers to each page
      pages.forEach((page, index) => {
        page.setAttribute("data-page-number", `Page ${index + 1} of ${pages.length}`);
      });

      // Inject viewer styles
      const styleEl = document.createElement("style");
      styleEl.textContent = getPageViewerStyles();
      containerRef.current.prepend(styleEl);

      setCurrentPage(1);
    } catch (err) {
      console.error("Paged.js rendering error:", err);
      setError("Failed to render document pages");
    } finally {
      setIsRendering(false);
    }
  }, [content]);

  // Render when content changes
  useEffect(() => {
    renderPages();

    return () => {
      // Cleanup
      if (previewerRef.current) {
        previewerRef.current = null;
      }
    };
  }, [renderPages]);

  // Handle zoom
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  // Navigate between pages
  const scrollToPage = (pageNumber: number) => {
    if (!containerRef.current) return;
    const pages = containerRef.current.querySelectorAll(".pagedjs_page");
    if (pages[pageNumber - 1]) {
      pages[pageNumber - 1].scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pageCount) {
      scrollToPage(currentPage + 1);
    }
  };

  // Track current page on scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const pages = containerRef.current.querySelectorAll(".pagedjs_page");
    const containerRect = containerRef.current.getBoundingClientRect();

    for (let i = 0; i < pages.length; i++) {
      const pageRect = pages[i].getBoundingClientRect();
      // Page is considered "current" when its top is near the top of the container
      if (pageRect.top <= containerRect.top + 100) {
        setCurrentPage(i + 1);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full border rounded-lg bg-background ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{title}</span>
            {pageCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({pageCount} page{pageCount !== 1 ? "s" : ""})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            {pageCount > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToNextPage}
                  disabled={currentPage >= pageCount}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_LEVELS[0]}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Select
                value={zoom.toString()}
                onValueChange={(value) => setZoom(parseInt(value))}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZOOM_LEVELS.map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pages Container */}
      <ScrollArea 
        className={`flex-1 ${compact ? "" : "bg-muted/20"}`}
        onScroll={handleScroll}
      >
        <div
          className="min-h-full flex justify-center relative"
          style={{
            padding: compact ? "16px" : "32px",
            backgroundColor: compact ? undefined : "hsl(var(--muted) / 0.3)",
          }}
        >
          {/* Loading overlay */}
          {isRendering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-3">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-muted-foreground">Rendering pages...</span>
            </div>
          )}
          
          {/* Error state */}
          {error && !isRendering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
          
          {/* Container is ALWAYS mounted - hidden while loading */}
          <div
            ref={containerRef}
            className="paginated-document-container"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              width: `${100 / (zoom / 100)}%`,
              maxWidth: `${816 / (zoom / 100)}px`,
              opacity: isRendering || error ? 0 : 1,
              visibility: isRendering || error ? "hidden" : "visible",
            }}
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      {showFooter && (
        <div className="flex items-center justify-between p-3 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>Print-accurate preview • US Letter (8.5" × 11")</span>
          </div>
          {pageCount > 0 && (
            <span>
              Page {currentPage} of {pageCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
