import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Image, FileIcon, Download, Trash2, Eye, Pencil, X } from "lucide-react";
import { format } from "date-fns";

interface SubjectAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  name: string | null;
  description: string | null;
  tags: string[] | null;
  created_at: string;
}

interface UploadingFile {
  name: string;
  preview: string;
  status: "uploading" | "complete" | "error";
  error?: string;
}

interface SubjectAttachmentsProps {
  subjectId: string;
  subjectName: string;
}

export const SubjectAttachments = ({ subjectId, subjectName }: SubjectAttachmentsProps) => {
  const [attachments, setAttachments] = useState<SubjectAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingAttachment, setEditingAttachment] = useState<SubjectAttachment | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", tags: "" });

  useEffect(() => {
    fetchAttachments();
  }, [subjectId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("subject_attachments")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files: FileList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }

    const fileArray = Array.from(files);
    const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
      name: file.name,
      preview: URL.createObjectURL(file),
      status: "uploading",
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${subjectId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("subject-attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("subject_attachments").insert({
          subject_id: subjectId,
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          name: file.name,
        });

        if (dbError) throw dbError;

        setUploadingFiles((prev) =>
          prev.map((uf, idx) =>
            idx === i + (prev.length - fileArray.length)
              ? { ...uf, status: "complete" }
              : uf
          )
        );
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles((prev) =>
          prev.map((uf, idx) =>
            idx === i + (prev.length - fileArray.length)
              ? { ...uf, status: "error", error: "Upload failed" }
              : uf
          )
        );
      }
    }

    setTimeout(() => {
      setUploadingFiles([]);
      fetchAttachments();
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handlePreview = async (attachment: SubjectAttachment) => {
    try {
      const { data } = await supabase.storage
        .from("subject-attachments")
        .createSignedUrl(attachment.file_path, 3600);

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    } catch (error) {
      console.error("Error creating preview:", error);
      toast({ title: "Error", description: "Failed to preview file", variant: "destructive" });
    }
  };

  const handleDownload = async (attachment: SubjectAttachment) => {
    try {
      const { data } = await supabase.storage
        .from("subject-attachments")
        .createSignedUrl(attachment.file_path, 60);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  const handleDelete = async (attachment: SubjectAttachment) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("subject-attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("subject_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Attachment deleted successfully" });
      fetchAttachments();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({ title: "Error", description: "Failed to delete attachment", variant: "destructive" });
    }
  };

  const handleEdit = (attachment: SubjectAttachment) => {
    setEditingAttachment(attachment);
    setEditForm({
      name: attachment.name || attachment.file_name,
      description: attachment.description || "",
      tags: attachment.tags?.join(", ") || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAttachment) return;

    try {
      const { error } = await supabase
        .from("subject_attachments")
        .update({
          name: editForm.name,
          description: editForm.description,
          tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        })
        .eq("id", editingAttachment.id);

      if (error) throw error;

      toast({ title: "Success", description: "Attachment updated successfully" });
      setEditingAttachment(null);
      fetchAttachments();
    } catch (error) {
      console.error("Error updating attachment:", error);
      toast({ title: "Error", description: "Failed to update attachment", variant: "destructive" });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (fileType === "application/pdf") return <FileText className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading attachments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">📎 Subject Attachments</h3>
        <label htmlFor={`file-upload-${subjectId}`}>
          <Button size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </span>
          </Button>
          <Input
            id={`file-upload-${subjectId}`}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />
        </label>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or click Upload File button
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports images, PDFs, and documents
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              {file.preview && file.preview.startsWith("blob:") && (
                <img src={file.preview} className="h-10 w-10 object-cover rounded" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.status === "uploading" && "Uploading..."}
                  {file.status === "complete" && "✓ Uploaded"}
                  {file.status === "error" && `✗ ${file.error}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && uploadingFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No attachments yet. Upload files to get started.
        </p>
      ) : (
        <div className="grid gap-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
              <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(attachment.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.name || attachment.file_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(attachment.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                {attachment.description && (
                  <p className="text-xs text-muted-foreground mt-1">{attachment.description}</p>
                )}
                {attachment.tags && attachment.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {attachment.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {attachment.file_type.startsWith("image/") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePreview(attachment)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(attachment)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(attachment)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(attachment)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAttachment} onOpenChange={() => setEditingAttachment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Attachment name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma separated)</label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="e.g., ID, Registration"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingAttachment(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
