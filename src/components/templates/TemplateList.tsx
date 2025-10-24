import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Copy } from "lucide-react";
import { TemplateEditor } from "./TemplateEditor";

interface Template {
  id: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const TemplateList = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_update_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("case_update_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

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

  const handleDuplicate = async (template: Template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("case_update_templates")
        .insert({
          user_id: user.id,
          name: `${template.name} (Copy)`,
          body: template.body,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(undefined);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingTemplate(undefined);
    fetchTemplates();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Case Update Templates</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create templates for generating reports from case updates
          </p>
        </div>
        <Button onClick={handleNew} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">No templates yet</p>
            <Button onClick={handleNew} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base break-words">{template.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Updated {new Date(template.updated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex flex-row gap-2 sm:gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4 sm:mr-0" />
                      <span className="sm:hidden ml-2">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                      className="flex-1 sm:flex-none"
                    >
                      <Copy className="h-4 w-4 sm:mr-0" />
                      <span className="sm:hidden ml-2">Duplicate</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-0" />
                      <span className="sm:hidden ml-2">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="bg-muted p-3 rounded-md overflow-x-auto">
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {template.body.substring(0, 200)}
                    {template.body.length > 200 ? "..." : ""}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSuccess={handleEditorClose}
        template={editingTemplate}
      />
    </div>
  );
};
