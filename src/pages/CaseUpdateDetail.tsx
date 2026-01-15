import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  Paperclip, 
  Download, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Link2, 
  DollarSign,
  Clock,
  MapPin,
  X
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { AttachmentPreviewThumbnail } from "@/components/case-detail/AttachmentPreviewThumbnail";
import { ActivityTimelineDisplay } from "@/components/case-detail/ActivityTimelineDisplay";
import { AIBadge } from "@/components/ui/ai-badge";
import { UpdateForm } from "@/components/case-detail/UpdateForm";
import { AttachmentPickerDialog } from "@/components/case-detail/AttachmentPicker";
import { CreateBillingItemButton } from "@/components/billing/CreateBillingItemButton";
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

interface TimelineEntry {
  time: string;
  description: string;
}

interface Update {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  update_type: string;
  user_id: string;
  case_id: string;
  activity_timeline: TimelineEntry[] | null;
  is_ai_summary: boolean;
  linked_activity_id: string | null;
}

interface LinkedActivity {
  id: string;
  title: string;
  activity_type: string;
  status: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  address: string | null;
  is_scheduled: boolean;
}

interface BillingEntry {
  id: string;
  description: string;
  amount: number;
  hours: number | null;
  hourly_rate: number | null;
  finance_type: string;
  date: string;
  status: string | null;
  category: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface CaseInfo {
  id: string;
  title: string;
  case_number: string;
  status: string;
}

const CaseUpdateDetail = () => {
  const { caseId, updateId } = useParams<{ caseId: string; updateId: string }>();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission } = usePermissions();

  const [update, setUpdate] = useState<Update | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [linkedActivity, setLinkedActivity] = useState<LinkedActivity | null>(null);
  const [linkedAttachments, setLinkedAttachments] = useState<LinkedAttachment[]>([]);
  const [billingEntries, setBillingEntries] = useState<BillingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const canEditUpdates = hasPermission("edit_updates");
  const canDeleteUpdates = hasPermission("delete_updates");
  const isClosedCase = caseInfo?.status === "closed";

  useSetBreadcrumbs(
    caseInfo && update
      ? [
          { label: "Cases", href: "/cases" },
          { label: caseInfo.title || caseInfo.case_number, href: `/cases/${caseId}` },
          { label: "Updates", href: `/cases/${caseId}?tab=updates` },
          { label: update.title },
        ]
      : []
  );

