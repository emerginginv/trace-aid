import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderColorPicker } from "./FolderColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { useConfirmation } from "@/components/ui/confirmation-dialog";

interface AttachmentFolder {
  id: string;
  name: string;
  color: string;
}

interface EditFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: AttachmentFolder | null;
  onFolderUpdated: () => void;
  onFolderDeleted: () => void;
}

export function EditFolderDialog({
  open,
  onOpenChange,
  folder,
  onFolderUpdated,
  onFolderDeleted,
}: EditFolderDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirmation();

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setColor(folder.color);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folder || !name.trim()) {
      toast({
        title: "Error",
        description: "Folder name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("attachment_folders")
        .update({
          name: name.trim(),
          color,
        })
        .eq("id", folder.id);

      if (error) {
        if (error.code === "23505") {
          throw new Error("A folder with this name already exists");
        }
        throw error;
      }

      toast({
        title: "Folder updated",
        description: `"${name}" has been updated`,
      });

      onOpenChange(false);
      onFolderUpdated();
    } catch (error: any) {
      console.error("Error updating folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update folder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!folder) return;

    const confirmed = await confirm({
      title: "Delete Folder",
      description: `Are you sure you want to delete "${folder.name}"? Files inside will be moved to "Unfiled".`,
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("attachment_folders")
        .delete()
        .eq("id", folder.id);

      if (error) throw error;

      toast({
        title: "Folder deleted",
        description: `"${folder.name}" has been deleted`,
      });

      onOpenChange(false);
      onFolderDeleted();
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                autoFocus
              />
            </div>
            
            <FolderColorPicker value={color} onChange={setColor} />
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="sm:mr-auto"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || deleting}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
