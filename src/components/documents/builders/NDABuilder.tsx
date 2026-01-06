import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, Shield, Sparkles, Lock, RefreshCw, AlertTriangle, Scale, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, NDA_TYPES } from "@/lib/letterCategories";
import { 
  getNDAStateProvisions, 
  NDA_TERM_LENGTHS, 
  NDA_DISPUTE_RESOLUTION, 
  NDA_LANGUAGE_STYLES,
  getNonCompeteStatusInfo
} from "@/lib/ndaStatutes";
import { cn } from "@/lib/utils";
import { LetterBrandingConfigEditor } from "@/components/documents/LetterBrandingConfig";
import { 
  type LetterBrandingConfig, 
  getDefaultLetterBrandingConfig,
  wrapLetterWithBranding
} from "@/lib/letterBranding";
import { getOrganizationProfile } from "@/lib/organizationProfile";
import { useQuery } from "@tanstack/react-query";

interface NDABuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function NDABuilder({ organizationId, onSave, onCancel }: NDABuilderProps) {
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    templateName: '',
    agreementType: 'mutual' as 'mutual' | 'unilateral',
    disclosingParty: '',
    disclosingAddress: '',
    receivingParty: '',
    receivingAddress: '',
    purposeOfDisclosure: '',
    confidentialInfoDefinition: '',
    duration: '2',
    governingLaw: '',
    disputeResolution: 'litigation' as 'litigation' | 'arbitration' | 'mediation',
    languageStyle: 'standard' as 'standard' | 'simplified' | 'tightened',
    includeNonSolicitation: false,
    includeNonCompete: false,
  });
  
  // Branding config
  const [brandingConfig, setBrandingConfig] = useState<LetterBrandingConfig>(getDefaultLetterBrandingConfig());
  
  // Fetch organization profile
  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile-branding', organizationId],
    queryFn: () => getOrganizationProfile(organizationId),
    enabled: !!organizationId,
  });

  const selectedStateProvisions = formData.governingLaw ? getNDAStateProvisions(formData.governingLaw) : null;
  const nonCompeteStatus = selectedStateProvisions ? getNonCompeteStatusInfo(selectedStateProvisions.nonCompeteStatus) : null;

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear generated content when form changes
    if (generatedHtml) {
      setGeneratedHtml(null);
    }
  };

  const handleGenerateNDA = async () => {
    if (!formData.governingLaw) {
      toast.error('Please select a governing state');
      return;
    }
    if (!formData.disclosingParty || !formData.receivingParty) {
      toast.error('Please enter both party names');
      return;
    }
    if (!formData.purposeOfDisclosure) {
      toast.error('Please enter the purpose of disclosure');
      return;
    }

    const stateProvisions = getNDAStateProvisions(formData.governingLaw);
    if (!stateProvisions) {
      toast.error('State provisions not found');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-nda', {
        body: {
          agreementType: formData.agreementType,
          disclosingParty: {
            name: formData.disclosingParty,
            address: formData.disclosingAddress,
          },
          receivingParty: {
            name: formData.receivingParty,
            address: formData.receivingAddress,
          },
          purpose: formData.purposeOfDisclosure,
          termLength: formData.duration,
          governingState: stateProvisions.name,
          stateProvisions: {
            governingLawLanguage: stateProvisions.governingLawLanguage,
            venueLanguage: stateProvisions.venueLanguage,
            tradeSecretStatute: stateProvisions.tradeSecretStatute,
            tradeSecretStatuteName: stateProvisions.tradeSecretStatuteName,
          },
          options: {
            style: formData.languageStyle,
            includeNonSolicitation: formData.includeNonSolicitation,
            includeNonCompete: formData.includeNonCompete,
            disputeResolution: formData.disputeResolution,
          },
          confidentialInfoDefinition: formData.confidentialInfoDefinition || undefined,
        },
      });

      if (error) throw error;

      if (data?.html) {
        setGeneratedHtml(data.html);
        toast.success('NDA generated successfully');
      } else {
        throw new Error('No content received from AI');
      }
    } catch (error: any) {
      console.error('Error generating NDA:', error);
      toast.error(error.message || 'Failed to generate NDA');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!generatedHtml) {
      toast.error('Please generate the NDA first');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Wrap NDA HTML with branding (letterhead for formal presentation)
      const brandedHtml = wrapLetterWithBranding(
        generatedHtml,
        orgProfile || null,
        {
          ...brandingConfig,
          // NDAs typically don't need full letter signature block since they have their own
          showSignatureBlock: false,
        },
        new Date()
      );

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `${formData.agreementType === 'mutual' ? 'Mutual' : 'Unilateral'} Non-Disclosure Agreement - ${formData.governingLaw}`,
          document_type: 'agreement',
          letter_category: 'nda',
          body: brandedHtml,
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

  // Protected clauses that will be shown with lock icons
  const protectedClauses = [
    'Definition of Confidential Information',
    'Obligations of Receiving Party',
    'Exclusions from Confidentiality',
    'Term and Termination',
    'Return of Materials',
    'Governing Law and Jurisdiction',
    'Remedies',
    'Severability',
    'Entire Agreement',
    'Signature Blocks',
  ];

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
              <Label>Agreement Type *</Label>
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
              <Label htmlFor="disclosingParty">Disclosing Party Name *</Label>
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
              <Label htmlFor="receivingParty">Receiving Party Name *</Label>
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
              <Label htmlFor="purposeOfDisclosure">Purpose of Disclosure *</Label>
              <Textarea
                id="purposeOfDisclosure"
                placeholder="Describe the business purpose for sharing confidential information..."
                value={formData.purposeOfDisclosure}
                onChange={(e) => handleChange('purposeOfDisclosure', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidentialInfoDefinition">Definition of Confidential Information (Optional)</Label>
              <Textarea
                id="confidentialInfoDefinition"
                placeholder="Leave blank for standard definition, or describe specific categories of confidential information..."
                value={formData.confidentialInfoDefinition}
                onChange={(e) => handleChange('confidentialInfoDefinition', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term Length *</Label>
                <Select 
                  value={formData.duration} 
                  onValueChange={(v) => handleChange('duration', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NDA_TERM_LENGTHS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        <div>
                          <div>{term.label}</div>
                          <div className="text-xs text-muted-foreground">{term.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Governing State *</Label>
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

            {/* State Info Card */}
            {selectedStateProvisions && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedStateProvisions.name}</span>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Trade Secret Statute:</span>
                        <span className="ml-1">{selectedStateProvisions.tradeSecretStatute}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Non-Compete Status:</span>
                        <Badge variant="secondary" className={cn("text-xs", nonCompeteStatus?.color)}>
                          {nonCompeteStatus?.label}
                        </Badge>
                      </div>
                    </div>
                    
                    {selectedStateProvisions.nonCompeteStatus !== 'enforceable' && (
                      <p className="text-xs text-muted-foreground pl-6">
                        {selectedStateProvisions.nonCompeteRestrictions}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Dispute Resolution</Label>
              <Select 
                value={formData.disputeResolution} 
                onValueChange={(v) => handleChange('disputeResolution', v as 'litigation' | 'arbitration' | 'mediation')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NDA_DISPUTE_RESOLUTION.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Language Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {NDA_LANGUAGE_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => handleChange('languageStyle', style.value)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors",
                      formData.languageStyle === style.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium text-sm">{style.label}</div>
                    <div className="text-xs text-muted-foreground">{style.description}</div>
                  </button>
                ))}
              </div>
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

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="nonCompete"
                  checked={formData.includeNonCompete}
                  onCheckedChange={(checked) => handleChange('includeNonCompete', !!checked)}
                  disabled={selectedStateProvisions?.nonCompeteStatus === 'unenforceable'}
                />
                <div className="space-y-1">
                  <Label htmlFor="nonCompete" className={cn(
                    "cursor-pointer",
                    selectedStateProvisions?.nonCompeteStatus === 'unenforceable' && "text-muted-foreground"
                  )}>
                    Include non-compete clause
                  </Label>
                  {selectedStateProvisions?.nonCompeteStatus === 'unenforceable' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Generally unenforceable in {selectedStateProvisions.name}
                    </p>
                  )}
                  {selectedStateProvisions?.nonCompeteStatus === 'limited' && formData.includeNonCompete && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limited enforceability - review state restrictions
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding Configuration */}
        <Card>
          <LetterBrandingConfigEditor
            config={brandingConfig}
            onChange={setBrandingConfig}
            organizationId={organizationId}
          />
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleGenerateNDA} 
            disabled={generating || !formData.governingLaw}
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate NDA
              </>
            )}
          </Button>
          <Button onClick={handleSaveTemplate} disabled={saving || !generatedHtml}>
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
              {generatedHtml ? 'Generated NDA' : 'Preview Structure'}
            </CardTitle>
            {!generatedHtml && (
              <CardDescription>
                Protected clauses are marked with lock icons
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {generatedHtml ? (
              <div 
                className="bg-white dark:bg-muted/20 rounded-lg p-6 min-h-[500px] max-h-[700px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-6 min-h-[500px] font-serif text-sm space-y-4">
                <h3 className="text-center font-bold text-lg">
                  {formData.agreementType === 'mutual' ? 'MUTUAL ' : ''}NON-DISCLOSURE AGREEMENT
                </h3>

                <p className="text-muted-foreground text-center text-xs">
                  Generate the NDA to see the full document
                </p>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                    Protected Structural Clauses
                  </p>
                  {protectedClauses.map((clause, index) => (
                    <div 
                      key={clause} 
                      className="flex items-center gap-2 p-2 rounded bg-muted/50"
                    >
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {index + 1}. {clause}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong>Style:</strong> {NDA_LANGUAGE_STYLES.find(s => s.value === formData.languageStyle)?.label}</p>
                  <p><strong>Term:</strong> {NDA_TERM_LENGTHS.find(t => t.value === formData.duration)?.label}</p>
                  {formData.governingLaw && (
                    <p><strong>Governing Law:</strong> {US_STATES.find(s => s.value === formData.governingLaw)?.label}</p>
                  )}
                  <p><strong>Dispute Resolution:</strong> {NDA_DISPUTE_RESOLUTION.find(d => d.value === formData.disputeResolution)?.label}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
