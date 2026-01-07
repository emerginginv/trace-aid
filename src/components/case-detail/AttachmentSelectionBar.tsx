import { Button } from "@/components/ui/button";
import { X, Share2, Mail, ShieldOff, FolderInput } from "lucide-react";

interface AttachmentSelectionBarProps {
  selectedCount: number;
  hasSharedSelected: boolean;
  canEditAttachments: boolean;
  onGenerateLinks: () => void;
  onEmailAttachments: () => void;
  onRevokeAccess: () => void;
  onClearSelection: () => void;
  onMoveToFolder?: () => void;
}

export function AttachmentSelectionBar({
  selectedCount,
  hasSharedSelected,
  canEditAttachments,
  onGenerateLinks,
  onEmailAttachments,
  onRevokeAccess,
  onClearSelection,
  onMoveToFolder,
}: AttachmentSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg p-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {selectedCount} selected
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {canEditAttachments && (
            <>
              {onMoveToFolder && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onMoveToFolder}
                  className="gap-1.5"
                >
                  <FolderInput className="h-4 w-4" />
                  <span className="hidden sm:inline">Move to Folder</span>
                  <span className="sm:hidden">Move</span>
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="sm"
                onClick={onGenerateLinks}
                className="gap-1.5"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Share Links</span>
                <span className="sm:hidden">Share</span>
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={onEmailAttachments}
                className="gap-1.5"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email Attachments</span>
                <span className="sm:hidden">Email</span>
              </Button>
              
              {hasSharedSelected && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRevokeAccess}
                  className="gap-1.5"
                >
                  <ShieldOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Revoke Access</span>
                  <span className="sm:hidden">Revoke</span>
                </Button>
              )}
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
