import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Plus, SkipForward, Upload, X, FileText, Image, Video, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WizardNavigation } from "../WizardNavigation";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface Step5Props {
  caseId: string;
  organizationId: string;
  onBack: () => void;
  onContinue: (count: number) => void;
}

function sanitizeFileName(fileName: string): string {
  // Replace spaces and special characters with underscores for storage path
  return fileName
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove other special characters
    .replace(/_+/g, '_');            // Collapse multiple underscores
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />;
  if (fileType.includes("pdf")) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

export function Step5Attachments({ caseId, organizationId, onBack, onContinue }: Step5Props) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchAttachments();
  }, [caseId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("case_attachments")
        .select("id, file_name, file_type, file_size")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setPendingFiles(prev => [...prev, ...fileArray]);
    setHasStarted(true);
  };

  const handleClearPending = () => {
    setPendingFiles([]);
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadPending = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: pendingFiles.length });

    const results = { succeeded: 0, failed: [] as string[] };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of pendingFiles) {
        try {
          // Extract file extension
          const fileExt = file.name.split('.').pop() || 'bin';
          // Use user.id as first path segment to match RLS policy requirements
          const filePath = `${user.id}/${caseId}/${crypto.randomUUID()}.${fileExt}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("case-attachments")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: insertError } = await supabase.from("case_attachments").insert({
            case_id: caseId,
            organization_id: organizationId,
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
          });

          if (insertError) throw insertError;

          results.succeeded++;
          setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          results.failed.push(file.name);
          setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }

      // Show appropriate toast based on results
      if (results.failed.length === 0) {
        toast.success(`${results.succeeded} file${results.succeeded !== 1 ? "s" : ""} uploaded successfully`);
      } else if (results.succeeded > 0) {
        toast.warning(`${results.succeeded} uploaded, ${results.failed.length} failed: ${results.failed.join(", ")}`);
      } else {
        toast.error(`All uploads failed: ${results.failed.join(", ")}`);
      }

      setPendingFiles([]);
      fetchAttachments();
    } catch (error) {
      console.error("Error during upload:", error);
      toast.error("Upload failed - not authenticated");
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      // Get file path first
      const { data: attachmentData } = await supabase
        .from("case_attachments")
        .select("file_path")
        .eq("id", attachment.id)
        .single();

      if (attachmentData?.file_path) {
        // Delete from storage
        await supabase.storage
          .from("case-attachments")
          .remove([attachmentData.file_path]);
      }

      // Delete record
      const { error } = await supabase
        .from("case_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;
      
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast.success("Attachment removed");
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Failed to remove attachment");
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }, []);

  const handleContinue = () => {
    onContinue(attachments.length);
  };

  if (!hasStarted && attachments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Paperclip className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Would you like to add any attachments?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Upload documents, images, videos, or other files relevant to this case.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setHasStarted(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Attachments
            </Button>
            <Button variant="outline" onClick={handleContinue} className="gap-2">
              <SkipForward className="h-4 w-4" />
              Skip for Now
            </Button>
          </div>
        </div>

        <WizardNavigation
          currentStep={5}
          onBack={onBack}
          onContinue={handleContinue}
          canContinue={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Upload Attachments</h3>
        <p className="text-sm text-muted-foreground">
          Add documents, images, or other files to your case.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here, or
        </p>
        <label>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" disabled={isUploading} asChild>
            <span className="cursor-pointer">Browse Files</span>
          </Button>
        </label>
      </div>

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {isUploading 
                ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`
                : `${pendingFiles.length} file${pendingFiles.length !== 1 ? "s" : ""} ready to upload`
              }
            </p>
            {!isUploading && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUploadPending} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload {pendingFiles.length} File{pendingFiles.length !== 1 ? "s" : ""}
                </Button>
                <Button size="sm" variant="outline" onClick={handleClearPending}>
                  Clear
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            {pendingFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="text-muted-foreground shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePendingFile(index)}
                    className="h-6 w-6 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Uploaded Files ({attachments.length})
          </p>
          {attachments.map(attachment => (
            <Card key={attachment.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-muted-foreground shrink-0">
                    {getFileIcon(attachment.file_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAttachment(attachment)}
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WizardNavigation
        currentStep={5}
        onBack={onBack}
        onContinue={handleContinue}
        canContinue={true}
      />
    </div>
  );
}
