import { useEffect, useState } from "react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PermissionsManager } from "@/components/PermissionsManager";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { TemplateList } from "@/components/templates/TemplateList";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSearchParams } from "react-router-dom";
import { OrgIsolationAudit } from "@/components/OrgIsolationAudit";
import { CaseDataAudit } from "@/components/CaseDataAudit";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { DataImportTab } from "@/components/settings/DataImportTab";
import { UserPreferencesTab } from "@/components/settings/UserPreferencesTab";
import { OrganizationTab } from "@/components/settings/OrganizationTab";
import { UsersManagementTab } from "@/components/settings/UsersManagementTab";
import { PicklistsTab } from "@/components/settings/PicklistsTab";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { HelpCenterAdmin } from "@/components/help-center";
import { DataComplianceTab } from "@/components/settings/DataComplianceTab";
import { AuthenticationTab } from "@/components/settings/AuthenticationTab";
import { LegalTab } from "@/components/settings/LegalTab";
import { ReportsExportsTab } from "@/components/settings/ReportsExportsTab";
import { SlaSuccessTab } from "@/components/settings/SlaSuccessTab";
import { CaseNumberingSection } from "@/components/settings/CaseNumberingSection";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { LoginBrandingSection } from "@/components/settings/LoginBrandingSection";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Name must be less than 100 characters"),
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
});

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

interface PicklistItem {
  id: string;
  value: string;
  isActive: boolean;
  color: string;
  statusType?: string;
}

