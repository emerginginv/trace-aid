import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, FileText, X, AlertCircle, CheckCircle2, 
  FileJson, FileCode, File, ArrowRight, Loader2, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIUploadedFile } from "@/lib/aiImportTypes";
import { detectFileType, parseFile } from "@/lib/aiImportParser";

interface AIImportUploaderProps {
  files: AIUploadedFile[];
  onFilesChange: (files: AIUploadedFile[]) => void;
  onContinue: () => void;
}

const FILE_ICONS: Record<AIUploadedFile['type'], React.ReactNode> = {
  csv: <FileText className="h-5 w-5 text-green-500" />,
  json: <FileJson className="h-5 w-5 text-blue-500" />,
  txt: <File className="h-5 w-5 text-gray-500" />,
  css: <FileCode className="h-5 w-5 text-purple-500" />,
  unknown: <File className="h-5 w-5 text-muted-foreground" />,
};

export function AIImportUploader({ files, onFilesChange, onContinue }: AIImportUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    setIsProcessing(true);
    const newFiles: AIUploadedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const id = `${file.name}-${Date.now()}-${i}`;
      const fileType = detectFileType(file);
      
      // Skip unsupported files silently
      if (fileType === 'unknown') continue;
      
      const uploadedFile: AIUploadedFile = {
        id,
        file,
        name: file.name,
        type: fileType,
        size: file.size,
        content: '',
        status: 'parsing',
      };
      
      newFiles.push(uploadedFile);
    }
    
    // Add files immediately as "parsing"
    const updatedFiles = [...files, ...newFiles];
    onFilesChange(updatedFiles);
    
    // Parse each file
    let currentFiles = updatedFiles;
    for (const uploadedFile of newFiles) {
      const parseResult = await parseFile(uploadedFile.file);
      
      currentFiles = currentFiles.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, ...parseResult, content: parseResult.status === 'error' ? '' : (f.content || '') }
          : f
      );
      onFilesChange(currentFiles);
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsProcessing(false);
  }, [files, onFilesChange]);

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
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = useCallback((id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  }, [files, onFilesChange]);

  const parsedFiles = files.filter(f => f.status === 'parsed');
  const errorFiles = files.filter(f => f.status === 'error');
  const hasDataFiles = parsedFiles.some(f => f.type === 'csv' || f.type === 'json');
  const canContinue = hasDataFiles && !isProcessing;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.01]" 
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-16">
          {isProcessing ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Processing files...</p>
            </>
          ) : (
            <>
              <Upload className={cn(
                "h-12 w-12 mb-4 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-lg font-medium mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Upload CSV, JSON, TXT, or CSS files from your legacy system
              </p>
              <div className="flex gap-2 mt-4">
                <Badge variant="secondary">CSV</Badge>
                <Badge variant="secondary">JSON</Badge>
                <Badge variant="secondary">TXT</Badge>
                <Badge variant="outline">CSS (metadata only)</Badge>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt,.css,.md"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Uploaded Files</CardTitle>
                <CardDescription>
                  {parsedFiles.length} file(s) ready for analysis
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onFilesChange([])}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      file.status === 'error' 
                        ? "bg-destructive/5 border-destructive/20" 
                        : "bg-muted/30"
                    )}
                  >
                    <div className="shrink-0">
                      {file.status === 'parsing' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : file.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        FILE_ICONS[file.type]
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{file.name}</p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {file.type.toUpperCase()}
                        </Badge>
                        {file.type === 'css' && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Metadata Only
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        {file.preview?.rowCount !== undefined && (
                          <span>{file.preview.rowCount} rows</span>
                        )}
                        {file.preview?.headers && (
                          <span>{file.preview.headers.length} columns</span>
                        )}
                        {file.status === 'error' && (
                          <span className="text-destructive">{file.error}</span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* CSS Warning */}
      {files.some(f => f.type === 'css') && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            CSS files are analyzed for documentation purposes only. 
            <strong> Styles will NOT be applied to CaseWyze.</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Supported Formats Help */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <h4 className="font-medium mb-3">Supported Import Formats</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">CSV</p>
                <p className="text-xs text-muted-foreground">Primary data format</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileJson className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">JSON</p>
                <p className="text-xs text-muted-foreground">Structured exports</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <File className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">TXT/MD</p>
                <p className="text-xs text-muted-foreground">Documentation</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileCode className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">CSS</p>
                <p className="text-xs text-muted-foreground">Metadata only</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          onClick={onContinue} 
          disabled={!canContinue}
          size="lg"
        >
          Analyze with AI
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
