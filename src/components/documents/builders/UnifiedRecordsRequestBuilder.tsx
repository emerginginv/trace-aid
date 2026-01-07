import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Loader2, 
  Sparkles, 
  RefreshCw, 
  Save, 
  Scale, 
  Clock, 
  DollarSign,
  Gavel,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { 
  getAllJurisdictions, 
  getJurisdictionInfo, 
  DELIVERY_PREFERENCES,
  formatFeeStructure,
  type DeliveryPreference 
} from "@/lib/foiaStatutes";
import { LetterBrandingConfigEditor } from "@/components/documents/LetterBrandingConfig";
import { 
  type LetterBrandingConfig, 
  getDefaultLetterBrandingConfig,
  wrapLetterWithBranding
} from "@/lib/letterBranding";
import { getOrganizationProfile } from "@/lib/organizationProfile";
import { sanitizeAiContent } from "@/lib/aiContentSanitizer";

interface UnifiedRecordsRequestBuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function UnifiedRecordsRequestBuilder({ 
  organizationId, 
  onSave, 
  onCancel 
}: UnifiedRecordsRequestBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  
  // Branding config
  const [brandingConfig, setBrandingConfig] = useState<LetterBrandingConfig>(getDefaultLetterBrandingConfig());
  
  // Fetch organization profile
  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile-branding', organizationId],
    queryFn: () => getOrganizationProfile(organizationId),
    enabled: !!organizationId,
  });

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  const [formData, setFormData] = useState({
    jurisdiction: 'federal',
    useOrgInfo: true,
    customRequester: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: ''
    },
    agencyName: '',
    agencyDepartment: '',
    agencyAddress: '',
    recordsDescription: '',
    dateRangeStart: '',
    dateRangeEnd: '',
    purpose: '',
    caseNumber: '',
    deliveryPreference: 'email' as DeliveryPreference,
    deliveryEmail: '',
    portalUrl: '',
    requestFeeWaiver: false,
    feeWaiverJustification: '',
    expeditedProcessing: false,
    expeditedJustification: '',
    includeAppealRights: true,
    includeFeeNotice: true
  });

  const jurisdictions = getAllJurisdictions();
  const jurisdictionInfo = getJurisdictionInfo(formData.jurisdiction);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomRequesterChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customRequester: { ...prev.customRequester, [field]: value }
    }));
  };

  const getRequestingParty = () => {
    if (formData.useOrgInfo && orgSettings) {
      return {
        name: orgSettings.company_name || '',
        address: orgSettings.address || '',
        city: orgSettings.city || '',
        state: orgSettings.state || '',
        zipCode: orgSettings.zip_code || '',
        phone: orgSettings.phone || '',
        email: orgSettings.email || ''
      };
    }
    return formData.customRequester;
  };

  const handleGenerate = async () => {
    if (!formData.agencyName || !formData.recordsDescription) {
      toast.error("Please fill in required fields: Agency Name and Records Description");
      return;
    }

    const requestingParty = getRequestingParty();
    if (!requestingParty.name || !requestingParty.email) {
      toast.error("Please provide requester name and email");
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-foia-letter', {
        body: {
          jurisdiction: formData.jurisdiction,
          requestingParty,
          receivingAgency: {
            name: formData.agencyName,
            department: formData.agencyDepartment,
            address: formData.agencyAddress
          },
          requestDetails: {
            recordsDescription: formData.recordsDescription,
            dateRangeStart: formData.dateRangeStart,
            dateRangeEnd: formData.dateRangeEnd,
            purpose: formData.purpose,
            caseNumber: formData.caseNumber
          },
          options: {
            deliveryPreference: formData.deliveryPreference,
            deliveryEmail: formData.deliveryEmail,
            portalUrl: formData.portalUrl,
            requestFeeWaiver: formData.requestFeeWaiver,
            feeWaiverJustification: formData.feeWaiverJustification,
            expeditedProcessing: formData.expeditedProcessing,
            expeditedJustification: formData.expeditedJustification,
            includeAppealRights: formData.includeAppealRights,
            includeFeeNotice: formData.includeFeeNotice
          },
          statuteInfo: {
            statute: jurisdictionInfo.statute,
            statuteName: jurisdictionInfo.statuteName,
            responseDeadline: jurisdictionInfo.responseDeadline,
            appealProvision: jurisdictionInfo.appealProvision,
            appealDeadline: jurisdictionInfo.appealDeadline,
            appealBody: jurisdictionInfo.appealBody,
            feeStructure: jurisdictionInfo.feeStructure,
            legalLanguage: jurisdictionInfo.legalLanguage
          }
        }
      });

      if (error) throw error;

      if (data?.html) {
        // Sanitize AI-generated FOIA letter content
        const { clean, violations, wasModified } = sanitizeAiContent(data.html);
        if (violations.length > 0) {
          console.warn('AI content violations in FOIA letter:', violations);
          // Check for intrusion violations specifically
          const intrusionViolations = violations.filter(v => v.startsWith('INTRUSION:'));
          if (intrusionViolations.length > 0) {
            toast.warning("AI content was adjusted to comply with letter structure rules");
          }
        }
        setGeneratedHtml(clean);
        toast.success("Letter generated successfully!");
      } else {
        throw new Error("No content generated");
      }
    } catch (error) {
      console.error("Error generating letter:", error);
      toast.error("Failed to generate letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!generatedHtml) {
      toast.error("Please generate a letter first");
      return;
    }

    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Wrap generated HTML with branding
      const brandedHtml = wrapLetterWithBranding(
        generatedHtml,
        orgProfile || null,
        brandingConfig,
        new Date()
      );

      const { error } = await supabase.from('document_templates').insert({
        name: templateName,
        body: brandedHtml,
        document_type: 'letter',
        letter_category: formData.jurisdiction === 'federal' ? 'foia_federal' : 'state_pra',
        description: `${jurisdictionInfo.statuteName} request to ${formData.agencyName}`,
        organization_id: organizationId,
        user_id: userData.user.id,
        is_active: true
      });

      if (error) throw error;

      toast.success("Template saved successfully!");
      onSave();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
        {/* Jurisdiction Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Jurisdiction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Select Jurisdiction *</Label>
              <Select
                value={formData.jurisdiction}
                onValueChange={(value) => handleChange('jurisdiction', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j.code} value={j.code}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Enhanced Jurisdiction Info Card */}
            <div className="p-4 bg-muted rounded-lg space-y-3 border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{jurisdictionInfo.statuteName}</h4>
                <Badge variant="outline" className="text-xs">
                  {formData.jurisdiction === 'federal' ? 'Federal' : formData.jurisdiction}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Statute:</span>
                    <span className="ml-1 font-medium">{jurisdictionInfo.statute}</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Response:</span>
                    <span className="ml-1 font-medium">{jurisdictionInfo.responseDeadline}</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Gavel className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Appeal to:</span>
                    <span className="ml-1 font-medium">{jurisdictionInfo.appealBody}</span>
                    <span className="text-muted-foreground ml-1">
                      (within {jurisdictionInfo.appealDeadline})
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Fees:</span>
                    <span className="ml-1 font-medium text-xs">
                      {formatFeeStructure(jurisdictionInfo.feeStructure)}
                    </span>
                  </div>
                </div>
              </div>

              {jurisdictionInfo.exemptions.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Info className="h-3 w-3" />
                    Common Exemptions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {jurisdictionInfo.exemptions.slice(0, 4).map((exemption, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {exemption.length > 30 ? exemption.slice(0, 30) + '...' : exemption}
                      </Badge>
                    ))}
                    {jurisdictionInfo.exemptions.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{jurisdictionInfo.exemptions.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Requesting Party */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Requesting Party</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useOrgInfo"
                checked={formData.useOrgInfo}
                onCheckedChange={(checked) => handleChange('useOrgInfo', !!checked)}
              />
              <Label htmlFor="useOrgInfo">Use Organization Information</Label>
            </div>

            {formData.useOrgInfo && orgSettings ? (
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p className="font-medium">{orgSettings.company_name || 'Not set'}</p>
                <p className="text-muted-foreground">{orgSettings.address}</p>
                <p className="text-muted-foreground">
                  {orgSettings.city}, {orgSettings.state} {orgSettings.zip_code}
                </p>
                <p className="text-muted-foreground">{orgSettings.phone}</p>
                <p className="text-muted-foreground">{orgSettings.email}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.customRequester.name}
                    onChange={(e) => handleCustomRequesterChange('name', e.target.value)}
                    placeholder="Requester name or organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.customRequester.address}
                    onChange={(e) => handleCustomRequesterChange('address', e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.customRequester.city}
                      onChange={(e) => handleCustomRequesterChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.customRequester.state}
                      onChange={(e) => handleCustomRequesterChange('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={formData.customRequester.zipCode}
                      onChange={(e) => handleCustomRequesterChange('zipCode', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.customRequester.phone}
                      onChange={(e) => handleCustomRequesterChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.customRequester.email}
                      onChange={(e) => handleCustomRequesterChange('email', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receiving Agency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Receiving Agency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Agency Name *</Label>
              <Input
                value={formData.agencyName}
                onChange={(e) => handleChange('agencyName', e.target.value)}
                placeholder="e.g., Department of Justice"
              />
            </div>
            <div className="space-y-2">
              <Label>Department / Division (Optional)</Label>
              <Input
                value={formData.agencyDepartment}
                onChange={(e) => handleChange('agencyDepartment', e.target.value)}
                placeholder="e.g., Office of Information Policy"
              />
            </div>
            <div className="space-y-2">
              <Label>Agency Address</Label>
              <Textarea
                value={formData.agencyAddress}
                onChange={(e) => handleChange('agencyAddress', e.target.value)}
                placeholder="Full mailing address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Records Requested */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Records Requested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Description of Records *</Label>
              <Textarea
                value={formData.recordsDescription}
                onChange={(e) => handleChange('recordsDescription', e.target.value)}
                placeholder="Describe the specific records you are requesting. Be as detailed as possible to help the agency locate the records."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Range Start (Optional)</Label>
                <Input
                  type="date"
                  value={formData.dateRangeStart}
                  onChange={(e) => handleChange('dateRangeStart', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date Range End (Optional)</Label>
                <Input
                  type="date"
                  value={formData.dateRangeEnd}
                  onChange={(e) => handleChange('dateRangeEnd', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose (Optional)</Label>
              <Textarea
                value={formData.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                placeholder="Explain why you need these records (helps with fee waiver requests)"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Case Reference Number (Optional)</Label>
              <Input
                value={formData.caseNumber}
                onChange={(e) => handleChange('caseNumber', e.target.value)}
                placeholder="Your internal case or reference number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Preference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delivery Preference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={formData.deliveryPreference}
              onValueChange={(value) => handleChange('deliveryPreference', value)}
            >
              {DELIVERY_PREFERENCES.map((pref) => (
                <div key={pref.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={pref.value} id={pref.value} className="mt-1" />
                  <div>
                    <Label htmlFor={pref.value} className="font-medium">
                      {pref.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {formData.deliveryPreference === 'email' && (
              <div className="space-y-2 pl-6">
                <Label>Delivery Email Address</Label>
                <Input
                  type="email"
                  value={formData.deliveryEmail}
                  onChange={(e) => handleChange('deliveryEmail', e.target.value)}
                  placeholder="Email for receiving records"
                />
              </div>
            )}

            {formData.deliveryPreference === 'portal' && (
              <div className="space-y-2 pl-6">
                <Label>Portal URL (Optional)</Label>
                <Input
                  type="url"
                  value={formData.portalUrl}
                  onChange={(e) => handleChange('portalUrl', e.target.value)}
                  placeholder="Agency portal URL if known"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Special Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="feeWaiver"
                  checked={formData.requestFeeWaiver}
                  onCheckedChange={(checked) => handleChange('requestFeeWaiver', !!checked)}
                />
                <Label htmlFor="feeWaiver">Request Fee Waiver</Label>
              </div>
              {formData.requestFeeWaiver && (
                <Textarea
                  value={formData.feeWaiverJustification}
                  onChange={(e) => handleChange('feeWaiverJustification', e.target.value)}
                  placeholder="Explain why fees should be waived (e.g., public interest, non-commercial use)"
                  rows={3}
                  className="ml-6"
                />
              )}
            </div>

            {jurisdictionInfo.legalLanguage.expedited && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expedited"
                    checked={formData.expeditedProcessing}
                    onCheckedChange={(checked) => handleChange('expeditedProcessing', !!checked)}
                  />
                  <Label htmlFor="expedited">Request Expedited Processing</Label>
                </div>
                {formData.expeditedProcessing && (
                  <Textarea
                    value={formData.expeditedJustification}
                    onChange={(e) => handleChange('expeditedJustification', e.target.value)}
                    placeholder="Explain the urgency (e.g., imminent threat, time-sensitive matter)"
                    rows={3}
                    className="ml-6"
                  />
                )}
              </div>
            )}

            <div className="pt-3 border-t space-y-3">
              <p className="text-sm text-muted-foreground">Letter Content Options</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAppeal"
                  checked={formData.includeAppealRights}
                  onCheckedChange={(checked) => handleChange('includeAppealRights', !!checked)}
                />
                <Label htmlFor="includeAppeal" className="text-sm">
                  Include Appeal Rights Language
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFee"
                  checked={formData.includeFeeNotice}
                  onCheckedChange={(checked) => handleChange('includeFeeNotice', !!checked)}
                />
                <Label htmlFor="includeFee" className="text-sm">
                  Include Fee Acknowledgment
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Letter
              </>
            )}
          </Button>
        </div>

        {/* Branding Configuration */}
        <Card>
          <LetterBrandingConfigEditor
            config={brandingConfig}
            onChange={setBrandingConfig}
            organizationId={organizationId}
          />
        </Card>
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview</CardTitle>
              {generatedHtml && (
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedHtml ? (
              <div className="space-y-4">
                <div 
                  className="prose prose-sm max-w-none bg-white dark:bg-gray-900 p-6 rounded-lg border min-h-[400px] max-h-[500px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: generatedHtml }}
                />
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., FOIA Request - DOJ Records"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveTemplate} 
                    disabled={isSaving || !templateName.trim()}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save as Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Fill in the form and click "Generate Letter"</p>
                  <p className="text-sm mt-2">AI will create a legally structured letter with proper statutory language</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
