import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  ExternalLink, 
  Trash2, 
  Copy, 
  Power, 
  PowerOff,
  FileInput,
  Info,
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CaseRequestFormEditor } from "./CaseRequestFormEditor";
import { CaseRequestSettingsSection } from "./CaseRequestSettingsSection";
import { CaseRequestFormConfig, validateFormConfig } from "@/types/case-request-form-config";

interface CaseRequestForm {
  id: string;
  form_name: string;
  form_slug: string | null;
  is_active: boolean;
  is_public: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
  organization_display_name: string | null;
  organization_phone: string | null;
  organization_website: string | null;
  header_instructions: string | null;
  primary_color: string | null;
  success_message: string | null;
  field_config: CaseRequestFormConfig | null;
  send_confirmation_email: boolean | null;
  confirmation_email_subject: string | null;
  confirmation_email_body: string | null;
  notify_staff_on_submission: boolean | null;
  staff_notification_emails: string[] | null;
}

export function CaseRequestFormsTab() {
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canManageForms = hasPermission('manage_case_request_forms');
  const [forms, setForms] = useState<CaseRequestForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CaseRequestForm | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<CaseRequestForm | null>(null);

  useEffect(() => {
    if (organization?.id) {
      loadForms();
    }
  }, [organization?.id]);

  const loadForms = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("case_request_forms")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setForms((data || []).map(form => ({
        ...form,
        field_config: validateFormConfig(form.field_config as any)
      })));
    } catch (error) {
      console.error("Error loading forms:", error);
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (form: CaseRequestForm) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/request/${form.form_slug || form.id}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("URL copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleToggleActive = async (form: CaseRequestForm) => {
    try {
      const { error } = await supabase
        .from("case_request_forms")
        .update({ is_active: !form.is_active })
        .eq("id", form.id);

      if (error) throw error;

      setForms(forms.map(f => 
        f.id === form.id ? { ...f, is_active: !f.is_active } : f
      ));
      toast.success(`Form ${!form.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error("Error toggling form:", error);
      toast.error("Failed to update form");
    }
  };

  const handleDelete = async () => {
    if (!formToDelete) return;

    try {
      const { error } = await supabase
        .from("case_request_forms")
        .delete()
        .eq("id", formToDelete.id);

      if (error) throw error;

      setForms(forms.filter(f => f.id !== formToDelete.id));
      toast.success("Form deleted successfully");
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    }
  };

  const openEditor = (form: CaseRequestForm | null = null) => {
    setEditingForm(form);
    setEditorOpen(true);
  };

  if (loading || permissionsLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canManageForms) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to manage case request forms. Contact your administrator to request access.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Section */}
      <CaseRequestSettingsSection />
      
      {/* Info Banner */}
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Public Request Forms</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Create customizable forms for clients to submit case requests. Each form has its own URL, 
                branding, and field configuration. Submitted requests appear in your Case Requests inbox.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forms Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileInput className="h-5 w-5" />
                Request Forms
              </CardTitle>
              <CardDescription>
                Manage public intake forms for case requests
              </CardDescription>
            </div>
            <Button onClick={() => openEditor(null)}>
              <Plus className="w-4 h-4 mr-2" />
              New Form
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead className="hidden md:table-cell">Public URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No forms configured. Click "New Form" to create your first public intake form.
                    </TableCell>
                  </TableRow>
                ) : (
                  forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell>
                        <div className="font-medium">{form.form_name}</div>
                        {form.form_slug && (
                          <div className="text-xs text-muted-foreground">/request/{form.form_slug}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                            {getPublicUrl(form)}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(getPublicUrl(form))}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy URL</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.is_active ? "default" : "secondary"}>
                          {form.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {!form.is_public && (
                          <Badge variant="outline" className="ml-1">
                            Private
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {format(new Date(form.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditor(form)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(getPublicUrl(form), '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(getPublicUrl(form))}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(form)}>
                              {form.is_active ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setFormToDelete(form);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <CaseRequestFormEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        form={editingForm}
        organizationId={organization?.id || ""}
        onSaved={loadForms}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.form_name}"? 
              This will not delete any submitted requests, but the form URL will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
