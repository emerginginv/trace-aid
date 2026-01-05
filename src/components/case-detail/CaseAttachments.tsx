import { useEffect, useState, useCallback, useRef } from "react";
import { AttachmentsTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, File, FileText, Image as ImageIcon, Video, Music, Search, LayoutGrid, List, Pencil, X, ShieldAlert, Share2, Link2, ShieldOff, History, ExternalLink, MoreVertical } from "lucide-react";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { RevokeMode } from "./RevokeAccessDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getPlanLimits } from "@/lib/planLimits";
import { usePermissions } from "@/hooks/usePermissions";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ShareAttachmentDialog } from "./ShareAttachmentDialog";
import { AttachmentSelectionBar } from "./AttachmentSelectionBar";
import { BulkShareAttachmentDialog } from "./BulkShareAttachmentDialog";
import { EmailAttachmentsDialog } from "./EmailAttachmentsDialog";
import { RevokeAccessDialog } from "./RevokeAccessDialog";
import { AttachmentAccessLogDialog } from "./AttachmentAccessLogDialog";
import { CaseAccessAuditPanel } from "./CaseAccessAuditPanel";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { AttachmentPreviewThumbnail } from "./AttachmentPreviewThumbnail";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { PdfViewer } from "./PdfViewer";

interface Attachment {
  id: string;
  case_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
  preview_path?: string | null;
  preview_status?: string | null;
  preview_generated_at?: string | null;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'complete' | 'error';
  progress?: number;
}

interface CaseAttachmentsProps {
  caseId: string;
  caseNumber?: string;
  isClosedCase?: boolean;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "select", label: "", hideable: false },
  { key: "name", label: "Name" },
  { key: "file_type", label: "Type" },
  { key: "file_size", label: "Size" },
  { key: "created_at", label: "Uploaded" },
  { key: "tags", label: "Tags" },
  { key: "actions", label: "Actions", hideable: false },
];

export const CaseAttachments = ({ caseId, caseNumber = "", isClosedCase = false }: CaseAttachmentsProps) => {
  const { organization } = useOrganization();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", tags: "" });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAttachmentForShare, setSelectedAttachmentForShare] = useState<Attachment | null>(null);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharedAttachmentIds, setSharedAttachmentIds] = useState<Set<string>>(new Set());
  
  // Bulk actions dialogs
  const [bulkShareDialogOpen, setBulkShareDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeMode, setRevokeMode] = useState<RevokeMode>("bulk");
  const [singleRevokeAttachment, setSingleRevokeAttachment] = useState<Attachment | null>(null);
  
  // Access log dialog state
  const [accessLogDialogOpen, setAccessLogDialogOpen] = useState(false);
  const [accessLogAttachment, setAccessLogAttachment] = useState<Attachment | null>(null);
  
  // File Blob state (to bypass blocked signed URLs for all file types)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewBlobData, setPreviewBlobData] = useState<ArrayBuffer | null>(null);
  const [previewBlobLoading, setPreviewBlobLoading] = useState(false);
  const [previewBlobError, setPreviewBlobError] = useState<string | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  
  // Confirmation hook for single revoke
  const { confirm, ConfirmDialog } = useConfirmation();
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("case-attachments", "created_at", "desc");

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewAttachments = hasPermission("view_attachments");
  const canAddAttachments = hasPermission("add_attachments");
  const canEditAttachments = hasPermission("edit_attachments");
  const canDeleteAttachments = hasPermission("delete_attachments");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("case-attachments-columns", COLUMNS);

  useEffect(() => {
    fetchAttachments();
  }, [caseId]);

  // Effect to load file as blob when previewing (for all file types to avoid signed URL blocking)
  useEffect(() => {
    // Cleanup function for blob URL
    const cleanupBlobUrl = () => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      setPreviewBlobUrl(null);
      setPreviewBlobData(null);
      setPreviewBlobError(null);
    };

    const loadPreviewBlob = async () => {
      if (!previewAttachment) {
        cleanupBlobUrl();
        return;
      }

      setPreviewBlobLoading(true);
      setPreviewBlobError(null);
      cleanupBlobUrl();

      try {
        const { data, error } = await supabase.storage
          .from("case-attachments")
          .download(previewAttachment.file_path);

        if (error) throw error;
        if (!data) throw new Error("No data received");

        // Create blob URL first (for non-PDF previews and download)
        const blobUrl = URL.createObjectURL(data);
        previewBlobUrlRef.current = blobUrl;
        setPreviewBlobUrl(blobUrl);

        // For PDFs, get ArrayBuffer from a fresh blob read
        if (previewAttachment.file_type.includes("pdf")) {
          const arrayBuffer = await data.arrayBuffer();
          setPreviewBlobData(arrayBuffer);
        }
      } catch (error) {
        console.error("Error loading file preview:", error);
        setPreviewBlobError("Failed to load file preview");
      } finally {
        setPreviewBlobLoading(false);
      }
    };

    loadPreviewBlob();

    return cleanupBlobUrl;
  }, [previewAttachment]);

  useEffect(() => {
    if (attachments.length > 0) {
      fetchSharedStatus();
    }
  }, [attachments]);

  // Note: We no longer generate signed URLs for all attachments
  // Instead, we use authenticated downloads (blob URLs) which bypass blocked signed URL patterns
  // The previewUrls state is kept for compatibility but no longer populated

  const fetchAttachments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!orgMember) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("case_attachments")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", orgMember.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedStatus = useCallback(async () => {
    try {
      const attachmentIds = attachments.map(a => a.id);
      
      const { data, error } = await supabase
        .from("attachment_access")
        .select("attachment_id")
        .in("attachment_id", attachmentIds)
        .eq("attachment_type", "case")
        .is("revoked_at", null)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (error) throw error;

      const sharedIds = new Set(data?.map(d => d.attachment_id) || []);
      setSharedAttachmentIds(sharedIds);
    } catch (error) {
      console.error("Error fetching shared status:", error);
    }
  }, [attachments]);

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredAttachments.map(a => a.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check storage limits
    if (organization) {
      const planLimits = getPlanLimits(organization.subscription_product_id);
      const totalNewSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      const totalNewSizeGb = totalNewSize / (1024 * 1024 * 1024);
      const currentStorageGb = organization.storage_used_gb || 0;
      const projectedStorage = currentStorageGb + totalNewSizeGb;

      if (projectedStorage > planLimits.storage_gb) {
        const remainingGb = Math.max(0, planLimits.storage_gb - currentStorageGb);
        toast({
          title: "Storage Limit Exceeded",
          description: `Your ${planLimits.name} allows ${planLimits.storage_gb} GB of storage. You have ${remainingGb.toFixed(2)} GB remaining. Please upgrade your plan to upload more files.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Create uploading entries with local previews
    const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as const,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const uploadingFile of newUploadingFiles) {
        try {
          const file = uploadingFile.file;
          const fileExt = file.name.split(".").pop();
          const filePath = `${user.id}/${caseId}/${crypto.randomUUID()}.${fileExt}`;

          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from("case-attachments")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Save metadata to database
          const { error: dbError } = await supabase
            .from("case_attachments")
            .insert({
              case_id: caseId,
              user_id: user.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type || "application/octet-stream",
              file_size: file.size,
            });

          if (dbError) throw dbError;

          // Update status to complete
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id ? { ...f, status: 'complete' as const } : f
            )
          );

          // Cleanup blob URL
          URL.revokeObjectURL(uploadingFile.preview);
        } catch (error) {
          console.error(`Error uploading ${uploadingFile.file.name}:`, error);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id ? { ...f, status: 'error' as const } : f
            )
          );
        }
      }

      toast({
        title: "Success",
        description: `${fileArray.length} file(s) uploaded successfully`,
      });
      
      // Update organization usage
      await supabase.functions.invoke("update-org-usage");
      
      // Refresh attachments list
      await fetchAttachments();
      
      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.status === 'uploading'));
      }, 2000);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await uploadFiles(files);
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    await uploadFiles(files);
  };

  const handleDownload = async (attachment: Attachment) => {
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
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("case-attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("case_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      fetchAttachments();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (fileType.startsWith("video/")) return <Video className="h-8 w-8 text-purple-500" />;
    if (fileType.startsWith("audio/")) return <Music className="h-8 w-8 text-green-500" />;
    if (fileType.includes("pdf") || extension === "pdf") return <FileText className="h-8 w-8 text-red-500" />;
    if (extension === "doc" || extension === "docx") return <FileText className="h-8 w-8 text-blue-600" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeCategory = (fileType: string) => {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.startsWith("video/")) return "video";
    if (fileType.startsWith("audio/")) return "audio";
    if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("word")) return "document";
    return "other";
  };

  const handleEdit = (attachment: Attachment) => {
    setEditingAttachment(attachment);
    setEditForm({
      name: attachment.name || attachment.file_name,
      description: attachment.description || "",
      tags: attachment.tags?.join(", ") || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAttachment) return;

    try {
      const tagsArray = editForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const { error } = await supabase
        .from("case_attachments")
        .update({
          name: editForm.name || editingAttachment.file_name,
          description: editForm.description || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        })
        .eq("id", editingAttachment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attachment updated successfully",
      });

      setEditingAttachment(null);
      fetchAttachments();
    } catch (error) {
      console.error("Error updating attachment:", error);
      toast({
        title: "Error",
        description: "Failed to update attachment",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (attachment: Attachment) => {
    setPreviewAttachment(attachment);
  };

  const handleShare = (attachment: Attachment) => {
    setSelectedAttachmentForShare(attachment);
    setShareDialogOpen(true);
  };

  // Handle single attachment revocation
  const handleSingleRevoke = async (attachment: Attachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Get link count for this attachment
    const { data } = await supabase
      .from("attachment_access")
      .select("id")
      .eq("attachment_id", attachment.id)
      .eq("attachment_type", "case")
      .is("revoked_at", null)
      .or("expires_at.is.null,expires_at.gt.now()");
    
    const linkCount = data?.length || 0;
    
    if (linkCount === 0) {
      toast({
        title: "No active links",
        description: "This attachment has no active share links to revoke.",
      });
      return;
    }
    
    const confirmed = await confirm({
      title: "Revoke Access",
      description: `This will immediately revoke all ${linkCount} active share link${linkCount !== 1 ? 's' : ''} for "${attachment.name || attachment.file_name}". Recipients will no longer be able to access this file.`,
      variant: "destructive",
    });
    
    if (confirmed) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from("attachment_access")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by_user_id: user.id,
        })
        .eq("attachment_id", attachment.id)
        .eq("attachment_type", "case")
        .is("revoked_at", null);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to revoke access",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Access revoked",
        description: `Revoked ${linkCount} share link${linkCount !== 1 ? 's' : ''}`,
      });
      
      fetchSharedStatus();
    }
  };

  // Handle case-level revocation (opens dialog in case mode)
  const handleRevokeCaseLinks = () => {
    setRevokeMode("case");
    setRevokeDialogOpen(true);
  };

  // Handle bulk revocation (from selection bar)
  const handleBulkRevoke = () => {
    setRevokeMode("bulk");
    setRevokeDialogOpen(true);
  };

  // Handle viewing access log for a single attachment
  const handleViewAccessLog = (attachment: Attachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAccessLogAttachment(attachment);
    setAccessLogDialogOpen(true);
  };

  const renderPreviewContent = () => {
    if (!previewAttachment) return null;

    // Show loading state while fetching file blob
    if (previewBlobLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      );
    }

    // Show error state with download option
    if (previewBlobError || !previewBlobUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
          <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Preview not available</p>
          <p className="text-muted-foreground mb-4">
            {previewBlobError || "Loading..."}
          </p>
          <Button onClick={() => handleDownload(previewAttachment)}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      );
    }

    // Handle PDFs with PdfViewer component
    if (previewAttachment.file_type.includes("pdf")) {
      if (!previewBlobData) {
        return (
          <div className="flex flex-col items-center justify-center py-12 h-[70vh] bg-muted/30 rounded">
            <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">PDF preview loading...</p>
          </div>
        );
      }

      return (
        <PdfViewer
          pdfData={previewBlobData}
          fileName={previewAttachment.file_name}
          onDownload={() => handleDownload(previewAttachment)}
        />
      );
    }

    // Handle images with blob URL
    if (previewAttachment.file_type.startsWith("image/")) {
      return (
        <div className="flex flex-col items-center">
          <img src={previewBlobUrl} alt={previewAttachment.file_name} className="max-w-full max-h-[80vh] rounded" />
          <div className="flex gap-2 justify-center mt-4 pt-4 border-t w-full">
            <Button variant="outline" size="sm" onClick={() => window.open(previewBlobUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload(previewAttachment)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    // Handle videos with blob URL
    if (previewAttachment.file_type.startsWith("video/")) {
      return (
        <div className="flex flex-col">
          <video controls className="w-full max-h-[80vh] rounded">
            <source src={previewBlobUrl} type={previewAttachment.file_type} />
          </video>
          <div className="flex gap-2 justify-center mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => handleDownload(previewAttachment)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    // Handle audio with blob URL
    if (previewAttachment.file_type.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center gap-4">
          <audio controls className="w-full">
            <source src={previewBlobUrl} type={previewAttachment.file_type} />
          </audio>
          <Button variant="outline" size="sm" onClick={() => handleDownload(previewAttachment)}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      );
    }

    // Fallback for unsupported file types
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">Preview not available</p>
        <p className="text-muted-foreground mb-4">Download to view this file</p>
        <Button onClick={() => handleDownload(previewAttachment)}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  // Get unique tags from all attachments
  const allTags = Array.from(
    new Set(
      attachments
        .flatMap((attachment) => attachment.tags || [])
        .filter(Boolean)
    )
  ).sort();

  const filteredAttachments = attachments.filter((attachment) => {
    const displayName = attachment.name || attachment.file_name;
    const matchesSearch = searchQuery === "" || 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attachment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attachment.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === "all" || getFileTypeCategory(attachment.file_type) === typeFilter;
    
    const matchesTag = tagFilter === "all" || attachment.tags?.includes(tagFilter);
    
    return matchesSearch && matchesType && matchesTag;
  });

  // Calculate selection state
  const selectedAttachments = filteredAttachments.filter(a => selectedIds.has(a.id));
  const hasSharedSelected = selectedAttachments.some(a => sharedAttachmentIds.has(a.id));
  const allSelected = filteredAttachments.length > 0 && filteredAttachments.every(a => selectedIds.has(a.id));

  const handleBulkShareSuccess = () => {
    fetchSharedStatus();
    clearSelection();
  };

  const handleRevokeSuccess = () => {
    fetchSharedStatus();
    clearSelection();
  };

  if (permissionsLoading || loading) {
    return <AttachmentsTabSkeleton />;
  }

  if (!canViewAttachments) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            You don't have permission to view attachments. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Selection Bar */}
        <AttachmentSelectionBar
          selectedCount={selectedIds.size}
          hasSharedSelected={hasSharedSelected}
          canEditAttachments={canEditAttachments}
          onGenerateLinks={() => setBulkShareDialogOpen(true)}
          onEmailAttachments={() => setEmailDialogOpen(true)}
          onRevokeAccess={handleBulkRevoke}
          onClearSelection={clearSelection}
        />
        
        {/* Confirmation dialog for single revoke */}
        <ConfirmDialog />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Attachments</h2>
            <p className="text-muted-foreground">
              {filteredAttachments.length} file{filteredAttachments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Case-level revoke button - only show when there are shared attachments */}
            {canEditAttachments && sharedAttachmentIds.size > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={handleRevokeCaseLinks}
                    className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5"
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Revoke All Links
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Revoke all active share links for this case ({sharedAttachmentIds.size} shared file{sharedAttachmentIds.size !== 1 ? 's' : ''})
                </TooltipContent>
              </Tooltip>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const exportColumns: ExportColumn[] = [
                    { key: "name", label: "Name", format: (v, row) => v || row.file_name },
                    { key: "file_type", label: "Type", format: (v) => getFileTypeCategory(v) },
                    { key: "file_size", label: "Size", format: (v) => formatFileSize(v) },
                    { key: "created_at", label: "Uploaded", format: (v) => format(new Date(v), "MMM d, yyyy") },
                    { key: "tags", label: "Tags", format: (v) => v?.join(", ") || "-" },
                    { key: "description", label: "Description", format: (v) => v || "-" },
                  ];
                  exportToCSV(filteredAttachments, exportColumns, "case-attachments");
                }}>
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const exportColumns: ExportColumn[] = [
                    { key: "name", label: "Name", format: (v, row) => v || row.file_name },
                    { key: "file_type", label: "Type", format: (v) => getFileTypeCategory(v) },
                    { key: "file_size", label: "Size", format: (v) => formatFileSize(v) },
                    { key: "created_at", label: "Uploaded", format: (v) => format(new Date(v), "MMM d, yyyy") },
                    { key: "tags", label: "Tags", format: (v) => v?.join(", ") || "-" },
                  ];
                  exportToPDF(filteredAttachments, exportColumns, "case-attachments", "Case Attachments");
                }}>
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canAddAttachments && !isClosedCase && (
              <Button onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        </div>

        {/* Drag-and-Drop Zone - only show if user can add attachments */}
        {canAddAttachments && !isClosedCase && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
            className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop files here, or{' '}
              <span className="text-primary font-medium underline">click to upload</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Supports images, videos, audio, PDF, DOC, and more
            </p>
          </div>
        )}

        {/* Uploading Files Preview */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile) => (
              <Card key={uploadingFile.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0">
                      {uploadingFile.file.type.startsWith('image/') ? (
                        <img
                          src={uploadingFile.preview}
                          alt={uploadingFile.file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : uploadingFile.file.type.startsWith('video/') ? (
                        <video
                          src={uploadingFile.preview}
                          className="h-10 w-10 object-cover rounded"
                          muted
                        />
                      ) : (
                        getFileIcon(uploadingFile.file.type, uploadingFile.file.name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {uploadingFile.status === 'uploading' && 'Uploading...'}
                        {uploadingFile.status === 'complete' && '✓ Uploaded'}
                        {uploadingFile.status === 'error' && '✗ Upload failed'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="flex-1 sm:w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="flex-1 sm:w-32">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.length === 0 ? (
                  <SelectItem value="none" disabled>No tags</SelectItem>
                ) : (
                  allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-md p-0.5">
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-9 w-9"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === "card" ? "secondary" : "ghost"} 
                size="icon"
                onClick={() => setViewMode("card")}
                className="h-9 w-9"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <ColumnVisibility
              columns={COLUMNS}
              visibility={visibility}
              onToggle={toggleColumn}
              onReset={resetToDefaults}
            />
          </div>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {attachments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="font-semibold text-lg mb-2">No attachments yet</h3>
              <p className="text-muted-foreground text-center">
                Upload files to get started
              </p>
            </CardContent>
          </Card>
        ) : filteredAttachments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No files match your search criteria</p>
            </CardContent>
          </Card>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredAttachments.map((attachment) => {
              const isSelected = selectedIds.has(attachment.id);
              const isShared = sharedAttachmentIds.has(attachment.id);

              return (
                <Card 
                  key={attachment.id} 
                  className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all relative ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handlePreview(attachment)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePreview(attachment);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    {/* Selection checkbox */}
                    <div 
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => toggleSelection(attachment.id, e)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="bg-background/80 backdrop-blur-sm"
                      />
                    </div>
                    
                    {/* Shared indicator */}
                    {isShared && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="absolute top-2 right-2 z-10 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1"
                          >
                            <Link2 className="h-3 w-3" />
                            Shared
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>This file has active share links</TooltipContent>
                      </Tooltip>
                    )}

                    <AttachmentPreviewThumbnail
                      filePath={attachment.file_path}
                      fileName={attachment.file_name}
                      fileType={attachment.file_type}
                      previewPath={attachment.preview_path}
                      previewStatus={attachment.preview_status}
                      size="lg"
                      className="w-full h-40"
                    />
                    <div className="mt-2">
                      <div className="text-sm font-medium truncate" title={attachment.name || attachment.file_name}>
                        {attachment.name || attachment.file_name}
                      </div>
                      {attachment.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {attachment.description}
                        </p>
                      )}
                      {attachment.tags && attachment.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {attachment.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex justify-end mt-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {canEditAttachments && !isClosedCase && (
                            <DropdownMenuItem onClick={() => handleEdit(attachment)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canEditAttachments && (
                            <DropdownMenuItem onClick={() => handleShare(attachment)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                          )}
                          {canEditAttachments && isShared && (
                            <DropdownMenuItem 
                              onClick={() => handleSingleRevoke(attachment)}
                              className="text-destructive focus:text-destructive"
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Revoke
                            </DropdownMenuItem>
                          )}
                          {isShared && (
                            <DropdownMenuItem onClick={() => handleViewAccessLog(attachment)}>
                              <History className="h-4 w-4 mr-2" />
                              Access Log
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {canDeleteAttachments && !isClosedCase && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(attachment)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 py-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAll();
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-12 sm:w-16 py-2">Preview</TableHead>
                  <TableHead className="py-2 min-w-[150px]">File Name</TableHead>
                  <TableHead className="py-2 hidden sm:table-cell">Size</TableHead>
                  <TableHead className="py-2 hidden md:table-cell">Uploaded</TableHead>
                  <TableHead className="text-right py-2 min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttachments.map((attachment) => {
                  const isSelected = selectedIds.has(attachment.id);
                  const isShared = sharedAttachmentIds.has(attachment.id);
                  
                  return (
                  <TableRow 
                    key={attachment.id} 
                    className={`text-sm cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => handlePreview(attachment)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePreview(attachment);
                      }
                    }}
                  >
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(attachment.id)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <AttachmentPreviewThumbnail
                        filePath={attachment.file_path}
                        fileName={attachment.file_name}
                        fileType={attachment.file_type}
                        previewPath={attachment.preview_path}
                        previewStatus={attachment.preview_status}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {attachment.name || attachment.file_name}
                          {isShared && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>This file has active share links</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {attachment.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {attachment.description}
                          </p>
                        )}
                        {attachment.tags && attachment.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {attachment.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 hidden sm:table-cell">{formatFileSize(attachment.file_size)}</TableCell>
                    <TableCell className="py-1.5 hidden md:table-cell">{new Date(attachment.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right py-1.5">
                      <div className="flex justify-end gap-1">
                        {canEditAttachments && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(attachment);
                            }}
                            disabled={isClosedCase}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        {canEditAttachments && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(attachment);
                            }}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            title="Share"
                          >
                            <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        {canEditAttachments && isShared && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleSingleRevoke(attachment, e)}
                                className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                title="Revoke Links"
                              >
                                <ShieldOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revoke share links</TooltipContent>
                          </Tooltip>
                        )}
                        {isShared && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleViewAccessLog(attachment, e)}
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                title="View Access Log"
                              >
                                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View access log</TooltipContent>
                          </Tooltip>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(attachment);
                          }}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          title="Download"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        {canDeleteAttachments && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(attachment);
                            }}
                            disabled={isClosedCase}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewAttachment?.name || previewAttachment?.file_name}</DialogTitle>
            </DialogHeader>
            <div className="w-full overflow-hidden">
              {renderPreviewContent()}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingAttachment} onOpenChange={() => setEditingAttachment(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Attachment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  type="text"
                  placeholder="Attachment name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  placeholder="Add a description..."
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tags</label>
                <Input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingAttachment(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ShareAttachmentDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          attachment={selectedAttachmentForShare}
          attachmentType="case"
        />

        <BulkShareAttachmentDialog
          open={bulkShareDialogOpen}
          onOpenChange={setBulkShareDialogOpen}
          attachments={selectedAttachments}
          attachmentType="case"
          onSuccess={handleBulkShareSuccess}
        />

        <EmailAttachmentsDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          attachments={selectedAttachments}
          caseNumber={caseNumber}
          caseId={caseId}
          attachmentType="case"
          onSuccess={handleBulkShareSuccess}
        />

        <RevokeAccessDialog
          open={revokeDialogOpen}
          onOpenChange={setRevokeDialogOpen}
          attachments={revokeMode === "case" ? [] : selectedAttachments}
          attachmentType="case"
          mode={revokeMode}
          allCaseAttachmentIds={revokeMode === "case" ? attachments.map(a => a.id) : undefined}
          onSuccess={handleRevokeSuccess}
        />

        <AttachmentAccessLogDialog
          open={accessLogDialogOpen}
          onOpenChange={setAccessLogDialogOpen}
          attachment={accessLogAttachment}
        />

        {/* Access Audit Panel - collapsible at bottom */}
        <CaseAccessAuditPanel
          caseId={caseId}
          attachments={attachments}
          canExport={canEditAttachments}
        />
      </div>
    </TooltipProvider>
  );
};
