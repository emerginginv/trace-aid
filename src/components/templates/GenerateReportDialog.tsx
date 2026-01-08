import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getDocxTemplates, generateDocxReport, saveGeneratedReport, type DocxTemplate } from "@/lib/docxTemplateEngine";

import { FileText, Download, Loader2 } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseData: {
    title: string;
    case_number: string;
    case_manager_id: string | null;
  };
}

export const GenerateReportDialog = ({
  open,
  onOpenChange,
  caseId,
  caseData,
}: GenerateReportDialogProps) => {
  const { organization } = useOrganization();
  
  const [templates, setTemplates] = useState<DocxTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && organization?.id) {
      fetchTemplates();
    }
  }, [open, organization?.id]);

  const fetchTemplates = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const fetchedTemplates = await getDocxTemplates(organization.id);
      setTemplates(fetchedTemplates.filter(t => t.isActive));
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId || !organization?.id) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setGenerating(true);
    try {
      const result = await generateDocxReport(template.filePath, caseId, organization.id);
      
      if (result) {
        // Get user ID and save the generated report
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveGeneratedReport(
            result.blob,
            caseId,
            template.id,
            template.name,
            organization.id,
            user.id,
            result.variables,
            template.filenameTemplate
          );
        }
        
        // Download the generated file
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name} - ${caseData.case_number}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Success",
        description: "Report generated and downloaded successfully",
      });
      
      onOpenChange(false);
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

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const hasTemplates = templates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Select a DOCX template to generate a report for case {caseData.case_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasTemplates ? (
            <div className="text-center py-6">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No templates available. Upload a DOCX template in Settings → Report Templates.
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
                          <FileText className="h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedTemplate && (
                  <div className="space-y-2 pt-2">
                    {selectedTemplate.description && (
                      <p className="text-xs text-muted-foreground">
                        {selectedTemplate.description}
                      </p>
                    )}
                    
                    {selectedTemplate.detectedVariables && selectedTemplate.detectedVariables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">Variables:</span>
                        {selectedTemplate.detectedVariables.slice(0, 5).map((v, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                        {selectedTemplate.detectedVariables.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{selectedTemplate.detectedVariables.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
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
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate & Download
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
