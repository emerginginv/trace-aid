import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AIBadge } from "@/components/ui/ai-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  X,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { AttachmentPreviewThumbnail } from "./AttachmentPreviewThumbnail";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string | null;
  tags?: string[] | null;
  preview_path?: string | null;
  preview_status?: string | null;
}

interface AnalysisResult {
  attachment_id: string;
  file_name: string;
  description: string;
  tags: string[];
  success: boolean;
  error?: string;
}

interface AIAttachmentAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAttachments: Attachment[];
  onSuccess: () => void;
}

type Step = "preview" | "analyzing" | "review";

export function AIAttachmentAnalysisDialog({
  open,
  onOpenChange,
  selectedAttachments,
  onSuccess,
}: AIAttachmentAnalysisDialogProps) {
  const { organization } = useOrganization();
  const [step, setStep] = useState<Step>("preview");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [editedResults, setEditedResults] = useState<Record<string, { description: string; tags: string }>>({});
  const [selectedForApply, setSelectedForApply] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState(0);

  // Initialize selected items when results come in
  useEffect(() => {
    if (results.length > 0) {
      const successfulIds = new Set(results.filter(r => r.success).map(r => r.attachment_id));
      setSelectedForApply(successfulIds);
      
      // Initialize edited results
      const edited: Record<string, { description: string; tags: string }> = {};
      results.forEach(r => {
        edited[r.attachment_id] = {
          description: r.description,
          tags: r.tags.join(", ")
        };
      });
      setEditedResults(edited);
    }
  }, [results]);

  const resetState = () => {
    setStep("preview");
    setResults([]);
    setEditedResults({});
    setSelectedForApply(new Set());
    setIsSaving(false);
    setCurrentlyAnalyzing(0);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleAnalyze = async () => {
    setStep("analyzing");
    setCurrentlyAnalyzing(0);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-attachment", {
        body: {
          attachment_ids: selectedAttachments.map((a) => a.id),
          organization_id: organization?.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);
      setStep("review");
    } catch (error) {
      console.error("Error analyzing attachments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze attachments",
        variant: "destructive",
      });
      setStep("preview");
    }
  };

  const toggleSelectForApply = (id: string) => {
    setSelectedForApply(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const updateEditedResult = (id: string, field: "description" | "tags", value: string) => {
    setEditedResults(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleApplySelected = async () => {
    if (selectedForApply.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one attachment to apply changes.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Update each selected attachment
      for (const attachmentId of selectedForApply) {
        const edited = editedResults[attachmentId];
        if (!edited) continue;

        const tags = edited.tags
          .split(",")
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0);

        const { error } = await supabase
          .from("case_attachments")
          .update({
            description: edited.description,
            tags: tags
          })
          .eq("id", attachmentId)
          .eq("organization_id", organization?.id);

        if (error) {
          console.error(`Error updating attachment ${attachmentId}:`, error);
        }
      }

      // Log to security audit
      await supabase.from("security_audit_log").insert({
        event_type: "ai_attachment_analysis",
        user_id: user.id,
        organization_id: organization?.id,
        metadata: {
          attachment_ids: Array.from(selectedForApply),
          applied_count: selectedForApply.size,
          total_analyzed: results.length,
        },
      });

      toast({
        title: "Changes Applied",
        description: `Updated ${selectedForApply.size} attachment(s) with AI-generated descriptions and tags.`,
      });

      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error applying changes:", error);
      toast({
        title: "Error",
        description: "Failed to apply changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (fileType.startsWith("audio/")) return <Music className="h-4 w-4" />;
    if (fileType.includes("pdf") || fileType.includes("document")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {step === "preview" && "AI Attachment Analysis"}
            {step === "analyzing" && "Analyzing Attachments..."}
            {step === "review" && (
              <>
                AI Analysis Results (Draft)
                <AIBadge />
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "preview" &&
              `Analyze ${selectedAttachments.length} attachment(s) to generate descriptions and tags.`}
            {step === "analyzing" && "Please wait while the AI analyzes the selected files."}
            {step === "review" &&
              "Review and edit the generated descriptions and tags before applying."}
          </DialogDescription>
        </DialogHeader>

        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selected Attachments ({selectedAttachments.length})</Label>
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-2">
                  {selectedAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
                    >
                      <AttachmentPreviewThumbnail
                        filePath={attachment.file_path}
                        fileName={attachment.file_name}
                        fileType={attachment.file_type}
                        previewPath={attachment.preview_path}
                        previewStatus={attachment.preview_status}
                        size="sm"
                        className="h-12 w-12 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{attachment.file_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {getFileIcon(attachment.file_type)}
                          <span>{formatFileSize(attachment.file_size)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-muted-foreground">
                    The AI will analyze file content to generate factual, objective descriptions
                    suitable for investigative documentation. You will be able to review and edit
                    all suggestions before applying them.
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    <strong>Supported:</strong> Images (full visual analysis), PDFs, DOCX (metadata analysis), 
                    Videos/Audio (filename only)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAnalyze}>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Attachments
              </Button>
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Analyzing {selectedAttachments.length} attachment(s)...
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a moment for images with visual analysis
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-4">
                {results.map((result) => {
                  const attachment = selectedAttachments.find(a => a.id === result.attachment_id);
                  const isSelected = selectedForApply.has(result.attachment_id);
                  const edited = editedResults[result.attachment_id];

                  return (
                    <div
                      key={result.attachment_id}
                      className={`p-4 rounded-lg border ${
                        result.success 
                          ? isSelected ? 'border-primary bg-primary/5' : 'border-border' 
                          : 'border-destructive/50 bg-destructive/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {result.success && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectForApply(result.attachment_id)}
                            className="mt-1"
                          />
                        )}
                        
                        {attachment && (
                          <AttachmentPreviewThumbnail
                            filePath={attachment.file_path}
                            fileName={attachment.file_name}
                            fileType={attachment.file_type}
                            previewPath={attachment.preview_path}
                            previewStatus={attachment.preview_status}
                            size="sm"
                            className="h-16 w-16 flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{result.file_name}</span>
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                          </div>

                          {result.success && edited ? (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Textarea
                                  value={edited.description}
                                  onChange={(e) => updateEditedResult(result.attachment_id, "description", e.target.value)}
                                  className="text-sm min-h-[60px]"
                                  placeholder="Enter description..."
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Tags (comma-separated)</Label>
                                <Input
                                  value={edited.tags}
                                  onChange={(e) => updateEditedResult(result.attachment_id, "tags", e.target.value)}
                                  className="text-sm"
                                  placeholder="tag1, tag2, tag3..."
                                />
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-destructive">
                              {result.error || "Analysis failed"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    AI-Generated Content — Review Required
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    These descriptions and tags were generated by AI. Please review and edit
                    as needed before applying. All content should be factual and objective.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleApplySelected}
                  disabled={isSaving || selectedForApply.size === 0}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Apply to {selectedForApply.size} Selected
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
