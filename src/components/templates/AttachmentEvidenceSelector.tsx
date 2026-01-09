import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AttachmentPreviewThumbnail } from "@/components/case-detail/AttachmentPreviewThumbnail";
import { ChevronDown, ChevronRight, Paperclip, FileText, Image, Link2 } from "lucide-react";
import { format } from "date-fns";

interface CaseAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
  preview_path: string | null;
}

interface UpdateLink {
  attachment_id: string;
  update_id: string;
  update_title: string;
}

interface AttachmentEvidenceSelectorProps {
  caseId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

type FilterType = "all" | "update-linked" | "documents" | "images";

export const AttachmentEvidenceSelector = ({
  caseId,
  selectedIds,
  onSelectionChange,
}: AttachmentEvidenceSelectorProps) => {
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [updateLinks, setUpdateLinks] = useState<UpdateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetchAttachments();
  }, [caseId]);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      // Fetch all case attachments
      const { data: attachmentData } = await supabase
        .from("case_attachments")
        .select("id, file_name, file_type, file_size, file_path, created_at, preview_path")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (attachmentData) {
        setAttachments(attachmentData);
        // Default: select all attachments
        if (selectedIds.length === 0) {
          onSelectionChange(attachmentData.map(a => a.id));
        }
      }

      // Fetch update-attachment links with update titles
      const { data: linkData } = await supabase
        .from("update_attachment_links")
        .select(`
          attachment_id,
          update_id,
          case_updates!inner(title, case_id)
        `)
        .eq("case_updates.case_id", caseId);

      if (linkData) {
        const links: UpdateLink[] = linkData.map((l: any) => ({
          attachment_id: l.attachment_id,
          update_id: l.update_id,
          update_title: l.case_updates?.title || "Untitled Update",
        }));
        setUpdateLinks(links);
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  const linkedAttachmentIds = useMemo(() => {
    return new Set(updateLinks.map(l => l.attachment_id));
  }, [updateLinks]);

  const getLinkedUpdates = (attachmentId: string) => {
    return updateLinks.filter(l => l.attachment_id === attachmentId);
  };

  const filteredAttachments = useMemo(() => {
    switch (filter) {
      case "update-linked":
        return attachments.filter(a => linkedAttachmentIds.has(a.id));
      case "documents":
        const docTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
        return attachments.filter(a => docTypes.includes(a.file_type?.toLowerCase() || ""));
      case "images":
        const imgTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
        return attachments.filter(a => imgTypes.includes(a.file_type?.toLowerCase() || ""));
      default:
        return attachments;
    }
  }, [attachments, filter, linkedAttachmentIds]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredAttachments.map(a => a.id));
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredAttachments.map(a => a.id));
    onSelectionChange(selectedIds.filter(id => !filteredIds.has(id)));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const selectedCount = filteredAttachments.filter(a => selectedIds.includes(a.id)).length;

  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Paperclip className="h-4 w-4" />
          <span className="font-medium text-sm">Evidence Attachments</span>
          <Badge variant="secondary" className="text-xs">
            {selectedIds.length}/{attachments.length} selected
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3 overflow-hidden">
          <div className="flex flex-col gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
              <TabsList className="h-auto flex-wrap gap-1 w-full justify-start">
                <TabsTrigger value="all" className="text-xs px-2 h-7">
                  All ({attachments.length})
                </TabsTrigger>
                <TabsTrigger value="update-linked" className="text-xs px-2 h-7">
                  <Link2 className="h-3 w-3 mr-1" />
                  Linked ({[...linkedAttachmentIds].length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs px-2 h-7">
                  <FileText className="h-3 w-3 mr-1" />
                  Docs
                </TabsTrigger>
                <TabsTrigger value="images" className="text-xs px-2 h-7">
                  <Image className="h-3 w-3 mr-1" />
                  Images
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs h-7">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll} className="text-xs h-7">
                Deselect All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[200px] border rounded-md">
            <div className="p-2 space-y-1">
              {filteredAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attachments match the current filter
                </p>
              ) : (
                filteredAttachments.map((attachment) => {
                  const linkedUpdates = getLinkedUpdates(attachment.id);
                  const isSelected = selectedIds.includes(attachment.id);
                  
                  return (
                    <label
                      key={attachment.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(attachment.id)}
                      />
                      
                      <div className="w-10 h-10 flex-shrink-0">
                        <AttachmentPreviewThumbnail
                          filePath={attachment.file_path}
                          fileName={attachment.file_name}
                          fileType={attachment.file_type}
                          previewPath={attachment.preview_path}
                          size="sm"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.file_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                          <span>{format(new Date(attachment.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>

                      {linkedUpdates.length > 0 && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          <Link2 className="h-3 w-3 mr-1" />
                          {linkedUpdates.length === 1 
                            ? linkedUpdates[0].update_title.slice(0, 15) + (linkedUpdates[0].update_title.length > 15 ? "..." : "")
                            : `${linkedUpdates.length} updates`
                          }
                        </Badge>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground">
            {selectedCount} of {filteredAttachments.length} {filter !== "all" ? "filtered " : ""}attachments will be included in <code className="bg-muted px-1 rounded">{"{{Files.*}}"}</code> variables
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
