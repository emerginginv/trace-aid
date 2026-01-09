import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "sonner";
import { 
  ArrowLeft, Mail, Shield, User, Calendar, Phone, Building2, MapPin, 
  Edit, UserX, Trash2, KeyRound, Eye, Loader2, CheckCircle2, XCircle,
  AlertTriangle
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  mobile_phone: string | null;
  office_phone: string | null;
  department: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  color: string | null;
}

interface UserReferences {
  cases: number;
  activities: number;
  updates: number;
  finances: number;
  reports: number;
}

const UserProfileDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrganization();
  const { isAdmin, role: currentUserRole } = useUserRole();
  const { startImpersonation } = useImpersonation();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string>("investigator");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [references, setReferences] = useState<UserReferences | null>(null);
  const [checkingReferences, setCheckingReferences] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: "",
    mobile_phone: "",
    office_phone: "",
    department: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    role: "investigator",
  });

  const isOwnProfile = currentUserId === id;
  const canEdit = isAdmin || isOwnProfile;
  const canManageUser = isAdmin && !isOwnProfile;

  useSetBreadcrumbs(
    userProfile
      ? [
          { label: "Settings", href: "/settings?tab=users" },
          { label: "Users", href: "/settings?tab=users" },
          { label: userProfile.full_name || userProfile.email },
        ]
      : []
  );

  // Get current user ID
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getCurrentUser();
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!id || !organization?.id) {
        return;
      }

      try {
        setIsLoading(true);
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, mobile_phone, office_phone, department, address, city, state, zip_code, is_active, deactivated_at, created_at, color")
          .eq("id", id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Failed to load user profile");
          navigate("/settings?tab=users");
          return;
        }

        if (!profile) {
          toast.error("User not found");
          navigate("/settings?tab=users");
          return;
        }

        // Check if user is in this organization
        const { data: membership } = await supabase
          .from("organization_members")
          .select("role")
          .eq("user_id", id)
          .eq("organization_id", organization.id)
          .maybeSingle();

        if (!membership && !isAdmin) {
          toast.error("User is not a member of this organization");
          navigate("/settings?tab=users");
          return;
        }

        setUserProfile(profile as UserProfile);
        setUserRole(membership?.role || "investigator");
        
        // Initialize edit form
        setEditForm({
          full_name: profile.full_name || "",
          mobile_phone: profile.mobile_phone || "",
          office_phone: profile.office_phone || "",
          department: profile.department || "",
          address: profile.address || "",
          city: profile.city || "",
          state: profile.state || "",
          zip_code: profile.zip_code || "",
          role: membership?.role || "investigator",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load user profile");
        navigate("/settings?tab=users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, navigate, organization?.id, isAdmin]);

  // Check user references (for delete eligibility)
  const checkUserReferences = useCallback(async () => {
    if (!id || !organization?.id) return;
    
    setCheckingReferences(true);
    try {
      const [casesRes, activitiesRes, updatesRes, financesRes, reportsRes] = await Promise.all([
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("case_activities").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("case_updates").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("case_finances").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("generated_reports").select("id", { count: "exact", head: true }).eq("user_id", id),
      ]);

      setReferences({
        cases: casesRes.count || 0,
        activities: activitiesRes.count || 0,
        updates: updatesRes.count || 0,
        finances: financesRes.count || 0,
        reports: reportsRes.count || 0,
      });
    } catch (error) {
      console.error("Error checking references:", error);
    } finally {
      setCheckingReferences(false);
    }
  }, [id, organization?.id]);

  useEffect(() => {
    if (canManageUser) {
      checkUserReferences();
    }
  }, [canManageUser, checkUserReferences]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role.toLowerCase()) {
      case "admin":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name || null,
          mobile_phone: editForm.mobile_phone || null,
          office_phone: editForm.office_phone || null,
          department: editForm.department || null,
          address: editForm.address || null,
          city: editForm.city || null,
          state: editForm.state || null,
          zip_code: editForm.zip_code || null,
        })
        .eq("id", id);

      if (profileError) throw profileError;

      // Update role if admin and role changed
      if (isAdmin && !isOwnProfile && editForm.role !== userRole && organization?.id) {
        const { error: roleError } = await supabase.rpc('update_user_role', {
          _user_id: id,
          _new_role: editForm.role as "admin" | "manager" | "investigator" | "vendor",
          _org_id: organization.id
        });

        if (roleError) throw roleError;
        setUserRole(editForm.role);
      }

      // Refresh profile data
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (updatedProfile) {
        setUserProfile(updatedProfile as UserProfile);
      }

      toast.success("Profile updated successfully");
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!id || !currentUserId) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: currentUserId,
        })
        .eq("id", id);

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, is_active: false, deactivated_at: new Date().toISOString() } : null);
      toast.success("User deactivated successfully");
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      toast.error(error.message || "Failed to deactivate user");
    }
  };

  const handleReactivateUser = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
        })
        .eq("id", id);

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, is_active: true, deactivated_at: null } : null);
      toast.success("User reactivated successfully");
    } catch (error: any) {
      console.error("Error reactivating user:", error);
      toast.error(error.message || "Failed to reactivate user");
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !organization?.id) return;
    
    try {
      // Remove from organization
      const { error: memberError } = await supabase
        .from("organization_members")
        .delete()
        .eq("user_id", id)
        .eq("organization_id", organization.id);

      if (memberError) throw memberError;

      // Call edge function to delete auth user
      const { data: { session } } = await supabase.auth.getSession();
      const { error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (deleteError) throw deleteError;

      toast.success("User deleted successfully");
      navigate("/settings?tab=users");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleResetPassword = async () => {
    if (!userProfile?.email) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: userProfile.email },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success("Password reset email sent");
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast.error(error.message || "Failed to send password reset");
    }
  };

  const handleViewAsUser = () => {
    if (!userProfile) return;
    
    // Log impersonation
    supabase.from("security_audit_log").insert({
      event_type: "impersonation_start",
      user_id: currentUserId,
      target_user_id: id,
      organization_id: organization?.id,
      metadata: { target_email: userProfile.email },
    });

    startImpersonation(id!, userProfile.email, userProfile.full_name || "User");
  };

  const canDeleteUser = references && 
    references.cases === 0 && 
    references.activities === 0 && 
    references.updates === 0 && 
    references.finances === 0 && 
    references.reports === 0;

  const totalReferences = references 
    ? references.cases + references.activities + references.updates + references.finances + references.reports 
    : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Unable to load profile</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings?tab=users")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">User Profile</h1>
              <p className="text-muted-foreground mt-1">
                {canManageUser ? "Manage user information and access" : "View user information"}
              </p>
            </div>
          </div>
          
          {canEdit && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit User Profile</DialogTitle>
                  <DialogDescription>
                    Update user information and contact details
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    {isAdmin && !isOwnProfile && (
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={editForm.role} 
                          onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                        >
                          <SelectTrigger id="role">
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
                    )}
                  </div>
                  
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Contact Information</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile_phone">Mobile Phone</Label>
                      <Input
                        id="mobile_phone"
                        type="tel"
                        value={editForm.mobile_phone}
                        onChange={(e) => setEditForm({ ...editForm, mobile_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="office_phone">Office Phone</Label>
                      <Input
                        id="office_phone"
                        type="tel"
                        value={editForm.office_phone}
                        onChange={(e) => setEditForm({ ...editForm, office_phone: e.target.value })}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department / Office</Label>
                    <Input
                      id="department"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      placeholder="Investigations"
                    />
                  </div>

                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Address</p>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">ZIP Code</Label>
                      <Input
                        id="zip_code"
                        value={editForm.zip_code}
                        onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-primary/10">
                    <AvatarImage src={userProfile.avatar_url || ""} alt={userProfile.full_name || userProfile.email} />
                    <AvatarFallback 
                      className="text-3xl"
                      style={{ backgroundColor: userProfile.color || "#6366f1", color: "white" }}
                    >
                      {getInitials(userProfile.full_name, userProfile.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!userProfile.is_active && (
                    <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1">
                      <XCircle className="h-5 w-5 text-destructive-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 w-full">
                  <h2 className="text-xl font-semibold">
                    {userProfile.full_name || "User"}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant={getRoleBadgeVariant(userRole)} className="capitalize">
                      {userRole}
                    </Badge>
                    {!userProfile.is_active && (
                      <Badge variant="destructive">Deactivated</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Identity Section */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Full Name</p>
                    <p className="text-sm font-semibold truncate">{userProfile.full_name || "Not set"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
                    <p className="text-sm font-semibold truncate">{userProfile.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Role</p>
                    <p className="text-sm font-semibold capitalize">{userRole}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Member Since</p>
                    <p className="text-sm font-semibold">{format(new Date(userProfile.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Section */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Contact Information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Mobile Phone</p>
                      <p className="text-sm font-semibold">{userProfile.mobile_phone || "Not set"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Office Phone</p>
                      <p className="text-sm font-semibold">{userProfile.office_phone || "Not set"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Department</p>
                      <p className="text-sm font-semibold">{userProfile.department || "Not set"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Address</p>
                      <p className="text-sm font-semibold">
                        {userProfile.address || userProfile.city || userProfile.state
                          ? `${userProfile.address || ""}${userProfile.city ? `, ${userProfile.city}` : ""}${userProfile.state ? `, ${userProfile.state}` : ""} ${userProfile.zip_code || ""}`
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        {canManageUser && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Administrative Actions
              </CardTitle>
              <CardDescription>
                These actions require admin privileges and affect user access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Reset Password */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset User Password</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will send a password reset email to {userProfile.email}. The user will need to click the link to set a new password.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetPassword}>
                        Send Reset Email
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* View As User */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="h-4 w-4 mr-2" />
                      View As User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>View As This User</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will see the application as {userProfile.full_name || userProfile.email} sees it. This action is logged for audit purposes. A banner will indicate you are viewing as another user.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleViewAsUser}>
                        Start Viewing
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Deactivate/Reactivate */}
                {userProfile.is_active ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate User
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Deactivate User
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            Deactivating {userProfile.full_name || userProfile.email} will:
                          </p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            <li>Prevent them from logging in</li>
                            <li>Preserve all their historical records</li>
                            <li>Keep them visible in cases, reports, and audit logs</li>
                          </ul>
                          <p className="text-sm font-medium">This action can be reversed by reactivating the user.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeactivateUser}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Deactivate User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={handleReactivateUser}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Reactivate User
                  </Button>
                )}

                {/* Delete User */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
                      disabled={!canDeleteUser || checkingReferences}
                    >
                      {checkingReferences ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete User Permanently
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {canDeleteUser ? (
                          <p>
                            This will permanently delete {userProfile.full_name || userProfile.email} and remove all their data. This action cannot be undone.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <p>
                              This user cannot be deleted because they have existing records:
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {references?.cases && references.cases > 0 && <li>{references.cases} case(s) created</li>}
                              {references?.activities && references.activities > 0 && <li>{references.activities} activity/activities</li>}
                              {references?.updates && references.updates > 0 && <li>{references.updates} update(s)</li>}
                              {references?.finances && references.finances > 0 && <li>{references.finances} financial record(s)</li>}
                              {references?.reports && references.reports > 0 && <li>{references.reports} report(s)</li>}
                            </ul>
                            <p className="text-sm font-medium mt-2">
                              Consider deactivating this user instead to preserve data integrity.
                            </p>
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      {canDeleteUser && (
                        <AlertDialogAction 
                          onClick={handleDeleteUser}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete Permanently
                        </AlertDialogAction>
                      )}
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {!canDeleteUser && totalReferences > 0 && (
                <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  User has {totalReferences} linked record(s). Deletion is disabled to preserve data integrity.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserProfileDetail;