import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Copy, Layers } from "lucide-react";
import { ReportTemplateEditor } from "./ReportTemplateEditor";
import {
  type ReportTemplate,
  getOrganizationTemplates,
  deleteReportTemplate,
  duplicateSystemTemplate,
} from "@/lib/reportTemplates";
import { useOrganization } from "@/contexts/OrganizationContext";

export const TemplateList = () => {
  const { organization } = useOrganization();
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportEditorOpen, setReportEditorOpen] = useState(false);
  const [editingReportTemplateId, setEditingReportTemplateId] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchAllTemplates();
    }
  }, [organization?.id]);

  const fetchAllTemplates = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch report templates
      const templates = await getOrganizationTemplates(organization.id);
      setReportTemplates(templates);
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

  // Report template handlers
  const handleDeleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const success = await deleteReportTemplate(id);
      if (!success) throw new Error("Failed to delete");

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      fetchAllTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateReport = async (template: ReportTemplate) => {
    if (!organization?.id || !userId) return;

    try {
      const newTemplate = await duplicateSystemTemplate(
        template.id,
        organization.id,
        userId
      );

      if (!newTemplate) throw new Error("Failed to duplicate");

      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
      fetchAllTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleEditReport = (template: ReportTemplate) => {
    setEditingReportTemplateId(template.id);
    setReportEditorOpen(true);
  };

  const handleNewReport = () => {
    setEditingReportTemplateId(undefined);
    setReportEditorOpen(true);
  };

  const handleReportEditorClose = () => {
    setReportEditorOpen(false);
    setEditingReportTemplateId(undefined);
    fetchAllTemplates();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading templates...</div>;
  }

  const systemTemplates = reportTemplates.filter(t => t.isSystemTemplate);
  const customTemplates = reportTemplates.filter(t => !t.isSystemTemplate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Report Templates</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create and manage structured report templates
          </p>
        </div>
      </div>

      {/* System Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">System Templates</h4>
          <Badge variant="secondary" className="text-xs">
            {systemTemplates.length} available
          </Badge>
        </div>
        
        {systemTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No system templates available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm break-words flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {template.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      System
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditReport(template)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDuplicateReport(template)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Custom Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Custom Templates</h4>
          <Button onClick={handleNewReport} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>
        
        {customTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No custom templates yet. Create one or duplicate a system template.
              </p>
              <Button onClick={handleNewReport} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create Custom Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {customTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm break-words flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {template.description || 'No description'} • Updated {new Date(template.updatedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditReport(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateReport(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReport(template.id)}
                        className="text-destructive hover:text-destructive"
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
      </div>

      {/* Editor */}
      <ReportTemplateEditor
        open={reportEditorOpen}
        onOpenChange={setReportEditorOpen}
        onSuccess={handleReportEditorClose}
        templateId={editingReportTemplateId}
      />
    </div>
  );
};
