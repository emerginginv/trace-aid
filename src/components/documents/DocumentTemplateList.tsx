import { useState, useEffect } from "react";
import { Plus, FileText, Pencil, Trash2, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DocumentTemplate,
  getAllDocumentTemplates,
  deleteDocumentTemplate,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documentTemplates";
import { DocumentTemplateEditor } from "./DocumentTemplateEditor";
import { LetterCategorySelector } from "./LetterCategorySelector";
import { GuidedLetterBuilder } from "./GuidedLetterBuilder";
import { LetterCategory, getCategoryConfig } from "@/lib/letterCategories";
import { ContextBanner } from "@/components/ui/context-banner";

type ViewMode = 'list' | 'category-select' | 'guided-builder' | 'free-editor';

export function DocumentTemplateList() {
  const { organization } = useOrganization();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategory, setSelectedCategory] = useState<LetterCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  const loadTemplates = async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getAllDocumentTemplates(organization.id);
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, [organization?.id]);

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    const success = await deleteDocumentTemplate(templateToDelete.id);
    if (success) {
      toast.success("Template deleted");
      loadTemplates();
    } else {
      toast.error("Failed to delete template");
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleSave = () => {
    setEditingTemplate(null);
    setViewMode('list');
    setSelectedCategory(null);
    loadTemplates();
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCategory(null);
    setEditingTemplate(null);
  };

  const handleCategorySelect = (category: LetterCategory) => {
    setSelectedCategory(category);
    setViewMode('guided-builder');
  };

  // Category selection screen
  if (viewMode === 'category-select') {
    return (
      <LetterCategorySelector
        onSelectCategory={handleCategorySelect}
        onBack={handleBackToList}
      />
    );
  }

  // Guided builder for selected category
  if (viewMode === 'guided-builder' && selectedCategory && organization?.id) {
    return (
      <GuidedLetterBuilder
        category={selectedCategory}
        organizationId={organization.id}
        onBack={() => setViewMode('category-select')}
        onSave={handleSave}
      />
    );
  }

  // Free-form editor for editing existing templates
  if (viewMode === 'free-editor' || editingTemplate) {
    return (
      <DocumentTemplateEditor
        template={editingTemplate}
        onSave={handleSave}
        onCancel={handleBackToList}
      />
    );
  }

  // Get category info for display
  const getCategoryLabel = (category: string | undefined): string => {
    if (!category) return '';
    const config = getCategoryConfig(category as LetterCategory);
    return config?.shortName || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Document Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage reusable document structures
          </p>
        </div>
        <Button onClick={() => setViewMode('category-select')}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <ContextBanner
        variant="template"
        title="Templates define structure only"
        description="Templates are reusable document frameworks with placeholders. They do NOT contain case-specific content. When you generate a letter for a case, the template is filled with that case's data."
        tips={[
          "Use {{PLACEHOLDER}} syntax for dynamic content",
          "Templates apply to ALL cases—customize letters per-case when generating"
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layout className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No document templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create your first template structure to generate letters and documents from case data.
            </p>
            <Button onClick={() => setViewMode('category-select')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => {
            const categoryLabel = getCategoryLabel((template as any).letterCategory);
            return (
              <Card key={template.id} className={!template.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                        Template
                      </Badge>
                      <Badge variant="secondary">
                        {DOCUMENT_TYPE_LABELS[template.documentType]}
                      </Badge>
                      {categoryLabel && (
                        <Badge variant="secondary">{categoryLabel}</Badge>
                      )}
                      {!template.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTemplate(template);
                          setViewMode('free-editor');
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
              Existing documents generated from this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
