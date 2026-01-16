import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig } from "@/types/case-request-form-config";
import { ArrowLeft, Upload, File, X, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupportingFilesStepProps {
  fieldConfig: CaseRequestFormConfig;
  files: FileData[];
  requestId: string | null;
  onAddFiles: (files: FileData[]) => void;
  onUpdateFile: (id: string, updates: Partial<FileData>) => void;
  onRemoveFile: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function SupportingFilesStep({
  fieldConfig,
  files,
  requestId,
  onAddFiles,
  onUpdateFile,
  onRemoveFile,
  onContinue,
  onBack,
  onSkip,
}: SupportingFilesStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const maxFileSize = fieldConfig.supportingFiles.maxFileSize || 1073741824; // 1GB default
  const allowedTypes = fieldConfig.supportingFiles.allowedFileTypes || ['*'];

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
    const droppedFiles = Array.from(e.dataTransfer.files);
    addNewFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addNewFiles(selectedFiles);
    e.target.value = ''; // Reset input
  }, []);

  const addNewFiles = (newFiles: File[]) => {
    const fileDataList: FileData[] = newFiles
      .filter(file => {
        if (file.size > maxFileSize) {
          toast.error(`${file.name} exceeds maximum file size of ${formatBytes(maxFileSize)}`);
          return false;
        }
        if (allowedTypes[0] !== '*' && !allowedTypes.includes(file.type)) {
          toast.error(`${file.name} is not an allowed file type`);
          return false;
        }
        return true;
      })
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending' as const,
        progress: 0,
      }));

    if (fileDataList.length > 0) {
      onAddFiles(fileDataList);
    }
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      onContinue();
      return;
    }

    setIsUploading(true);

    for (const fileData of pendingFiles) {
      try {
        onUpdateFile(fileData.id, { status: 'uploading', progress: 0 });

        const fileExt = fileData.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `uploads/${requestId || 'draft'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('case-request-files')
          .upload(filePath, fileData.file);

        if (uploadError) throw uploadError;

        onUpdateFile(fileData.id, {
          status: 'uploaded',
          progress: 100,
          storage_path: filePath,
        });
      } catch (error) {
        console.error('Upload error:', error);
        onUpdateFile(fileData.id, {
          status: 'error',
          error: 'Failed to upload file',
        });
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

  const getStatusIcon = (status: FileData['status']) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'uploaded':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const uploadedCount = files.filter(f => f.status === 'uploaded').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Supporting Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Drag and drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click the button below to select files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: {formatBytes(maxFileSize)}
            </p>
            
            <div className="mt-4">
              <label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault();
                    (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{files.length} file(s) selected</span>
                <span>{uploadedCount} uploaded, {pendingCount} pending</span>
              </div>
              
              <div className="border rounded-lg divide-y">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-3 hover:bg-muted/50"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(file.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-destructive">{file.error}</p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFile(file.id)}
                      disabled={file.status === 'uploading'}
                    >
                      {file.status === 'uploaded' ? (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isUploading}
          >
            Skip this step
          </Button>
          <Button
            onClick={uploadFiles}
            size="lg"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : pendingCount > 0 ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Add formatBytes utility if not already available
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
