import { useEffect, useState } from "react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionsManager } from "@/components/PermissionsManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Upload, X, UserPlus, Search, Users as UsersIcon, Edit2, Trash2, MoreVertical, Plus, List, Mail, CreditCard, Check, AlertTriangle, HardDrive, Palette, GripVertical, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { getPlanLimits, isTrialActive, getTrialDaysRemaining, PRICING_TIERS, STORAGE_ADDON_TIERS, getTotalStorage, getStorageAddon } from "@/lib/planLimits";
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
  const { impersonatedUserId } = useImpersonation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // User Preferences State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
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
  
  // Email Signature State
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [signaturePhone, setSignaturePhone] = useState("");
  const [signatureEmail, setSignatureEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

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
  const [showInvitePassword, setShowInvitePassword] = useState(false);

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
  const { organization, subscriptionStatus, checkSubscription, refreshOrganization } = useOrganization();
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Import pricing tiers from planLimits - removed local definition

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

      // Use impersonated user ID if available, otherwise use actual user
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

      // Load user role - use impersonated user's role if impersonating
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", effectiveUserId);

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
        setSignatureName(orgSettings.signature_name || "");
        setSignatureTitle(orgSettings.signature_title || "");
        setSignaturePhone(orgSettings.signature_phone || "");
        setSignatureEmail(orgSettings.signature_email || "");
        setSenderEmail(orgSettings.sender_email || "");
      }

      // Get user's organization
      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (orgError) {
        console.error("Error fetching organization:", orgError);
        return;
      }

      if (!orgMember) {
        console.error("No organization found for user");
        return;
      }

      console.log("Loading picklists for org:", orgMember.organization_id);

      // Load picklists from database filtered by organization
      const { data: picklists, error: picklistError } = await supabase
        .from("picklists")
        .select("*")
        .eq("organization_id", orgMember.organization_id)
        .order("display_order");

      if (picklistError) {
        console.error("Error loading picklists:", picklistError);
      }

      console.log("Loaded picklists:", picklists);

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

        console.log("Update types found:", updates);
        
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
        username: username,
        email: email,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setSaving(true);

      if (!currentUserId) return;

      // Check if username is already taken by another user
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .neq("id", currentUserId)
        .maybeSingle();

      if (existingUser) {
        toast.error("This username is already taken. Please choose another.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username.trim(),
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

  const handleEmailChange = async () => {
    try {
      // Validate new email
      const emailValidation = z.string().email("Invalid email address").safeParse(newEmail);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }

      if (newEmail === email) {
        toast.error("New email must be different from current email");
        return;
      }

      setChangingEmail(true);

      // Call edge function to request email change
      const { error } = await supabase.functions.invoke('request-email-change', {
        body: { newEmail }
      });

      if (error) throw error;

      toast.success("Confirmation email sent to your current email address. Please check your inbox to complete the change.");
      setNewEmail("");
    } catch (error: any) {
      console.error("Error changing email:", error);
      toast.error(error.message || "Failed to change email");
    } finally {
      setChangingEmail(false);
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
        signature_name: signatureName,
        signature_title: signatureTitle,
        signature_phone: signaturePhone,
        signature_email: signatureEmail,
        sender_email: senderEmail,
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
    if (!organization?.id) {
      console.error("No organization ID available for fetching users");
      return;
    }

    try {
      setUsersLoading(true);
      
      console.log("Settings: Fetching users for organization:", organization.id);
      
      // Use the secure RPC function that filters by organization
      const { data, error } = await supabase.rpc('get_organization_users', {
        org_id: organization.id
      });

      console.log("Settings: RPC Response - Data:", data, "Error:", error);
      if (error) throw error;

      // Get user colors from profiles
      const userIds = (data || []).filter((u: any) => u.status === 'active').map((u: any) => u.id);
      let profileColors = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, color')
          .in('id', userIds);
        
        profileColors = new Map(profiles?.map(p => [p.id, p.color]) || []);
      }

      // Convert to User format - only include active users
      const usersData: User[] = (data || [])
        .filter((u: any) => u.status === 'active')
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          created_at: u.created_at,
          roles: [u.role], // Single role from RPC
          color: profileColors.get(u.id) || null,
          disabled: false,
        }));

      console.log("Settings: Loaded users:", usersData.length);
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
        
        if (planLimits.max_admin_users !== Infinity && currentUsers >= planLimits.max_admin_users) {
          toast.error(`You've reached the maximum of ${planLimits.max_admin_users} admin users for your ${planLimits.name}. Please upgrade to add more users.`);
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

      if (!organization?.id) {
        toast.error("Organization not found. Please refresh and try again.");
        return;
      }

      setInviting(true);

      // Call edge function to create user server-side
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: inviteEmail,
          fullName: inviteFullName,
          password: invitePassword,
          role: inviteRole,
          organizationId: organization.id,
        }
      });

      if (error) {
        console.error("Error creating user:", error);
        if (error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to create user. Please try again.");
        }
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`User ${inviteEmail} has been added successfully`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteFullName("");
      setInvitePassword("");
      setInviteRole("investigator");
      setShowInvitePassword(false);
      fetchUsers();
      
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

  const handleResetPassword = async (userId: string, userEmail: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success(`Password reset email sent to ${userEmail}`);
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast.error("Failed to send password reset email");
    }
  };

  const { startImpersonation } = useImpersonation();

  const handleViewAsUser = async (userId: string, userEmail: string) => {
    const userName = users.find(u => u.id === userId)?.full_name;
    startImpersonation(userId, userEmail, userName || userEmail);
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
    if (!userToDelete || !organization?.id) return;

    console.log("🔴 Settings: Deleting user", {
      email: userToDelete.email,
      userId: userToDelete.id,
      orgId: organization.id,
      orgName: organization.name
    });

    try {
      // First, let's verify the user exists in organization_members
      const { data: verifyMember, error: verifyError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("user_id", userToDelete.id)
        .eq("organization_id", organization.id)
        .maybeSingle();

      console.log("🔴 Settings: Pre-delete verification", { verifyMember, verifyError });

      if (!verifyMember && !verifyError) {
        console.log("🔴 Settings: User not found in organization_members!");
        toast.error("User not found in organization");
        return;
      }

      // Remove user from THIS organization only (not deleting the entire user account)
      const { data: deleteResult, error: memberError, count } = await supabase
        .from("organization_members")
        .delete({ count: 'exact' })
        .eq("user_id", userToDelete.id)
        .eq("organization_id", organization.id);

      console.log("🔴 Settings: Delete result", { deleteResult, error: memberError, count });

      if (memberError) {
        console.error("🔴 Settings: Delete error", memberError);
        throw memberError;
      }

      if (count === 0) {
        console.error("🔴 Settings: No rows deleted");
        throw new Error("User not found in this organization");
      }

      // Recalculate actual user count from database
      console.log("🔴 Settings: Recalculating user count...");
      const { data: { session } } = await supabase.auth.getSession();
      const { error: usageError } = await supabase.functions.invoke('update-org-usage', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (usageError) {
        console.error("🔴 Settings: Failed to update usage:", usageError);
      } else {
        console.log("✅ Settings: User count recalculated successfully");
      }

      toast.success("User removed from organization");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers();
      
      // Refresh the organization context
      if (organization) {
        await refreshOrganization();
      }
    } catch (error: any) {
      console.error("🔴 Settings: Error removing user:", error);
      toast.error(error.message || "Failed to remove user");
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
      // Get the picklist value to check for usage
      const { data: picklistData } = await supabase
        .from("picklists")
        .select("value")
        .eq("id", id)
        .single();

      if (!picklistData) {
        toast.error("Picklist item not found");
        return;
      }

      // Check if the item is being used
      let isInUse = false;
      let usageCount = 0;

      if (type === "status") {
        const { count } = await supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .eq("status", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      } else if (type === "updateType") {
        const { count } = await supabase
          .from("case_updates")
          .select("*", { count: "exact", head: true })
          .eq("update_type", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      } else if (type === "expenseCategory") {
        const { count } = await supabase
          .from("case_finances")
          .select("*", { count: "exact", head: true })
          .eq("category", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      }

      if (isInUse) {
        toast.error(`Cannot delete: This value is being used by ${usageCount} record${usageCount !== 1 ? 's' : ''}. Please deactivate it instead.`);
        return;
      }

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
        <TabsList className={`grid w-full gap-1 p-1 ${(currentUserRole === 'investigator' || currentUserRole === 'vendor') ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'} h-auto`}>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm px-2 py-2 sm:px-3">Preferences</TabsTrigger>
          {currentUserRole !== 'investigator' && currentUserRole !== 'vendor' && (
            <>
              <TabsTrigger value="organization" className="text-xs sm:text-sm px-2 py-2 sm:px-3">Organization</TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs sm:text-sm px-2 py-2 sm:px-3">Permissions</TabsTrigger>
              <TabsTrigger value="users" onClick={() => !users.length && fetchUsers()} className="text-xs sm:text-sm px-2 py-2 sm:px-3">Users</TabsTrigger>
              <TabsTrigger value="picklists" className="text-xs sm:text-sm px-2 py-2 sm:px-3">Picklists</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs sm:text-sm px-2 py-2 sm:px-3">Templates</TabsTrigger>
              <TabsTrigger value="email" className="text-xs sm:text-sm px-2 py-2 sm:px-3 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              {currentUserRole === 'admin' && (
                <TabsTrigger value="billing" className="text-xs sm:text-sm px-2 py-2 sm:px-3 flex items-center justify-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  <span className="hidden sm:inline">Billing</span>
                </TabsTrigger>
              )}
            </>
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
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Username can only contain letters, numbers, and underscores
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Current Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="newEmail">Change Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                      disabled={changingEmail}
                    />
                    <Button 
                      onClick={handleEmailChange} 
                      disabled={changingEmail || !newEmail}
                      variant="outline"
                    >
                      {changingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Change Email
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A confirmation email will be sent to your current email address. 
                    You must click the link in that email to complete the change.
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
                <div className="flex gap-2">
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
                        <div className="relative">
                          <Input
                            id="invitePassword"
                            type={showInvitePassword ? "text" : "password"}
                            placeholder="Min 6 characters"
                            value={invitePassword}
                            onChange={(e) => setInvitePassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowInvitePassword(!showInvitePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showInvitePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
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
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Color</TableHead>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Email Address</TableHead>
                        <TableHead className="min-w-[140px]">Role</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Joined Date</TableHead>
                        <TableHead className="text-right min-w-[80px]">Actions</TableHead>
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
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="editRole">Role</Label>
                    <Select 
                      value={editingUser.roles[0] || "investigator"}
                      onValueChange={(value: string) => 
                        setEditingUser({...editingUser, roles: [value]})
                      }
                    >
                      <SelectTrigger id="editRole">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Case Manager</SelectItem>
                        <SelectItem value="investigator">Investigator</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  {editingUser && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(editingUser.id, editingUser.email)}
                        className="flex-1"
                      >
                        Reset Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAsUser(editingUser.id, editingUser.email)}
                        className="flex-1"
                      >
                        View as User
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEditUser}>
                    Save Changes
                  </Button>
                </div>
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
          {/* Email Sender Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure email sender and signature settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Sender Settings</h4>
                <div>
                  <Label htmlFor="senderEmail">Verified Sender Email *</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be verified in Mailjet. Visit{" "}
                    <a 
                      href="https://app.mailjet.com/account/sender" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mailjet Sender Settings
                    </a>{" "}
                    to verify your domain or email.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email Signature</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signatureName">Name</Label>
                  <Input
                    id="signatureName"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="signatureTitle">Title</Label>
                  <Input
                    id="signatureTitle"
                    value={signatureTitle}
                    onChange={(e) => setSignatureTitle(e.target.value)}
                    placeholder="Case Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signaturePhone">Phone</Label>
                  <Input
                    id="signaturePhone"
                    value={signaturePhone}
                    onChange={(e) => setSignaturePhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="signatureEmail">Email</Label>
                  <Input
                    id="signatureEmail"
                    type="email"
                    value={signatureEmail}
                    onChange={(e) => setSignatureEmail(e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Preview</Label>
                <div className="rounded-md border border-border bg-muted/30 p-4">
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#333' }}>
                    {logoUrl && (
                      <div style={{ marginBottom: '12px' }}>
                        <img 
                          src={logoUrl} 
                          alt="Company logo" 
                          style={{ height: '40px', width: 'auto' }}
                        />
                      </div>
                    )}
                    {signatureName && (
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {signatureName}
                      </div>
                    )}
                    {signatureTitle && (
                      <div style={{ color: '#666', marginBottom: '8px' }}>
                        {signatureTitle}
                      </div>
                    )}
                    {companyName && (
                      <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                        {companyName}
                      </div>
                    )}
                    {(signaturePhone || signatureEmail) && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                        {signaturePhone && (
                          <div style={{ marginBottom: '4px' }}>
                            📞 {signaturePhone}
                          </div>
                        )}
                        {signatureEmail && (
                          <div>
                            ✉️ <a href={`mailto:${signatureEmail}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                              {signatureEmail}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {address && (
                      <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
                        {address.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                    Save Signature
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Email Test Form */}
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
                          {organization.current_users_count || 0} / {getPlanLimits(organization.subscription_product_id).max_admin_users === Infinity ? "Unlimited" : getPlanLimits(organization.subscription_product_id).max_admin_users}
                        </span>
                      </div>
                      <Progress 
                        value={
                          getPlanLimits(organization.subscription_product_id).max_admin_users === Infinity 
                            ? 0 
                            : ((organization.current_users_count || 0) / getPlanLimits(organization.subscription_product_id).max_admin_users) * 100
                        } 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>Storage</span>
                          {subscriptionStatus?.storage_addon_product_id && (
                            <Badge variant="secondary" className="text-xs">
                              +{getStorageAddon(subscriptionStatus.storage_addon_product_id)?.storage_gb || 0}GB Add-on
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {(organization.storage_used_gb || 0).toFixed(2)} GB / {getTotalStorage(organization.subscription_product_id, subscriptionStatus?.storage_addon_product_id || null)} GB
                        </span>
                      </div>
                      <Progress 
                        value={((organization.storage_used_gb || 0) / getTotalStorage(organization.subscription_product_id, subscriptionStatus?.storage_addon_product_id || null)) * 100} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subscription Plans */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Subscription Plans</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {PRICING_TIERS.map((tier) => {
                  const isCurrentPlan = tier.name === getCurrentTier();

                  return (
                    <Card 
                      key={tier.name} 
                      className={`relative ${isCurrentPlan ? "border-primary shadow-lg ring-2 ring-primary/20" : ""} ${tier.popular ? "border-primary/50" : ""}`}
                    >
                      {tier.popular && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{tier.name}</CardTitle>
                          {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                        </div>
                        <CardDescription>
                          <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                          <span className="text-muted-foreground">/month</span>
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
                        {!isCurrentPlan ? (
                          <Button
                            className="w-full"
                            variant={tier.popular ? "default" : "outline"}
                            onClick={() => handleSubscribe(tier.priceId)}
                            disabled={billingLoading === tier.priceId}
                          >
                            {billingLoading === tier.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {subscriptionStatus?.subscribed ? "Switch Plan" : "Subscribe"}
                          </Button>
                        ) : (
                          <Button className="w-full" variant="secondary" disabled>
                            Current Plan
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Storage Add-ons */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Additional Storage</h3>
              <p className="text-muted-foreground text-sm mb-4">Need more space? Add extra storage to your plan.</p>
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
                {STORAGE_ADDON_TIERS.map((addon) => (
                  <Card key={addon.name}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">{addon.name}</CardTitle>
                      </div>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">{addon.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleSubscribe(addon.priceId)}
                        disabled={billingLoading === addon.priceId || !subscriptionStatus?.subscribed}
                      >
                        {billingLoading === addon.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {!subscriptionStatus?.subscribed ? "Subscribe to a plan first" : "Add Storage"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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
    if (!subscriptionStatus?.product_id) return null;
    const tier = PRICING_TIERS.find(t => t.productId === subscriptionStatus.product_id);
    return tier?.name || null;
  }
};

export default Settings;
