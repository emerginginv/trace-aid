import { useState } from "react";
import { format } from "date-fns";
import { Download, Eye, File, FileText, Image, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CaseRequestFile {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_at: string;
}

interface RequestFilesTabProps {
  files: CaseRequestFile[];
}

const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("pdf") || fileType.includes("document")) return FileText;
  return File;
};

const getHumanReadableType = (fileType: string | null, fileName: string): string => {
  if (!fileType) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? ext.toUpperCase() : "Unknown";
  }
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  };
  return typeMap[fileType] || fileType.split("/")[1]?.toUpperCase() || fileType;
};

export function RequestFilesTab({ files }: RequestFilesTabProps) {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const handleDownload = async (file: CaseRequestFile) => {
    setLoadingFile(file.id);
    try {
      const { data, error } = await supabase.storage.from("case-request-files").download(file.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setLoadingFile(null);
    }
  };

  const handlePreview = async (file: CaseRequestFile) => {
    setLoadingFile(file.id);
    try {
      const { data, error } = await supabase.storage.from("case-request-files").createSignedUrl(file.storage_path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to preview file");
    } finally {
      setLoadingFile(null);
    }
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No files</p>
          <p className="text-sm">No files were uploaded with this request.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">File Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const FileIcon = getFileIcon(file.file_type);
              const isLoading = loadingFile === file.id;
              return (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[250px] font-medium">{file.file_name}</span>
                          </TooltipTrigger>
                          <TooltipContent><p>{file.file_name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{getHumanReadableType(file.file_type, file.file_name)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatFileSize(file.file_size)}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(file.uploaded_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handlePreview(file)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
