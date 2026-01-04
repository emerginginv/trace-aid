import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { getCurrentOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";

interface Template {
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      fetchOrgProfile();
    }
  }, [open]);

  const fetchOrgProfile = async () => {
    const profile = await getCurrentOrganizationProfile();
    setOrgProfile(profile);
  };

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!orgMember) return;

      const { data, error } = await supabase
        .from("case_update_templates")
        .select("*")
        .eq("organization_id", orgMember.organization_id)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    }
  };

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

    // Build logo HTML if available
    const logoHtml = orgProfile?.logoUrl 
      ? `<img src="${orgProfile.logoUrl}" alt="${orgProfile.companyName || 'Company'} Logo" style="max-height: 60px; max-width: 200px;" />`
      : "";

    return templateBody
      // Case placeholders
      .replace(/\{\{case_title\}\}/g, caseData.title)
      .replace(/\{\{case_number\}\}/g, caseData.case_number)
      .replace(/\{\{case_manager\}\}/g, caseManagerName)
      .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{update_list\}\}/g, updateList)
      // Organization branding placeholders
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

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Select a template and format to generate a report from case updates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates available. Create a template in Settings first.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as "pdf" | "docx")}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !selectedTemplateId} className="w-full sm:w-auto">
                  {generating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
