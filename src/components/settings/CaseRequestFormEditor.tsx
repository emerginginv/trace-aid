import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Palette, 
  FormInput, 
  Bell, 
  Building2, 
  Users, 
  Phone, 
  Briefcase, 
  FileText,
  Upload,
  Info
} from "lucide-react";
import { FieldConfigSection } from "./case-request-forms";
import { 
  CaseRequestFormConfig, 
  DEFAULT_FORM_CONFIG, 
  FieldConfig,
  validateFormConfig 
} from "@/types/case-request-form-config";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { getOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";

interface CaseRequestForm {
  id?: string;
  form_name: string;
  form_slug: string | null;
  is_active: boolean;
  is_public: boolean;
  organization_id: string;
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

interface CaseRequestFormEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CaseRequestForm | null;
  organizationId: string;
  onSaved: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CaseRequestFormEditor({ 
  open, 
  onOpenChange, 
  form, 
  organizationId,
  onSaved 
}: CaseRequestFormEditorProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  
  // Branding state
  const [logoUrl, setLogoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [headerInstructions, setHeaderInstructions] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a365d");
  const [successMessage, setSuccessMessage] = useState("Thank you for your submission. We will review your request and contact you shortly.");
  
  // Field config state
  const [fieldConfig, setFieldConfig] = useState<CaseRequestFormConfig>(DEFAULT_FORM_CONFIG);
  
  // Notification state
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [confirmationSubject, setConfirmationSubject] = useState("Case Request Received");
  const [confirmationBody, setConfirmationBody] = useState("Thank you for submitting your case request. We have received your information and will be in touch shortly.");
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [staffEmails, setStaffEmails] = useState("");

  // Fetch organization profile on dialog open
  useEffect(() => {
    if (open && organizationId) {
      getOrganizationProfile(organizationId).then(profile => {
        setOrgProfile(profile);
      });
    }
  }, [open, organizationId]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (form) {
        setFormName(form.form_name);
        setFormSlug(form.form_slug || "");
        setIsActive(form.is_active);
        setIsPublic(form.is_public);
        setLogoUrl(form.logo_url || "");
        setDisplayName(form.organization_display_name || "");
        setPhone(form.organization_phone || "");
        setWebsite(form.organization_website || "");
        setHeaderInstructions(form.header_instructions || "");
        setPrimaryColor(form.primary_color || "#1a365d");
        setSuccessMessage(form.success_message || "Thank you for your submission. We will review your request and contact you shortly.");
        setFieldConfig(validateFormConfig(form.field_config as any));
        setSendConfirmation(form.send_confirmation_email || false);
        setConfirmationSubject(form.confirmation_email_subject || "Case Request Received");
        setConfirmationBody(form.confirmation_email_body || "Thank you for submitting your case request. We have received your information and will be in touch shortly.");
        setNotifyStaff(form.notify_staff_on_submission ?? true);
        setStaffEmails((form.staff_notification_emails || []).join(", "));
      } else {
        // Reset to defaults for new form
        setFormName("");
        setFormSlug("");
        setIsActive(true);
        setIsPublic(true);
        setLogoUrl("");
        setDisplayName("");
        setPhone("");
        setWebsite("");
        setHeaderInstructions("");
        setPrimaryColor("#1a365d");
        setSuccessMessage("Thank you for your submission. We will review your request and contact you shortly.");
        setFieldConfig(DEFAULT_FORM_CONFIG);
        setSendConfirmation(false);
        setConfirmationSubject("Case Request Received");
        setConfirmationBody("Thank you for submitting your case request. We have received your information and will be in touch shortly.");
        setNotifyStaff(true);
        setStaffEmails("");
      }
      setActiveTab("general");
    }
  }, [open, form]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!form && formName && !formSlug) {
      setFormSlug(generateSlug(formName));
    }
  }, [formName, form, formSlug]);

  const updateFieldConfig = (
    category: keyof CaseRequestFormConfig, 
    fieldKey: string, 
    config: FieldConfig
  ) => {
    setFieldConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [fieldKey]: config
      }
    }));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Form name is required");
      return;
    }

    try {
      setSaving(true);

      const formData = {
        form_name: formName.trim(),
        form_slug: formSlug.trim() || generateSlug(formName),
        is_active: isActive,
        is_public: isPublic,
        organization_id: organizationId,
        logo_url: logoUrl || null,
        organization_display_name: displayName || null,
        organization_phone: phone || null,
        organization_website: website || null,
        header_instructions: headerInstructions || null,
        primary_color: primaryColor || null,
        success_message: successMessage || null,
        field_config: fieldConfig as any,
        send_confirmation_email: sendConfirmation,
        confirmation_email_subject: confirmationSubject || null,
        confirmation_email_body: confirmationBody || null,
        notify_staff_on_submission: notifyStaff,
        staff_notification_emails: staffEmails ? staffEmails.split(",").map(e => e.trim()).filter(Boolean) : null,
      };

      if (form?.id) {
        const { error } = await supabase
          .from("case_request_forms")
          .update(formData)
          .eq("id", form.id);
        if (error) throw error;
        toast.success("Form updated successfully");
      } else {
        const { error } = await supabase
          .from("case_request_forms")
          .insert(formData);
        if (error) throw error;
        toast.success("Form created successfully");
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving form:", error);
      toast.error(error.message || "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {form ? "Edit Request Form" : "Create Request Form"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <FormInput className="h-4 w-4" />
              <span className="hidden sm:inline">Fields</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto pr-4 pb-6">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="formName">Form Name *</Label>
                  <Input
                    id="formName"
                    placeholder="e.g., Default Intake Form"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal name for this form configuration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formSlug">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/request/</span>
                    <Input
                      id="formSlug"
                      placeholder="e.g., intake"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL-friendly identifier. Leave blank to auto-generate from name.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="isActive">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Form accepts new submissions when active
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="isPublic">Public Access</Label>
                    <p className="text-xs text-muted-foreground">
                      Anyone with the link can submit requests
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4 mt-4">
              <div className="space-y-4">
                {/* Organization defaults info */}
                <div className="p-3 bg-muted/50 rounded-lg border flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Branding fields will use your organization settings from Settings → Organizational Information as defaults. 
                    Override any field here to customize this specific form.
                  </p>
                </div>

                {/* Logo Section */}
                <div className="space-y-3">
                  <Label>Logo</Label>
                  
                  {/* Logo Preview */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    {(logoUrl || orgProfile?.logoUrl) ? (
                      <div className="space-y-2">
                        <img 
                          src={logoUrl || orgProfile?.logoUrl || ''} 
                          alt="Form logo"
                          className="h-12 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          {logoUrl 
                            ? "Using: Custom URL override" 
                            : "Using: Organization logo (from Settings → Organizational Information)"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No organization logo configured. Go to Settings → Organizational Information to add one.
                      </p>
                    )}
                  </div>

                  {/* URL Override Input */}
                  <div className="space-y-1">
                    <Label htmlFor="logoUrl" className="text-sm font-normal text-muted-foreground">
                      Logo URL Override (optional)
                    </Label>
                    <Input
                      id="logoUrl"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      If provided, this URL will be used instead of the organization logo
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Organization Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder={orgProfile?.companyName || "e.g., Acme Investigations"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  {orgProfile?.companyName && !displayName && (
                    <p className="text-xs text-muted-foreground">
                      Will use: {orgProfile.companyName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder={orgProfile?.phone || "(555) 123-4567"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    {orgProfile?.phone && !phone && (
                      <p className="text-xs text-muted-foreground">
                        Will use: {orgProfile.phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      placeholder={orgProfile?.websiteUrl || "https://example.com"}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                    {orgProfile?.websiteUrl && !website && (
                      <p className="text-xs text-muted-foreground">
                        Will use: {orgProfile.websiteUrl}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headerInstructions">Header Instructions</Label>
                  <Textarea
                    id="headerInstructions"
                    placeholder="Instructions shown at the top of the form..."
                    value={headerInstructions}
                    onChange={(e) => setHeaderInstructions(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1a365d"
                      className="w-32"
                    />
                    <div 
                      className="h-10 flex-1 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Preview
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="successMessage">Success Message</Label>
                  <Textarea
                    id="successMessage"
                    placeholder="Message shown after successful submission..."
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Fields Tab */}
            <TabsContent value="fields" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure which fields appear on the form, whether they're required, and custom labels.
              </p>
              
              <div className="space-y-3">
                <FieldConfigSection
                  title="Case Type"
                  icon={<Briefcase className="h-4 w-4" />}
                  fields={[
                    { key: "caseTypeField", defaultLabel: "Case Type" }
                  ]}
                  configs={fieldConfig.caseType as any}
                  onChange={(key, config) => updateFieldConfig("caseType", key, config)}
                />

                <FieldConfigSection
                  title="Client Information"
                  icon={<Building2 className="h-4 w-4" />}
                  fields={[
                    { key: "companyName", defaultLabel: "Company Name" },
                    { key: "country", defaultLabel: "Country" },
                    { key: "address", defaultLabel: "Address" }
                  ]}
                  configs={fieldConfig.clientInformation as any}
                  onChange={(key, config) => updateFieldConfig("clientInformation", key, config)}
                />

                <FieldConfigSection
                  title="Contact Information"
                  icon={<Phone className="h-4 w-4" />}
                  fields={[
                    { key: "contactName", defaultLabel: "Contact Name" },
                    { key: "email", defaultLabel: "Email" },
                    { key: "officePhone", defaultLabel: "Office Phone" },
                    { key: "mobilePhone", defaultLabel: "Mobile Phone" },
                    { key: "homePhone", defaultLabel: "Home Phone" }
                  ]}
                  configs={fieldConfig.contactInformation as any}
                  onChange={(key, config) => updateFieldConfig("contactInformation", key, config)}
                />

                <FieldConfigSection
                  title="Case Details"
                  icon={<FileText className="h-4 w-4" />}
                  fields={[
                    { key: "caseServices", defaultLabel: "Services Requested" },
                    { key: "claimNumber", defaultLabel: "Claim/Reference Number" },
                    { key: "budgetDollars", defaultLabel: "Budget (Dollars)" },
                    { key: "budgetHours", defaultLabel: "Budget (Hours)" },
                    { key: "notesInstructions", defaultLabel: "Notes & Instructions" },
                    { key: "customFields", defaultLabel: "Additional Information" }
                  ]}
                  configs={fieldConfig.caseDetails as any}
                  onChange={(key, config) => updateFieldConfig("caseDetails", key, config)}
                />

                <FieldConfigSection
                  title="Subject Information"
                  icon={<Users className="h-4 w-4" />}
                  fields={[
                    { key: "primarySubject", defaultLabel: "Primary Subject" },
                    { key: "additionalSubjects", defaultLabel: "Additional Subjects" },
                    { key: "subjectPhoto", defaultLabel: "Subject Photo" }
                  ]}
                  configs={fieldConfig.subjectInformation as any}
                  onChange={(key, config) => updateFieldConfig("subjectInformation", key, config)}
                />

                <FieldConfigSection
                  title="Supporting Files"
                  icon={<Upload className="h-4 w-4" />}
                  fields={[
                    { key: "fileUpload", defaultLabel: "File Upload" }
                  ]}
                  configs={{ fileUpload: fieldConfig.supportingFiles.fileUpload }}
                  onChange={(key, config) => updateFieldConfig("supportingFiles", key, config)}
                />

                {/* File size and type settings */}
                <div className="border rounded-lg p-4 space-y-4 mt-4">
                  <h4 className="font-medium text-sm">File Upload Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        value={Math.round(fieldConfig.supportingFiles.maxFileSize / 1048576)}
                        onChange={(e) => setFieldConfig(prev => ({
                          ...prev,
                          supportingFiles: {
                            ...prev.supportingFiles,
                            maxFileSize: parseInt(e.target.value) * 1048576
                          }
                        }))}
                        min={1}
                        max={1024}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowedTypes">Allowed File Types</Label>
                      <Input
                        id="allowedTypes"
                        placeholder="* for all, or .pdf,.docx,.jpg"
                        value={fieldConfig.supportingFiles.allowedFileTypes.join(", ")}
                        onChange={(e) => setFieldConfig(prev => ({
                          ...prev,
                          supportingFiles: {
                            ...prev.supportingFiles,
                            allowedFileTypes: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-6">
                {/* Confirmation Email */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Confirmation Email</h4>
                      <p className="text-xs text-muted-foreground">
                        Send an email to the submitter when their request is received
                      </p>
                    </div>
                    <Switch
                      checked={sendConfirmation}
                      onCheckedChange={setSendConfirmation}
                    />
                  </div>
                  
                  {sendConfirmation && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="confirmationSubject">Email Subject</Label>
                        <Input
                          id="confirmationSubject"
                          value={confirmationSubject}
                          onChange={(e) => setConfirmationSubject(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmationBody">Email Body</Label>
                        <Textarea
                          id="confirmationBody"
                          value={confirmationBody}
                          onChange={(e) => setConfirmationBody(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Staff Notification */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Staff Notification</h4>
                      <p className="text-xs text-muted-foreground">
                        Notify staff members when a new request is submitted
                      </p>
                    </div>
                    <Switch
                      checked={notifyStaff}
                      onCheckedChange={setNotifyStaff}
                    />
                  </div>
                  
                  {notifyStaff && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="staffEmails">Staff Email Addresses</Label>
                      <Textarea
                        id="staffEmails"
                        placeholder="email1@example.com, email2@example.com"
                        value={staffEmails}
                        onChange={(e) => setStaffEmails(e.target.value)}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate multiple emails with commas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : form ? "Save Changes" : "Create Form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
