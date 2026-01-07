import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generatePublicRecordsBodyContent, renderPublicRecordsBodyHtml } from "@/lib/letterBodyGenerators";

interface PublicRecordsBuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function PublicRecordsBuilder({ organizationId, onSave, onCancel }: PublicRecordsBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    agencyName: '',
    agencyAddress: '',
    recordsRequested: '',
    legalAuthority: 'general',
    customAuthority: '',
    responseDeadline: '',
    requestFeeWaiver: false,
    formatPreference: 'electronic',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTemplate = async () => {
    if (!formData.templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate body content only (no layout elements)
      const bodyContent = generatePublicRecordsBodyContent(formData);
      const letterBody = renderPublicRecordsBodyHtml(bodyContent);

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `Public records request template for ${formData.agencyName || 'general use'}`,
          document_type: 'request',
          letter_category: 'public_records',
          body: letterBody,
        });

      if (error) throw error;

      toast.success('Template saved successfully');
      onSave();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                placeholder="e.g., General Public Records Request"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agency Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency/Department Name</Label>
              <Input
                id="agencyName"
                placeholder="e.g., City of Los Angeles Police Department"
                value={formData.agencyName}
                onChange={(e) => handleChange('agencyName', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{agency_name}}"} placeholder for dynamic insertion
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencyAddress">Agency Address</Label>
              <Textarea
                id="agencyAddress"
                placeholder="Full mailing address..."
                value={formData.agencyAddress}
                onChange={(e) => handleChange('agencyAddress', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recordsRequested">Records Requested *</Label>
              <Textarea
                id="recordsRequested"
                placeholder="Describe the specific records you are requesting..."
                value={formData.recordsRequested}
                onChange={(e) => handleChange('recordsRequested', e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as possible. Include dates, names, case numbers if applicable.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Legal Authority</Label>
              <Select 
                value={formData.legalAuthority} 
                onValueChange={(v) => handleChange('legalAuthority', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Public Records Law</SelectItem>
                  <SelectItem value="state">State Public Records Act</SelectItem>
                  <SelectItem value="foia">Freedom of Information Act</SelectItem>
                  <SelectItem value="custom">Custom Citation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.legalAuthority === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customAuthority">Custom Legal Citation</Label>
                <Input
                  id="customAuthority"
                  placeholder="e.g., Cal. Gov. Code § 6250"
                  value={formData.customAuthority}
                  onChange={(e) => handleChange('customAuthority', e.target.value)}
                />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Format Preference</Label>
              <Select 
                value={formData.formatPreference} 
                onValueChange={(v) => handleChange('formatPreference', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">Electronic (PDF preferred)</SelectItem>
                  <SelectItem value="paper">Paper Copies</SelectItem>
                  <SelectItem value="either">Either Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="feeWaiver"
                checked={formData.requestFeeWaiver}
                onCheckedChange={(checked) => handleChange('requestFeeWaiver', !!checked)}
              />
              <Label htmlFor="feeWaiver" className="cursor-pointer">
                Include fee waiver section
              </Label>
            </div>

            {formData.requestFeeWaiver && (
              <div className="ml-6 p-3 bg-muted/50 rounded-md border">
                <p className="text-sm text-muted-foreground">
                  Template will include: <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{fee_waiver_justification}}"}</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-6 min-h-[400px] font-sans text-sm">
              <p className="text-xs text-muted-foreground italic mb-4">
                Template structure - placeholders are filled at document generation
              </p>
              
              <div className="space-y-4">
                <p className="text-right text-muted-foreground">{"{{current_date}}"}</p>
                
                <div>
                  <p>{formData.agencyName || "{{agency_name}}"}</p>
                  <p className="whitespace-pre-line text-muted-foreground">{formData.agencyAddress || "{{agency_address}}"}</p>
                </div>

                <p><strong>RE: Public Records Request</strong></p>

                <p>Dear Records Custodian,</p>

                <p>
                  Pursuant to applicable public records laws, I am requesting access to and copies of the following records:
                </p>

                <div className="pl-4 border-l-2 border-muted-foreground/30">
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {formData.recordsRequested || "{{RECORDS_REQUESTED}}"}
                  </code>
                </div>

                <p>
                  I request that records be provided in {
                    formData.formatPreference === 'electronic' ? 'electronic format (PDF preferred)' :
                    formData.formatPreference === 'paper' ? 'paper copies' : 'either electronic or paper format'
                  }.
                </p>

                {formData.requestFeeWaiver && (
                  <div className="p-2 border border-dashed border-muted-foreground/50 rounded">
                    <p className="text-xs text-muted-foreground">[IF fee_waiver_enabled]</p>
                    <p><strong>Fee Waiver Request:</strong></p>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{FEE_WAIVER_CONTENT}}"}</code>
                    <p className="text-xs text-muted-foreground">[/IF]</p>
                  </div>
                )}

                <p>
                  Please respond within the time period required by law. If you have any questions, please contact me at the information provided below.
                </p>

                <div className="pt-4">
                  <p>Sincerely,</p>
                  <p className="pt-4 text-muted-foreground">{"{{signature_name}}"}</p>
                  <p className="text-muted-foreground">{"{{company_name}}"}</p>
                  <p className="text-muted-foreground">{"{{company_phone}}"}</p>
                  <p className="text-muted-foreground">{"{{company_email}}"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
