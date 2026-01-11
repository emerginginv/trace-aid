import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { isValidHexColor, sanitizeBrandName } from "@/hooks/use-tenant-branding";
import type { Json } from "@/integrations/supabase/types";

const ALLOWED_MIME_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface LoginBrandingSectionProps {
  organizationId: string | null;
  currentUserId: string | null;
  brandingEnabled: boolean;
  setBrandingEnabled: (value: boolean) => void;
  loginLogoUrl: string;
  setLoginLogoUrl: (value: string) => void;
  brandName: string;
  setBrandName: (value: string) => void;
  accentColor: string;
  setAccentColor: (value: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function LoginBrandingSection({
  organizationId,
  currentUserId,
  brandingEnabled,
  setBrandingEnabled,
  loginLogoUrl,
  setLoginLogoUrl,
  brandName,
  setBrandName,
  accentColor,
  setAccentColor,
  onSave,
  saving,
}: LoginBrandingSectionProps) {
  const [uploading, setUploading] = useState(false);

  const validateLogoFile = (file: File): boolean => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Only PNG, SVG, and JPEG files are allowed");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 2MB");
      return false;
    }
    return true;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!organizationId) {
        toast.error("Organization not found");
        return;
      }

      const file = e.target.files[0];
      
      if (!validateLogoFile(file)) return;

      setUploading(true);

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `${organizationId}/login-logo.${fileExt}`;

      // Remove old logo if exists
      if (loginLogoUrl) {
        const oldPath = loginLogoUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("organization-logos").remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("organization-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("organization-logos")
        .getPublicUrl(fileName);

      setLoginLogoUrl(data.publicUrl);
      
      // Log audit event
      await logBrandingChange("BRANDING_LOGO_UPDATED", {
        previous_url: loginLogoUrl || null,
        new_url: data.publicUrl,
      });

      toast.success("Login logo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading login logo:", error);
      toast.error("Failed to upload login logo");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      if (!loginLogoUrl || !organizationId) return;

      const filePath = loginLogoUrl.split("/").slice(-2).join("/");
      
      const { error } = await supabase.storage
        .from("organization-logos")
        .remove([filePath]);

      if (error) throw error;

      // Log audit event
      await logBrandingChange("BRANDING_LOGO_REMOVED", {
        removed_url: loginLogoUrl,
      });

      setLoginLogoUrl("");
      toast.success("Login logo removed");
    } catch (error: any) {
      console.error("Error removing login logo:", error);
      toast.error("Failed to remove login logo");
    }
  };

  const logBrandingChange = async (action: string, metadata: Json) => {
    if (!organizationId || !currentUserId) return;
    
    try {
      await supabase.from("audit_events").insert([{
        organization_id: organizationId,
        actor_user_id: currentUserId,
        action,
        metadata,
      }]);
    } catch (error) {
      console.error("Failed to log branding change:", error);
    }
  };

  const handleBrandNameChange = (value: string) => {
    setBrandName(sanitizeBrandName(value));
  };

  const handleAccentColorChange = (value: string) => {
    // Allow partial input but validate on blur/save
    setAccentColor(value);
  };

  const validateAccentColor = () => {
    if (accentColor && !isValidHexColor(accentColor)) {
      toast.error("Please enter a valid hex color (e.g., #1e90ff)");
      return false;
    }
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Login Page Branding
        </CardTitle>
        <CardDescription>
          Customize the appearance of your organization's login page at your subdomain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="branding-toggle" className="text-base">
              Enable Branded Login
            </Label>
            <p className="text-sm text-muted-foreground">
              Show your organization's branding on the login page
            </p>
          </div>
          <Switch
            id="branding-toggle"
            checked={brandingEnabled}
            onCheckedChange={setBrandingEnabled}
          />
        </div>

        {brandingEnabled && (
          <>
            {/* Login Logo Upload */}
            <div className="space-y-3">
              <Label>Login Logo</Label>
              <div className="flex items-start gap-4">
                {loginLogoUrl ? (
                  <div className="relative">
                    <div className="h-16 w-auto max-w-[200px] rounded border border-border bg-background p-2">
                      <img
                        src={loginLogoUrl}
                        alt="Login logo preview"
                        className="h-full w-auto object-contain"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-border bg-muted/50">
                    <span className="text-xs text-muted-foreground">No logo</span>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Label htmlFor="login-logo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4" />
                      {loginLogoUrl ? "Replace logo" : "Upload logo"}
                    </div>
                  </Label>
                  <Input
                    id="login-logo-upload"
                    type="file"
                    accept=".png,.svg,.jpg,.jpeg"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, SVG, or JPEG. Max 2MB. Recommended: 200×80px
                  </p>
                </div>
              </div>
            </div>

            {/* Brand Name */}
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name (Optional)</Label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={(e) => handleBrandNameChange(e.target.value)}
                placeholder="Your Organization"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Displayed below the logo. Max 50 characters.
              </p>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color (Optional)</Label>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded border border-border"
                  style={{
                    backgroundColor: isValidHexColor(accentColor)
                      ? accentColor
                      : "hsl(var(--primary))",
                  }}
                />
                <Input
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => handleAccentColorChange(e.target.value)}
                  onBlur={validateAccentColor}
                  placeholder="#1e90ff"
                  className="max-w-[140px] font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for buttons and focus states. Enter a hex color (e.g., #1e90ff)
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={onSave} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Branding Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
