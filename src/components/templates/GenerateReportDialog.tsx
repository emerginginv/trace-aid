import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getOrganizationTemplates, getReportTemplate, ReportTemplate, TemplateCustomization } from "@/lib/reportTemplates";
import { generateReport, ReportInstance } from "@/lib/reportEngine";
import { ReportInstanceViewer } from "@/components/templates/ReportInstanceViewer";
import { TemplateCustomizer } from "@/components/templates/TemplateCustomizer";
import { FileText, Settings2 } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Update {
  created_at: string;
  title: string;
  update_type: string;
  description: string | null;
  user_id: string;
}

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseData: {
    title: string;
    case_number: string;
    case_manager_id: string | null;
  };
  updates: Update[];
  userProfiles: Record<string, { full_name: string }>;
}

export const GenerateReportDialog = ({
  open,
  onOpenChange,
  caseId,
  caseData,
}: GenerateReportDialogProps) => {
  const { organization } = useOrganization();
  
  // Template state
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  
  // Common state
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  // Preview state
  const [generatedReport, setGeneratedReport] = useState<ReportInstance | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  // Customization state
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selectedTemplateForCustomization, setSelectedTemplateForCustomization] = useState<ReportTemplate | null>(null);
  const [templateCustomization, setTemplateCustomization] = useState<TemplateCustomization | null>(null);

  useEffect(() => {
    if (open) {
      fetchUser();
    }
  }, [open, caseId]);

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
  };

  const fetchTemplates = async () => {
    if (!organization?.id) return;
    
    try {
      const fetchedTemplates = await getOrganizationTemplates(organization.id);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const result = await generateReport({
        caseId,
        templateId: selectedTemplateId,
        organizationId: organization?.id || "",
        userId,
        customization: templateCustomization || undefined,
      });

      if (!result.success || !result.reportInstance) {
        throw new Error(result.error || "Failed to generate report");
      }

      setGeneratedReport(result.reportInstance);
      setViewerOpen(true);

      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenCustomizer = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Select a template",
        description: "Please select a template before customizing",
        variant: "destructive",
      });
      return;
    }

    // Fetch full template with sections
    const fullTemplate = await getReportTemplate(selectedTemplateId);
    if (!fullTemplate) {
      toast({
        title: "Error",
        description: "Failed to load template details",
        variant: "destructive",
      });
      return;
    }

    setSelectedTemplateForCustomization(fullTemplate);
    setCustomizerOpen(true);
  };

  const handleApplyCustomization = (customization: TemplateCustomization) => {
    setTemplateCustomization(customization);
    toast({
      title: "Customization applied",
      description: "Your changes will be used when generating the report",
    });
  };

  // Clear customization when template changes
  useEffect(() => {
    setTemplateCustomization(null);
    setSelectedTemplateForCustomization(null);
  }, [selectedTemplateId]);

  const hasTemplates = templates.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Select a template to generate a report from case data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!hasTemplates ? (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No templates available. Create one in Settings → Report Templates.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select 
                    value={selectedTemplateId} 
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            {template.name}
                            {template.isSystemTemplate && (
                              <Badge variant="outline" className="text-xs">System</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {templates.find(t => t.id === selectedTemplateId)?.description || 
                          "Generates a report using structured sections."}
                      </p>
                      
                      {/* Customize Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleOpenCustomizer}
                      >
                        <Settings2 className="h-4 w-4 mr-2" />
                        Customize Template
                        {templateCustomization && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Modified
                          </Badge>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerate} 
                    disabled={generating || !selectedTemplateId} 
                    className="w-full sm:w-auto"
                  >
                    {generating ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Viewer */}
      {generatedReport && (
        <ReportInstanceViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          report={generatedReport}
        />
      )}

      {/* Template Customizer */}
      {selectedTemplateForCustomization && (
        <TemplateCustomizer
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          template={selectedTemplateForCustomization}
          onApply={handleApplyCustomization}
          initialCustomization={templateCustomization || undefined}
        />
      )}
    </>
  );
};
