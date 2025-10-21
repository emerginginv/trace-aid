import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, File, FileText, Image as ImageIcon, Video, Music, Search, LayoutGrid, List, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Attachment {
  id: string;
  case_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface CaseAttachmentsProps {
  caseId: string;
}

export const CaseAttachments = ({ caseId }: CaseAttachmentsProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [caseId]);

  const fetchAttachments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_attachments")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${caseId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from("case-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from("case_attachments")
          .insert({
            case_id: caseId,
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });
      fetchAttachments();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("case-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("case-attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("case_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      fetchAttachments();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-primary" />;
    if (fileType.startsWith("video/")) return <Video className="h-8 w-8 text-primary" />;
    if (fileType.startsWith("audio/")) return <Music className="h-8 w-8 text-primary" />;
    if (fileType.includes("pdf")) return <FileText className="h-8 w-8 text-primary" />;
    return <File className="h-8 w-8 text-primary" />;
  };

  const getFilePreview = (attachment: Attachment) => {
    const { data: { publicUrl } } = supabase.storage
      .from("case-attachments")
      .getPublicUrl(attachment.file_path);

    if (attachment.file_type.startsWith("image/")) {
      return (
        <img 
          src={publicUrl} 
          alt={attachment.file_name}
          className="h-20 w-20 object-cover rounded"
        />
      );
    }
    if (attachment.file_type.startsWith("video/")) {
      return (
        <video 
          src={publicUrl} 
          className="h-20 w-20 object-cover rounded"
          controls={false}
        />
      );
    }
    return getFileIcon(attachment.file_type);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeCategory = (fileType: string) => {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.startsWith("video/")) return "video";
    if (fileType.startsWith("audio/")) return "audio";
    if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("word")) return "document";
    return "other";
  };

  const handlePreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
  };

  const renderPreviewContent = () => {
    if (!previewAttachment) return null;

    const { data: { publicUrl } } = supabase.storage
      .from("case-attachments")
      .getPublicUrl(previewAttachment.file_path);

    if (previewAttachment.file_type.startsWith("image/")) {
      return <img src={publicUrl} alt={previewAttachment.file_name} className="max-w-full max-h-[80vh] rounded" />;
    }

    if (previewAttachment.file_type.startsWith("video/")) {
      return (
        <video controls className="w-full max-h-[80vh] rounded">
          <source src={publicUrl} type={previewAttachment.file_type} />
        </video>
      );
    }

    if (previewAttachment.file_type.startsWith("audio/")) {
      return (
        <audio controls className="w-full">
          <source src={publicUrl} type={previewAttachment.file_type} />
        </audio>
      );
    }

    if (previewAttachment.file_type.includes("pdf")) {
      return <iframe src={publicUrl} className="w-full h-[80vh] rounded" title={previewAttachment.file_name} />;
    }

    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">Preview not available</p>
        <p className="text-muted-foreground mb-4">Download to view this file</p>
        <Button onClick={() => handleDownload(previewAttachment)}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  const filteredAttachments = attachments.filter((attachment) => {
    const matchesSearch = searchQuery === "" || 
      attachment.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || getFileTypeCategory(attachment.file_type) === typeFilter;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="text-center py-8">Loading attachments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-0.5">
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("list")}
            className="h-9 w-9"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "card" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("card")}
            className="h-9 w-9"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
        <label htmlFor="file-upload">
          <Button disabled={uploading} asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Files"}
            </span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No attachments yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload files to get started
            </p>
          </CardContent>
        </Card>
      ) : filteredAttachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No files match your search criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAttachments.map((attachment) => {
            const { data: { publicUrl } } = supabase.storage
              .from("case-attachments")
              .getPublicUrl(attachment.file_path);

            return (
              <Card key={attachment.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="w-full h-40 bg-muted rounded overflow-hidden flex items-center justify-center">
                    {attachment.file_type.startsWith("image/") ? (
                      <img 
                        src={publicUrl} 
                        alt={attachment.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : attachment.file_type.startsWith("video/") ? (
                      <video 
                        src={publicUrl} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getFileIcon(attachment.file_type)
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(attachment)}
                      className="h-8 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      className="h-8 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment)}
                      className="h-8 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 py-2">Preview</TableHead>
                <TableHead className="py-2">File Name</TableHead>
                <TableHead className="py-2">Size</TableHead>
                <TableHead className="py-2">Uploaded</TableHead>
                <TableHead className="text-right py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttachments.map((attachment) => (
                <TableRow key={attachment.id} className="text-sm">
                  <TableCell className="py-1.5">
                    <div className="flex items-center justify-center">
                      {getFilePreview(attachment)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium py-1.5">{attachment.file_name}</TableCell>
                  <TableCell className="py-1.5">{formatFileSize(attachment.file_size)}</TableCell>
                  <TableCell className="py-1.5">{new Date(attachment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right py-1.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(attachment)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment)}
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(attachment)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {renderPreviewContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};