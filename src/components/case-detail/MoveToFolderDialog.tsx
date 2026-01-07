import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Folder, FileQuestion, FolderPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AttachmentFolder {
  id: string;
  name: string;
  color: string;
}

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachmentIds: string[];
  folders: AttachmentFolder[];
  onMoveComplete: () => void;
  onCreateFolder: () => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  attachmentIds,
  folders,
  onMoveComplete,
  onCreateFolder,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    if (attachmentIds.length === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("case_attachments")
        .update({ folder_id: selectedFolderId })
        .in("id", attachmentIds);

      if (error) throw error;

      const destination = selectedFolderId === null
        ? "Unfiled"
        : folders.find((f) => f.id === selectedFolderId)?.name || "folder";

      toast({
        title: "Files moved",
        description: `${attachmentIds.length} file${attachmentIds.length !== 1 ? "s" : ""} moved to ${destination}`,
      });

      onOpenChange(false);
      onMoveComplete();
    } catch (error: any) {
      console.error("Error moving files:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to move files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndClose = () => {
    onOpenChange(false);
    onCreateFolder();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {attachmentIds.length} file{attachmentIds.length !== 1 ? "s" : ""} to folder
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1 pr-4">
            {/* Unfiled option */}
            <button
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                selectedFolderId === null
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <FileQuestion className="h-5 w-5 shrink-0" />
              <span className="font-medium">Remove from folder (Unfiled)</span>
            </button>

            {folders.length > 0 && (
              <div className="border-t my-2" />
            )}

            {/* Folder options */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                  selectedFolderId === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: folder.color }}
                />
                <Folder
                  className="h-5 w-5 shrink-0"
                  style={{ color: selectedFolderId === folder.id ? "currentColor" : folder.color }}
                />
                <span className="font-medium truncate">{folder.name}</span>
              </button>
            ))}

            {/* Create new folder */}
            <button
              onClick={handleCreateAndClose}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left hover:bg-accent text-muted-foreground"
            >
              <FolderPlus className="h-5 w-5 shrink-0" />
              <span>Create new folder...</span>
            </button>
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
