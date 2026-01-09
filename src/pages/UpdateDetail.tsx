import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User, FileText, Paperclip, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { AttachmentPreviewThumbnail } from "@/components/case-detail/AttachmentPreviewThumbnail";

interface LinkedAttachment {
  id: string;
  attachment_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  preview_path?: string | null;
  preview_status?: string | null;
}

interface Update {
  id: string;
  title: string;
  description: string;
  created_at: string;
  update_type: string;
  user_id: string;
  case_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const UpdateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [update, setUpdate] = useState<Update | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [linkedAttachments, setLinkedAttachments] = useState<LinkedAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useSetBreadcrumbs(
    update
      ? [
          { label: "Cases", href: "/cases" },
          { label: update.title || "Update" },
        ]
      : []
  );

  useEffect(() => {
    fetchUpdate();
  }, [id]);

  const fetchUpdate = async () => {
    try {
      setLoading(true);
      
      const { data: updateData, error: updateError } = await supabase
        .from("case_updates")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updateData) {
        toast({
          title: "Update not found",
          description: "The requested update could not be found.",
          variant: "destructive",
        });
        navigate("/cases");
        return;
      }

      setUpdate(updateData);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", updateData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch linked attachments with full details
      const { data: linksData } = await supabase
        .from("update_attachment_links")
        .select(`
          id,
          attachment_id,
          case_attachments!inner(file_name, file_type, file_path, file_size, preview_path, preview_status)
        `)
        .eq("update_id", updateData.id);

      if (linksData) {
        setLinkedAttachments(
          linksData.map((link: any) => ({
            id: link.id,
            attachment_id: link.attachment_id,
            file_name: link.case_attachments.file_name,
            file_type: link.case_attachments.file_type,
            file_path: link.case_attachments.file_path,
            file_size: link.case_attachments.file_size,
            preview_path: link.case_attachments.preview_path,
            preview_status: link.case_attachments.preview_status,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching update:", error);
      toast({
        title: "Error",
        description: "Failed to load update details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: LinkedAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("case-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the file.",
        variant: "destructive",
      });
    }
  };

  const handleViewAttachment = (attachment: LinkedAttachment) => {
    if (update) {
      navigate(`/cases/${update.case_id}/attachments/${attachment.attachment_id}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!update) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/cases/${update.case_id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Case
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{update.title}</CardTitle>
              <Badge variant="outline">{update.update_type}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(update.created_at), "PPP 'at' p")}
              </span>
            </div>

            {userProfile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Created by {userProfile.full_name || userProfile.email}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Description
            </div>
            <RichTextDisplay 
              html={update.description} 
              fallback="No description provided."
              className="[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1"
            />
          </div>

          {/* Linked Attachments Section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 font-semibold">
              <Paperclip className="h-4 w-4" />
              Linked Attachments
              {linkedAttachments.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {linkedAttachments.length}
                </Badge>
              )}
            </div>
            {linkedAttachments.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {linkedAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors group"
                  >
                    <div 
                      className="cursor-pointer shrink-0"
                      onClick={() => handleViewAttachment(attachment)}
                    >
                      <AttachmentPreviewThumbnail
                        filePath={attachment.file_path}
                        fileName={attachment.file_name}
                        fileType={attachment.file_type}
                        previewPath={attachment.preview_path}
                        previewStatus={attachment.preview_status}
                        size="md"
                        className="rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => handleViewAttachment(attachment)}
                      >
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(attachment.file_size)}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleViewAttachment(attachment)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No attachments linked to this update.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateDetail;