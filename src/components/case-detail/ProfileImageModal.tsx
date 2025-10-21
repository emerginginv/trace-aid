import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProfileImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  subjectId: string;
  onImageUpdated: () => void;
}

export const ProfileImageModal = ({ 
  open, 
  onOpenChange, 
  imageUrl, 
  subjectId,
  onImageUpdated 
}: ProfileImageModalProps) => {
  const [uploading, setUploading] = useState(false);

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("subject-profile-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("subject-profile-images")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("case_subjects")
        .update({ profile_image_url: publicUrl })
        .eq("id", subjectId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile image updated successfully",
      });

      onImageUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error replacing image:", error);
      toast({
        title: "Error",
        description: "Failed to replace image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      const { error } = await supabase
        .from("case_subjects")
        .update({ profile_image_url: null })
        .eq("id", subjectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile image removed successfully",
      });

      onImageUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error removing image:", error);
      toast({
        title: "Error",
        description: "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <img
            src={imageUrl}
            alt="Profile"
            className="max-w-xs mx-auto rounded-lg border"
          />
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild disabled={uploading}>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReplaceImage}
                  className="hidden"
                />
                {uploading ? "Uploading..." : "Change Image"}
              </label>
            </Button>
            <Button variant="destructive" onClick={handleRemoveImage}>
              Remove Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
