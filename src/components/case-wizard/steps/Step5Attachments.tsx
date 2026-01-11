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

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of fileArray) {
        const filePath = `${organizationId}/${caseId}/${Date.now()}_${file.name}`;

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
      }

      toast.success(`${fileArray.length} file${fileArray.length !== 1 ? "s" : ""} uploaded`);
      fetchAttachments();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
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
      handleFileUpload(e.dataTransfer.files);
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
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" disabled={isUploading} asChild>
            <span className="cursor-pointer">
              {isUploading ? "Uploading..." : "Browse Files"}
            </span>
          </Button>
        </label>
      </div>

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
