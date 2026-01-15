import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useUpdateEditability } from "@/hooks/useUpdateEditability";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Paperclip, 
  Download, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Link2, 
  X,
  Lock,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { AttachmentPreviewThumbnail } from "@/components/case-detail/AttachmentPreviewThumbnail";
import { ActivityTimelineDisplay } from "@/components/case-detail/ActivityTimelineDisplay";
import { AIBadge } from "@/components/ui/ai-badge";
import { UpdateForm } from "@/components/case-detail/UpdateForm";
import { AttachmentPickerDialog } from "@/components/case-detail/AttachmentPicker";
import { UpdateSidebar } from "@/components/update-detail/UpdateSidebar";
import { UpdateAuditSection } from "@/components/update-detail/UpdateAuditSection";
import { UpdateTimeExpensesSection } from "@/components/update-detail/UpdateTimeExpensesSection";
import { TimeExpensesPanel } from "@/components/case-detail/TimeExpensesPanel";
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
  updated_at?: string | null;
  update_type: string;
  user_id: string;
  case_id: string;
  activity_timeline: TimelineEntry[] | null;
  is_ai_summary: boolean;
  is_legacy_billing: boolean;
  linked_activity_id: string | null;
  ai_approved_by: string | null;
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
  account_name?: string | null;
}

const CaseUpdateDetail = () => {
  const { caseId, updateId } = useParams<{ caseId: string; updateId: string }>();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { navigateBack, getBackButtonLabel } = useNavigationSource();

  const [update, setUpdate] = useState<Update | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [aiApprover, setAiApprover] = useState<UserProfile | null>(null);
  const [linkedActivity, setLinkedActivity] = useState<LinkedActivity | null>(null);
  const [linkedAttachments, setLinkedAttachments] = useState<LinkedAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showTimeExpensesPanel, setShowTimeExpensesPanel] = useState(false);

  // Centralized editability logic
  const {
    canEdit,
    canDelete,
    canLinkAttachments,
    readOnlyReason,
    isOwner,
  } = useUpdateEditability(update, caseInfo?.status);

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
        updated_at: updateData.created_at,
        update_type: updateData.update_type,
        user_id: updateData.user_id,
        case_id: updateData.case_id,
        activity_timeline: updateData.activity_timeline as unknown as TimelineEntry[] | null,
        is_ai_summary: updateData.is_ai_summary || false,
        is_legacy_billing: updateData.is_legacy_billing || false,
        linked_activity_id: updateData.linked_activity_id,
        ai_approved_by: updateData.ai_approved_by,
      };
      setUpdate(mappedUpdate);

      const { data: caseData } = await supabase
        .from("cases")
        .select(`id, title, case_number, status, accounts(name)`)
        .eq("id", caseId)
        .maybeSingle();

      if (caseData) {
        setCaseInfo({
          id: caseData.id,
          title: caseData.title,
          case_number: caseData.case_number,
          status: caseData.status,
          account_name: (caseData.accounts as any)?.name || null,
        });
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", updateData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }

      if (updateData.ai_approved_by) {
        const { data: approverData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", updateData.ai_approved_by)
          .maybeSingle();

        if (approverData) {
          setAiApprover(approverData);
        }
      } else {
        setAiApprover(null);
      }

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

  const getDisplayTitle = (): string => {
    if (update?.title && update.title.toLowerCase() !== "update" && update.title.toLowerCase() !== "case update") {
      return update.title;
    }
    if (update?.description) {
      const plainText = update.description.replace(/<[^>]*>/g, "").trim();
      const firstLine = plainText.split("\n")[0].substring(0, 100);
      return firstLine || update.title;
    }
    return update?.title || "Update";
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!update || !caseInfo) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* ========== READ-ONLY BANNER ========== */}
      {readOnlyReason && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Read-Only:</span>
          <span className="text-sm">{readOnlyReason}</span>
        </div>
      )}

      {/* ========== UNIFIED HEADER ========== */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b">
        {/* Left: Back + Title + Metadata */}
        <div className="flex items-start gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 mt-0.5"
            onClick={() => navigateBack(navigate, `/cases/${caseId}?tab=updates`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight">{getDisplayTitle()}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <Badge variant="outline">{update.update_type}</Badge>
              {update.is_ai_summary && <AIBadge />}
              {isOwner && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                  Your Update
                </Badge>
              )}
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {userProfile?.full_name || userProfile?.email || "Unknown"}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(update.created_at), "PPP")}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditFormOpen(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ========== TWO-COLUMN LAYOUT ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column - Primary Content */}
        <div className="space-y-6">
          {/* ========== NARRATIVE SECTION (DOMINANT) ========== */}
          <Card className="border-primary/10">
            <CardHeader className="pb-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Narrative
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <RichTextDisplay
                html={update.description}
                fallback="No description provided."
                className="[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 prose prose-sm max-w-none min-h-[120px]"
              />

              {update.activity_timeline && update.activity_timeline.length > 0 && (
                <div className="pt-4 border-t">
                  <ActivityTimelineDisplay timeline={update.activity_timeline} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== ATTACHMENTS SECTION ========== */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Attachments
                  </h2>
                  {linkedAttachments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {linkedAttachments.length}
                    </Badge>
                  )}
                </div>
                {canLinkAttachments && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLinkDialogOpen(true)}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {linkedAttachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {linkedAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-start gap-2 p-2 border rounded-md bg-card hover:bg-muted/30 transition-colors group relative"
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
                          size="sm"
                          className="rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium truncate cursor-pointer hover:text-primary"
                          onClick={() => handleViewAttachment(attachment.attachment_id)}
                        >
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)}
                        </p>
                        <div className="flex gap-1 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleViewAttachment(attachment.attachment_id)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleDownload(attachment)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {canLinkAttachments && (
                        <button
                          onClick={() => handleUnlinkAttachment(attachment.id)}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Unlink attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No attachments linked to this update.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ========== TIME & EXPENSES SECTION ========== */}
          <UpdateTimeExpensesSection
            updateId={update.id}
            caseId={caseId!}
            organizationId={organization?.id || ""}
            canEdit={canEdit}
            onDataChange={fetchData}
          />
        </div>

        {/* Right Column - Sidebar */}
        <UpdateSidebar
          caseInfo={caseInfo}
          linkedActivity={linkedActivity}
          onViewCase={() => navigate(`/cases/${caseId}`)}
        />
      </div>

      {/* ========== AUDIT SECTION (BOTTOM, MUTED) ========== */}
      <UpdateAuditSection
        createdAt={update.created_at}
        updatedAt={update.updated_at}
        createdBy={userProfile}
        isLegacyBilling={update.is_legacy_billing}
        isAiSummary={update.is_ai_summary}
        aiApprovedBy={aiApprover}
      />

      {/* Edit Form Dialog */}
      <UpdateForm
        caseId={caseId!}
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        onSuccess={(options) => {
          fetchData();
          if (options?.addTimeExpenses && options?.updateId) {
            setShowTimeExpensesPanel(true);
          }
        }}
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

      {/* Time & Expenses Panel */}
      <TimeExpensesPanel
        open={showTimeExpensesPanel}
        onOpenChange={setShowTimeExpensesPanel}
        updateId={update.id}
        caseId={caseId!}
        organizationId={organization?.id || ""}
        onSaveComplete={() => {
          fetchData();
        }}
      />
    </div>
  );
};

export default CaseUpdateDetail;
