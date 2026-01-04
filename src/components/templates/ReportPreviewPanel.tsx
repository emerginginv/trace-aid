import { useState, useEffect, useRef, useCallback } from "react";
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

const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const PAGE_WIDTH_INCHES = 8.5;
const PAGE_HEIGHT_INCHES = 11;
const DPI = 96;

type ZoomMode = "manual" | "fit-width" | "fit-page";

export function ReportPreviewPanel({
  preview,
  isLoading = false,
  highlightedSectionId,
  onSectionClick,
  className,
}: ReportPreviewPanelProps) {
  const [zoomLevel, setZoomLevel] = useState(75);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("manual");
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate fit-to-width zoom
  const calculateFitWidth = useCallback(() => {
    if (!containerRef.current) return 75;
    const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
    const pageWidth = PAGE_WIDTH_INCHES * DPI;
    return Math.min(150, Math.max(50, Math.floor((containerWidth / pageWidth) * 100)));
  }, []);

  // Calculate fit-to-page zoom
  const calculateFitPage = useCallback(() => {
    if (!containerRef.current) return 75;
    const containerWidth = containerRef.current.clientWidth - 32;
    const containerHeight = containerRef.current.clientHeight - 32;
    const pageWidth = PAGE_WIDTH_INCHES * DPI;
    const pageHeight = PAGE_HEIGHT_INCHES * DPI;
    
    const widthRatio = containerWidth / pageWidth;
    const heightRatio = containerHeight / pageHeight;
    const fitRatio = Math.min(widthRatio, heightRatio);
    
    return Math.min(150, Math.max(50, Math.floor(fitRatio * 100)));
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

    // Add resize observer for responsive fit modes
    if (containerRef.current && zoomMode !== "manual") {
      const resizeObserver = new ResizeObserver(updateZoom);
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [zoomMode, calculateFitWidth, calculateFitPage]);

  // Scroll to highlighted section
  useEffect(() => {
    if (highlightedSectionId && previewRef.current) {
      const sectionEl = previewRef.current.querySelector(
        `[data-section-id="${highlightedSectionId}"]`
      );
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: "smooth", block: "center" });
        sectionEl.setAttribute("data-section-highlighted", "true");
      }
    }

    return () => {
      if (previewRef.current) {
        const highlighted = previewRef.current.querySelector(
          "[data-section-highlighted='true']"
        );
        if (highlighted) {
          highlighted.removeAttribute("data-section-highlighted");
        }
      }
    };
  }, [highlightedSectionId]);

  const handleZoomIn = () => {
    setZoomMode("manual");
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    } else if (zoomLevel < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]) {
      // Handle non-standard zoom levels from fit modes
      const nextLevel = ZOOM_LEVELS.find(l => l > zoomLevel);
      if (nextLevel) setZoomLevel(nextLevel);
    }
  };

  const handleZoomOut = () => {
    setZoomMode("manual");
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    } else if (zoomLevel > ZOOM_LEVELS[0]) {
      // Handle non-standard zoom levels from fit modes
      const prevLevel = [...ZOOM_LEVELS].reverse().find(l => l < zoomLevel);
      if (prevLevel) setZoomLevel(prevLevel);
    }
  };

  const handleResetZoom = () => {
    setZoomMode("manual");
    setZoomLevel(75);
  };

  const handleFitWidth = () => {
    setZoomMode("fit-width");
  };

  const handleFitPage = () => {
    setZoomMode("fit-page");
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

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
          </div>
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="w-full h-[300px] rounded-lg" />
          <Skeleton className="w-3/4 h-4 mt-4" />
          <Skeleton className="w-1/2 h-4 mt-2" />
          <Skeleton className="w-full h-[200px] mt-4 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
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
      {/* Header with zoom controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Preview</span>
          <Badge variant="outline" className="text-xs">
            ~{preview.estimatedPages} page{preview.estimatedPages !== 1 ? "s" : ""}
          </Badge>
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
                      size="icon"
                      className="h-7 w-7"
                    >
                      {zoomMode === "fit-width" ? (
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      ) : zoomMode === "fit-page" ? (
                        <Maximize className="h-3.5 w-3.5" />
                      ) : (
                        <Maximize className="h-3.5 w-3.5" />
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
                Reset to 75%
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
                  disabled={zoomLevel <= ZOOM_LEVELS[0]}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
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
                  disabled={zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Preview content */}
      <ScrollArea className="flex-1" ref={containerRef}>
        <div className="p-4 bg-muted/20 min-h-full">
          <div
            ref={previewRef}
            className="bg-background shadow-lg rounded-lg mx-auto overflow-hidden transition-all duration-200"
            style={{
              width: `${PAGE_WIDTH_INCHES * (zoomLevel / 100) * DPI}px`,
              transformOrigin: "top center",
            }}
            onClick={handlePreviewClick}
          >
            <div
              className="report-preview-content"
              dangerouslySetInnerHTML={{ __html: preview.html }}
              style={{
                fontSize: `${zoomLevel}%`,
              }}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Section count footer */}
      <div className="px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
        {preview.sectionPreviews.filter((s) => s.isVisible).length} of{" "}
        {preview.sectionPreviews.length} sections visible
      </div>
    </div>
  );
}
