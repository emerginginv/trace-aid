import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { toast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { AttachmentViewerHeader } from "@/components/attachment-viewer/AttachmentViewerHeader";
import { FullscreenPdfViewer } from "@/components/attachment-viewer/FullscreenPdfViewer";
import { ImageViewer } from "@/components/attachment-viewer/ImageViewer";
import { usePreviewLogging } from "@/hooks/use-preview-logging";
import { Loader2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

export default function AttachmentViewer() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const caseId = searchParams.get("caseId");
  const returnTab = searchParams.get("returnTab") || "attachments";
  const { logPreview } = usePreviewLogging();
  const hasLoggedPreview = useRef(false);

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [caseAttachments, setCaseAttachments] = useState<Attachment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useSetBreadcrumbs(
    attachment
      ? [
          { label: "Cases", href: "/cases" },
          { label: attachment.name || attachment.file_name },
        ]
      : []
  );

  // Fetch single attachment and all case attachments
  const fetchAttachmentData = useCallback(async () => {
    if (!id) {
      setError("No attachment ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!orgMember) {
        setError("No organization found");
        setLoading(false);
        return;
      }

      // Fetch the attachment
      const { data: attachmentData, error: attachmentError } = await supabase
        .from("case_attachments")
        .select("*")
        .eq("id", id)
        .eq("organization_id", orgMember.organization_id)
        .single();

      if (attachmentError || !attachmentData) {
        setError("Attachment not found or access denied");
        setLoading(false);
        return;
      }

      setAttachment(attachmentData);

      // Fetch all attachments in the same case for navigation
      const { data: allAttachments } = await supabase
        .from("case_attachments")
        .select("*")
        .eq("case_id", attachmentData.case_id)
        .eq("organization_id", orgMember.organization_id)
        .order("created_at", { ascending: false });

      if (allAttachments) {
        setCaseAttachments(allAttachments);
        const idx = allAttachments.findIndex(a => a.id === id);
        setCurrentIndex(idx >= 0 ? idx : 0);
      }

      // Download the file
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("case-attachments")
        .download(attachmentData.file_path);

      if (downloadError || !fileBlob) {
        setError("Failed to load file");
        setLoading(false);
        return;
      }

      // Create blob URL for images and other types
      const url = URL.createObjectURL(fileBlob);
      setBlobUrl(url);

      // For PDFs, also get ArrayBuffer
      if (attachmentData.file_type.includes("pdf")) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        setFileData(arrayBuffer);
      }

      // Log the preview for audit
      if (!hasLoggedPreview.current) {
        logPreview(attachmentData.id, 'case', 'fullscreen');
        hasLoggedPreview.current = true;
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching attachment:", err);
      setError("Failed to load attachment");
      setLoading(false);
    }
  }, [id, logPreview]);

  useEffect(() => {
    hasLoggedPreview.current = false;
    fetchAttachmentData();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fetchAttachmentData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, caseAttachments]);

  const handleClose = () => {
    if (caseId) {
      navigate(`/cases/${caseId}?tab=${returnTab}`);
    } else if (attachment?.case_id) {
      navigate(`/cases/${attachment.case_id}?tab=${returnTab}`);
    } else {
      navigate(-1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevAttachment = caseAttachments[currentIndex - 1];
      navigate(`/attachments/${prevAttachment.id}/view?caseId=${caseId || attachment?.case_id}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < caseAttachments.length - 1) {
      const nextAttachment = caseAttachments[currentIndex + 1];
      navigate(`/attachments/${nextAttachment.id}/view?caseId=${caseId || attachment?.case_id}`);
    }
  };

  const handleDownload = async () => {
    if (!attachment || !blobUrl) return;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Download started",
      description: attachment.file_name,
    });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading attachment...</p>
        </div>
      </PageTransition>
    );
  }

  if (error || !attachment) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <FileWarning className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Attachment</h2>
          <p className="text-muted-foreground mb-6">{error || "Attachment not found"}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </PageTransition>
    );
  }

  const isPdf = attachment.file_type.includes("pdf");
  const isImage = attachment.file_type.startsWith("image/");

  return (
    <PageTransition className="flex flex-col h-[calc(100vh-4rem)]">
      <AttachmentViewerHeader
        attachment={attachment}
        currentIndex={currentIndex}
        totalCount={caseAttachments.length}
        onClose={handleClose}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onDownload={handleDownload}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < caseAttachments.length - 1}
      />

      <div className="flex-1 overflow-hidden bg-muted/30">
        {isPdf && fileData ? (
          <FullscreenPdfViewer
            pdfData={fileData}
            fileName={attachment.file_name}
            onDownload={handleDownload}
          />
        ) : isImage && blobUrl ? (
          <ImageViewer
            src={blobUrl}
            alt={attachment.name || attachment.file_name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <FileWarning className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Preview not available</p>
            <p className="text-muted-foreground mb-4">
              This file type ({attachment.file_type}) cannot be previewed
            </p>
            <Button onClick={handleDownload}>Download File</Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
