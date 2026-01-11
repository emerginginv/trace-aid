import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface PhotoToUpload {
  file: File;
  preview: string;
}

interface ExistingPhoto {
  id: string;
  file_path: string;
  file_name: string;
}

interface ActivityPhotoUploadProps {
  photos: PhotoToUpload[];
  onPhotosChange: (photos: PhotoToUpload[]) => void;
  existingPhotos?: ExistingPhoto[];
  onRemoveExisting?: (photoId: string) => void;
  maxPhotos?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ActivityPhotoUpload({
  photos,
  onPhotosChange,
  existingPhotos = [],
  onRemoveExisting,
  maxPhotos = 2,
}: ActivityPhotoUploadProps) {
  const totalPhotos = existingPhotos.length + photos.length;
  const canAddMore = totalPhotos < 2;

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newPhotos: PhotoToUpload[] = [];

      Array.from(files).forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name} is not a valid image type (JPG, PNG, or WEBP)`);
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds the 5MB limit`);
          return;
        }

        if (photos.length + existingPhotos.length + newPhotos.length >= 2) {
          toast.error("Maximum 2 photos allowed");
          return;
        }

        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      });

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
      }
    },
    [photos, existingPhotos.length, onPhotosChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeNewPhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Existing photos */}
      {existingPhotos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {existingPhotos.map((photo) => (
            <ExistingPhotoThumbnail
              key={photo.id}
              photo={photo}
              onRemove={() => onRemoveExisting?.(photo.id)}
            />
          ))}
        </div>
      )}

      {/* New photos to upload */}
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((photo, index) => (
            <div key={index} className="relative w-20 h-20 rounded border overflow-hidden group">
              <img
                src={photo.preview}
                alt={photo.file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeNewPhoto(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 text-[10px] truncate px-1 py-0.5 bg-black/50 text-white">
                {photo.file.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
        >
          <input
            type="file"
            id="photo-upload"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-6 w-6" />
              <span className="text-sm">
                Drag & drop or click to upload
              </span>
              <span className="text-xs">
                JPG, PNG, or WEBP up to 5MB ({2 - totalPhotos} remaining)
              </span>
            </div>
          </label>
        </div>
      )}

      {!canAddMore && totalPhotos > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum 2 photos reached
        </p>
      )}
    </div>
  );
}

function ExistingPhotoThumbnail({
  photo,
  onRemove,
}: {
  photo: ExistingPhoto;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadUrl = async () => {
      const { data } = await supabase.storage
        .from("entity-activity-photos")
        .createSignedUrl(photo.file_path, 3600);
      setUrl(data?.signedUrl || null);
    };
    loadUrl();
  }, [photo.file_path]);

  if (!url) {
    return <Skeleton className="w-20 h-20 rounded" />;
  }

  return (
    <div className="relative w-20 h-20 rounded border overflow-hidden group">
      <img src={url} alt={photo.file_name} className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
      <span className="absolute bottom-0 left-0 right-0 text-[10px] truncate px-1 py-0.5 bg-black/50 text-white">
        {photo.file_name}
      </span>
    </div>
  );
}
