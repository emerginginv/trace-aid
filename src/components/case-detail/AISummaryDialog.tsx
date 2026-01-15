import React, { useState } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AIBadge } from "@/components/ui/ai-badge";
import { AIButton } from "@/components/ui/ai-button";
import { AILabel } from "@/components/ui/ai-label";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Update {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  update_type: string;
}

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  selectedUpdates: Update[];
  onSuccess: () => void;
}

type Step = "configure" | "generating" | "review";

export function AISummaryDialog({
  open,
  onOpenChange,
  caseId,
  selectedUpdates,
  onSuccess,
}: AISummaryDialogProps) {
  const { organization } = useOrganization();
  const [step, setStep] = useState<Step>("configure");
  const [title, setTitle] = useState("AI Summary");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = () => {
    setStep("configure");
    setTitle("AI Summary");
    setGeneratedSummary("");
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    setStep("generating");

    try {
      const { data, error } = await supabase.functions.invoke("generate-update-summary", {
        body: {
          update_ids: selectedUpdates.map((u) => u.id),
          case_id: caseId,
          organization_id: organization?.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setGeneratedSummary(data.summary || "");
      setStep("review");
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
      setStep("configure");
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get user's full name for the attribution
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name || user.email || "Unknown User";
      const approvalDate = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

      // Append AI attribution footer
      const summaryWithAttribution = `${generatedSummary}
<div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
  <em>AI-assisted summary — reviewed and approved by ${userName} on ${approvalDate}</em>
</div>`;

      // Create the new update
      const { data: newUpdate, error: updateError } = await supabase
        .from("case_updates")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organization.id,
          title,
          description: summaryWithAttribution,
          update_type: "AI Summary",
          is_ai_summary: true,
          ai_source_update_ids: selectedUpdates.map((u) => u.id),
          ai_approved_by: user.id,
        })
        .select()
        .single();

      if (updateError) throw updateError;

      // Log to security audit
      await supabase.from("security_audit_log").insert({
        event_type: "ai_summary_generated",
        user_id: user.id,
        organization_id: organization.id,
        metadata: {
          case_id: caseId,
          source_update_ids: selectedUpdates.map((u) => u.id),
          new_update_id: newUpdate?.id,
          source_count: selectedUpdates.length,
        },
      });

      toast({
        title: "Summary Saved",
        description: "The AI-generated summary has been saved as a new update.",
      });

      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error saving summary:", error);
      toast({
        title: "Error",
        description: "Failed to save summary",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(270,85%,55%)]" />
            {step === "configure" && "Generate AI Summary"}
            {step === "generating" && "Generating Summary..."}
            {step === "review" && (
              <>
                AI-Generated Summary (Draft)
                <AIBadge size="sm" />
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "configure" &&
              `Generate a consolidated summary from ${selectedUpdates.length} selected update(s).`}
            {step === "generating" && "Please wait while the AI analyzes the selected updates."}
            {step === "review" &&
              "Review and edit the summary before saving. This will create a new update."}
          </DialogDescription>
        </DialogHeader>

        {step === "configure" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Summary Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for the summary"
              />
            </div>

            <div className="space-y-2">
              <Label>Selected Updates ({selectedUpdates.length})</Label>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {selectedUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="px-3 py-2 border-b last:border-b-0 text-sm"
                  >
                    <div className="font-medium">{update.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {update.update_type} • {format(new Date(update.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">
                  The AI will analyze the selected updates and generate a consolidated summary.
                  You will be able to review and edit the summary before saving.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <AIButton onClick={handleGenerate} disabled={!title.trim()}>
                Generate Summary
              </AIButton>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Analyzing {selectedUpdates.length} update(s)...
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-title">Title</Label>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Generated Summary <AILabel showIcon={false}>AI-Generated</AILabel>
              </Label>
              {isEditing ? (
                <RichTextEditor
                  value={generatedSummary}
                  onChange={setGeneratedSummary}
                  placeholder="Edit the summary..."
                />
              ) : (
                <div
                  className="border rounded-lg p-4 prose prose-sm max-w-none bg-muted/30"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(generatedSummary, {
                      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "code", "pre"],
                      ALLOWED_ATTR: ["href", "target", "rel", "class"],
                    }) 
                  }}
                />
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    AI-Generated Content — Review Required
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    This summary was generated by artificial intelligence. Please review
                    carefully before saving. The saved update will include attribution
                    noting it as AI-assisted content.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <div className="flex gap-2">
                {isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Done Editing
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Summary
                  </Button>
                )}
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save as New Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
