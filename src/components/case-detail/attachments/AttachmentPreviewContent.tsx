import React from 'react';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfViewer } from '../PdfViewer';
import { Attachment } from '@/hooks/useAttachments';

interface AttachmentPreviewContentProps {
  attachment: Attachment;
  blobUrl: string | null;
  blobData: ArrayBuffer | null;
  loading: boolean;
  error: string | null;
  onDownload: () => void;
}

export function AttachmentPreviewContent({
  attachment,
  blobUrl,
  blobData,
  loading,
  error,
  onDownload,
}: AttachmentPreviewContentProps) {
  // Show loading state while fetching file blob
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  // Show error state with download option
  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
        <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">Preview not available</p>
        <p className="text-muted-foreground mb-4">{error || 'Loading...'}</p>
        <Button onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  }

  // Handle PDFs with PdfViewer component
  if (attachment.file_type.includes('pdf')) {
    if (!blobData) {
      return (
        <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
          <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">PDF preview loading...</p>
        </div>
      );
    }

    return <PdfViewer pdfData={blobData} fileName={attachment.file_name} onDownload={onDownload} />;
  }

  // Handle images with blob URL
  if (attachment.file_type.startsWith('image/')) {
    return (
      <div className="flex flex-col items-center">
        <img
          src={blobUrl}
          alt={attachment.file_name}
          className="max-w-full max-h-[80vh] rounded"
        />
        <div className="flex gap-2 justify-center mt-4 pt-4 border-t w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(blobUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  // Handle videos with blob URL
  if (attachment.file_type.startsWith('video/')) {
    return (
      <div className="flex flex-col">
        <video controls className="w-full max-h-[80vh] rounded">
          <source src={blobUrl} type={attachment.file_type} />
        </video>
        <div className="flex gap-2 justify-center mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  // Handle audio with blob URL
  if (attachment.file_type.startsWith('audio/')) {
    return (
      <div className="flex flex-col items-center gap-4">
        <audio controls className="w-full">
          <source src={blobUrl} type={attachment.file_type} />
        </audio>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    );
  }

  // Fallback for unsupported file types
  return (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg font-medium mb-2">Preview not available</p>
      <p className="text-muted-foreground mb-4">Download to view this file</p>
      <Button onClick={onDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download File
      </Button>
    </div>
  );
}

export default AttachmentPreviewContent;
