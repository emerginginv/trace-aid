import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (url: string | null) => void;
  subjectId?: string;
}

export const ProfileImageUpload = ({ currentImageUrl, onImageChange, subjectId }: ProfileImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (.jpg, .png, .webp)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload to Supabase
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("subject-profile-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the file path (not a public URL since bucket is now private)
      // The path can be used to generate signed URLs when displaying
      onImageChange(fileName);

      // If editing existing subject, update the database with the file path
      if (subjectId) {
        const { error: updateError } = await supabase
          .from("case_subjects")
          .update({ profile_image_url: fileName })
          .eq("id", subjectId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: "Profile image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      toast({
        title: "Upload Error",
        description: errorMessage.includes("storage") 
          ? "Storage upload failed. Please try again or use a different image."
          : errorMessage,
        variant: "destructive",
      });
      setPreview(currentImageUrl || null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Profile preview"
              className="h-20 w-20 rounded-full object-cover border-2 border-border"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="h-20 w-20 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="profile-image-upload"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : preview ? "Change Photo" : "Upload Photo"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP</p>
      </div>
    </div>
  );
};
