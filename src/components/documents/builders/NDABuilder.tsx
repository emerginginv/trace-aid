import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, NDA_TYPES } from "@/lib/letterCategories";
import { generateNDALetter } from "@/lib/letterGenerators";

interface NDABuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function NDABuilder({ organizationId, onSave, onCancel }: NDABuilderProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    agreementType: 'mutual',
    disclosingParty: '',
    disclosingAddress: '',
    receivingParty: '',
    receivingAddress: '',
    purposeOfDisclosure: '',
    confidentialInfoDefinition: '',
    duration: '2',
    governingLaw: '',
    disputeResolution: 'litigation',
    includeNonSolicitation: false,
    includeNonCompete: false,
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

      const letterBody = generateNDALetter(formData);

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `${formData.agreementType === 'mutual' ? 'Mutual' : 'Unilateral'} Non-Disclosure Agreement template`,
          document_type: 'agreement',
          letter_category: 'nda',
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
                placeholder="e.g., Standard Mutual NDA"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Agreement Type</Label>
              <Select 
                value={formData.agreementType} 
                onValueChange={(v) => handleChange('agreementType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NDA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Party Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disclosingParty">Disclosing Party Name</Label>
              <Input
                id="disclosingParty"
                placeholder="Company or individual name"
                value={formData.disclosingParty}
                onChange={(e) => handleChange('disclosingParty', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use {"{{company_name}}"} for your organization</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disclosingAddress">Disclosing Party Address</Label>
              <Textarea
                id="disclosingAddress"
                placeholder="Full address..."
                value={formData.disclosingAddress}
                onChange={(e) => handleChange('disclosingAddress', e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="receivingParty">Receiving Party Name</Label>
              <Input
                id="receivingParty"
                placeholder="Company or individual name"
                value={formData.receivingParty}
                onChange={(e) => handleChange('receivingParty', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receivingAddress">Receiving Party Address</Label>
              <Textarea
                id="receivingAddress"
                placeholder="Full address..."
                value={formData.receivingAddress}
                onChange={(e) => handleChange('receivingAddress', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agreement Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purposeOfDisclosure">Purpose of Disclosure</Label>
              <Textarea
                id="purposeOfDisclosure"
                placeholder="Describe the business purpose for sharing confidential information..."
                value={formData.purposeOfDisclosure}
                onChange={(e) => handleChange('purposeOfDisclosure', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidentialInfoDefinition">Definition of Confidential Information</Label>
              <Textarea
                id="confidentialInfoDefinition"
                placeholder="Describe what constitutes confidential information..."
                value={formData.confidentialInfoDefinition}
                onChange={(e) => handleChange('confidentialInfoDefinition', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Years)</Label>
                <Select 
                  value={formData.duration} 
                  onValueChange={(v) => handleChange('duration', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Year</SelectItem>
                    <SelectItem value="2">2 Years</SelectItem>
                    <SelectItem value="3">3 Years</SelectItem>
                    <SelectItem value="5">5 Years</SelectItem>
                    <SelectItem value="perpetual">Perpetual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Governing Law</Label>
                <Select 
                  value={formData.governingLaw} 
                  onValueChange={(v) => handleChange('governingLaw', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state..." />
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
            </div>

            <div className="space-y-2">
              <Label>Dispute Resolution</Label>
              <Select 
                value={formData.disputeResolution} 
                onValueChange={(v) => handleChange('disputeResolution', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="litigation">Litigation</SelectItem>
                  <SelectItem value="arbitration">Binding Arbitration</SelectItem>
                  <SelectItem value="mediation">Mediation First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Additional Provisions</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nonSolicitation"
                  checked={formData.includeNonSolicitation}
                  onCheckedChange={(checked) => handleChange('includeNonSolicitation', !!checked)}
                />
                <Label htmlFor="nonSolicitation" className="cursor-pointer">
                  Include non-solicitation clause
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nonCompete"
                  checked={formData.includeNonCompete}
                  onCheckedChange={(checked) => handleChange('includeNonCompete', !!checked)}
                />
                <Label htmlFor="nonCompete" className="cursor-pointer">
                  Include non-compete clause
                </Label>
              </div>
            </div>
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
                <h3 className="text-center font-bold text-lg">
                  {formData.agreementType === 'mutual' ? 'MUTUAL ' : ''}NON-DISCLOSURE AGREEMENT
                </h3>

                <p>
                  This Non-Disclosure Agreement ("Agreement") is entered into as of {"{{current_date}}"} by and between:
                </p>

                <p>
                  <strong>Disclosing Party:</strong> {formData.disclosingParty || "{{disclosing_party}}"}<br />
                  {formData.disclosingAddress || "{{disclosing_address}}"}
                </p>

                <p>
                  <strong>Receiving Party:</strong> {formData.receivingParty || "{{receiving_party}}"}<br />
                  {formData.receivingAddress || "{{receiving_address}}"}
                </p>

                <p><strong>1. Purpose</strong></p>
                <p>{formData.purposeOfDisclosure || "The parties wish to explore a potential business relationship."}</p>

                <p><strong>2. Confidential Information</strong></p>
                <p>{formData.confidentialInfoDefinition || "All information disclosed by either party that is marked confidential or should reasonably be understood to be confidential."}</p>

                <p><strong>3. Term</strong></p>
                <p>This Agreement shall remain in effect for {formData.duration === 'perpetual' ? 'perpetuity' : `${formData.duration} year(s)`} from the date of execution.</p>

                {formData.governingLaw && (
                  <>
                    <p><strong>4. Governing Law</strong></p>
                    <p>This Agreement shall be governed by the laws of {US_STATES.find(s => s.value === formData.governingLaw)?.label || formData.governingLaw}.</p>
                  </>
                )}

                <div className="pt-6 grid grid-cols-2 gap-8">
                  <div>
                    <p className="border-t pt-2">{formData.disclosingParty || "Disclosing Party"}</p>
                    <p className="text-xs text-muted-foreground">Signature / Date</p>
                  </div>
                  <div>
                    <p className="border-t pt-2">{formData.receivingParty || "Receiving Party"}</p>
                    <p className="text-xs text-muted-foreground">Signature / Date</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
