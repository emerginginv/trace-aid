import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, FileText, Image, FileVideo, File, X, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface CaseAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  user_id: string;
  uploader_name?: string;
}

interface AttachmentPickerProps {
  caseId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  excludeIds?: string[];
  organizationId?: string;
  showUploadOption?: boolean;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (fileType.startsWith("video/")) return <FileVideo className="h-4 w-4 text-purple-500" />;
  if (fileType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentPicker = ({
  caseId,
  selectedIds,
  onSelectionChange,
  excludeIds = [],
  organizationId,
  showUploadOption = false,
}: AttachmentPickerProps) => {
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [caseId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("case_attachments")
        .select(`
          id, 
          file_name, 
          file_type, 
          file_size, 
          created_at, 
          user_id,
          profiles!case_attachments_user_id_fkey(full_name, email)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const attachmentsWithUploader = (data || []).map((a: any) => ({
        id: a.id,
        file_name: a.file_name,
        file_type: a.file_type,
        file_size: a.file_size,
        created_at: a.created_at,
        user_id: a.user_id,
        uploader_name: a.profiles?.full_name || a.profiles?.email || "Unknown",
      }));
      
      setAttachments(attachmentsWithUploader);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const file = files[0];
      
      // Step 1: Compute SHA-256 hash for deduplication
      const { computeFileHash } = await import("@/lib/fileHash");
      const fileHash = await computeFileHash(file);
      
      // Step 2: Check for existing attachment with same hash in this case
      const { data: existingAttachment } = await supabase
        .from("case_attachments")
        .select("id, file_name")
        .eq("case_id", caseId)
        .eq("file_hash", fileHash)
        .limit(1)
        .maybeSingle();
      
      if (existingAttachment) {
        // Duplicate found - notify user and auto-select the existing attachment
        toast({
          title: "Duplicate file detected",
          description: `"${file.name}" matches existing file "${existingAttachment.file_name}". Linking existing file instead.`,
        });
        
        // Auto-select the existing attachment for linking
        if (!selectedIds.includes(existingAttachment.id)) {
          onSelectionChange([...selectedIds, existingAttachment.id]);
        }
        
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      // Step 3: No duplicate - proceed with upload
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${caseId}/${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("case-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create case_attachments record with file_hash
      const { data: newAttachment, error: insertError } = await supabase
        .from("case_attachments")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          file_hash: fileHash,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded and linked.`,
      });

      // Refresh attachments list and auto-select the new one
      await fetchAttachments();
      if (newAttachment) {
        onSelectionChange([...selectedIds, newAttachment.id]);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const availableAttachments = attachments.filter(
    (a) => !excludeIds.includes(a.id)
  );

  const filteredAttachments = availableAttachments.filter((a) =>
    a.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const removeSelection = (id: string) => {
    onSelectionChange(selectedIds.filter((i) => i !== id));
  };

  const selectedAttachments = attachments.filter((a) =>
    selectedIds.includes(a.id)
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Loading attachments...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected attachments as chips */}
      {selectedAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAttachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
            >
              {getFileIcon(a.file_type)}
              <span className="truncate max-w-[150px]">{a.file_name}</span>
              <button
                type="button"
                onClick={() => removeSelection(a.id)}
                className="ml-1 hover:bg-primary/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search and list */}
      <div className="border rounded-md">
        <div className="p-2 border-b flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search attachments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          {showUploadOption && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </>
                )}
              </Button>
            </>
          )}
        </div>
        <ScrollArea className="h-[200px]">
          {filteredAttachments.length === 0 && availableAttachments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No case attachments available.
              {showUploadOption && (
                <span className="block text-xs mt-1">
                  Use the Upload button to add files.
                </span>
              )}
            </div>
          ) : filteredAttachments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No attachments match your search
            </div>
          ) : (
            <div className="p-1">
              {filteredAttachments.map((attachment) => (
                <label
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.includes(attachment.id)}
                    onCheckedChange={() => toggleSelection(attachment.id)}
                  />
                  {getFileIcon(attachment.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), "MMM d, yyyy")} • {attachment.uploader_name}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

// Dialog version for use in expanded rows
interface AttachmentPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  updateId: string;
  organizationId: string;
  existingLinkIds: string[];
  onSuccess: () => void;
}

export const AttachmentPickerDialog = ({
  open,
  onOpenChange,
  caseId,
  updateId,
  organizationId,
  existingLinkIds,
  onSuccess,
}: AttachmentPickerDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
    }
  }, [open]);

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const links = selectedIds.map((attachmentId) => ({
        update_id: updateId,
        attachment_id: attachmentId,
        organization_id: organizationId,
        linked_by_user_id: user.id,
      }));

      const { error } = await supabase
        .from("update_attachment_links")
        .insert(links);

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error linking attachments:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Case Attachments</DialogTitle>
        </DialogHeader>
        <AttachmentPicker
          caseId={caseId}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          excludeIds={existingLinkIds}
          organizationId={organizationId}
          showUploadOption={true}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedIds.length === 0}>
            {saving ? "Linking..." : `Link ${selectedIds.length} Attachment${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};