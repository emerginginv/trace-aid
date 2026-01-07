import { useState, useEffect } from "react";
import { FileText, Eye, Maximize2, ZoomIn, ZoomOut, X } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { CaseVariables } from "@/lib/caseVariables";
import { getOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseData: CaseVariables;
  onGenerated: () => void;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

// Styles that match the final document output
const documentPreviewStyles: React.CSSProperties = {
  fontFamily: "'Times New Roman', Times, Georgia, serif",
  fontSize: '12pt',
  lineHeight: 1.6,
  color: '#000',
  backgroundColor: '#fff',
  padding: '1.5rem',
};

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
  const [zoomLevel, setZoomLevel] = useState(100);

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
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;
    
    const variables = buildDocumentVariables(caseData, orgProfile);
    const rendered = renderDocument(selectedTemplate.body, variables);
    setPreview(rendered);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !organization?.id || !title.trim()) {
      toast.error("Please select a template and enter a title");
      return;
    }

    setGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const variables = buildDocumentVariables(caseData, orgProfile);
      const rendered = renderDocument(selectedTemplate.body, variables);
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

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Document
            </DialogTitle>
            <DialogDescription>
              Select a template to generate a letter or document for this case
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
                      <ScrollArea className="h-[300px] border rounded-md bg-white">
                        <div
                          style={documentPreviewStyles}
                          dangerouslySetInnerHTML={{ __html: preview }}
                        />
                      </ScrollArea>
                    ) : (
                      <div className="h-[100px] border rounded-md flex items-center justify-center text-muted-foreground">
                        Click "Show Preview" to see the document with case data
                      </div>
                    )}
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
              disabled={!selectedTemplateId || !title.trim() || generating}
            >
              {generating ? "Generating..." : "Generate Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">Document Preview</span>
              {title && (
                <span className="text-sm text-muted-foreground">— {title}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-md p-1 bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  disabled={zoomLevel === ZOOM_LEVELS[0]}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Select
                  value={zoomLevel.toString()}
                  onValueChange={(v) => setZoomLevel(parseInt(v))}
                >
                  <SelectTrigger className="w-20 h-7 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZOOM_LEVELS.map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {level}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomIn}
                  disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
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
          </div>
          
          <ScrollArea className="flex-1 bg-muted/30">
            <div className="flex justify-center p-8">
              <div
                className="bg-white shadow-lg border"
                style={{
                  width: `${8.5 * 96}px`, // 8.5 inches at 96 DPI
                  minHeight: `${11 * 96}px`, // 11 inches at 96 DPI
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <div
                  style={{
                    ...documentPreviewStyles,
                    padding: '1in',
                  }}
                  dangerouslySetInnerHTML={{ __html: preview || '' }}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
