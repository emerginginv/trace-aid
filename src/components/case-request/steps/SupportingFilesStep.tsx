import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  CloudUpload,
  ArrowLeft,
  ArrowRight,
  SkipForward
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig } from "@/types/case-request-form-config";

interface SupportingFilesStepProps {
  fieldConfig: CaseRequestFormConfig;
  files: FileData[];
  requestId: string | null;
  organizationId: string;
  onAddFiles: (files: FileData[]) => void;
  onUpdateFile: (id: string, updates: Partial<FileData>) => void;
  onRemoveFile: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
};

export function SupportingFilesStep({
  fieldConfig,
  files,
  requestId,
  organizationId,
  onAddFiles,
  onUpdateFile,
  onRemoveFile,
  onContinue,
  onBack,
  onSkip,
}: SupportingFilesStepProps) {
  const [isUploading, setIsUploading] = useState(false);

  const maxFileSize = fieldConfig.supportingFiles?.maxFileSize || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = fieldConfig.supportingFiles?.allowedFileTypes || ["*"];

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach((rejection) => {
      const errors = rejection.errors.map((e: any) => e.message).join(", ");
      toast.error(`${rejection.file.name}: ${errors}`);
    });

    // Filter and add accepted files
    const newFiles: FileData[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: "pending" as const,
      progress: 0,
      file,
    }));

    if (newFiles.length > 0) {
      onAddFiles(newFiles);
      toast.success(`Added ${newFiles.length} file(s)`);
    }
  }, [onAddFiles]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
    accept: allowedTypes[0] === "*" ? undefined : 
      Object.fromEntries(allowedTypes.map((t) => [t, []])),
    multiple: true,
    disabled: isUploading,
  });

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      onContinue();
      return;
    }

    setIsUploading(true);

    for (const fileData of pendingFiles) {
      if (!fileData.file) continue;

      try {
        onUpdateFile(fileData.id, { status: "uploading", progress: 0 });

        const fileExt = fileData.name.split(".").pop() || "bin";
        const storagePath = `${organizationId}/${requestId || "draft"}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("case-request-files")
          .upload(storagePath, fileData.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        onUpdateFile(fileData.id, {
          status: "uploaded",
          progress: 100,
          storage_path: storagePath,
        });
      } catch (error: any) {
        console.error("Upload error:", error);
        onUpdateFile(fileData.id, {
          status: "error",
          error: error.message || "Upload failed",
        });
        toast.error(`Failed to upload ${fileData.name}`);
      }
    }

    setIsUploading(false);

    const hasErrors = files.some(f => f.status === 'error');
    if (hasErrors) {
      toast.error('Some files failed to upload. Please try again.');
    } else {
      toast.success('All files uploaded successfully');
      onContinue();
    }
  };

  const getStatusBadge = (file: FileData) => {
    switch (file.status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "uploading":
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        );
      case "uploaded":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Uploaded
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const hasFiles = files.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Supporting Files
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload any supporting documents, photos, or files for this case request.
          Maximum file size: {formatBytes(maxFileSize)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragActive && !isDragReject ? "border-primary bg-primary/5" : ""}
            ${isDragReject ? "border-destructive bg-destructive/5" : ""}
            ${!isDragActive && !isDragReject ? "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50" : ""}
            ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          <CloudUpload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
          {isDragReject ? (
            <p className="text-destructive font-medium">Some files are not allowed</p>
          ) : isDragActive ? (
            <p className="text-primary font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-muted-foreground mb-2">
                Drag and drop files here, or click to select files
              </p>
              <Button type="button" variant="outline" size="sm" disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                Add Files
              </Button>
            </>
          )}
        </div>

        {/* File List Table */}
        {hasFiles && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-24">Size</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">
                          {file.name}
                        </span>
                      </div>
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                      {file.status === "error" && file.error && (
                        <p className="text-xs text-destructive mt-1">{file.error}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBytes(file.size)}
                    </TableCell>
                    <TableCell>{getStatusBadge(file)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveFile(file.id)}
                        disabled={isUploading && file.status === "uploading"}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {!hasFiles && (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                className="text-muted-foreground"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip this step
              </Button>
            )}
            <Button
              type="button"
              onClick={uploadFiles}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : pendingCount > 0 ? (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount} File{pendingCount !== 1 ? "s" : ""} & Continue
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
