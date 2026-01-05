import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Search, Users as UsersIcon, Edit2, Trash2, MoreVertical, Eye, EyeOff, Palette } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { getPlanLimits, isTrialActive } from "@/lib/planLimits";
import { Organization, SubscriptionStatus } from "@/contexts/OrganizationContext";

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

interface UsersManagementTabProps {
  organization: Organization | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentUserId: string | null;
  currentUserRole: string | null;
  refreshOrganization: () => Promise<void>;
}

const colorPalette = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", 
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b", "#71717a", "#78716c"
];

export const UsersManagementTab = ({
  organization,
  subscriptionStatus,
  currentUserId,
  currentUserRole,
  refreshOrganization,
}: UsersManagementTabProps) => {
  const { startImpersonation } = useImpersonation();
  
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

  const isAdmin = currentUserRole === "admin";

  const fetchUsers = async () => {
    if (!organization?.id) {
      console.error("No organization ID available for fetching users");
      return;
    }

    try {
      setUsersLoading(true);
      
      const { data, error } = await supabase.rpc('get_organization_users', {
        org_id: organization.id
      });

      if (error) throw error;

      const userIds = (data || []).filter((u: any) => u.status === 'active').map((u: any) => u.id);
      let profileColors = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, color')
          .in('id', userIds);
        
        profileColors = new Map(profiles?.map(p => [p.id, p.color]) || []);
      }

      const usersData: User[] = (data || [])
        .filter((u: any) => u.status === 'active')
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          created_at: u.created_at,
          roles: [u.role],
          color: profileColors.get(u.id) || null,
          disabled: false,
        }));

      setUsers(usersData);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  // Load users on mount
  useState(() => {
    if (organization?.id && users.length === 0) {
      fetchUsers();
    }
  });

  const handleInviteUser = async () => {
    try {
      if (organization && inviteRole === "admin") {
        const activeProductId = subscriptionStatus?.product_id || organization.subscription_product_id;
        const planLimits = getPlanLimits(activeProductId);
        const currentAdminUsers = organization.current_users_count || 0;
        
        if (planLimits.max_admin_users !== Infinity && currentAdminUsers >= planLimits.max_admin_users) {
          toast.error(`You've reached the maximum of ${planLimits.max_admin_users} admin users for your ${planLimits.name}. Please upgrade to add more admin users.`);
          return;
        }
      }

      if (organization && subscriptionStatus?.trial_end && !isTrialActive(subscriptionStatus.trial_end) && subscriptionStatus.status !== "active") {
        toast.error("Your trial has expired. Please add a payment method to continue adding users.");
        return;
      }

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

      if (inviteRole === 'admin') {
        const planProductId = subscriptionStatus?.product_id || organization.subscription_product_id;
        const planLimits = getPlanLimits(planProductId);
        const currentAdminCount = users.filter(u => u.roles.includes('admin')).length;
        
        if (currentAdminCount >= planLimits.max_admin_users) {
          toast.error(`Maximum admin limit reached for ${planLimits.name} plan. Please upgrade your plan to add more admins.`);
          setInviting(false);
          return;
        }
      }

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
        toast.error(error.message || "Failed to create user. Please try again.");
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
      if (userId === currentUserId) {
        toast.error("You cannot change your own role");
        return;
      }

      if (!currentUserId) {
        toast.error("Not authenticated");
        return;
      }

      if (newRole === 'admin') {
        const planProductId = subscriptionStatus?.product_id || organization?.subscription_product_id;
        const planLimits = getPlanLimits(planProductId || null);
        const currentAdminCount = users.filter(u => u.roles.includes('admin')).length;
        const userBeingChanged = users.find(u => u.id === userId);
        const isAlreadyAdmin = userBeingChanged?.roles.includes('admin');
        
        if (!isAlreadyAdmin && currentAdminCount >= planLimits.max_admin_users) {
          toast.error(`Maximum admin limit reached for ${planLimits.name} plan. Please upgrade your plan to add more admins.`);
          return;
        }
      }

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (orgError || !orgMember) {
        toast.error("Could not find organization");
        return;
      }

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

  const handleViewAsUser = async (userId: string, userEmail: string) => {
    const userName = users.find(u => u.id === userId)?.full_name;
    startImpersonation(userId, userEmail, userName || userEmail);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !organization?.id) return;

    try {
      const { data: verifyMember, error: verifyError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("user_id", userToDelete.id)
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (!verifyMember && !verifyError) {
        toast.error("User not found in organization");
        return;
      }

      const { error: memberError, count } = await supabase
        .from("organization_members")
        .delete({ count: 'exact' })
        .eq("user_id", userToDelete.id)
        .eq("organization_id", organization.id);

      if (memberError) throw memberError;

      if (count === 0) {
        throw new Error("User not found in this organization");
      }

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('update-org-usage', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      toast.success("User removed from organization");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers();
      await refreshOrganization();
    } catch (error: any) {
      console.error("Error removing user:", error);
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                          placeholder="Min 8 characters"
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
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="investigator">Investigator</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={fetchUsers}
              >
                Load Users
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Color</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <button
                          onClick={() => {
                            setSelectedUserForColor(user);
                            setColorDialogOpen(true);
                          }}
                          className="w-6 h-6 rounded-full border-2 border-border hover:border-primary transition-colors"
                          style={{ backgroundColor: user.color || '#6366f1' }}
                          title="Click to change color"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {user.full_name || "—"}
                          <span className="block sm:hidden text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                      <TableCell>
                        {isAdmin && user.id !== currentUserId ? (
                          <Select
                            value={user.roles[0] || "investigator"}
                            onValueChange={(value: "admin" | "manager" | "investigator" | "vendor") =>
                              handleRoleChange(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="investigator">Investigator</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={user.roles[0] === "admin" ? "default" : "secondary"} className="capitalize">
                            {user.roles[0] || "user"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
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
                            <DropdownMenuItem onClick={() => {
                              setSelectedUserForColor(user);
                              setColorDialogOpen(true);
                            }}>
                              <Palette className="h-4 w-4 mr-2" />
                              Change Color
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
    </>
  );
};

export default UsersManagementTab;
