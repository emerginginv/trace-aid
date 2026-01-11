import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageViewer } from "@/components/attachment-viewer/ImageViewer";

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  alt: string;
}

export const ProfileImageModal = ({
  isOpen,
  onClose,
  imageUrl,
  alt,
}: ProfileImageModalProps) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
        <ImageViewer src={imageUrl} alt={alt} />
      </DialogContent>
    </Dialog>
  );
};
