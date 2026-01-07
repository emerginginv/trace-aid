import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, FileText, Scale } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FEDERAL_AGENCIES } from "@/lib/letterCategories";
import { generateFOIABodyContent, renderFOIABodyHtml } from "@/lib/letterBodyGenerators";

interface FOIABuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function FOIABuilder({ organizationId, onSave, onCancel }: FOIABuilderProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    federalAgency: '',
    subAgency: '',
    recordsRequested: '',
    dateRangeStart: '',
    dateRangeEnd: '',
    feeCategory: 'other',
    requestFeeWaiver: false,
    expeditedProcessing: false,
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
      const bodyContent = generateFOIABodyContent(formData);
      const letterBody = renderFOIABodyHtml(bodyContent);

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `FOIA request template for ${formData.federalAgency || 'federal agencies'}`,
          document_type: 'request',
          letter_category: 'foia_federal',
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
                placeholder="e.g., FBI FOIA Request Template"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Federal Agency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Federal Agency *</Label>
              <Select 
                value={formData.federalAgency} 
                onValueChange={(v) => handleChange('federalAgency', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agency..." />
                </SelectTrigger>
                <SelectContent>
                  {FEDERAL_AGENCIES.map((agency) => (
                    <SelectItem key={agency} value={agency}>
                      {agency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subAgency">Sub-Agency/Component (Optional)</Label>
              <Input
                id="subAgency"
                placeholder="e.g., Criminal Justice Information Services"
                value={formData.subAgency}
                onChange={(e) => handleChange('subAgency', e.target.value)}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">Legal Authority:</p>
              <p className="text-sm text-muted-foreground">5 U.S.C. § 552 (Freedom of Information Act)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recordsRequested">Description of Records Requested *</Label>
              <Textarea
                id="recordsRequested"
                placeholder="Provide a detailed description of the records you are seeking..."
                value={formData.recordsRequested}
                onChange={(e) => handleChange('recordsRequested', e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as possible. Include names, dates, locations, and any identifying information.
              </p>
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
              <Label>Fee Category</Label>
              <Select 
                value={formData.feeCategory} 
                onValueChange={(v) => handleChange('feeCategory', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial Use</SelectItem>
                  <SelectItem value="educational">Educational Institution</SelectItem>
                  <SelectItem value="news_media">News Media</SelectItem>
                  <SelectItem value="scientific">Scientific Institution</SelectItem>
                  <SelectItem value="other">Other (General Public)</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="electronic">Electronic Format</SelectItem>
                  <SelectItem value="paper">Paper Copies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

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
            <div className="bg-muted/50 rounded-lg p-6 min-h-[400px] font-serif text-sm">
              <div className="space-y-4">
                <p className="text-right">{"{{current_date}}"}</p>
                
                <div>
                  <p>FOIA Officer</p>
                  <p>{formData.federalAgency || "{{federal_agency}}"}</p>
                  {formData.subAgency && <p>{formData.subAgency}</p>}
                </div>

                <p><strong>RE: Freedom of Information Act Request</strong></p>

                <p>Dear FOIA Officer,</p>

                <p>
                  Pursuant to the Freedom of Information Act, 5 U.S.C. § 552, I am requesting access to and copies of the following records:
                </p>

                <div className="pl-4 border-l-2 border-muted-foreground/30">
                  <p className="whitespace-pre-line">
                    {formData.recordsRequested || "{{records_requested}}"}
                  </p>
                </div>

                {(formData.dateRangeStart || formData.dateRangeEnd) && (
                  <p>
                    <strong>Date Range:</strong> {formData.dateRangeStart || 'N/A'} to {formData.dateRangeEnd || 'Present'}
                  </p>
                )}

                <p>
                  <strong>Fee Category:</strong> {
                    formData.feeCategory === 'commercial' ? 'Commercial Use' :
                    formData.feeCategory === 'educational' ? 'Educational Institution' :
                    formData.feeCategory === 'news_media' ? 'News Media' :
                    formData.feeCategory === 'scientific' ? 'Scientific Institution' : 'Other'
                  }
                </p>

                {formData.requestFeeWaiver && (
                  <div>
                    <p><strong>Fee Waiver Request:</strong></p>
                    <p className="text-muted-foreground italic">{"{{fee_waiver_justification}}"}</p>
                  </div>
                )}

                {formData.expeditedProcessing && (
                  <div>
                    <p><strong>Expedited Processing Request:</strong></p>
                    <p className="text-muted-foreground italic">{"{{expedited_justification}}"}</p>
                  </div>
                )}

                <p>
                  Please respond within 20 business days as required by law.
                </p>

                <div className="pt-4">
                  <p>Sincerely,</p>
                  <p className="pt-4">{"{{signature_name}}"}</p>
                  <p>{"{{company_name}}"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
