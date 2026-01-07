import { useState, useEffect } from "react";
import { ArrowLeft, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DocumentTemplate,
  DocumentType,
  createDocumentTemplate,
  updateDocumentTemplate,
  DOCUMENT_TYPE_OPTIONS,
} from "@/lib/documentTemplates";
import { getDefaultTemplateBody, getAvailablePlaceholders } from "@/lib/documentEngine";
import { ContextBanner } from "@/components/ui/context-banner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface DocumentTemplateEditorProps {
  template: DocumentTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

export function DocumentTemplateEditor({
  template,
  onSave,
  onCancel,
}: DocumentTemplateEditorProps) {
  const { organization } = useOrganization();
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [documentType, setDocumentType] = useState<DocumentType>(
    template?.documentType || "letter"
  );
  const [body, setBody] = useState(template?.body || "");
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [placeholdersOpen, setPlaceholdersOpen] = useState(false);

  const placeholders = getAvailablePlaceholders();
  const placeholdersByCategory = placeholders.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof placeholders>);

  // Set default body when document type changes (only for new templates)
  useEffect(() => {
    if (!template && !body) {
      setBody(getDefaultTemplateBody(documentType));
    }
  }, []);

  const handleTypeChange = (newType: DocumentType) => {
    setDocumentType(newType);
    // Only set default body if current body is empty or matches a default template
    if (!body || Object.values(['letter', 'notice', 'request', 'agreement']).some(t => 
      body === getDefaultTemplateBody(t)
    )) {
      setBody(getDefaultTemplateBody(newType));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (template) {
        // Update existing
        const success = await updateDocumentTemplate(template.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          documentType,
          body,
          isActive,
        });

        if (success) {
          toast.success("Template updated");
          onSave();
        } else {
          toast.error("Failed to update template");
        }
      } else {
        // Create new
        const created = await createDocumentTemplate(
          organization.id,
          user.id,
          name.trim(),
          documentType,
          body,
          description.trim() || undefined
        );

        if (created) {
          toast.success("Template created");
          onSave();
        } else {
          toast.error("Failed to create template");
        }
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    // Insert at cursor position or append
    setBody((prev) => prev + placeholder);
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h3 className="text-lg font-medium">
            {template ? "Edit Template Structure" : "New Document Template"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Define the structure for generating letters and documents
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <ContextBanner
        variant="template"
        title="You are editing a template structure"
        description="Changes here affect ALL future documents generated from this template. To customize a letter for a specific case, generate it from the case's Documents tab."
        tips={[
          "Placeholders like {{CASE_NUMBER}} will be replaced with actual values",
          "Conditional sections like [IF fee_waiver_enabled] are controlled by case settings"
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Client Status Letter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Document Type</Label>
                  <Select value={documentType} onValueChange={(v) => handleTypeChange(v as DocumentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template's purpose"
                  rows={2}
                />
              </div>

              {template && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active">Active (available for generating documents)</Label>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Body</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px] border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={body}
                  onChange={setBody}
                  modules={quillModules}
                  className="h-[350px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Available Placeholders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Click a placeholder to insert it into your template. Values will be replaced when generating documents.
              </p>
              
              {Object.entries(placeholdersByCategory).map(([category, items]) => (
                <Collapsible
                  key={category}
                  open={placeholdersOpen || category === "Organization"}
                  onOpenChange={setPlaceholdersOpen}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary">
                    {category}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {items.map((p) => (
                      <button
                        key={p.variable}
                        onClick={() => insertPlaceholder(p.variable)}
                        className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
                      >
                        <Badge variant="secondary" className="font-mono text-xs">
                          {p.variable}
                        </Badge>
                        <p className="text-muted-foreground mt-1">{p.description}</p>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
