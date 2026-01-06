import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, FileText, Eye, Maximize, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PreviewResult } from "@/lib/reportPreview";
import { cn } from "@/lib/utils";

interface ReportPreviewPanelProps {
  preview: PreviewResult | null;
  isLoading?: boolean;
  highlightedSectionId?: string | null;
  onSectionClick?: (sectionId: string) => void;
  className?: string;
}

// US Letter page dimensions in pixels at 96 DPI
const PAGE_WIDTH_PX = 816;  // 8.5 inches * 96 DPI
const PAGE_HEIGHT_PX = 1056; // 11 inches * 96 DPI
const PAGE_GAP = 32; // Gap between pages in pixels
const CONTAINER_PADDING = 40; // Padding around the pages

const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;

type ZoomMode = "manual" | "fit-width" | "fit-page";

interface ParsedPage {
  pageNumber: number;
  pageType: 'cover' | 'content';
  html: string;
}

export function ReportPreviewPanel({
  preview,
  isLoading = false,
  highlightedSectionId,
  onSectionClick,
  className,
}: ReportPreviewPanelProps) {
  const [zoomLevel, setZoomLevel] = useState(75);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-width");
  const [activePage, setActivePage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Parse HTML into pages
  const pages = useMemo<ParsedPage[]>(() => {
    if (!preview?.html) return [];
    
    const pages: ParsedPage[] = [];
    
    // Extract cover page
    const coverMatch = preview.html.match(/<div class="report-cover-page"[\s\S]*?<\/div>\s*(?=<div class="preview-page-break"|<div class="report-content")/);
    if (coverMatch) {
      pages.push({
        pageNumber: 1,
        pageType: 'cover',
        html: coverMatch[0],
      });
    }
    
    // Extract content - everything after the page break
    const contentMatch = preview.html.match(/<div class="report-content"[\s\S]*$/);
    if (contentMatch) {
      pages.push({
        pageNumber: 2,
        pageType: 'content',
        html: contentMatch[0],
      });
    }
    
    return pages;
  }, [preview?.html]);

  // Calculate fit-to-width zoom
  const calculateFitWidth = useCallback(() => {
    if (!containerRef.current) return 75;
    const containerWidth = containerRef.current.clientWidth - CONTAINER_PADDING * 2;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor((containerWidth / PAGE_WIDTH_PX) * 100)));
  }, []);

  // Calculate fit-to-page zoom
  const calculateFitPage = useCallback(() => {
    if (!containerRef.current) return 50;
    const containerWidth = containerRef.current.clientWidth - CONTAINER_PADDING * 2;
    const containerHeight = containerRef.current.clientHeight - CONTAINER_PADDING * 2;
    
    const widthRatio = containerWidth / PAGE_WIDTH_PX;
    const heightRatio = containerHeight / PAGE_HEIGHT_PX;
    const fitRatio = Math.min(widthRatio, heightRatio);
    
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(fitRatio * 100)));
  }, []);

  // Update zoom when mode changes or container resizes
  useEffect(() => {
    const updateZoom = () => {
      if (zoomMode === "fit-width") {
        setZoomLevel(calculateFitWidth());
      } else if (zoomMode === "fit-page") {
        setZoomLevel(calculateFitPage());
      }
    };

    updateZoom();

    if (containerRef.current && zoomMode !== "manual") {
      const resizeObserver = new ResizeObserver(updateZoom);
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [zoomMode, calculateFitWidth, calculateFitPage]);

  // Scroll to highlighted section
  useEffect(() => {
    if (highlightedSectionId && containerRef.current) {
      const sectionEl = containerRef.current.querySelector(
        `[data-section-id="${highlightedSectionId}"]`
      );
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: "smooth", block: "center" });
        sectionEl.setAttribute("data-section-highlighted", "true");
      }
    }

    return () => {
      if (containerRef.current) {
        const highlighted = containerRef.current.querySelector(
          "[data-section-highlighted='true']"
        );
        if (highlighted) {
          highlighted.removeAttribute("data-section-highlighted");
        }
      }
    };
  }, [highlightedSectionId]);

  // Track which page is in view
  useEffect(() => {
    if (!containerRef.current || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1');
            setActivePage(pageNum);
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    );

    pageRefs.current.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages]);

  const handleZoomIn = () => {
    setZoomMode("manual");
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    } else if (zoomLevel < MAX_ZOOM) {
      const nextLevel = ZOOM_LEVELS.find(l => l > zoomLevel);
      if (nextLevel) setZoomLevel(nextLevel);
    }
  };

  const handleZoomOut = () => {
    setZoomMode("manual");
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    } else if (zoomLevel > MIN_ZOOM) {
      const prevLevel = [...ZOOM_LEVELS].reverse().find(l => l < zoomLevel);
      if (prevLevel) setZoomLevel(prevLevel);
    }
  };

  const handleResetZoom = () => {
    setZoomMode("fit-width");
  };

  const handleFitWidth = () => {
    setZoomMode("fit-width");
  };

  const handleFitPage = () => {
    setZoomMode("fit-page");
  };

  const handlePageClick = (pageNumber: number) => {
    const pageEl = pageRefs.current.get(pageNumber);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(pageNumber);
    }
  };

  // Handle section clicks
  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!onSectionClick) return;

    const target = e.target as HTMLElement;
    const sectionEl = target.closest("[data-section-id]");
    if (sectionEl) {
      const sectionId = sectionEl.getAttribute("data-section-id");
      if (sectionId) {
        onSectionClick(sectionId);
      }
    }
  };

  const scale = zoomLevel / 100;
  const scaledPageWidth = PAGE_WIDTH_PX * scale;
  const scaledPageHeight = PAGE_HEIGHT_PX * scale;
  const scaledGap = PAGE_GAP * scale;

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background/80">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Document Preview</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 bg-muted/40">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Skeleton className="w-[200px] h-[260px] rounded shadow-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground text-sm">
                  Generating...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background/80">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Document Preview</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 bg-muted/40">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">
              Select a template to see preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Compact toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
          </div>
          
          {/* Page indicator pills */}
          <div className="flex items-center gap-1">
            {pages.map((page) => (
              <button
                key={page.pageNumber}
                onClick={() => handlePageClick(page.pageNumber)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  activePage === page.pageNumber
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {page.pageType === 'cover' ? 'Cover' : `Page ${page.pageNumber}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Fit options dropdown */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={zoomMode !== "manual" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      {zoomMode === "fit-width" ? (
                        <><ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Fit</>
                      ) : zoomMode === "fit-page" ? (
                        <><Maximize className="h-3.5 w-3.5 mr-1" /> Page</>
                      ) : (
                        <><Maximize className="h-3.5 w-3.5 mr-1" /> View</>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Fit options</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleFitWidth}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Fit to width
                {zoomMode === "fit-width" && (
                  <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFitPage}>
                <Maximize className="h-4 w-4 mr-2" />
                Fit to page
                {zoomMode === "fit-page" && (
                  <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border mx-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= MIN_ZOOM}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs text-muted-foreground w-10 text-center tabular-nums font-medium">
            {zoomLevel}%
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= MAX_ZOOM}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Preview content - clean document-focused layout */}
      <ScrollArea className="flex-1" ref={containerRef}>
        <div 
          className="min-h-full flex justify-center"
          style={{
            padding: CONTAINER_PADDING,
            background: 'linear-gradient(180deg, hsl(var(--muted) / 0.5) 0%, hsl(var(--muted) / 0.7) 100%)',
          }}
          onClick={handlePreviewClick}
        >
          {/* Pages container - centered flex column */}
          <div 
            className="flex flex-col items-center"
            style={{ gap: `${scaledGap}px` }}
          >
            {pages.map((page) => (
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
                  className="relative bg-white overflow-hidden transition-shadow"
                  style={{
                    width: `${scaledPageWidth}px`,
                    height: `${scaledPageHeight}px`,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)',
                    borderRadius: `${Math.max(1, 2 * scale)}px`,
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {/* Inner content with transform scaling */}
                  <div
                    className="absolute top-0 left-0 origin-top-left"
                    style={{
                      width: `${PAGE_WIDTH_PX}px`,
                      height: `${PAGE_HEIGHT_PX}px`,
                      transform: `scale(${scale})`,
                    }}
                  >
                    <div 
                      className="w-full h-full overflow-hidden report-document"
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: '11pt',
                        lineHeight: 1.6,
                        color: '#1a1a1a',
                        backgroundColor: '#ffffff',
                      }}
                      dangerouslySetInnerHTML={{ __html: page.html }}
                    />
                  </div>
                </div>
                
                {/* Subtle page indicator */}
                <div 
                  className="mt-3 text-center"
                  style={{ 
                    fontSize: `${Math.max(10, 11 * scale)}px`,
                  }}
                >
                  <span className="text-muted-foreground/70 font-medium">
                    {page.pageType === 'cover' ? 'Cover Page' : `Page ${page.pageNumber}`}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Spacer at bottom */}
            <div style={{ height: CONTAINER_PADDING }} />
          </div>
        </div>
      </ScrollArea>

      {/* Minimal footer */}
      <div className="px-4 py-1.5 border-t bg-background/60 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {preview.sectionPreviews.filter((s) => s.isVisible).length} of{" "}
          {preview.sectionPreviews.length} sections visible
        </span>
        <span className="text-muted-foreground/60">
          US Letter • 8.5" × 11"
        </span>
      </div>
    </div>
  );
}
