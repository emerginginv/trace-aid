import { useState, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw, FileText, Eye } from "lucide-react";
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

export function ReportPreviewPanel({
  preview,
  isLoading = false,
  highlightedSectionId,
  onSectionClick,
  className,
}: ReportPreviewPanelProps) {
  const [zoomLevel, setZoomLevel] = useState(75);
  const previewRef = useRef<HTMLDivElement>(null);

  // Scroll to highlighted section
  useEffect(() => {
    if (highlightedSectionId && previewRef.current) {
      const sectionEl = previewRef.current.querySelector(
        `[data-section-id="${highlightedSectionId}"]`
      );
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add highlight attribute
        sectionEl.setAttribute("data-section-highlighted", "true");
      }
    }

    // Cleanup previous highlight
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
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(75);
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  disabled={zoomLevel === ZOOM_LEVELS[0]}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs text-muted-foreground w-10 text-center">
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
                  disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleResetZoom}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset zoom</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Preview content */}
      <ScrollArea className="flex-1">
        <div className="p-4 bg-muted/20 min-h-full">
          <div
            ref={previewRef}
            className="bg-background shadow-lg rounded-lg mx-auto overflow-hidden transition-all duration-200"
            style={{
              width: `${8.5 * (zoomLevel / 100) * 96}px`, // 8.5" at 96dpi
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
