import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, FileText, Building } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, getStateInfo } from "@/lib/letterCategories";
import { generateStatePRABodyContent, renderStatePRABodyHtml } from "@/lib/letterBodyGenerators";

interface StatePRABuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function StatePRABuilder({ organizationId, onSave, onCancel }: StatePRABuilderProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    state: '',
    agencyName: '',
    agencyAddress: '',
    recordsRequested: '',
    dateRangeStart: '',
    dateRangeEnd: '',
    formatPreference: 'electronic',
    expeditedProcessing: false,
    requestFeeWaiver: false,
  });

  const selectedStateInfo = formData.state ? getStateInfo(formData.state) : null;

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTemplate = async () => {
    if (!formData.templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.state) {
      toast.error('Please select a state');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate body content only (no layout elements)
      const bodyContent = generateStatePRABodyContent(formData, selectedStateInfo);
      const letterBody = renderStatePRABodyHtml(bodyContent);

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `${selectedStateInfo?.label || formData.state} Public Records Act request template`,
          document_type: 'request',
          letter_category: 'state_pra',
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
                placeholder="e.g., California PRA Request Template"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              State & Agency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>State *</Label>
              <Select 
                value={formData.state} 
                onValueChange={(v) => handleChange('state', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStateInfo && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">Applicable Statute:</p>
                <p className="text-sm text-muted-foreground">{selectedStateInfo.statute}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency/Department Name</Label>
              <Input
                id="agencyName"
                placeholder="e.g., City Police Department"
                value={formData.agencyName}
                onChange={(e) => handleChange('agencyName', e.target.value)}
              />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateRangeStart">Date Range Start</Label>
                <Input
                  id="dateRangeStart"
                  type="date"
                  value={formData.dateRangeStart}
                  onChange={(e) => handleChange('dateRangeStart', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateRangeEnd">Date Range End</Label>
                <Input
                  id="dateRangeEnd"
                  type="date"
                  value={formData.dateRangeEnd}
                  onChange={(e) => handleChange('dateRangeEnd', e.target.value)}
                />
              </div>
            </div>

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
                id="expedited"
                checked={formData.expeditedProcessing}
                onCheckedChange={(checked) => handleChange('expeditedProcessing', !!checked)}
              />
              <Label htmlFor="expedited" className="cursor-pointer">
                Include expedited processing section
              </Label>
            </div>

            {formData.expeditedProcessing && (
              <div className="ml-6 p-3 bg-muted/50 rounded-md border">
                <p className="text-sm text-muted-foreground">
                  Template will include: <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{expedited_justification}}"}</code>
                </p>
              </div>
            )}

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

                <p><strong>RE: Public Records Request Pursuant to {selectedStateInfo?.statute || '[State Statute]'}</strong></p>

                <p>Dear Records Custodian,</p>

                <p>
                  Pursuant to {selectedStateInfo?.statute || 'the applicable state public records act'}, I hereby request access to and copies of the following records:
                </p>

                <div className="pl-4 border-l-2 border-muted-foreground/30">
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {formData.recordsRequested || "{{RECORDS_REQUESTED}}"}
                  </code>
                </div>

                {(formData.dateRangeStart || formData.dateRangeEnd) && (
                  <div className="p-2 border border-dashed border-muted-foreground/50 rounded">
                    <p className="text-xs text-muted-foreground">[IF has_date_range]</p>
                    <p><strong>Date Range:</strong> {formData.dateRangeStart || "{{DATE_RANGE_START}}"} to {formData.dateRangeEnd || "{{DATE_RANGE_END}}"}</p>
                    <p className="text-xs text-muted-foreground">[/IF]</p>
                  </div>
                )}

                {formData.expeditedProcessing && (
                  <div className="p-2 border border-dashed border-muted-foreground/50 rounded">
                    <p className="text-xs text-muted-foreground">[IF expedited_enabled]</p>
                    <p><strong>Request for Expedited Processing:</strong></p>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{EXPEDITED_CONTENT}}"}</code>
                    <p className="text-xs text-muted-foreground">[/IF]</p>
                  </div>
                )}

                {formData.requestFeeWaiver && (
                  <div className="p-2 border border-dashed border-muted-foreground/50 rounded">
                    <p className="text-xs text-muted-foreground">[IF fee_waiver_enabled]</p>
                    <p><strong>Fee Waiver Request:</strong></p>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{FEE_WAIVER_CONTENT}}"}</code>
                    <p className="text-xs text-muted-foreground">[/IF]</p>
                  </div>
                )}

                <p>
                  Please respond within the statutory time period. Contact me with any questions.
                </p>

                <div className="pt-4">
                  <p>Sincerely,</p>
                  <p className="pt-4 text-muted-foreground">{"{{signature_name}}"}</p>
                  <p className="text-muted-foreground">{"{{company_name}}"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
