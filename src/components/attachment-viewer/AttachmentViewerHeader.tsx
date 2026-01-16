import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  name?: string | null;
}

interface AttachmentViewerHeaderProps {
  attachment: Attachment;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentViewerHeader({
  attachment,
  currentIndex,
  totalCount,
  onClose,
  onPrevious,
  onNext,
  onDownload,
  hasPrevious,
  hasNext,
}: AttachmentViewerHeaderProps) {
  const displayName = attachment.name || attachment.file_name;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background border-b">
      {/* Left: Back and Navigation */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close (Esc)</TooltipContent>
        </Tooltip>

        {totalCount > 1 && (
          <div className="flex items-center gap-1 ml-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous (←)</TooltipContent>
            </Tooltip>

            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {currentIndex + 1} of {totalCount}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next (→)</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Center: File Info */}
      <div className="flex-1 min-w-0 text-center">
        <h1 className="text-sm font-medium truncate" title={displayName}>
          {displayName}
        </h1>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download file</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
