import React from 'react';
import { Upload } from 'lucide-react';

interface AttachmentDropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  disabled?: boolean;
}

export function AttachmentDropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  disabled = false,
}: AttachmentDropZoneProps) {
  if (disabled) return null;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-1">
        Drag and drop files here, or{' '}
        <span className="text-primary font-medium underline">click to upload</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Supports images, videos, audio, PDF, DOC, and more
      </p>
    </div>
  );
}

export default AttachmentDropZone;
