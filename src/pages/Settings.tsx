import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionsManager } from "@/components/PermissionsManager";
import { OrgIsolationAudit } from "@/components/OrgIsolationAudit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Upload, X, UserPlus, Search, Users as UsersIcon, Edit2, Trash2, MoreVertical, Plus, List, Mail, CreditCard, Check, AlertTriangle, HardDrive, Palette, GripVertical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { getPlanLimits, isTrialActive, getTrialDaysRemaining } from "@/lib/planLimits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { TemplateList } from "@/components/templates/TemplateList";
import { EmailTestForm } from "@/components/EmailTestForm";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["admin", "manager", "investigator", "vendor"]),
});

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
  disabled?: boolean;
  color?: string | null;
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
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "investigator" | "vendor">("investigator");
  const [inviting, setInviting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectedUserForColor, setSelectedUserForColor] = useState<User | null>(null);

  const colorPalette = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", 
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#64748b", "#71717a", "#78716c"
  ];

  // Picklists State
  const [caseStatuses, setCaseStatuses] = useState<Array<{id: string, value: string, isActive: boolean, color: string, statusType?: string}>>([]);
  const [updateTypes, setUpdateTypes] = useState<Array<{id: string, value: string, isActive: boolean, color: string}>>([]);
  const [expenseCategories, setExpenseCategories] = useState<Array<{id: string, value: string, isActive: boolean, color: string}>>([]);
  const [picklistDialogOpen, setPicklistDialogOpen] = useState(false);
  const [picklistType, setPicklistType] = useState<"status" | "updateType" | "expenseCategory">("status");
  const [editingPicklistItem, setEditingPicklistItem] = useState<{ id: string; value: string; color: string; statusType?: string } | null>(null);
  const [picklistValue, setPicklistValue] = useState("");
  const [picklistColor, setPicklistColor] = useState("#6366f1");
  const [picklistStatusType, setPicklistStatusType] = useState<"open" | "closed">("open");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Billing State
  const { organization, subscriptionStatus, checkSubscription } = useOrganization();
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const PRICING_TIERS = [
    {
      name: "Free",
      price: "$0",
      priceId: null,
      productId: null,
      features: ["Up to 2 users", "5 GB storage", "Basic case management", "Email support"],
      maxUsers: 2,
      storageGb: 5,
    },
    {
      name: "Standard",
      price: "$49",
      priceId: "price_1SLesURWPtpjyF4hGZI3sw13",
      productId: "prod_TIFNfVbkhFmIuB",
      features: ["Up to 10 users", "50 GB storage", "14-day free trial", "Full case management", "Priority support", "Advanced reporting"],
      maxUsers: 10,
      storageGb: 50,
    },
    {
      name: "Pro",
      price: "$99",
      priceId: "price_1SLeslRWPtpjyF4hxtzH85Ad",
      productId: "prod_TIFN9OVHNQ1tlK",
      features: ["Up to 10 users", "50 GB storage", "14-day free trial", "All features", "24/7 support", "Custom integrations", "API access"],
      maxUsers: 10,
      storageGb: 50,
    },
  ];

  useEffect(() => {
    loadSettings();
    checkSubscription();
    updateOrgUsage();
    
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      checkSubscription();
    }
  }, [searchParams]);

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

      // Load picklists from database
      const { data: picklists } = await supabase
        .from("picklists")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (picklists) {
        const statuses = picklists
          .filter(p => p.type === 'case_status')
          .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1', statusType: p.status_type || 'open' }));
        const updates = picklists
          .filter(p => p.type === 'update_type')
          .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1' }));
        const categories = picklists
          .filter(p => p.type === 'expense_category')
          .map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1' }));
        
        setCaseStatuses(statuses);
        setUpdateTypes(updates);
        setExpenseCategories(categories);
        
        // Initialize default expense categories if none exist
        if (categories.length === 0 && user) {
          await initializeExpenseCategories(user.id);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const initializeExpenseCategories = async (userId: string) => {
    try {
      const defaultCategories = ['Surveillance', 'Research'];
      const { error } = await supabase
        .from('picklists')
        .insert(
          defaultCategories.map((value, index) => ({
            user_id: userId,
            type: 'expense_category',
            value,
            display_order: index,
            is_active: true,
          }))
        );

      if (error) throw error;

      // Reload picklists
      const { data: picklists } = await supabase
        .from("picklists")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "expense_category")
        .order("display_order");

      if (picklists) {
        setExpenseCategories(picklists.map(p => ({ id: p.id, value: p.value, isActive: p.is_active, color: p.color || '#6366f1' })));
      }
    } catch (error) {
      console.error("Error initializing expense categories:", error);
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
        // Insert new - Get organization_id first
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

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, color")
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
        color: profile.color,
        disabled: false,
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
      // Check user limits before inviting
      if (organization) {
        const planLimits = getPlanLimits(organization.subscription_product_id);
        const currentUsers = organization.current_users_count || 0;
        
        if (planLimits.max_users !== Infinity && currentUsers >= planLimits.max_users) {
          toast.error(`You've reached the maximum of ${planLimits.max_users} users for your ${planLimits.name}. Please upgrade to add more users.`);
          return;
        }

        // Check if trial expired
        if (subscriptionStatus?.trial_end && !isTrialActive(subscriptionStatus.trial_end) && subscriptionStatus.status !== "active") {
          toast.error("Your trial has expired. Please add a payment method to continue adding users.");
          return;
        }
      }

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
        setInviteRole("investigator");
        fetchUsers();
        updateOrgUsage(); // Update usage count after adding user
      }
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "manager" | "investigator" | "vendor") => {
    try {
      // Prevent users from changing their own role
      if (userId === currentUserId) {
        toast.error("You cannot change your own role");
        return;
      }

      if (!currentUserId) {
        toast.error("Not authenticated");
        return;
      }

      // Get the organization ID from the current user's organization membership
      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (orgError || !orgMember) {
        toast.error("Could not find organization");
        return;
      }

      // Use the secure RPC function to update role
      const { error } = await supabase.rpc('update_user_role', {
        _user_id: userId,
        _new_role: newRole,
        _org_id: orgMember.organization_id
      });

      if (error) throw error;

      toast.success("Role updated successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update role");
    }
  };

  const handleColorChange = async (userId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ color })
        .eq('id', userId);

      if (error) throw error;

      toast.success("User color updated");
      setColorDialogOpen(false);
      setSelectedUserForColor(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating color:", error);
      toast.error(error.message || "Failed to update user color");
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
      // User disable/enable functionality
      // For now, inform users to remove from organization to disable access
      toast.info("To disable a user, please remove them from the organization");
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

  // Sortable row component
  interface SortableRowProps {
    id: string;
    children: React.ReactNode;
  }

  const SortableRow = ({ id, children }: SortableRowProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow ref={setNodeRef} style={style}>
        <TableCell className="w-[40px] cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </TableCell>
        {children}
      </TableRow>
    );
  };

  // Picklist handlers
  const handleAddPicklistItem = async () => {
    if (!picklistValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const picklistTypeMap = {
        status: "case_status",
        updateType: "update_type",
        expenseCategory: "expense_category",
      };

      const currentLength = picklistType === "status" 
        ? caseStatuses.length 
        : picklistType === "updateType" 
        ? updateTypes.length 
        : expenseCategories.length;

      const insertData: any = {
        user_id: user.id,
        type: picklistTypeMap[picklistType],
        value: picklistValue.trim(),
        is_active: true,
        display_order: currentLength,
        color: picklistColor,
      };

      // Only add status_type for case_status
      if (picklistType === "status") {
        insertData.status_type = picklistStatusType;
      }

      const { data, error } = await supabase
        .from("picklists")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newItem = { 
        id: data.id, 
        value: data.value, 
        isActive: data.is_active, 
        color: data.color || '#6366f1',
        ...(picklistType === "status" && { statusType: data.status_type || 'open' })
      };
      
      if (picklistType === "status") {
        setCaseStatuses([...caseStatuses, newItem]);
      } else if (picklistType === "updateType") {
        setUpdateTypes([...updateTypes, newItem]);
      } else {
        setExpenseCategories([...expenseCategories, newItem]);
      }

      setPicklistValue("");
      setPicklistColor("#6366f1");
      setPicklistDialogOpen(false);
      setEditingPicklistItem(null);
      toast.success(`${picklistValue} added successfully`);
    } catch (error) {
      console.error("Error adding picklist item:", error);
      toast.error("Failed to add picklist item");
    }
  };

  const handleEditPicklistItem = async () => {
    if (!picklistValue.trim() || !editingPicklistItem) {
      toast.error("Please enter a value");
      return;
    }

    try {
      const updateData: any = { 
        value: picklistValue.trim(),
        color: picklistColor 
      };

      // Only update status_type for case_status
      if (picklistType === "status") {
        updateData.status_type = picklistStatusType;
      }

      const { error } = await supabase
        .from("picklists")
        .update(updateData)
        .eq("id", editingPicklistItem.id);

      if (error) throw error;

      if (picklistType === "status") {
        setCaseStatuses(
          caseStatuses.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor, statusType: picklistStatusType } : item
          )
        );
      } else if (picklistType === "updateType") {
        setUpdateTypes(
          updateTypes.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor } : item
          )
        );
      } else {
        setExpenseCategories(
          expenseCategories.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor } : item
          )
        );
      }

      setPicklistValue("");
      setPicklistColor("#6366f1");
      setPicklistDialogOpen(false);
      setEditingPicklistItem(null);
      toast.success("Value updated successfully");
    } catch (error) {
      console.error("Error updating picklist item:", error);
      toast.error("Failed to update picklist item");
    }
  };

  const handleTogglePicklistActive = async (id: string, isActive: boolean, type: "status" | "updateType" | "expenseCategory") => {
    try {
      const { error } = await supabase
        .from("picklists")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;

      if (type === "status") {
        setCaseStatuses(
          caseStatuses.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      } else if (type === "updateType") {
        setUpdateTypes(
          updateTypes.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      } else {
        setExpenseCategories(
          expenseCategories.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      }
      toast.success(`Value ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error toggling picklist item:", error);
      toast.error("Failed to update picklist item");
    }
  };

  const handleDeletePicklistItem = async (id: string, type: "status" | "updateType" | "expenseCategory") => {
    try {
      const { error } = await supabase
        .from("picklists")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (type === "status") {
        setCaseStatuses(caseStatuses.filter((item) => item.id !== id));
      } else if (type === "updateType") {
        setUpdateTypes(updateTypes.filter((item) => item.id !== id));
      } else {
        setExpenseCategories(expenseCategories.filter((item) => item.id !== id));
      }
      toast.success("Value deleted successfully");
    } catch (error) {
      console.error("Error deleting picklist item:", error);
      toast.error("Failed to delete picklist item");
    }
  };

  const openAddPicklistDialog = (type: "status" | "updateType" | "expenseCategory") => {
    setPicklistType(type);
    setEditingPicklistItem(null);
    setPicklistValue("");
    setPicklistColor("#6366f1");
    setPicklistStatusType("open");
    setPicklistDialogOpen(true);
  };

  const openEditPicklistDialog = (item: { id: string; value: string; color: string; statusType?: string }, type: "status" | "updateType" | "expenseCategory") => {
    setPicklistType(type);
    setEditingPicklistItem(item);
    setPicklistValue(item.value);
    setPicklistColor(item.color);
    setPicklistStatusType((item.statusType as "open" | "closed") || "open");
    setPicklistDialogOpen(true);
  };

  // Drag and drop handlers
  const handleDragEnd = async (event: DragEndEvent, type: "status" | "updateType" | "expenseCategory") => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const items = type === "status" 
      ? caseStatuses 
      : type === "updateType" 
      ? updateTypes 
      : expenseCategories;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex);

    // Update local state
    if (type === "status") {
      setCaseStatuses(newItems);
    } else if (type === "updateType") {
      setUpdateTypes(newItems);
    } else {
      setExpenseCategories(newItems);
    }

    // Update database with new order
    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("picklists")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Order updated successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      // Revert on error
      loadSettings();
    }
  };

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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="preferences" className="text-xs sm:text-sm">Preferences</TabsTrigger>
          <TabsTrigger value="organization" className="text-xs sm:text-sm">Organization</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs sm:text-sm">Permissions</TabsTrigger>
          <TabsTrigger value="users" onClick={() => !users.length && fetchUsers()} className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="picklists" className="text-xs sm:text-sm">Picklists</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm">Templates</TabsTrigger>
          <TabsTrigger value="email" className="text-xs sm:text-sm">
            <Mail className="w-3 h-3 mr-1" />
            Email
          </TabsTrigger>
          {currentUserRole === 'admin' && (
            <TabsTrigger value="billing" className="text-xs sm:text-sm">
              <CreditCard className="w-3 h-3 mr-1" />
              Billing
            </TabsTrigger>
          )}
          {currentUserRole === 'admin' && (
            <TabsTrigger value="audit" className="text-xs sm:text-sm">
              Audit
            </TabsTrigger>
          )}
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
                      Receive email reminders for tasks and updates
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
                    <Label htmlFor="pushNotif">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive in-app notifications for tasks and updates
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
          <PermissionsManager />
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
                        <Select value={inviteRole} onValueChange={(value: "admin" | "manager" | "investigator" | "vendor") => setInviteRole(value)}>
                          <SelectTrigger id="inviteRole">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="investigator">Investigator</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
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
                        <TableHead className="w-[60px]">Color</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedUserForColor(user);
                                  setColorDialogOpen(true);
                                }}
                              >
                                <div 
                                  className="w-6 h-6 rounded-full border-2 border-border"
                                  style={{ backgroundColor: user.color || "#6366f1" }}
                                />
                              </Button>
                            ) : (
                              <div 
                                className="w-6 h-6 rounded-full border-2 border-border ml-2"
                                style={{ backgroundColor: user.color || "#6366f1" }}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Select
                                value={user.roles[0] || "investigator"}
                                onValueChange={(value: "admin" | "manager" | "investigator" | "vendor") =>
                                  handleRoleChange(user.id, value)
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue>
                                    {user.roles[0] === "admin" && <Badge variant="default">Admin</Badge>}
                                    {user.roles[0] === "manager" && <Badge variant="secondary">Manager</Badge>}
                                    {user.roles[0] === "investigator" && <Badge variant="outline">Investigator</Badge>}
                                    {user.roles[0] === "vendor" && <Badge className="bg-purple-100 text-purple-700 border-purple-200">Vendor</Badge>}
                                    {!user.roles[0] && <Badge variant="outline">No Role</Badge>}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="investigator">Investigator</SelectItem>
                                  <SelectItem value="vendor">Vendor</SelectItem>
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
                            <Badge variant="default" className="capitalize">
                              Active
                            </Badge>
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

          {/* Color Picker Dialog */}
          <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Calendar Color</DialogTitle>
                <DialogDescription>
                  Select a color for {selectedUserForColor?.full_name || selectedUserForColor?.email} to display in the calendar
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-5 gap-3 py-4">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    onClick={() => selectedUserForColor && handleColorChange(selectedUserForColor.id, color)}
                    className="w-12 h-12 rounded-lg border-2 hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: color,
                      borderColor: selectedUserForColor?.color === color ? "#000" : "transparent"
                    }}
                    title={color}
                  />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Picklists Tab */}
        <TabsContent value="picklists">
          <div className="space-y-6">
            {/* Case Status Picklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Case Status Picklist</CardTitle>
                    <CardDescription>
                      Manage available status options for cases
                    </CardDescription>
                  </div>
                  <Button onClick={() => openAddPicklistDialog("status")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Status
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, "status")}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Status Value</TableHead>
                          <TableHead className="w-[100px]">Color</TableHead>
                          <TableHead className="w-[120px]">Status Type</TableHead>
                          <TableHead className="w-[100px]">Active</TableHead>
                          <TableHead className="text-right w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {caseStatuses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No status values configured
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableContext items={caseStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            {caseStatuses.map((status) => (
                              <SortableRow key={status.id} id={status.id}>
                                <TableCell className="font-medium">{status.value}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded border"
                                      style={{ backgroundColor: status.color }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={status.statusType === "open" ? "default" : "secondary"}>
                                    {status.statusType === "open" ? "🟢 Open" : "⚪ Closed"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={status.isActive ? "default" : "secondary"}>
                                    {status.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleTogglePicklistActive(status.id, status.isActive, "status")}
                                    >
                                      {status.isActive ? "Deactivate" : "Activate"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditPicklistDialog(status, "status")}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeletePicklistItem(status.id, "status")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </SortableRow>
                            ))}
                          </SortableContext>
                        )}
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </CardContent>
            </Card>

            {/* Update Type Picklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Update Type Picklist</CardTitle>
                    <CardDescription>
                      Manage available types for case updates
                    </CardDescription>
                  </div>
                  <Button onClick={() => openAddPicklistDialog("updateType")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, "updateType")}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Type Value</TableHead>
                          <TableHead className="w-[100px]">Color</TableHead>
                          <TableHead className="w-[100px]">Active</TableHead>
                          <TableHead className="text-right w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {updateTypes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No update types configured
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableContext items={updateTypes.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {updateTypes.map((type) => (
                              <SortableRow key={type.id} id={type.id}>
                                <TableCell className="font-medium">{type.value}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded border"
                                      style={{ backgroundColor: type.color }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={type.isActive ? "default" : "secondary"}>
                                    {type.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleTogglePicklistActive(type.id, type.isActive, "updateType")}
                                    >
                                      {type.isActive ? "Deactivate" : "Activate"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditPicklistDialog(type, "updateType")}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeletePicklistItem(type.id, "updateType")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </SortableRow>
                            ))}
                          </SortableContext>
                        )}
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </CardContent>
            </Card>

            {/* Expense Category Picklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense Category Picklist</CardTitle>
                    <CardDescription>
                      Manage available categories for expenses
                    </CardDescription>
                  </div>
                  <Button onClick={() => openAddPicklistDialog("expenseCategory")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, "expenseCategory")}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Category Value</TableHead>
                          <TableHead className="w-[100px]">Color</TableHead>
                          <TableHead className="w-[100px]">Active</TableHead>
                          <TableHead className="text-right w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseCategories.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No expense categories configured
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableContext items={expenseCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {expenseCategories.map((category) => (
                              <SortableRow key={category.id} id={category.id}>
                                <TableCell className="font-medium">{category.value}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded border"
                                      style={{ backgroundColor: category.color }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={category.isActive ? "default" : "secondary"}>
                                    {category.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleTogglePicklistActive(category.id, category.isActive, "expenseCategory")}
                                    >
                                      {category.isActive ? "Deactivate" : "Activate"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditPicklistDialog(category, "expenseCategory")}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeletePicklistItem(category.id, "expenseCategory")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </SortableRow>
                            ))}
                          </SortableContext>
                        )}
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add/Edit Picklist Dialog */}
          <Dialog open={picklistDialogOpen} onOpenChange={setPicklistDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPicklistItem ? "Edit" : "Add"}{" "}
                  {picklistType === "status" ? "Case Status" : "Update Type"}
                </DialogTitle>
                <DialogDescription>
                  {editingPicklistItem
                    ? `Update the ${picklistType === "status" ? "status" : "type"} value`
                    : `Add a new ${picklistType === "status" ? "status" : "type"} option`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="picklistValue">Value</Label>
                  <Input
                    id="picklistValue"
                    value={picklistValue}
                    onChange={(e) => setPicklistValue(e.target.value)}
                    placeholder={`Enter ${picklistType === "status" ? "status" : picklistType === "updateType" ? "type" : "category"} value`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editingPicklistItem ? handleEditPicklistItem() : handleAddPicklistItem();
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="picklistColor">Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="picklistColor"
                      type="color"
                      value={picklistColor}
                      onChange={(e) => setPicklistColor(e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={picklistColor}
                      onChange={(e) => setPicklistColor(e.target.value)}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
                {picklistType === "status" && (
                  <div>
                    <Label htmlFor="picklistStatusType">Status Type</Label>
                    <Select value={picklistStatusType} onValueChange={(value: "open" | "closed") => setPicklistStatusType(value)}>
                      <SelectTrigger id="picklistStatusType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">🟢 Open</SelectItem>
                        <SelectItem value="closed">⚪ Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Determines if this status represents an open or closed case
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPicklistDialogOpen(false);
                    setPicklistValue("");
                    setPicklistColor("#6366f1");
                    setEditingPicklistItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingPicklistItem ? handleEditPicklistItem : handleAddPicklistItem}
                >
                  {editingPicklistItem ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <TemplateList />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailTestForm />
        </TabsContent>

        {/* Billing Tab */}
        {currentUserRole === 'admin' && (
          <TabsContent value="billing" className="space-y-6">
            {/* Trial Banner */}
            {subscriptionStatus?.trial_end && isTrialActive(subscriptionStatus.trial_end) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Free Trial Active</AlertTitle>
                <AlertDescription>
                  You have {getTrialDaysRemaining(subscriptionStatus.trial_end)} days remaining in your 14-day free trial.
                  {subscriptionStatus.trial_end && (
                    <> Trial ends on {new Date(subscriptionStatus.trial_end).toLocaleDateString()}.</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Expired Trial Banner */}
            {subscriptionStatus?.trial_end && !isTrialActive(subscriptionStatus.trial_end) && subscriptionStatus.status !== "active" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Trial Expired</AlertTitle>
                <AlertDescription>
                  Your trial has ended. Please add a payment method to continue using premium features.
                </AlertDescription>
              </Alert>
            )}

            {/* Current Plan & Usage */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan & Usage</CardTitle>
                  <CardDescription>
                    {subscriptionStatus?.subscribed ? (
                      <>Your subscription is {subscriptionStatus.status === "trialing" ? "on trial" : organization.subscription_status}</>
                    ) : (
                      <>You are on the Free plan</>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg capitalize">
                        {getPlanLimits(organization.subscription_product_id).name}
                      </p>
                      {subscriptionStatus?.subscription_end && (
                        <p className="text-sm text-muted-foreground">
                          {subscriptionStatus.status === "trialing" ? "Trial ends" : "Renews"} on {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {subscriptionStatus?.subscribed && (
                      <Button onClick={handleManageSubscription} disabled={billingLoading === "portal"}>
                        {billingLoading === "portal" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </Button>
                    )}
                  </div>

                  {/* Usage Metrics */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <UsersIcon className="w-4 h-4" />
                          <span>Users</span>
                        </div>
                        <span className="text-muted-foreground">
                          {organization.current_users_count || 0} / {getPlanLimits(organization.subscription_product_id).max_users === Infinity ? "Unlimited" : getPlanLimits(organization.subscription_product_id).max_users}
                        </span>
                      </div>
                      <Progress 
                        value={
                          getPlanLimits(organization.subscription_product_id).max_users === Infinity 
                            ? 0 
                            : ((organization.current_users_count || 0) / getPlanLimits(organization.subscription_product_id).max_users) * 100
                        } 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>Storage</span>
                        </div>
                        <span className="text-muted-foreground">
                          {(organization.storage_used_gb || 0).toFixed(2)} GB / {getPlanLimits(organization.subscription_product_id).storage_gb} GB
                        </span>
                      </div>
                      <Progress 
                        value={((organization.storage_used_gb || 0) / getPlanLimits(organization.subscription_product_id).storage_gb) * 100} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {PRICING_TIERS.map((tier) => {
                const isCurrentPlan = tier.name.toLowerCase() === getCurrentTier();
                const isFree = tier.name === "Free";

                return (
                  <Card key={tier.name} className={isCurrentPlan ? "border-primary shadow-lg" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{tier.name}</CardTitle>
                        {isCurrentPlan && <Badge>Current Plan</Badge>}
                      </div>
                      <CardDescription>
                        <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                        {!isFree && <span className="text-muted-foreground">/month</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                       {!isCurrentPlan && !isFree && (
                        <Button
                          className="w-full"
                          onClick={() => handleSubscribe(tier.priceId!)}
                          disabled={billingLoading === tier.priceId}
                        >
                          {billingLoading === tier.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Start 14-Day Free Trial
                        </Button>
                      )}
                      {isFree && !isCurrentPlan && (
                        <Button className="w-full" variant="outline" disabled>
                          Contact Support
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}

        {/* Audit Tab */}
        {currentUserRole === 'admin' && (
          <TabsContent value="audit" className="space-y-6">
            <OrgIsolationAudit />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );

  function handleSubscribe(priceId: string) {
    setBillingLoading(priceId);
    supabase.functions.invoke("create-checkout", {
      body: { priceId },
    }).then(({ data, error }) => {
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    }).catch((error: any) => {
      toast.error(error.message);
    }).finally(() => {
      setBillingLoading(null);
    });
  }

  function handleManageSubscription() {
    setBillingLoading("portal");
    supabase.functions.invoke("customer-portal")
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      }).catch((error: any) => {
        toast.error(error.message);
      }).finally(() => {
        setBillingLoading(null);
      });
  }

  function getCurrentTier() {
    if (!subscriptionStatus?.product_id) return "free";
    const tier = PRICING_TIERS.find(t => t.productId === subscriptionStatus.product_id);
    return tier?.name.toLowerCase() || "free";
  }
};

export default Settings;
