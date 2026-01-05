import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Loader2 } from "lucide-react";
import { SectionEditor } from "./SectionEditor";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  type ReportTemplate,
  type TemplateSection,
  type SectionType,
  getReportTemplate,
  createReportTemplate,
  updateReportTemplate,
  createTemplateSection,
  updateTemplateSection,
  deleteTemplateSection,
  reorderSections,
} from "@/lib/reportTemplates";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ReportTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  templateId?: string;
}

interface SortableSectionProps {
  section: TemplateSection;
  onUpdate: (updates: Partial<TemplateSection>) => void;
  onDelete: () => void;
  isReadOnly: boolean;
}

function SortableSection({ section, onUpdate, onDelete, isReadOnly }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SectionEditor
        section={section}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}

export function ReportTemplateEditor({
  open,
  onOpenChange,
  onSuccess,
  templateId,
}: ReportTemplateEditorProps) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [isSystemTemplate, setIsSystemTemplate] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      if (templateId) {
        loadTemplate(templateId);
      } else {
        resetForm();
      }
    }
  }, [open, templateId]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSections([]);
    setIsSystemTemplate(false);
    setCurrentTemplateId(null);
  };

  const loadTemplate = async (id: string) => {
    setLoading(true);
    try {
      const template = await getReportTemplate(id);
      if (template) {
        setName(template.name);
        setDescription(template.description || "");
        setSections(template.sections);
        setIsSystemTemplate(template.isSystemTemplate);
        setCurrentTemplateId(template.id);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!organization?.id) throw new Error("Organization not found");

      let savedTemplateId = currentTemplateId;

      if (!savedTemplateId) {
        // Create new template
        const newTemplate = await createReportTemplate({
          organizationId: organization.id,
          userId: user.id,
          name,
          description: description || null,
          isSystemTemplate: false,
          isActive: true,
        });
        
        if (!newTemplate) throw new Error("Failed to create template");
        savedTemplateId = newTemplate.id;
        setCurrentTemplateId(savedTemplateId);
      } else {
        // Update existing template
        const success = await updateReportTemplate(savedTemplateId, {
          name,
          description: description || null,
        });
        
        if (!success) throw new Error("Failed to update template");
      }

      // Save sections
      for (const section of sections) {
        if (section.id.startsWith('temp-')) {
          // New section - create it
          await createTemplateSection({
            templateId: savedTemplateId,
            title: section.title,
            sectionType: section.sectionType,
            displayOrder: section.displayOrder,
            content: section.content,
            variableConfig: section.variableConfig,
            collectionConfig: section.collectionConfig,
            isVisible: section.isVisible,
          });
        } else {
          // Existing section - update it
          await updateTemplateSection(section.id, {
            title: section.title,
            sectionType: section.sectionType,
            displayOrder: section.displayOrder,
            content: section.content,
            variableConfig: section.variableConfig,
            collectionConfig: section.collectionConfig,
            isVisible: section.isVisible,
          });
        }
      }

      // Reorder sections
      const sectionIds = sections
        .filter(s => !s.id.startsWith('temp-'))
        .map(s => s.id);
      if (sectionIds.length > 0) {
        await reorderSections(savedTemplateId, sectionIds);
      }

      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: `temp-${Date.now()}`,
      templateId: currentTemplateId || '',
      title: 'New Section',
      sectionType: 'static_text',
      displayOrder: sections.length + 1,
      content: '<p></p>',
      variableConfig: null,
      collectionConfig: null,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (index: number, updates: Partial<TemplateSection>) => {
    setSections(prev => prev.map((s, i) => 
      i === index ? { ...s, ...updates } : s
    ));
  };

  const handleDeleteSection = async (index: number) => {
    const section = sections[index];
    
    // If it's a saved section (not temp), delete from database
    if (!section.id.startsWith('temp-')) {
      const success = await deleteTemplateSection(section.id);
      if (!success) {
        toast({
          title: "Error",
          description: "Failed to delete section",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update display orders
        return reordered.map((item, index) => ({
          ...item,
          displayOrder: index + 1,
        }));
      });
    }
  };

  const isReadOnly = isSystemTemplate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {templateId ? (isSystemTemplate ? 'View System Template' : 'Edit Template') : 'New Report Template'}
          </DialogTitle>
          <DialogDescription>
            {isSystemTemplate 
              ? 'System templates are read-only. Duplicate to customize.'
              : 'Define the structure of your report template with ordered sections.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template metadata */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Standard Investigation Report"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template"
                  disabled={isReadOnly}
                  rows={1}
                />
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Sections</Label>
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={handleAddSection}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Section
                  </Button>
                )}
              </div>

              {sections.length === 0 ? (
                <div className="border rounded-md p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No sections yet. Add sections to define your template structure.
                  </p>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={handleAddSection}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Section
                    </Button>
                  )}
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sections.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {sections.map((section, index) => (
                        <SortableSection
                          key={section.id}
                          section={section}
                          onUpdate={(updates) => handleUpdateSection(index, updates)}
                          onDelete={() => handleDeleteSection(index)}
                          isReadOnly={isReadOnly}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
