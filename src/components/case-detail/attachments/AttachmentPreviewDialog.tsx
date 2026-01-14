import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Attachment } from '@/hooks/useAttachments';
import { useAttachmentPreview } from '@/hooks/useAttachmentPreview';
import { AttachmentPreviewContent } from './AttachmentPreviewContent';

interface AttachmentPreviewDialogProps {
  attachment: Attachment | null;
  onClose: () => void;
  onDownload: (attachment: Attachment) => void;
}

export function AttachmentPreviewDialog({
  attachment,
  onClose,
  onDownload,
}: AttachmentPreviewDialogProps) {
  const { blobUrl, blobData, loading, error } = useAttachmentPreview({ attachment });

  return (
    <Dialog open={!!attachment} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{attachment?.name || attachment?.file_name}</DialogTitle>
        </DialogHeader>
        <div className="w-full overflow-hidden">
          {attachment && (
            <AttachmentPreviewContent
              attachment={attachment}
              blobUrl={blobUrl}
              blobData={blobData}
              loading={loading}
              error={error}
              onDownload={() => onDownload(attachment)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AttachmentPreviewDialog;
