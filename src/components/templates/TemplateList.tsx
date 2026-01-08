import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, FileText, Eye, Upload } from "lucide-react";
import { getDocxTemplates, deleteDocxTemplate, type DocxTemplate } from "@/lib/docxTemplateEngine";
import { DocxTemplateUploader } from "./DocxTemplateUploader";
import { VariableReferenceSheet } from "./VariableReferenceSheet";
import { useOrganization } from "@/contexts/OrganizationContext";

export const TemplateList = () => {
  const { organization } = useOrganization();
  const [templates, setTemplates] = useState<DocxTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [variableSheetOpen, setVariableSheetOpen] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  const fetchTemplates = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      const fetchedTemplates = await getDocxTemplates(organization.id);
      setTemplates(fetchedTemplates);
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

  const handleDelete = async (template: DocxTemplate) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteDocxTemplate(template.id, template.filePath);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleDownloadOriginal = async (template: DocxTemplate) => {
    try {
      const { data, error } = await supabase.storage
        .from('docx-templates')
        .download(template.filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleUploaderClose = () => {
    setUploaderOpen(false);
    fetchTemplates();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Document Templates</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Upload DOCX templates with variable placeholders to generate reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setVariableSheetOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            View Variables
          </Button>
          <Button onClick={() => setUploaderOpen(true)} size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Upload Template
          </Button>
        </div>
      </div>

      {/* Tip */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> After uploading a document template, you can generate reports from within any case 
            by clicking the "Generate Report" button in the Reports tab.
          </p>
        </CardContent>
      </Card>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Templates Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a DOCX template with {"{{variable}}"} placeholders to get started.
            </p>
            <Button onClick={() => setUploaderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm break-words flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      {template.name}
                      {!template.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {template.description || 'No description'} • 
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </CardDescription>
                    
                    {/* Detected Variables */}
                    {template.detectedVariables && template.detectedVariables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.detectedVariables.slice(0, 4).map((v, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                        {template.detectedVariables.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.detectedVariables.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Case Types */}
                    {template.caseTypes && template.caseTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-muted-foreground">For:</span>
                        {template.caseTypes.map((type, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadOriginal(template)}
                      title="Download original template"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      className="text-destructive hover:text-destructive"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <DocxTemplateUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        onUploaded={handleUploaderClose}
      />

      {/* Variable Reference Sheet */}
      <VariableReferenceSheet
        open={variableSheetOpen}
        onOpenChange={setVariableSheetOpen}
      />
    </div>
  );
};
