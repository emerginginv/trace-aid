import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, FileText, X, AlertCircle, CheckCircle2, 
  ArrowUp, ArrowDown, Download 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedCSV, parseCSVFile, detectEntityType, getEntityDisplayName, IMPORT_ORDER } from "@/lib/csvParser";

interface FileUploaderProps {
  onFilesValidated: (files: ParsedCSV[]) => void;
  importType: 'new_migration' | 'incremental';
}

interface UploadedFile {
  file: File;
  parsed: ParsedCSV | null;
  status: 'pending' | 'parsing' | 'valid' | 'invalid';
  entityType: string | null;
}

export function FileUploader({ onFilesValidated, importType }: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Only accept CSV files
      if (!file.name.toLowerCase().endsWith('.csv')) {
        continue;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }
      
      const entityType = detectEntityType(file.name);
      
      newFiles.push({
        file,
        parsed: null,
        status: 'pending',
        entityType
      });
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Parse files
    for (const uploadedFile of newFiles) {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.file === uploadedFile.file 
            ? { ...f, status: 'parsing' as const }
            : f
        )
      );
      
      try {
        const parsed = await parseCSVFile(uploadedFile.file);
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === uploadedFile.file 
              ? { 
                  ...f, 
                  parsed,
                  status: parsed.errors.length > 0 ? 'invalid' as const : 'valid' as const,
                  entityType: parsed.entityType
                }
              : f
          )
        );
      } catch {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === uploadedFile.file 
              ? { ...f, status: 'invalid' as const }
              : f
          )
        );
      }
    }
  }, []);
  
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
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);
  
  const removeFile = useCallback((file: File) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== file));
  }, []);
  
  const sortedFiles = [...uploadedFiles].sort((a, b) => {
    const orderA = a.entityType ? IMPORT_ORDER.indexOf(a.entityType) : 999;
    const orderB = b.entityType ? IMPORT_ORDER.indexOf(b.entityType) : 999;
    return orderA - orderB;
  });
  
  const validFiles = uploadedFiles.filter(f => f.status === 'valid' && f.parsed);
  const hasErrors = uploadedFiles.some(f => f.status === 'invalid');
  const allParsed = uploadedFiles.length > 0 && uploadedFiles.every(f => f.status === 'valid' || f.status === 'invalid');
  
  const handleContinue = () => {
    const parsedFiles = validFiles.map(f => f.parsed!);
    onFilesValidated(parsedFiles);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Upload Import Files</h2>
        <p className="text-muted-foreground">
          Upload CaseWyze-formatted CSV files. Files will be processed in the correct order.
        </p>
        <Badge variant="outline" className="mt-2">
          {importType === 'new_migration' ? 'New Migration' : 'Incremental Import'}
        </Badge>
      </div>
      
      {/* Drop Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className={cn(
            "h-12 w-12 mb-4 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
          <p className="text-lg font-medium mb-1">
            Drop CSV files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Upload up to 12 CaseWyze template files (max 10MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </CardContent>
      </Card>
      
      {/* File List */}
      {sortedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Uploaded Files ({sortedFiles.length})</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setUploadedFiles([])}
            >
              Clear All
            </Button>
          </div>
          
          <div className="space-y-2">
            {sortedFiles.map((uploadedFile, index) => (
              <Card key={`${uploadedFile.file.name}-${index}`} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {uploadedFile.status === 'parsing' && (
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {uploadedFile.status === 'valid' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {uploadedFile.status === 'invalid' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {uploadedFile.status === 'pending' && (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{uploadedFile.file.name}</p>
                      {uploadedFile.entityType && (
                        <Badge variant="secondary" className="text-xs">
                          {getEntityDisplayName(uploadedFile.entityType)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{(uploadedFile.file.size / 1024).toFixed(1)} KB</span>
                      {uploadedFile.parsed && (
                        <span>{uploadedFile.parsed.rowCount} rows</span>
                      )}
                      {uploadedFile.parsed?.errors.length > 0 && (
                        <span className="text-destructive">
                          {uploadedFile.parsed.errors.length} error(s)
                        </span>
                      )}
                      {uploadedFile.parsed?.warnings.length > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-500">
                          {uploadedFile.parsed.warnings.length} warning(s)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadedFile.file);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Show parsing errors inline */}
                {uploadedFile.parsed?.errors.slice(0, 3).map((error, i) => (
                  <Alert key={i} variant="destructive" className="mt-2 py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {error.row && `Row ${error.row}: `}
                      {error.column && `[${error.column}] `}
                      {error.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Import Order Info */}
      {sortedFiles.length > 0 && (
        <Alert>
          <ArrowDown className="h-4 w-4" />
          <AlertDescription>
            Files will be imported in dependency order: Organization → Clients → Contacts → Cases → Subjects → etc.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Template Downloads */}
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-muted-foreground self-center">Need templates?</span>
        <Button variant="link" size="sm" asChild className="h-auto p-0">
          <a href="/import-templates/README.md" download>
            <Download className="h-3 w-3 mr-1" />
            Download All
          </a>
        </Button>
      </div>
      
      {/* Continue Button */}
      {allParsed && validFiles.length > 0 && (
        <div className="flex justify-end gap-3">
          {hasErrors && (
            <p className="text-sm text-destructive self-center">
              Some files have errors and will be skipped
            </p>
          )}
          <Button onClick={handleContinue} size="lg">
            Continue to Validation
            <ArrowUp className="h-4 w-4 ml-2 rotate-90" />
          </Button>
        </div>
      )}
    </div>
  );
}
