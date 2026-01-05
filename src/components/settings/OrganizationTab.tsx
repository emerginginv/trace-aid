import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const organizationSchema = z.object({
  company_name: z.string().trim().max(100, "Company name must be less than 100 characters"),
  default_currency: z.string(),
  timezone: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  billing_email: z.string().email("Invalid email").or(z.literal('')).optional(),
  agency_license_number: z.string().optional(),
  fein_number: z.string().optional(),
  terms: z.string().optional(),
});

interface OrganizationTabProps {
  currentUserId: string | null;
  companyName: string;
  setCompanyName: (value: string) => void;
  defaultCurrency: string;
  setDefaultCurrency: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  zipCode: string;
  setZipCode: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  contactEmail: string;
  setContactEmail: (value: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  billingEmail: string;
  setBillingEmail: (value: string) => void;
  agencyLicenseNumber: string;
  setAgencyLicenseNumber: (value: string) => void;
  feinNumber: string;
  setFeinNumber: (value: string) => void;
  terms: string;
  setTerms: (value: string) => void;
  signatureName: string;
  signatureTitle: string;
  signaturePhone: string;
  signatureEmail: string;
  senderEmail: string;
}

export function OrganizationTab({
  currentUserId,
  companyName,
  setCompanyName,
  defaultCurrency,
  setDefaultCurrency,
  timezone,
  setTimezone,
  logoUrl,
  setLogoUrl,
  address,
  setAddress,
  city,
  setCity,
  state,
  setState,
  zipCode,
  setZipCode,
  phone,
  setPhone,
  contactEmail,
  setContactEmail,
  websiteUrl,
  setWebsiteUrl,
  billingEmail,
  setBillingEmail,
  agencyLicenseNumber,
  setAgencyLicenseNumber,
  feinNumber,
  setFeinNumber,
  terms,
  setTerms,
  signatureName,
  signatureTitle,
  signaturePhone,
  signatureEmail,
  senderEmail,
}: OrganizationTabProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!currentUserId) return;

      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}/logo.${fileExt}`;
      const filePath = fileName;

      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('organization-logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      setLogoUrl(data.publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      if (!logoUrl || !currentUserId) return;

      const filePath = logoUrl.split('/').slice(-2).join('/');
      
      const { error } = await supabase.storage
        .from('organization-logos')
        .remove([filePath]);

      if (error) throw error;

      setLogoUrl("");
      toast.success("Logo removed");
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const saveOrganizationSettings = async () => {
    try {
      const validation = organizationSchema.safeParse({
        company_name: companyName,
        default_currency: defaultCurrency,
        timezone: timezone,
        address: address,
        phone: phone,
        billing_email: billingEmail || undefined,
        agency_license_number: agencyLicenseNumber,
        fein_number: feinNumber,
        terms: terms,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setSaving(true);

      if (!currentUserId) return;

      const { data: existing } = await supabase
        .from("organization_settings")
        .select("id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      const updateData = {
        company_name: companyName,
        default_currency: defaultCurrency,
        timezone: timezone,
        logo_url: logoUrl,
        address: address,
        city: city,
        state: state,
        zip_code: zipCode,
        phone: phone,
        email: contactEmail,
        website_url: websiteUrl,
        billing_email: billingEmail,
        agency_license_number: agencyLicenseNumber,
        fein_number: feinNumber,
        terms: terms,
        signature_name: signatureName,
        signature_title: signatureTitle,
        signature_phone: signaturePhone,
        signature_email: signatureEmail,
        sender_email: senderEmail,
      };

      if (existing) {
        const { error } = await supabase
          .from("organization_settings")
          .update(updateData)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', currentUserId)
          .single();

        if (!orgMember?.organization_id) {
          throw new Error("User not in organization");
        }

        const { error } = await supabase
          .from("organization_settings")
          .insert({
            user_id: currentUserId,
            organization_id: orgMember.organization_id,
            ...updateData,
          });

        if (error) throw error;
      }

      toast.success("Organization settings saved successfully");
    } catch (error: any) {
      console.error("Error saving organization settings:", error);
      toast.error("Failed to save organization settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Configure your organization's default settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="logo">Organization Logo</Label>
            <div className="mt-2 space-y-3">
              {logoUrl && (
                <div className="relative inline-block">
                  <img 
                    src={logoUrl} 
                    alt="Organization logo" 
                    className="h-20 w-auto rounded border border-border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removeLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a logo for your invoices and system branding
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="billingEmail">Billing Email</Label>
              <Input
                id="billingEmail"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@company.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Suite 100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@company.com"
              />
            </div>
            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agencyLicense">Agency License #</Label>
              <Input
                id="agencyLicense"
                value={agencyLicenseNumber}
                onChange={(e) => setAgencyLicenseNumber(e.target.value)}
                placeholder="License number"
              />
            </div>

            <div>
              <Label htmlFor="fein">FEIN Number</Label>
              <Input
                id="fein"
                value={feinNumber}
                onChange={(e) => setFeinNumber(e.target.value)}
                placeholder="12-3456789"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="currency">Default Currency</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="terms">Invoice Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Enter default invoice terms and conditions..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              These terms will appear on your invoices
            </p>
          </div>
        </div>

        <Button onClick={saveOrganizationSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
