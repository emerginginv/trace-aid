import { format } from "date-fns";
import { Paperclip, FileText, Image, Video, File } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface PdfAttachmentsListProps {
  attachments: Attachment[];
}

export function PdfAttachmentsList({ attachments }: PdfAttachmentsListProps) {
  if (attachments.length === 0) {
    return null;
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (fileType.startsWith("video/")) {
      return <Video className="h-4 w-4 text-purple-500" />;
    }
    if (fileType.includes("pdf")) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (fileType.includes("word") || fileType.includes("document")) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toUpperCase() || "FILE";
  };

  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-primary" />
        Attachments ({attachments.length})
      </h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>File Name</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-24 text-right">Size</TableHead>
            <TableHead className="w-28">Date Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attachments.slice(0, 25).map((attachment) => (
            <TableRow key={attachment.id}>
              <TableCell>{getFileIcon(attachment.file_type)}</TableCell>
              <TableCell className="text-sm font-medium truncate max-w-[300px]">
                {attachment.file_name}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {getFileExtension(attachment.file_name)}
              </TableCell>
              <TableCell className="text-xs text-right text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(attachment.created_at), "MMM d, yyyy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {attachments.length > 25 && (
        <p className="text-sm text-center text-muted-foreground py-2 mt-2">
          ... and {attachments.length - 25} more attachments
        </p>
      )}
    </div>
  );
}
