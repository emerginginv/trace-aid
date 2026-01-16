import { FileIcon, Download, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const formatFileSize = (bytes: number | null) => {
  if (bytes === null) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  // Could be extended to show different icons based on file type
  return FileIcon;
};

export function RequestFilesTab({ files }: RequestFilesTabProps) {
  const handleDownload = async (file: CaseRequestFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('case-request-files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handlePreview = async (file: CaseRequestFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('case-request-files')
        .createSignedUrl(file.storage_path, 3600); // 1 hour

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Failed to preview file');
    }
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No files</h3>
          <p className="text-muted-foreground">
            No files were uploaded with this request.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => {
        const Icon = getFileIcon(file.file_type);
        
        return (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.file_size)}
                    {file.file_type && ` • ${file.file_type}`}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePreview(file)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