const Settings = () => {
  useSetBreadcrumbs([{ label: "Settings" }]);
  
  const { impersonatedUserId } = useImpersonation();
  const { role: currentUserRole, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // User Preferences State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);

  // Organization Settings State
  const [companyName, setCompanyName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("America/New_York");
  const [logoUrl, setLogoUrl] = useState("");
  const [squareLogoUrl, setSquareLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [agencyLicenseNumber, setAgencyLicenseNumber] = useState("");
  const [feinNumber, setFeinNumber] = useState("");
  const [terms, setTerms] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Login Branding State
  const [loginBrandingEnabled, setLoginBrandingEnabled] = useState(false);
  const [loginLogoUrl, setLoginLogoUrl] = useState("");
  const [loginBrandName, setLoginBrandName] = useState("");
  const [loginAccentColor, setLoginAccentColor] = useState("");
  
  // Email Signature State
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [signaturePhone, setSignaturePhone] = useState("");
  const [signatureEmail, setSignatureEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  // Picklists State
  const [caseStatuses, setCaseStatuses] = useState<PicklistItem[]>([]);
  const [updateTypes, setUpdateTypes] = useState<PicklistItem[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<PicklistItem[]>([]);
  const [eventTypes, setEventTypes] = useState<PicklistItem[]>([]);

  // Organization Context
  const { organization, subscriptionStatus, checkSubscription, refreshOrganization } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam || 'preferences';
  });

  useEffect(() => {
    loadSettings();
    checkSubscription();
    updateOrgUsage();
    
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      checkSubscription();
    }
  }, [searchParams, organization?.id]);

  const updateOrgUsage = async () => {
    try {
      await supabase.functions.invoke("update-org-usage");
    } catch (error) {
      console.error("Error updating org usage:", error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const effectiveUserId = impersonatedUserId || user.id;
      
      setCurrentUserId(effectiveUserId);
      setEmail(user.email || "");

      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setNotificationEmail(profile.notification_email ?? true);
        setNotificationPush(profile.notification_push ?? true);
      }

      // Load organization settings
      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgSettings) {
        setCompanyName(orgSettings.company_name || "");
        setDefaultCurrency(orgSettings.default_currency || "USD");
        setTimezone(orgSettings.timezone || "America/New_York");
        setLogoUrl(orgSettings.logo_url || "");
        setSquareLogoUrl((orgSettings as any).square_logo_url || "");
        setAddress(orgSettings.address || "");
        setCity((orgSettings as any).city || "");
        setState((orgSettings as any).state || "");
        setZipCode((orgSettings as any).zip_code || "");
        setPhone(orgSettings.phone || "");
        setContactEmail((orgSettings as any).email || "");
        setWebsiteUrl((orgSettings as any).website_url || "");
        setBillingEmail(orgSettings.billing_email || "");
        setAgencyLicenseNumber(orgSettings.agency_license_number || "");
        setFeinNumber(orgSettings.fein_number || "");
        setTerms(orgSettings.terms || "");
        setSignatureName(orgSettings.signature_name || "");
        setSignatureTitle(orgSettings.signature_title || "");
        setSignaturePhone(orgSettings.signature_phone || "");
        setSignatureEmail(orgSettings.sender_email || "");
        setSenderEmail(orgSettings.sender_email || "");
      }

      // Use organization from context for picklists and branding
      if (!organization?.id) {
        console.error("Organization not found");
        return;
      }

      // Load login branding from organization
      setLoginBrandingEnabled((organization as any).login_branding_enabled || false);
      setLoginLogoUrl((organization as any).login_logo_url || "");
      setLoginBrandName((organization as any).login_brand_name || "");
      setLoginAccentColor((organization as any).login_accent_color || "");

      // Load picklists
      const { data: picklistsRaw, error: picklistError } = await supabase
        .from("picklists")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order");

      if (picklistError) {
        console.error("Error loading picklists:", picklistError);
      }

      let picklists = picklistsRaw ?? [];

      // Ensure each picklist type has at least defaults
      if (user && organization?.id) {
        const hasCaseStatuses = picklists.some(p => p.type === "case_status");
        const hasUpdateTypes = picklists.some(p => p.type === "update_type");
        const hasExpenseCategories = picklists.some(p => p.type === "expense_category");
        const hasEventTypes = picklists.some(p => p.type === "event_type");

        if (!hasCaseStatuses || !hasUpdateTypes || !hasExpenseCategories || !hasEventTypes) {
          await initializeDefaultPicklists(user.id, organization.id, {
            hasCaseStatuses,
            hasUpdateTypes,
            hasExpenseCategories,
            hasEventTypes,
          });

          const { data: refreshedPicklists } = await supabase
            .from("picklists")
            .select("*")
            .eq("organization_id", organization.id)
            .order("display_order");

          picklists = refreshedPicklists ?? picklists;
        }
      }

      const statuses = picklists
        .filter(p => p.type === 'case_status')
        .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1', statusType: p.status_type || 'open' }));
      const updates = picklists
        .filter(p => p.type === 'update_type')
        .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1' }));
      const categories = picklists
        .filter(p => p.type === 'expense_category')
        .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1' }));
      const events = picklists
        .filter(p => p.type === 'event_type')
        .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1' }));

      setCaseStatuses(statuses);
      setUpdateTypes(updates);
      setExpenseCategories(categories);
      setEventTypes(events);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPicklists = async (
    userId: string,
    organizationId: string,
    existing: { hasCaseStatuses: boolean; hasUpdateTypes: boolean; hasExpenseCategories: boolean; hasEventTypes: boolean }
  ) => {
    try {
      const inserts: Array<{
        user_id: string;
        organization_id: string;
        type: string;
        value: string;
        color?: string;
        status_type?: string;
        display_order: number;
        is_active: boolean;
      }> = [];

      if (!existing.hasCaseStatuses) {
        inserts.push(
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'New', color: '#6366f1', status_type: 'open', display_order: 0, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'Open', color: '#10b981', status_type: 'open', display_order: 1, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'Active', color: '#3b82f6', status_type: 'open', display_order: 2, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'On Hold', color: '#f59e0b', status_type: 'open', display_order: 3, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'Pending', color: '#8b5cf6', status_type: 'open', display_order: 4, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'Closed', color: '#6b7280', status_type: 'closed', display_order: 5, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'case_status', value: 'Cancelled', color: '#ef4444', status_type: 'closed', display_order: 6, is_active: true }
        );
      }

      if (!existing.hasUpdateTypes) {
        inserts.push(
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Surveillance', color: '#6366f1', status_type: 'open', display_order: 0, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Case Update', color: '#8b5cf6', status_type: 'open', display_order: 1, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Interview', color: '#06b6d4', status_type: 'open', display_order: 2, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Accounting', color: '#10b981', status_type: 'open', display_order: 3, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Client Contact', color: '#f59e0b', status_type: 'open', display_order: 4, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: '3rd Party Contact', color: '#ec4899', status_type: 'open', display_order: 5, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Review', color: '#14b8a6', status_type: 'open', display_order: 6, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Background Check', color: '#0ea5e9', status_type: 'open', display_order: 7, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'update_type', value: 'Asset Check', color: '#84cc16', status_type: 'open', display_order: 8, is_active: true }
        );
      }

      if (!existing.hasExpenseCategories) {
        inserts.push(
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Mileage', color: '#6366f1', display_order: 0, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Database Search', color: '#10b981', display_order: 1, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Equipment', color: '#f59e0b', display_order: 2, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Rush Fee', color: '#ef4444', display_order: 3, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Admin Fee', color: '#8b5cf6', display_order: 4, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Travel', color: '#06b6d4', display_order: 5, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'expense_category', value: 'Miscellaneous', color: '#64748b', display_order: 6, is_active: true }
        );
      }

      if (!existing.hasEventTypes) {
        inserts.push(
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Surveillance Session', color: '#6366f1', display_order: 0, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Canvass Attempt', color: '#10b981', display_order: 1, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Records Search', color: '#f59e0b', display_order: 2, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Field Activity', color: '#3b82f6', display_order: 3, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Interview Session', color: '#8b5cf6', display_order: 4, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Site Visit', color: '#ec4899', display_order: 5, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Background Check', color: '#0ea5e9', display_order: 6, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Database Search', color: '#14b8a6', display_order: 7, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Court Attendance', color: '#84cc16', display_order: 8, is_active: true },
          { user_id: userId, organization_id: organizationId, type: 'event_type', value: 'Other', color: '#6b7280', display_order: 9, is_active: true }
        );
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("picklists").insert(inserts);
        if (error) {
          console.error("Error initializing picklists:", error);
        }
      }
    } catch (error) {
      console.error("Error in initializeDefaultPicklists:", error);
    }
  };

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
        if (!organization?.id) {
          throw new Error("Organization not found");
        }

        const { error } = await supabase
          .from("organization_settings")
          .insert({
            user_id: currentUserId,
            organization_id: organization.id,
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

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'preferences') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and organization settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar navigation */}
          <div className="w-full md:w-56 shrink-0">
            <div className="sticky top-6">
              <SettingsNav 
                currentTab={activeTab}
                onTabChange={handleTabChange}
                userRole={currentUserRole}
                onUsersClick={() => {}}
              />
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 min-w-0">
            <TabsContent value="preferences">
              <UserPreferencesTab
                currentUserId={currentUserId}
                fullName={fullName}
                setFullName={setFullName}
                username={username}
                setUsername={setUsername}
                email={email}
                notificationEmail={notificationEmail}
                setNotificationEmail={setNotificationEmail}
                notificationPush={notificationPush}
                setNotificationPush={setNotificationPush}
              />
            </TabsContent>

            <TabsContent value="organization" className="space-y-6">
              <OrganizationTab
                currentUserId={currentUserId}
                organizationId={organization?.id || null}
                companyName={companyName}
                setCompanyName={setCompanyName}
                defaultCurrency={defaultCurrency}
                setDefaultCurrency={setDefaultCurrency}
                timezone={timezone}
                setTimezone={setTimezone}
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
                squareLogoUrl={squareLogoUrl}
                setSquareLogoUrl={setSquareLogoUrl}
                address={address}
                setAddress={setAddress}
                city={city}
                setCity={setCity}
                state={state}
                setState={setState}
                zipCode={zipCode}
                setZipCode={setZipCode}
                phone={phone}
                setPhone={setPhone}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                websiteUrl={websiteUrl}
                setWebsiteUrl={setWebsiteUrl}
                billingEmail={billingEmail}
                setBillingEmail={setBillingEmail}
                agencyLicenseNumber={agencyLicenseNumber}
                setAgencyLicenseNumber={setAgencyLicenseNumber}
                feinNumber={feinNumber}
                setFeinNumber={setFeinNumber}
                terms={terms}
                setTerms={setTerms}
                signatureName={signatureName}
                signatureTitle={signatureTitle}
                signaturePhone={signaturePhone}
                signatureEmail={signatureEmail}
                senderEmail={senderEmail}
              />
              
              {/* Login Branding Section - Admin/Owner only */}
              {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <LoginBrandingSection
                  organizationId={organization?.id || null}
                  currentUserId={currentUserId}
                  brandingEnabled={loginBrandingEnabled}
                  setBrandingEnabled={setLoginBrandingEnabled}
                  loginLogoUrl={loginLogoUrl}
                  setLoginLogoUrl={setLoginLogoUrl}
                  brandName={loginBrandName}
                  setBrandName={setLoginBrandName}
                  accentColor={loginAccentColor}
                  setAccentColor={setLoginAccentColor}
                  onSave={async () => {
                    // Save branding to organizations table
                    if (!organization?.id) return;
                    setSaving(true);
                    try {
                      const { error } = await supabase
                        .from('organizations')
                        .update({
                          login_branding_enabled: loginBrandingEnabled,
                          login_logo_url: loginLogoUrl || null,
                          login_brand_name: loginBrandName || null,
                          login_accent_color: loginAccentColor || null,
                        })
                        .eq('id', organization.id);
                      if (error) throw error;
                      toast.success('Branding settings saved');
                    } catch (error: any) {
                      console.error('Error saving branding:', error);
                      toast.error('Failed to save branding settings');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  saving={saving}
                />
              )}

              {/* Case Numbering - Admin only */}
              {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <CaseNumberingSection
                  organizationId={organization?.id || null}
                  currentUserId={currentUserId}
                />
              )}
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions">
              <PermissionsManager />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <UsersManagementTab
                organization={organization}
                subscriptionStatus={subscriptionStatus}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                refreshOrganization={refreshOrganization}
              />
            </TabsContent>

            {/* Authentication Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="authentication" className="space-y-6">
                <AuthenticationTab />
              </TabsContent>
            )}

            {/* Picklists Tab */}
            <TabsContent value="picklists">
              <PicklistsTab
                caseStatuses={caseStatuses}
                setCaseStatuses={setCaseStatuses}
                updateTypes={updateTypes}
                setUpdateTypes={setUpdateTypes}
                expenseCategories={expenseCategories}
                setExpenseCategories={setExpenseCategories}
                eventTypes={eventTypes}
                setEventTypes={setEventTypes}
                loadSettings={loadSettings}
              />
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-6">
              <TemplateList />
            </TabsContent>

            {/* Email Settings Tab */}
            <TabsContent value="email" className="space-y-6">
              <EmailSettingsTab
                signatureName={signatureName}
                setSignatureName={setSignatureName}
                signatureTitle={signatureTitle}
                setSignatureTitle={setSignatureTitle}
                signaturePhone={signaturePhone}
                setSignaturePhone={setSignaturePhone}
                signatureEmail={signatureEmail}
                setSignatureEmail={setSignatureEmail}
                senderEmail={senderEmail}
                setSenderEmail={setSenderEmail}
                logoUrl={logoUrl}
                companyName={companyName}
                address={address}
                saving={saving}
                onSave={saveOrganizationSettings}
              />
            </TabsContent>

            {/* Help Center Admin Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="help-center" className="space-y-6">
                <HelpCenterAdmin />
              </TabsContent>
            )}

            {/* Billing Tab */}
            {currentUserRole === 'admin' && (
              <TabsContent value="billing" className="space-y-6">
                <BillingTab
                  organization={organization}
                  subscriptionStatus={subscriptionStatus}
                />
              </TabsContent>
            )}

            {/* Legal Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="legal" className="space-y-6">
                <LegalTab />
              </TabsContent>
            )}

            {/* Reports & Exports Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="reports" className="space-y-6">
                <ReportsExportsTab />
              </TabsContent>
            )}

            {/* SLA & Success Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="sla" className="space-y-6">
                <SlaSuccessTab />
              </TabsContent>
            )}

            {/* Integrations Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="integrations" className="space-y-6">
                <IntegrationsTab />
              </TabsContent>
            )}
            {currentUserRole === 'admin' && (
              <TabsContent value="data-compliance" className="space-y-6">
                <DataComplianceTab />
              </TabsContent>
            )}

            {/* Data Integrity Tab - Admin Only */}
            {currentUserRole === 'admin' && (
              <TabsContent value="data-integrity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Integrity</CardTitle>
                    <CardDescription>
                      Audit and fix organization data isolation issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OrgIsolationAudit />
                  </CardContent>
                </Card>
                
                <CaseDataAudit />
              </TabsContent>
            )}

            {/* Data Import Tab - Admin and Manager Only */}
            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
              <TabsContent value="data-import">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Import</CardTitle>
                    <CardDescription>
                      Import data from external systems using CaseWyze templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataImportTab />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
