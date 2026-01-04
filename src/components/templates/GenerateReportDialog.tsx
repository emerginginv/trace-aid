import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { getCurrentOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";
import { getCaseVariables, formatCaseVariablesForTemplate, CaseVariables } from "@/lib/caseVariables";
import { getOrganizationTemplates, getReportTemplate, ReportTemplate, TemplateCustomization } from "@/lib/reportTemplates";
import { generateReport, ReportInstance } from "@/lib/reportEngine";
import { ReportInstanceViewer } from "@/components/templates/ReportInstanceViewer";
import { TemplateCustomizer } from "@/components/templates/TemplateCustomizer";
import { FileText, Sparkles, FileCode, Settings2 } from "lucide-react";

interface LegacyTemplate {
  id: string;
  name: string;
  body: string;
}

interface Update {
  created_at: string;
  title: string;
  update_type: string;
  description: string | null;
  user_id: string;
}

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseData: {
    title: string;
    case_number: string;
    case_manager_id: string | null;
  };
  updates: Update[];
  userProfiles: Record<string, { full_name: string }>;
}

export const GenerateReportDialog = ({
  open,
  onOpenChange,
  caseId,
  caseData,
  updates,
  userProfiles,
}: GenerateReportDialogProps) => {
  // Legacy template state
  const [legacyTemplates, setLegacyTemplates] = useState<LegacyTemplate[]>([]);
  const [selectedLegacyTemplateId, setSelectedLegacyTemplateId] = useState<string>("");
  
  // Structured template state
  const [structuredTemplates, setStructuredTemplates] = useState<ReportTemplate[]>([]);
  const [selectedStructuredTemplateId, setSelectedStructuredTemplateId] = useState<string>("");
  
  // Common state
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);
  const [caseVariables, setCaseVariables] = useState<CaseVariables | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [templateType, setTemplateType] = useState<"legacy" | "structured">("structured");
  
  // Preview state
  const [generatedReport, setGeneratedReport] = useState<ReportInstance | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  // Customization state
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selectedTemplateForCustomization, setSelectedTemplateForCustomization] = useState<ReportTemplate | null>(null);
  const [templateCustomization, setTemplateCustomization] = useState<TemplateCustomization | null>(null);

  useEffect(() => {
    if (open) {
      fetchUserAndOrg();
      fetchOrgProfile();
      fetchCaseVariables();
    }
  }, [open, caseId]);

  useEffect(() => {
    if (organizationId) {
      fetchLegacyTemplates();
      fetchStructuredTemplates();
    }
  }, [organizationId]);

  const fetchUserAndOrg = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);

    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (orgMember) {
      setOrganizationId(orgMember.organization_id);
    }
  };

  const fetchOrgProfile = async () => {
    const profile = await getCurrentOrganizationProfile();
    setOrgProfile(profile);
  };

  const fetchCaseVariables = async () => {
    const variables = await getCaseVariables(caseId);
    setCaseVariables(variables);
  };

  const fetchLegacyTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("case_update_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;
      setLegacyTemplates(data || []);
    } catch (error) {
      console.error("Error fetching legacy templates:", error);
    }
  };

  const fetchStructuredTemplates = async () => {
    try {
      const templates = await getOrganizationTemplates(organizationId);
      setStructuredTemplates(templates);
    } catch (error) {
      console.error("Error fetching structured templates:", error);
    }
  };

  // Legacy template filling
  const fillTemplate = (templateBody: string): string => {
    const caseManagerName = caseData.case_manager_id 
      ? (userProfiles[caseData.case_manager_id]?.full_name || "Not assigned")
      : "Not assigned";

    const updateList = updates
      .map((update) => {
        const author = userProfiles[update.user_id]?.full_name || "Unknown";
        const date = new Date(update.created_at).toLocaleDateString();
        return `**${date}** - ${update.title} (${author})\n${update.description || "No description"}`;
      })
      .join("\n\n");

    const logoHtml = orgProfile?.logoUrl 
      ? `<img src="${orgProfile.logoUrl}" alt="${orgProfile.companyName || 'Company'} Logo" style="max-height: 60px; max-width: 200px;" />`
      : "";

    const caseVars = caseVariables ? formatCaseVariablesForTemplate(caseVariables) : {};

    return templateBody
      .replace(/\{\{case_title\}\}/g, caseData.title)
      .replace(/\{\{case_number\}\}/g, caseData.case_number)
      .replace(/\{\{case_manager\}\}/g, caseManagerName)
      .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{update_list\}\}/g, updateList)
      .replace(/\{\{claim_number\}\}/g, caseVars.claim_number || "")
      .replace(/\{\{client_list\}\}/g, caseVars.client_list || "")
      .replace(/\{\{subject_list\}\}/g, caseVars.subject_list || "")
      .replace(/\{\{primary_subject\}\}/g, caseVars.primary_subject || "")
      .replace(/\{\{primary_client\}\}/g, caseVars.primary_client || "")
      .replace(/\{\{investigator_list\}\}/g, caseVars.investigator_list || "")
      .replace(/\{\{location_list\}\}/g, caseVars.location_list || "")
      .replace(/\{\{assignment_date\}\}/g, caseVars.assignment_date || "")
      .replace(/\{\{surveillance_dates\}\}/g, caseVars.surveillance_dates || "")
      .replace(/\{\{surveillance_start\}\}/g, caseVars.surveillance_start || "")
      .replace(/\{\{surveillance_end\}\}/g, caseVars.surveillance_end || "")
      .replace(/\{\{due_date\}\}/g, caseVars.due_date || "")
      .replace(/\{\{company_name\}\}/g, orgProfile?.companyName || "")
      .replace(/\{\{company_logo\}\}/g, logoHtml)
      .replace(/\{\{company_address\}\}/g, orgProfile?.fullAddress || "")
      .replace(/\{\{company_street\}\}/g, orgProfile?.streetAddress || "")
      .replace(/\{\{company_city\}\}/g, orgProfile?.city || "")
      .replace(/\{\{company_state\}\}/g, orgProfile?.state || "")
      .replace(/\{\{company_zip\}\}/g, orgProfile?.zipCode || "")
      .replace(/\{\{company_phone\}\}/g, orgProfile?.phone || "")
      .replace(/\{\{company_email\}\}/g, orgProfile?.email || "")
      .replace(/\{\{company_website\}\}/g, orgProfile?.websiteUrl || "");
  };

  const generatePDF = async (content: string) => {
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px;">
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6;">
          ${content}
        </pre>
      </div>
    `;

    const options = {
      margin: 1,
      filename: `${caseData.case_number}_report.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" as const },
    };

    await html2pdf().from(element).set(options).save();
  };

  const generateDOCX = (content: string) => {
    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${caseData.case_number}_report.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateLegacy = async () => {
    if (!selectedLegacyTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    const template = legacyTemplates.find((t) => t.id === selectedLegacyTemplateId);
    if (!template) return;

    setGenerating(true);
    try {
      const filledContent = fillTemplate(template.body);

      if (exportFormat === "pdf") {
        await generatePDF(filledContent);
      } else {
        generateDOCX(filledContent);
      }

      toast({
        title: "Success",
        description: `Report generated as ${exportFormat.toUpperCase()}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateStructured = async () => {
    if (!selectedStructuredTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const result = await generateReport({
        caseId,
        templateId: selectedStructuredTemplateId,
        organizationId,
        userId,
        customization: templateCustomization || undefined,
      });

      if (!result.success || !result.reportInstance) {
        throw new Error(result.error || "Failed to generate report");
      }

      setGeneratedReport(result.reportInstance);
      setViewerOpen(true);

      toast({
        title: "Success",
        description: "Report generated successfully",
      });
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

  const handleOpenCustomizer = async () => {
    if (!selectedStructuredTemplateId) {
      toast({
        title: "Select a template",
        description: "Please select a template before customizing",
        variant: "destructive",
      });
      return;
    }

    // Fetch full template with sections
    const fullTemplate = await getReportTemplate(selectedStructuredTemplateId);
    if (!fullTemplate) {
      toast({
        title: "Error",
        description: "Failed to load template details",
        variant: "destructive",
      });
      return;
    }

    setSelectedTemplateForCustomization(fullTemplate);
    setCustomizerOpen(true);
  };

  const handleApplyCustomization = (customization: TemplateCustomization) => {
    setTemplateCustomization(customization);
    toast({
      title: "Customization applied",
      description: "Your changes will be used when generating the report",
    });
  };

  // Clear customization when template changes
  useEffect(() => {
    setTemplateCustomization(null);
    setSelectedTemplateForCustomization(null);
  }, [selectedStructuredTemplateId]);

  const handleGenerate = async () => {
    if (templateType === "legacy") {
      await handleGenerateLegacy();
    } else {
      await handleGenerateStructured();
    }
  };

  const hasLegacyTemplates = legacyTemplates.length > 0;
  const hasStructuredTemplates = structuredTemplates.length > 0;
  const selectedTemplateId = templateType === "legacy" ? selectedLegacyTemplateId : selectedStructuredTemplateId;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Select a template and format to generate a report from case data
            </DialogDescription>
          </DialogHeader>

          <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as "legacy" | "structured")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="structured" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Structured
                {hasStructuredTemplates && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {structuredTemplates.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="legacy" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Legacy
                {hasLegacyTemplates && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {legacyTemplates.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structured" className="space-y-4 mt-4">
              {!hasStructuredTemplates ? (
                <div className="text-center py-6">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No structured templates available. Create one in Settings → Report Templates.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="structured-template">Template</Label>
                    <Select 
                      value={selectedStructuredTemplateId} 
                      onValueChange={setSelectedStructuredTemplateId}
                    >
                      <SelectTrigger id="structured-template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {structuredTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              {template.name}
                              {template.isSystemTemplate && (
                                <Badge variant="outline" className="text-xs">System</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStructuredTemplateId && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {structuredTemplates.find(t => t.id === selectedStructuredTemplateId)?.description || 
                            "Generates a read-only report using structured sections."}
                        </p>
                        
                        {/* Customize Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={handleOpenCustomizer}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Customize Template
                          {templateCustomization && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Modified
                            </Badge>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={generating || !selectedStructuredTemplateId} 
                      className="w-full sm:w-auto"
                    >
                      {generating ? "Generating..." : "Generate Report"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="legacy" className="space-y-4 mt-4">
              {!hasLegacyTemplates ? (
                <div className="text-center py-6">
                  <FileCode className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No legacy templates available. Create one in Settings.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="legacy-template">Template</Label>
                    <Select 
                      value={selectedLegacyTemplateId} 
                      onValueChange={setSelectedLegacyTemplateId}
                    >
                      <SelectTrigger id="legacy-template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {legacyTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Export Format</Label>
                    <Select 
                      value={exportFormat} 
                      onValueChange={(value) => setExportFormat(value as "pdf" | "docx")}
                    >
                      <SelectTrigger id="format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={generating || !selectedLegacyTemplateId} 
                      className="w-full sm:w-auto"
                    >
                      {generating ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Report Viewer for structured reports */}
      <ReportInstanceViewer
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) {
            setGeneratedReport(null);
          }
        }}
        report={generatedReport}
      />

      {/* Template Customizer */}
      {selectedTemplateForCustomization && (
        <TemplateCustomizer
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          template={selectedTemplateForCustomization}
          initialCustomization={templateCustomization || undefined}
          onApply={handleApplyCustomization}
          orgProfile={orgProfile}
          caseVariables={caseVariables}
        />
      )}
    </>
  );
};
