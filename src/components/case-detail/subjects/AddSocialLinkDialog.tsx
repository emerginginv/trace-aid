import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOCIAL_PLATFORMS, SocialPlatform } from "./SocialPlatformIcons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SocialLink {
  id: string;
  subject_id: string;
  organization_id: string;
  platform: SocialPlatform;
  label: string | null;
  url: string;
  created_at: string;
  created_by: string | null;
}

interface AddSocialLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  organizationId: string;
  editingLink?: SocialLink | null;
  onSuccess: () => void;
}

export const AddSocialLinkDialog = ({
  open,
  onOpenChange,
  subjectId,
  organizationId,
  editingLink,
  onSuccess,
}: AddSocialLinkDialogProps) => {
  const [platform, setPlatform] = useState<SocialPlatform>("facebook");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLink) {
      setPlatform(editingLink.platform);
      setUrl(editingLink.url);
      setLabel(editingLink.label || "");
    } else {
      setPlatform("facebook");
      setUrl("");
      setLabel("");
    }
    setUrlError(null);
  }, [editingLink, open]);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError("URL is required");
      return false;
    }
    try {
      new URL(value);
      setUrlError(null);
      return true;
    } catch {
      setUrlError("Please enter a valid URL (e.g., https://example.com)");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) return;
    
    // Require label for "other" platform type
    if (platform === "other" && !label.trim()) {
      toast.error("Label is required for custom links");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingLink) {
        // Update existing link
        const { error } = await supabase
          .from("subject_social_links")
          .update({
            platform,
            url: url.trim(),
            label: label.trim() || null,
          })
          .eq("id", editingLink.id);

        if (error) throw error;
        toast.success("Link updated");
      } else {
        // Create new link
        const { error } = await supabase
          .from("subject_social_links")
          .insert({
            subject_id: subjectId,
            organization_id: organizationId,
            platform,
            url: url.trim(),
            label: label.trim() || null,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success("Link added");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Failed to save link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOther = platform === "other";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingLink ? "Edit Link" : "Add Social Media Link"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={platform}
              onValueChange={(value) => setPlatform(value as SocialPlatform)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <p.icon className="h-4 w-4" />
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) validateUrl(e.target.value);
              }}
              onBlur={(e) => validateUrl(e.target.value)}
              className={urlError ? "border-destructive" : ""}
            />
            {urlError && (
              <p className="text-sm text-destructive">{urlError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">
              {isOther ? "Label (required)" : "Custom Label (optional)"}
            </Label>
            <Input
              id="label"
              placeholder={isOther ? "e.g., Personal Website" : "Optional display name"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required={isOther}
            />
            {isOther && (
              <p className="text-sm text-muted-foreground">
                Enter a descriptive label for this link
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingLink ? "Update" : "Add Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
