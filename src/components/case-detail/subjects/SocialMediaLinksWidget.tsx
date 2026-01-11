import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SocialLinkIcon, SocialPlatform } from "./SocialPlatformIcons";
import { AddSocialLinkDialog, SocialLink } from "./AddSocialLinkDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logSocialLinkAudit } from "@/lib/subjectAuditLogger";

interface SocialMediaLinksWidgetProps {
  subjectId: string;
  organizationId: string;
  readOnly?: boolean;
}

export const SocialMediaLinksWidget = ({
  subjectId,
  organizationId,
  readOnly = false,
}: SocialMediaLinksWidgetProps) => {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<SocialLink | null>(null);

  useEffect(() => {
    fetchLinks();
  }, [subjectId]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("subject_social_links")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Cast platform to SocialPlatform type
      const typedLinks: SocialLink[] = (data || []).map(link => ({
        ...link,
        platform: link.platform as SocialPlatform,
      }));
      
      setLinks(typedLinks);
    } catch (error) {
      console.error("Error fetching social links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLink) return;

    try {
      // Store previous values for audit
      const previousValues = {
        platform: deletingLink.platform,
        url: deletingLink.url,
        label: deletingLink.label,
      };

      const { error } = await supabase
        .from("subject_social_links")
        .delete()
        .eq("id", deletingLink.id);

      if (error) throw error;

      // Log audit for deletion
      await logSocialLinkAudit({
        social_link_id: deletingLink.id,
        subject_id: subjectId,
        organization_id: organizationId,
        action: 'deleted',
        previous_values: previousValues,
      });

      toast.success("Link removed");
      fetchLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to remove link");
    } finally {
      setDeletingLink(null);
    }
  };

  const handleEditClick = (link: SocialLink) => {
    setEditingLink(link);
    setAddDialogOpen(true);
  };

  const handleAddDialogClose = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setEditingLink(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Social Media & External Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Social Media & External Links</CardTitle>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No links added</p>
              {!readOnly && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAddDialogOpen(true)}
                >
                  Add the first link
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <SocialLinkIcon
                      platform={link.platform}
                      url={link.url}
                      label={link.label || undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {link.label || link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.url}
                      </p>
                    </div>
                  </div>
                  
                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditClick(link)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingLink(link)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddSocialLinkDialog
        open={addDialogOpen}
        onOpenChange={handleAddDialogClose}
        subjectId={subjectId}
        organizationId={organizationId}
        editingLink={editingLink}
        onSuccess={fetchLinks}
      />

      <AlertDialog open={!!deletingLink} onOpenChange={() => setDeletingLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
