import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CoverImageUploadProps {
  subjectId: string;
  currentCoverUrl?: string | null;
  signedCoverUrl?: string | null;
  onCoverChange?: (url: string | null) => void;
  onImageClick?: () => void;
  readOnly?: boolean;
}

export const CoverImageUpload = ({ 
  subjectId, 
  currentCoverUrl, 
  signedCoverUrl,
  onCoverChange,
  onImageClick,
  readOnly = false 
}: CoverImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (.jpg, .png, .webp)");
      return;
    }

    // Validate file size (max 10MB for cover photos)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Please select an image smaller than 10MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload images");
        return;
      }

      // Create unique file path for cover images
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/cover_${Date.now()}.${fileExt}`;

      console.log("Uploading cover image:", fileName);

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("subject-profile-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      console.log("Upload successful:", uploadData);

      // Update the subject with the cover image URL
      const { error: updateError } = await supabase
        .from("case_subjects")
        .update({ cover_image_url: fileName })
        .eq("id", subjectId);

      if (updateError) {
        console.error("Database update error:", updateError);
        toast.error(`Failed to save cover: ${updateError.message}`);
        return;
      }

      console.log("Database updated successfully");
      onCoverChange?.(fileName);
      toast.success("Cover photo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading cover image:", error);
      toast.error(`Failed to upload cover photo: ${error?.message || "Unknown error"}`);
    } finally {
      setUploading(false);
      // Always reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from("case_subjects")
        .update({ cover_image_url: null })
        .eq("id", subjectId);

      if (error) throw error;

      onCoverChange?.(null);
      toast.success("Cover photo removed");
    } catch (error) {
      console.error("Error removing cover image:", error);
      toast.error("Failed to remove cover photo");
    }
  };

  const hasCover = signedCoverUrl || currentCoverUrl;

  return (
    <div className="relative h-full w-full group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="cover-image-upload"
      />
      
      {/* Cover image or gradient background */}
      {signedCoverUrl ? (
        <img 
          src={signedCoverUrl} 
          alt="Cover" 
          className={`w-full h-full object-cover ${onImageClick ? 'cursor-zoom-in' : ''}`}
          onClick={(e) => {
            if (onImageClick) {
              e.stopPropagation();
              onImageClick();
            }
          }}
        />
      ) : (
        <>
          <div className="h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9ImN1cnJlbnRDb2xvciIgZmlsbC1vcGFjaXR5PSIwLjAzIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTRNNjAgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTRNMTIgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTQiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        </>
      )}
      
      {/* Hover overlay for editing - uses group-hover for reliable visibility */}
      {!readOnly && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-black/40 flex items-center justify-center gap-2">
          {uploading ? (
            <Button variant="secondary" disabled className="pointer-events-auto">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </Button>
          ) : (
            <div className="pointer-events-auto flex items-center gap-2">
              <Button 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                {hasCover ? 'Change Cover' : 'Add Cover Photo'}
              </Button>
              {hasCover && (
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={handleRemove}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
