import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Upload, X, UserPlus, Search, Users as UsersIcon, Edit2, Trash2, MoreVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Name must be less than 100 characters"),
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

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user", "moderator"]),
});

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
  disabled?: boolean;
}

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // User Preferences State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSms, setNotificationSms] = useState(false);
  const [notificationPush, setNotificationPush] = useState(true);

  // Organization Settings State
  const [companyName, setCompanyName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("America/New_York");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [agencyLicenseNumber, setAgencyLicenseNumber] = useState("");
  const [feinNumber, setFeinNumber] = useState("");
  const [terms, setTerms] = useState("");
  const [uploading, setUploading] = useState(false);

  // Users Management State
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user" | "moderator">("user");
  const [inviting, setInviting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      setEmail(user.email || "");

      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setNotificationEmail(profile.notification_email ?? true);
        setNotificationSms(profile.notification_sms ?? false);
        setNotificationPush(profile.notification_push ?? true);
      }

      // Load user role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roles && roles.length > 0) {
        setCurrentUserRole(roles[0].role);
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
        setAddress(orgSettings.address || "");
        setPhone(orgSettings.phone || "");
        setBillingEmail(orgSettings.billing_email || "");
        setAgencyLicenseNumber(orgSettings.agency_license_number || "");
        setFeinNumber(orgSettings.fein_number || "");
        setTerms(orgSettings.terms || "");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveUserPreferences = async () => {
    try {
      // Validate input
      const validation = profileSchema.safeParse({
        full_name: fullName,
        email: email,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setSaving(true);

      if (!currentUserId) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          notification_email: notificationEmail,
          notification_sms: notificationSms,
          notification_push: notificationPush,
        })
        .eq("id", currentUserId);

      if (error) throw error;

      toast.success("User preferences saved successfully");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!currentUserId) return;

      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}/logo.${fileExt}`;
      const filePath = fileName;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('organization-logos').remove([oldPath]);
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
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
      // Validate input
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

      // Check if organization settings exist
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
        phone: phone,
        billing_email: billingEmail,
        agency_license_number: agencyLicenseNumber,
        fein_number: feinNumber,
        terms: terms,
      };

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("organization_settings")
          .update(updateData)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("organization_settings")
          .insert({
            user_id: currentUserId,
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

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Map roles to users
      const rolesMap = new Map<string, string[]>();
      userRoles?.forEach((ur) => {
        if (!rolesMap.has(ur.user_id)) {
          rolesMap.set(ur.user_id, []);
        }
        rolesMap.get(ur.user_id)?.push(ur.role);
      });

      // Combine data
      const usersData: User[] = profiles?.map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        roles: rolesMap.get(profile.id) || [],
        disabled: false, // TODO: Add disabled field to profiles table if needed
      })) || [];

      setUsers(usersData);
      
      // Update current user role if we're in the list
      const currentUser = usersData.find(u => u.id === currentUserId);
      if (currentUser && currentUser.roles.length > 0) {
        setCurrentUserRole(currentUser.roles[0]);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleInviteUser = async () => {
    try {
      // Validate input
      const validation = inviteSchema.safeParse({
        email: inviteEmail,
        full_name: inviteFullName,
        password: invitePassword,
        role: inviteRole,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setInviting(true);

      // Check if user already exists in profiles
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .maybeSingle();

      // Ignore "no rows" errors, only care if we found a user
      if (existingProfile) {
        toast.error(`A user with email ${inviteEmail} already exists in the system`);
        setInviting(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: invitePassword,
        options: {
          data: {
            full_name: inviteFullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        // Handle specific error messages
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          toast.error(`User with email ${inviteEmail} is already registered`);
        } else {
          toast.error("Failed to create user: " + authError.message);
        }
        setInviting(false);
        return;
      }

      if (authData.user) {
        // Add role to user_roles table
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: inviteRole as any, // Type assertion needed due to Supabase enum mismatch
          });

        if (roleError) {
          toast.error("User created but failed to assign role: " + roleError.message);
          setInviting(false);
          return;
        }

        toast.success(`User ${inviteEmail} has been added successfully`);
        setInviteDialogOpen(false);
        setInviteEmail("");
        setInviteFullName("");
        setInvitePassword("");
        setInviteRole("user");
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "user" | "moderator") => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole as any }) // Type assertion needed due to Supabase enum mismatch
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole as any, // Type assertion needed due to Supabase enum mismatch
          });

        if (error) throw error;
      }

      toast.success("Role updated successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editingUser.full_name,
          email: editingUser.email,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      // Update role if changed
      if (editingUser.roles.length > 0) {
        await handleRoleChange(editingUser.id, editingUser.roles[0] as any);
      }

      toast.success("User updated successfully");
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleToggleDisable = async (user: User) => {
    try {
      // TODO: Implement user disable/enable functionality
      // This would require adding a 'disabled' column to the profiles table
      toast.info("User disable/enable feature coming soon");
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Check if user has any assigned cases
      const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id")
        .eq("user_id", userToDelete.id)
        .limit(1);

      if (casesError) throw casesError;

      if (cases && cases.length > 0) {
        toast.error("Cannot delete user: They have cases assigned to them");
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
        return;
      }

      // Delete user roles first (foreign key constraint)
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToDelete.id);

      if (roleError) throw roleError;

      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (profileError) throw profileError;

      toast.success("User deleted successfully");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesRole =
      roleFilter === "all" ||
      user.roles.includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  const isAdmin = currentUserRole === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and organization settings
        </p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preferences">User Preferences</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users" onClick={() => !users.length && fetchUsers()}>Users</TabsTrigger>
        </TabsList>

        {/* User Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>
                Update your personal information and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed here. Contact support to update.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Notification Preferences</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotif">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotif"
                    checked={notificationEmail}
                    onCheckedChange={setNotificationEmail}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotif">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via text message
                    </p>
                  </div>
                  <Switch
                    id="smsNotif"
                    checked={notificationSms}
                    onCheckedChange={setNotificationSms}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotif">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates in your browser
                    </p>
                  </div>
                  <Switch
                    id="pushNotif"
                    checked={notificationPush}
                    onCheckedChange={setNotificationPush}
                  />
                </div>
              </div>

              <Button onClick={saveUserPreferences} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Settings Tab */}
        <TabsContent value="organization">
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

                <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Suite 100&#10;City, State 12345"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions & Roles</CardTitle>
              <CardDescription>
                View your current role and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Your Current Role</Label>
                  <div className="mt-2">
                    <Badge variant={currentUserRole === "admin" ? "default" : "secondary"} className="text-sm">
                      {currentUserRole || "Member"}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-3">Role Permissions</h3>
                  
                  {currentUserRole === "admin" ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div>
                          <p className="font-medium">Full System Access</p>
                          <p className="text-sm text-muted-foreground">
                            Manage all cases, contacts, accounts, and finances
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div>
                          <p className="font-medium">User Management</p>
                          <p className="text-sm text-muted-foreground">
                            Invite users and assign roles
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div>
                          <p className="font-medium">Settings Access</p>
                          <p className="text-sm text-muted-foreground">
                            Configure organization-wide settings
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-secondary mt-2" />
                        <div>
                          <p className="font-medium">Standard Access</p>
                          <p className="text-sm text-muted-foreground">
                            View and manage assigned cases
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-secondary mt-2" />
                        <div>
                          <p className="font-medium">Personal Settings</p>
                          <p className="text-sm text-muted-foreground">
                            Update your profile and preferences
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    To request role changes, contact your system administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Manage team members and their roles
                  </CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account for your team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="inviteFullName">Full Name</Label>
                        <Input
                          id="inviteFullName"
                          type="text"
                          placeholder="John Doe"
                          value={inviteFullName}
                          onChange={(e) => setInviteFullName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invitePassword">Temporary Password</Label>
                        <Input
                          id="invitePassword"
                          type="password"
                          placeholder="Min 6 characters"
                          value={invitePassword}
                          onChange={(e) => setInvitePassword(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="inviteRole">Role</Label>
                        <Select value={inviteRole} onValueChange={(value: "admin" | "user" | "moderator") => setInviteRole(value)}>
                          <SelectTrigger id="inviteRole">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleInviteUser} disabled={inviting} className="w-full">
                        {inviting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating User...
                          </>
                        ) : (
                          "Create User"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Widget */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {users.filter((u) => u.roles.includes("admin")).length} admin{users.filter((u) => u.roles.includes("admin")).length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              {usersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No matching users found
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Select
                                value={user.roles[0] || "user"}
                                onValueChange={(value: "admin" | "user" | "moderator") =>
                                  handleRoleChange(user.id, value)
                                }
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue>
                                    {user.roles[0] === "admin" && <Badge variant="default">Admin</Badge>}
                                    {user.roles[0] === "moderator" && <Badge variant="outline">Moderator</Badge>}
                                    {(!user.roles[0] || user.roles[0] === "user") && <Badge variant="secondary">User</Badge>}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <>
                                {user.roles[0] === "admin" && <Badge variant="default">Admin</Badge>}
                                {user.roles[0] === "moderator" && <Badge variant="outline">Moderator</Badge>}
                                {(!user.roles[0] || user.roles[0] === "user") && <Badge variant="secondary">User</Badge>}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="text-destructive"
                                  disabled={user.id === currentUserId}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and role
                </DialogDescription>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editFullName">Full Name</Label>
                    <Input
                      id="editFullName"
                      value={editingUser.full_name || ""}
                      onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEmail">Email Address</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editRole">Role</Label>
                    <Select 
                      value={editingUser.roles[0] || "user"}
                      onValueChange={(value: "admin" | "user" | "moderator") => 
                        setEditingUser({...editingUser, roles: [value]})
                      }
                    >
                      <SelectTrigger id="editRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditUser}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {userToDelete?.full_name || userToDelete?.email}?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteUser}>
                  Delete User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
