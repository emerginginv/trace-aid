import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ActivityPhotoUpload } from "./ActivityPhotoUpload";

interface EntityActivityFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType: "account" | "contact";
  entityId: string;
  activityTypes: string[];
  editingActivity?: {
    id: string;
    activity_type: string;
    title: string;
    description: string | null;
    activity_date: string;
    photos: { id: string; file_path: string; file_name: string }[];
  } | null;
}

interface PhotoToUpload {
  file: File;
  preview: string;
}

export function EntityActivityForm({
  open,
  onClose,
  onSuccess,
  entityType,
  entityId,
  activityTypes,
  editingActivity,
}: EntityActivityFormProps) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [photosToUpload, setPhotosToUpload] = useState<PhotoToUpload[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; file_path: string; file_name: string }[]
  >([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (editingActivity) {
        setActivityType(editingActivity.activity_type);
        setTitle(editingActivity.title);
        setDescription(editingActivity.description || "");
        setActivityDate(
          new Date(editingActivity.activity_date).toISOString().slice(0, 16)
        );
        setExistingPhotos(editingActivity.photos);
      } else {
        setActivityType("");
        setTitle("");
        setDescription("");
        setActivityDate(new Date().toISOString().slice(0, 16));
        setExistingPhotos([]);
      }
      setPhotosToUpload([]);
      setPhotosToDelete([]);
    }
  }, [open, editingActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    if (!activityType || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check photo limit
    const totalPhotos = existingPhotos.length - photosToDelete.length + photosToUpload.length;
    if (totalPhotos > 2) {
      toast.error("Maximum 2 photos allowed per activity");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let activityId = editingActivity?.id;

      if (editingActivity) {
        // Update existing activity
        const { error: updateError } = await supabase
          .from("entity_activities")
          .update({
            activity_type: activityType,
            title: title.trim(),
            description: description.trim() || null,
            activity_date: new Date(activityDate).toISOString(),
          })
          .eq("id", editingActivity.id);

        if (updateError) throw updateError;
      } else {
        // Create new activity
        const { data: newActivity, error: insertError } = await supabase
          .from("entity_activities")
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: activityType,
            title: title.trim(),
            description: description.trim() || null,
            activity_date: new Date(activityDate).toISOString(),
            user_id: user.id,
            organization_id: organization.id,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        activityId = newActivity.id;
      }

      // Delete photos marked for deletion
      if (photosToDelete.length > 0) {
        const photosToRemove = existingPhotos.filter((p) => photosToDelete.includes(p.id));
        const filePaths = photosToRemove.map((p) => p.file_path);

        await supabase.storage.from("entity-activity-photos").remove(filePaths);
        await supabase
          .from("entity_activity_photos")
          .delete()
          .in("id", photosToDelete);
      }

      // Upload new photos
      if (photosToUpload.length > 0 && activityId) {
        for (const photo of photosToUpload) {
          const fileExt = photo.file.name.split(".").pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${organization.id}/${entityType}/${entityId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("entity-activity-photos")
            .upload(filePath, photo.file);

          if (uploadError) throw uploadError;

          const { error: photoRecordError } = await supabase
            .from("entity_activity_photos")
            .insert({
              activity_id: activityId,
              file_path: filePath,
              file_name: photo.file.name,
              file_size: photo.file.size,
              file_type: photo.file.type,
              organization_id: organization.id,
              uploaded_by: user.id,
            });

          if (photoRecordError) throw photoRecordError;
        }
      }

      toast.success(editingActivity ? "Activity updated" : "Activity added");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast.error(error.message || "Failed to save activity");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExistingPhoto = (photoId: string) => {
    setPhotosToDelete((prev) => [...prev, photoId]);
  };

  const remainingPhotoSlots = 2 - (existingPhotos.length - photosToDelete.length);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingActivity ? "Edit Activity" : "Add Activity"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-type">Activity Type *</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger id="activity-type">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the activity"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-date">Date & Time</Label>
            <Input
              id="activity-date"
              type="datetime-local"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this interaction..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Photos (max 2)</Label>
            <ActivityPhotoUpload
              photos={photosToUpload}
              onPhotosChange={setPhotosToUpload}
              existingPhotos={existingPhotos.filter((p) => !photosToDelete.includes(p.id))}
              onRemoveExisting={handleRemoveExistingPhoto}
              maxPhotos={remainingPhotoSlots}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingActivity ? "Update" : "Add"} Activity
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
