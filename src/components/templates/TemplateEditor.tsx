import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Template {
  id: string;
  name: string;
  body: string;
}

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  template?: Template;
}

const DEFAULT_TEMPLATE = `<div style="text-align: center; margin-bottom: 20px;">
{{company_logo}}
<h2>{{company_name}}</h2>
<p>{{company_address}}</p>
<p>Phone: {{company_phone}} | Email: {{company_email}}</p>
</div>
<hr>
<h1>Case Update Report: {{case_title}}</h1>
<p><strong>Case Number:</strong> {{case_number}}</p>
<p><strong>Case Manager:</strong> {{case_manager}}</p>
<p><strong>Generated:</strong> {{current_date}}</p>
<hr>
<h2>Updates</h2>
<p>{{update_list}}</p>
<hr>
<p><em>This report was generated from case update templates.</em></p>`;

export const TemplateEditor = ({ open, onOpenChange, onSuccess, template }: TemplateEditorProps) => {
  const { organization } = useOrganization();
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBody(template.body);
    } else {
      setName("");
      setBody(DEFAULT_TEMPLATE);
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!organization?.id) throw new Error("Organization not found");

      if (template) {
        const { error } = await supabase
          .from("case_update_templates")
          .update({ name, body })
          .eq("id", template.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("case_update_templates")
          .insert({ 
            user_id: user.id, 
            organization_id: organization.id,
            name, 
            body 
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Template ${template ? "updated" : "created"} successfully`,
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

  const mockPreview = body
    // Organization placeholders
    .replace(/\{\{company_name\}\}/g, "Acme Investigations LLC")
    .replace(/\{\{company_logo\}\}/g, `<img src="https://via.placeholder.com/150x50?text=LOGO" alt="Company Logo" style="max-height: 50px;" />`)
    .replace(/\{\{company_address\}\}/g, "123 Main Street, Suite 100, New York, NY 10001")
    .replace(/\{\{company_street\}\}/g, "123 Main Street, Suite 100")
    .replace(/\{\{company_city\}\}/g, "New York")
    .replace(/\{\{company_state\}\}/g, "NY")
    .replace(/\{\{company_zip\}\}/g, "10001")
    .replace(/\{\{company_phone\}\}/g, "(555) 123-4567")
    .replace(/\{\{company_email\}\}/g, "info@acmeinvestigations.com")
    .replace(/\{\{company_website\}\}/g, "https://www.acmeinvestigations.com")
    // Case placeholders
    .replace(/\{\{case_title\}\}/g, "Sample Investigation Case")
    .replace(/\{\{case_number\}\}/g, "CASE-2024-001")
    .replace(/\{\{claim_number\}\}/g, "CLM-2024-98765")
    .replace(/\{\{case_manager\}\}/g, "John Doe")
    .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString())
    // Client/Subject/Investigator placeholders
    .replace(/\{\{client_list\}\}/g, "Acme Insurance Co., Jane Client")
    .replace(/\{\{primary_client\}\}/g, "Acme Insurance Co.")
    .replace(/\{\{subject_list\}\}/g, "John Smith (Primary), Mary Johnson")
    .replace(/\{\{primary_subject\}\}/g, "John Smith")
    .replace(/\{\{investigator_list\}\}/g, "Mike Investigator, Sarah Field")
    .replace(/\{\{location_list\}\}/g, "123 Oak Avenue, New York, NY; 456 Pine Street, Boston, MA")
    // Date placeholders
    .replace(/\{\{assignment_date\}\}/g, "January 10, 2024")
    .replace(/\{\{due_date\}\}/g, "February 1, 2024")
    .replace(/\{\{update_list\}\}/g, 
      `<p><strong>2024-01-15</strong> - Initial Contact (John Doe)<br>
Subject contacted and provided initial information.</p>
<p><strong>2024-01-18</strong> - Evidence Collection (Jane Smith)<br>
Collected relevant documents and photographs.</p>
<p><strong>2024-01-22</strong> - Progress Update (John Doe)<br>
Case is progressing well. Waiting for additional information.</p>`
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle>
          <DialogDescription>
            Create a template with placeholders that will be filled with case data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client Report, Court Summary"
            />
          </div>

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="body">Template Body</Label>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Enter your template here..."
                  className="min-h-[400px]"
                />
              </div>

              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-2">Available Placeholders:</h4>
                  
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Organization Branding:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    <div><code className="bg-muted px-1 rounded">{"{{company_name}}"}</code> - Company name</div>
                    <div><code className="bg-muted px-1 rounded">{"{{company_logo}}"}</code> - Company logo image</div>
                    <div><code className="bg-muted px-1 rounded">{"{{company_address}}"}</code> - Full address</div>
                    <div><code className="bg-muted px-1 rounded">{"{{company_phone}}"}</code> - Phone number</div>
                    <div><code className="bg-muted px-1 rounded">{"{{company_email}}"}</code> - Email address</div>
                    <div><code className="bg-muted px-1 rounded">{"{{company_website}}"}</code> - Website URL</div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Case Information:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    <div><code className="bg-muted px-1 rounded">{"{{case_title}}"}</code> - Case title</div>
                    <div><code className="bg-muted px-1 rounded">{"{{case_number}}"}</code> - Case number</div>
                    <div><code className="bg-muted px-1 rounded">{"{{claim_number}}"}</code> - Claim/reference number</div>
                    <div><code className="bg-muted px-1 rounded">{"{{case_manager}}"}</code> - Case manager name</div>
                    <div><code className="bg-muted px-1 rounded">{"{{current_date}}"}</code> - Current date</div>
                    <div><code className="bg-muted px-1 rounded">{"{{due_date}}"}</code> - Due date</div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 font-medium">People & Locations:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    <div><code className="bg-muted px-1 rounded">{"{{client_list}}"}</code> - All clients</div>
                    <div><code className="bg-muted px-1 rounded">{"{{primary_client}}"}</code> - Primary client</div>
                    <div><code className="bg-muted px-1 rounded">{"{{subject_list}}"}</code> - All subjects</div>
                    <div><code className="bg-muted px-1 rounded">{"{{primary_subject}}"}</code> - Primary subject</div>
                    <div><code className="bg-muted px-1 rounded">{"{{investigator_list}}"}</code> - All investigators</div>
                    <div><code className="bg-muted px-1 rounded">{"{{location_list}}"}</code> - Case locations</div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 font-medium">Dates:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    <div><code className="bg-muted px-1 rounded">{"{{assignment_date}}"}</code> - Assignment/start date</div>
                    <div><code className="bg-muted px-1 rounded">{"{{due_date}}"}</code> - Due date</div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 font-medium">Updates:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <code className="bg-muted px-1 rounded">{"{{update_list}}"}</code> - All case updates (date, author, type, content)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardContent className="p-6">
                  <div 
                    className="prose prose-sm max-w-none" 
                    dangerouslySetInnerHTML={{ __html: mockPreview }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
