import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";

interface ActivityPhotoViewerProps {
  open: boolean;
  onClose: () => void;
  photos: { url: string; name: string }[];
  initialIndex?: number;
}

export function ActivityPhotoViewer({
  open,
  onClose,
  photos,
  initialIndex = 0,
}: ActivityPhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    const photo = photos[currentIndex];
    if (!photo?.url) return;

    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (!photos.length) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
        <div className="relative flex items-center justify-center min-h-[60vh]">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-12 z-10 text-white hover:bg-white/10"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>

          {/* Previous button */}
          {photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Image */}
          <div className="flex items-center justify-center p-4 max-h-[80vh]">
            <img
              src={currentPhoto?.url}
              alt={currentPhoto?.name}
              className="max-w-full max-h-[75vh] object-contain"
            />
          </div>

          {/* Next button */}
          {photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {currentIndex + 1} / {photos.length}
            </div>
          )}

          {/* Filename */}
          <div className="absolute bottom-4 left-4 text-white text-sm truncate max-w-[200px]">
            {currentPhoto?.name}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