  useEffect(() => {
    if (caseId && updateId) {
      fetchData();
    }
  }, [caseId, updateId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch update
      const { data: updateData, error: updateError } = await supabase
        .from("case_updates")
        .select("*")
        .eq("id", updateId)
        .eq("case_id", caseId)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updateData) {
        toast({
          title: "Update not found",
          description: "The requested update could not be found.",
          variant: "destructive",
        });
        navigate(`/cases/${caseId}?tab=updates`);
        return;
      }

      const mappedUpdate: Update = {
        id: updateData.id,
        title: updateData.title,
        description: updateData.description,
        created_at: updateData.created_at,
        update_type: updateData.update_type,
        user_id: updateData.user_id,
        case_id: updateData.case_id,
        activity_timeline: updateData.activity_timeline as unknown as TimelineEntry[] | null,
        is_ai_summary: updateData.is_ai_summary || false,
        linked_activity_id: updateData.linked_activity_id,
      };
      setUpdate(mappedUpdate);

      // Fetch case info
      const { data: caseData } = await supabase
        .from("cases")
        .select("id, title, case_number, status")
        .eq("id", caseId)
        .maybeSingle();

      if (caseData) {
        setCaseInfo(caseData);
      }

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", updateData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch linked activity if exists
      if (updateData.linked_activity_id) {
        const { data: activityData } = await supabase
          .from("case_activities")
          .select("id, title, activity_type, status, due_date, start_time, end_time, address, is_scheduled")
          .eq("id", updateData.linked_activity_id)
          .maybeSingle();

        if (activityData) {
          setLinkedActivity(activityData);
        }
      } else {
        setLinkedActivity(null);
      }

      // Fetch linked attachments
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

      // Fetch billing entries linked to this update
      const { data: billingData } = await supabase
        .from("case_finances")
        .select("id, description, amount, hours, hourly_rate, finance_type, date, status, category")
        .eq("update_id", updateData.id)
        .order("date", { ascending: false });

      if (billingData) {
        setBillingEntries(billingData);
      }
    } catch (error) {
      console.error("Error fetching update details:", error);
      toast({
        title: "Error",
        description: "Failed to load update details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!update) return;

    try {
      const { error } = await supabase
        .from("case_updates")
        .delete()
        .eq("id", update.id);

      if (error) throw error;

      toast({ title: "Success", description: "Update deleted" });
      navigate(`/cases/${caseId}?tab=updates`);
    } catch (error) {
      console.error("Error deleting update:", error);
      toast({
        title: "Error",
        description: "Failed to delete update",
        variant: "destructive",
      });
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

  const handleViewAttachment = (attachmentId: string) => {
    navigate(`/cases/${caseId}/attachments/${attachmentId}`);
  };

  const handleUnlinkAttachment = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("update_attachment_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setLinkedAttachments(prev => prev.filter(a => a.id !== linkId));
      toast({ title: "Success", description: "Attachment unlinked" });
    } catch (error) {
      console.error("Error unlinking attachment:", error);
      toast({
        title: "Error",
        description: "Failed to unlink attachment",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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

  if (!update || !caseInfo) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/cases/${caseId}?tab=updates`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Updates
        </Button>

        <div className="flex items-center gap-2">
          {update.linked_activity_id && !isClosedCase && (
            <CreateBillingItemButton
              activityId={update.linked_activity_id}
              updateId={update.id}
              updateDescription={update.description}
              organizationId={organization?.id || ""}
              variant="outline"
              onSuccess={fetchData}
            />
          )}
          {canEditUpdates && !isClosedCase && (
            <Button variant="outline" onClick={() => setEditFormOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDeleteUpdates && !isClosedCase && (
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main update card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl">{update.title}</CardTitle>
                {update.is_ai_summary && <AIBadge />}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                <Badge variant="outline">{update.update_type}</Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(update.created_at), "PPP 'at' p")}
                </span>
                {userProfile && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {userProfile.full_name || userProfile.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
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

          {/* Linked Activity */}
          {linkedActivity && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 font-semibold">
                <Link2 className="h-4 w-4" />
                Linked Activity
              </div>
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={linkedActivity.is_scheduled ? "default" : "secondary"}>
                          {linkedActivity.activity_type}
                        </Badge>
                        <span className="font-medium">{linkedActivity.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <Badge variant="outline">{linkedActivity.status}</Badge>
                        {linkedActivity.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(linkedActivity.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                        {linkedActivity.start_time && linkedActivity.end_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {linkedActivity.start_time} - {linkedActivity.end_time}
                          </span>
                        )}
                        {linkedActivity.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {linkedActivity.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/cases/${caseId}?tab=activities`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activity Timeline */}
          {update.activity_timeline && update.activity_timeline.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <ActivityTimelineDisplay timeline={update.activity_timeline} />
            </div>
          )}

          {/* Linked Attachments */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Paperclip className="h-4 w-4" />
                Linked Attachments
                {linkedAttachments.length > 0 && (
                  <Badge variant="secondary">{linkedAttachments.length}</Badge>
                )}
              </div>
              {canEditUpdates && !isClosedCase && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkDialogOpen(true)}
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  Link Attachment
                </Button>
              )}
            </div>

            {linkedAttachments.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {linkedAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors group relative"
                  >
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={() => handleViewAttachment(attachment.attachment_id)}
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
                        onClick={() => handleViewAttachment(attachment.attachment_id)}
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
                          onClick={() => handleViewAttachment(attachment.attachment_id)}
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
                    {canEditUpdates && !isClosedCase && (
                      <button
                        onClick={() => handleUnlinkAttachment(attachment.id)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Unlink attachment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No attachments linked to this update.
              </p>
            )}
          </div>

          {/* Billing / Time Entries */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <DollarSign className="h-4 w-4" />
                Billing / Time Entries
                {billingEntries.length > 0 && (
                  <Badge variant="secondary">{billingEntries.length}</Badge>
                )}
              </div>
              {update.linked_activity_id && !isClosedCase && (
                <CreateBillingItemButton
                  activityId={update.linked_activity_id}
                  updateId={update.id}
                  updateDescription={update.description}
                  organizationId={organization?.id || ""}
                  variant="outline"
                  size="sm"
                  onSuccess={fetchData}
                />
              )}
            </div>

            {billingEntries.length > 0 ? (
              <div className="space-y-2">
                {billingEntries.map((entry) => (
                  <Card key={entry.id} className="bg-muted/30">
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {entry.finance_type}
                            </Badge>
                            {entry.hours && entry.hourly_rate ? (
                              <span className="text-sm font-medium">
                                {entry.hours} hours @ {formatCurrency(entry.hourly_rate)}/hr = {formatCurrency(entry.amount)}
                              </span>
                            ) : (
                              <span className="text-sm font-medium">
                                {formatCurrency(entry.amount)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {entry.status && (
                              <Badge variant="secondary" className="capitalize text-xs">
                                {entry.status}
                              </Badge>
                            )}
                            <span>{format(new Date(entry.date), "MMM d, yyyy")}</span>
                            {entry.category && (
                              <span className="capitalize">{entry.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No billing entries linked to this update.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form Dialog */}
      <UpdateForm
        caseId={caseId!}
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        onSuccess={fetchData}
        editingUpdate={{
          id: update.id,
          title: update.title,
          description: update.description,
          created_at: update.created_at,
          update_type: update.update_type,
          user_id: update.user_id,
          activity_timeline: update.activity_timeline,
          is_ai_summary: update.is_ai_summary,
          linked_activity_id: update.linked_activity_id,
        }}
        organizationId={organization?.id || ""}
      />

      {/* Attachment Picker Dialog */}
      <AttachmentPickerDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        caseId={caseId!}
        updateId={update.id}
        organizationId={organization?.id || ""}
        existingLinkIds={linkedAttachments.map((a) => a.attachment_id)}
        onSuccess={() => {
          fetchData();
          toast({ title: "Success", description: "Attachments linked" });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{update.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CaseUpdateDetail;
