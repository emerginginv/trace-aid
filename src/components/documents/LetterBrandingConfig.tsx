import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, Calendar, Pen, FileWarning, Building2 } from "lucide-react";
import { type LetterBrandingConfig, getDefaultLetterBrandingConfig } from "@/lib/letterBranding";
import { type OrganizationProfile } from "@/lib/organizationProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface LetterBrandingConfigEditorProps {
  config: LetterBrandingConfig;
  onChange: (config: LetterBrandingConfig) => void;
  organizationId: string;
}

export function LetterBrandingConfigEditor({ 
  config, 
  onChange, 
  organizationId 
}: LetterBrandingConfigEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Fetch user profile for default signature
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-for-signature'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      return data;
    },
  });

  // Fetch organization settings for preview
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings-branding', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('company_name, logo_url, address, city, state, zip_code, phone, email, signature_name, signature_title')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Set default signature from user profile or org settings
  useEffect(() => {
    if (!config.signatureName) {
      const defaultName = orgSettings?.signature_name || userProfile?.full_name || '';
      const defaultTitle = orgSettings?.signature_title || '';
      if (defaultName || defaultTitle) {
        onChange({
          ...config,
          signatureName: defaultName,
          signatureTitle: defaultTitle,
        });
      }
    }
  }, [userProfile, orgSettings]);

  const updateConfig = (updates: Partial<LetterBrandingConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Document Branding</span>
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-6 pt-2">
            {/* Letterhead Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                LETTERHEAD
              </div>
              
              <div className="grid gap-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showLogo" className="cursor-pointer">Organization Logo</Label>
                  <Switch
                    id="showLogo"
                    checked={config.showLogo}
                    onCheckedChange={(checked) => updateConfig({ showLogo: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="showOrgName" className="cursor-pointer">Organization Name</Label>
                  <Switch
                    id="showOrgName"
                    checked={config.showOrgName}
                    onCheckedChange={(checked) => updateConfig({ showOrgName: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="showOrgAddress" className="cursor-pointer">Full Address</Label>
                  <Switch
                    id="showOrgAddress"
                    checked={config.showOrgAddress}
                    onCheckedChange={(checked) => updateConfig({ showOrgAddress: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="showContactInfo" className="cursor-pointer">Contact Info (Phone & Email)</Label>
                  <Switch
                    id="showContactInfo"
                    checked={config.showContactInfo}
                    onCheckedChange={(checked) => updateConfig({ showContactInfo: checked })}
                  />
                </div>
                
                {(config.showLogo || config.showOrgName) && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Alignment</Label>
                    <RadioGroup
                      value={config.logoAlignment}
                      onValueChange={(value: 'left' | 'center' | 'right') => updateConfig({ logoAlignment: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="left" id="align-left" />
                        <Label htmlFor="align-left" className="cursor-pointer text-sm">Left</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="center" id="align-center" />
                        <Label htmlFor="align-center" className="cursor-pointer text-sm">Center</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="right" id="align-right" />
                        <Label htmlFor="align-right" className="cursor-pointer text-sm">Right</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                {/* Preview of org info */}
                {orgSettings && (config.showOrgName || config.showOrgAddress) && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <p className="font-medium">{orgSettings.company_name || 'Organization name not set'}</p>
                    {config.showOrgAddress && (
                      <p>{[orgSettings.address, orgSettings.city, orgSettings.state, orgSettings.zip_code].filter(Boolean).join(', ') || 'Address not set'}</p>
                    )}
                    {config.showContactInfo && (
                      <p>{[orgSettings.phone, orgSettings.email].filter(Boolean).join(' | ') || 'Contact info not set'}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                DATE
              </div>
              
              <div className="grid gap-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showDate" className="cursor-pointer">Include Date</Label>
                  <Switch
                    id="showDate"
                    checked={config.showDate}
                    onCheckedChange={(checked) => updateConfig({ showDate: checked })}
                  />
                </div>
                
                {config.showDate && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Format</Label>
                    <RadioGroup
                      value={config.dateFormat}
                      onValueChange={(value: 'full' | 'short') => updateConfig({ dateFormat: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="full" id="date-full" />
                        <Label htmlFor="date-full" className="cursor-pointer text-sm">Full (January 6, 2026)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="short" id="date-short" />
                        <Label htmlFor="date-short" className="cursor-pointer text-sm">Short (01/06/2026)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Pen className="h-4 w-4" />
                SIGNATURE
              </div>
              
              <div className="grid gap-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showSignatureBlock" className="cursor-pointer">Include Signature Block</Label>
                  <Switch
                    id="showSignatureBlock"
                    checked={config.showSignatureBlock}
                    onCheckedChange={(checked) => updateConfig({ showSignatureBlock: checked })}
                  />
                </div>
                
                {config.showSignatureBlock && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signatureName">Name</Label>
                      <Input
                        id="signatureName"
                        value={config.signatureName}
                        onChange={(e) => updateConfig({ signatureName: e.target.value })}
                        placeholder="Signer's full name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signatureTitle">Title</Label>
                      <Input
                        id="signatureTitle"
                        value={config.signatureTitle}
                        onChange={(e) => updateConfig({ signatureTitle: e.target.value })}
                        placeholder="Signer's title"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="includeSignatureLine" className="cursor-pointer">Include line for wet signature</Label>
                      <Switch
                        id="includeSignatureLine"
                        checked={config.includeSignatureLine}
                        onCheckedChange={(checked) => updateConfig({ includeSignatureLine: checked })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileWarning className="h-4 w-4" />
                FOOTER (OPTIONAL)
              </div>
              
              <div className="grid gap-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showConfidentiality" className="cursor-pointer">Confidentiality Notice</Label>
                  <Switch
                    id="showConfidentiality"
                    checked={config.showConfidentiality}
                    onCheckedChange={(checked) => updateConfig({ showConfidentiality: checked })}
                  />
                </div>
                
                {config.showConfidentiality && (
                  <div className="space-y-2">
                    <Label htmlFor="confidentialityText" className="text-xs text-muted-foreground">Footer Text</Label>
                    <Textarea
                      id="confidentialityText"
                      value={config.confidentialityText}
                      onChange={(e) => updateConfig({ confidentialityText: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
