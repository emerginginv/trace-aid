import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UploadingFile } from '@/hooks/useAttachments';
import { File, FileText, Image as ImageIcon, Video, Music } from 'lucide-react';

interface AttachmentUploadProgressProps {
  uploadingFiles: UploadingFile[];
}

function getFileIcon(fileType: string, fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (fileType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
  if (fileType.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
  if (fileType.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
  if (fileType.includes('pdf') || extension === 'pdf')
    return <FileText className="h-8 w-8 text-red-500" />;
  if (extension === 'doc' || extension === 'docx')
    return <FileText className="h-8 w-8 text-blue-600" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

export function AttachmentUploadProgress({ uploadingFiles }: AttachmentUploadProgressProps) {
  if (uploadingFiles.length === 0) return null;

  return (
    <div className="space-y-2">
      {uploadingFiles.map((uploadingFile) => (
        <Card key={uploadingFile.id}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0">
                {uploadingFile.file.type.startsWith('image/') ? (
                  <img
                    src={uploadingFile.preview}
                    alt={uploadingFile.file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : uploadingFile.file.type.startsWith('video/') ? (
                  <video
                    src={uploadingFile.preview}
                    className="h-10 w-10 object-cover rounded"
                    muted
                  />
                ) : (
                  getFileIcon(uploadingFile.file.type, uploadingFile.file.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {uploadingFile.status === 'uploading' && 'Uploading...'}
                  {uploadingFile.status === 'complete' && '✓ Uploaded'}
                  {uploadingFile.status === 'error' && '✗ Upload failed'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default AttachmentUploadProgress;
