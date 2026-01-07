import { useState, useEffect } from "react";
import { FileText, Eye, Maximize2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DocumentTemplate,
  getOrganizationDocumentTemplates,
  createDocumentInstance,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documentTemplates";
import {
  buildDocumentVariables,
  renderDocument,
  wrapInDocumentHtml,
} from "@/lib/documentEngine";
import { buildConditionalContextFromCase } from "@/lib/letterTemplateRenderer";
import { CaseVariables } from "@/lib/caseVariables";
import { getOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";
import { PaginatedDocumentViewer } from "./PaginatedDocumentViewer";
import { 
  validateBeforeCaseGeneration,
  type PreGenerationCaseValidation 
} from "@/lib/letterDocumentEngine";
import { ValidationStatusBanner } from "./ValidationStatusBanner";

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseData: CaseVariables;
  onGenerated: () => void;
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  caseId,
  caseData,
  onGenerated,
}: GenerateDocumentDialogProps) {
  const { organization } = useOrganization();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [validation, setValidation] = useState<PreGenerationCaseValidation | null>(null);

  useEffect(() => {
    if (open && organization?.id) {
      loadData();
    }
  }, [open, organization?.id]);

  const loadData = async () => {
    if (!organization?.id) return;
    setLoading(true);
    
    const [templatesData, profileData] = await Promise.all([
      getOrganizationDocumentTemplates(organization.id),
      getOrganizationProfile(organization.id),
    ]);
    
    setTemplates(templatesData);
    setOrgProfile(profileData);
    setLoading(false);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Auto-generate title
      const baseTitle = `${template.name} - ${caseData.caseNumber || caseData.caseTitle}`;
      setTitle(baseTitle);
    }
    setPreview(null);
    setValidation(null);
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;
    
    // Build conditional context from case data
    const conditionalContext = buildConditionalContextFromCase(caseData);
    const variables = buildDocumentVariables(caseData, orgProfile);
    const rendered = renderDocument(selectedTemplate.body, variables, conditionalContext);
    
    // Run validation
    const validationResult = validateBeforeCaseGeneration(
      selectedTemplate.body,
      rendered,
      caseData
    );
    setValidation(validationResult);
    setPreview(rendered);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !organization?.id || !title.trim()) {
      toast.error("Please select a template and enter a title");
      return;
    }
    
    // Run validation if not already done
    if (!validation) {
      handlePreview();
      return;
    }
    
    if (!validation.canProceed) {
      toast.error("Please fix validation errors before generating");
      return;
    }

    setGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build conditional context from case data
      const conditionalContext = buildConditionalContextFromCase(caseData);
      const variables = buildDocumentVariables(caseData, orgProfile);
      const rendered = renderDocument(selectedTemplate.body, variables, conditionalContext);
      const fullHtml = wrapInDocumentHtml(rendered, title, true, orgProfile);

      const instance = await createDocumentInstance(
        caseId,
        organization.id,
        user.id,
        selectedTemplate.id,
        title.trim(),
        selectedTemplate.documentType,
        fullHtml,
        orgProfile as unknown as Record<string, unknown> || {},
        caseData as unknown as Record<string, unknown>
      );

      if (instance) {
        toast.success("Document generated successfully");
        onGenerated();
        onOpenChange(false);
        // Reset form
        setSelectedTemplateId("");
        setTitle("");
        setPreview(null);
      } else {
        toast.error("Failed to generate document");
      }
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("An error occurred while generating the document");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Letter for This Case
            </DialogTitle>
            <DialogDescription>
              Select a template structure, then generate a letter customized with this case's data and settings
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No document templates available. Create templates in Settings → Templates.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Template *</Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <span className="flex items-center gap-2">
                              {template.name}
                              <span className="text-xs text-muted-foreground">
                                ({DOCUMENT_TYPE_LABELS[template.documentType]})
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-title">Document Title *</Label>
                    <Input
                      id="doc-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter document title..."
                    />
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-3 text-sm border border-green-200 dark:border-green-800">
                      <p className="font-medium text-green-800 dark:text-green-200">
                        📝 This letter will be customized for: {caseData.caseNumber || caseData.caseTitle}
                      </p>
                      <p className="text-green-700 dark:text-green-300 mt-1">
                        Placeholders will be replaced with this case's data. Fee waiver and expedited sections will appear based on your case settings.
                      </p>
                    </div>

                    {/* Validation Status */}
                    {validation && (
                      <ValidationStatusBanner validation={validation} />
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Preview</Label>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={handlePreview}>
                            <Eye className="h-4 w-4 mr-2" />
                            Show Preview
                          </Button>
                          {preview && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setShowFullscreen(true)}
                              title="Open fullscreen preview"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {preview ? (
                        <div className="h-[300px]">
                          <PaginatedDocumentViewer
                            content={preview}
                            title="Document Preview"
                            compact
                            showFooter={false}
                          />
                        </div>
                      ) : (
                        <div className="h-[100px] border rounded-md flex items-center justify-center text-muted-foreground">
                          Click "Show Preview" to see the document with case data
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedTemplateId || !title.trim() || generating || (validation && !validation.canProceed)}
            >
              {generating ? "Generating..." : "Generate Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col p-0 gap-0">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">Document Preview</span>
              {title && (
                <span className="text-sm text-muted-foreground">— {title}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {preview && (
              <PaginatedDocumentViewer
                content={preview}
                title="Document Preview"
                showHeader={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
