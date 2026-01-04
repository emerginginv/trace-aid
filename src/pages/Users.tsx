import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { UserPlus, Search, Trash2, Mail, Loader2, Palette } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleBadge } from "@/components/RoleBadge";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";

interface OrgUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'investigator' | 'vendor';
  status: 'active' | 'pending';
  created_at: string;
  color: string | null;
}

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "investigator", "vendor"]),
});

const COLUMNS: ColumnDefinition[] = [
  { key: "color", label: "Color", hideable: false },
  { key: "full_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Joined" },
  { key: "actions", label: "Actions", hideable: false },
];

const Users = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<OrgUser | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectedUserForColor, setSelectedUserForColor] = useState<OrgUser | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { isAdmin } = useUserRole();

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("users-columns", COLUMNS);

  const colorPalette = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", 
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#64748b", "#71717a", "#78716c"
  ];

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "investigator",
    },
  });

  useEffect(() => {
    console.log("Organization changed:", organization?.id);
    if (organization?.id) {
      // Clear existing users first to prevent stale data display
      setUsers([]);
      fetchUsers();
    }
  }, [organization?.id]);

  const fetchUsers = async () => {
    if (!organization?.id) {
      console.error("No organization ID available");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching users for organization:", organization.id);
      
      // Force fresh data by disabling cache
      const { data, error } = await supabase.rpc('get_organization_users', {
        org_id: organization.id
      });

      console.log("RPC Response - Data:", data, "Error:", error);
      if (error) throw error;
      
      // Get user colors from profiles
      const userIds = (data || []).filter((u: any) => u.status === 'active').map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, color')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.color]) || []);
      
      // Filter out any invalid roles and add colors
      const validUsers = (data || []).filter((u: any) => 
        ['admin', 'manager', 'investigator', 'vendor'].includes(u.role)
      ).map((u: any) => ({
        ...u,
        color: profileMap.get(u.id) || null
      }));
      
      setUsers(validUsers as OrgUser[]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (values: z.infer<typeof inviteSchema>) => {
    if (!organization?.id) return;

    console.log("🔵 Inviting user:", {
      email: values.email,
      role: values.role,
      orgId: organization.id,
      currentUserCount: users.filter(u => u.status === 'active').length
    });

    try {
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: values.email,
          role: values.role,
          organizationId: organization.id,
        }
      });

      console.log("🔵 Invite response:", { data, error });

      if (error) throw error;

      toast.success(`Invite sent to ${values.email}`);
      setInviteDialogOpen(false);
      form.reset();
      fetchUsers();
    } catch (error: any) {
      console.error("🔵 Error sending invite:", error);
      toast.error(error.message || "Failed to send invite");
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'investigator' | 'vendor') => {
    if (!organization?.id) return;

    try {
      // Use secure database function to update role
      const { error } = await supabase.rpc('update_user_role', {
        _user_id: userId,
        _new_role: newRole,
        _org_id: organization.id
      });

      if (error) throw error;

      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update user role");
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

  const handleRemoveUser = async () => {
    console.log("🔴 handleRemoveUser called", { userToRemove, orgId: organization?.id });
    
    if (!userToRemove || !organization?.id) {
      console.log("🔴 Missing data - userToRemove or organization");
      return;
    }

    try {
      console.log("🔴 Starting removal process for:", userToRemove.email, "Status:", userToRemove.status);
      
      if (userToRemove.status === 'pending') {
        console.log("🔴 Deleting pending invite with ID:", userToRemove.id);
        const { error } = await supabase
          .from("organization_invites")
          .delete()
          .eq("id", userToRemove.id);

        if (error) {
          console.error("🔴 Failed to delete invite:", error);
          throw error;
        }
        
        console.log("✅ Invite deleted successfully");
        toast.success("Invite cancelled");
      } else {
        console.log("🔴 Deleting active user from organization");
        console.log("🔴 Deleting with user_id:", userToRemove.id, "org_id:", organization.id);
        
        // Remove member from this organization only
        const { data: deleteResult, error: memberError, count } = await supabase
          .from("organization_members")
          .delete({ count: 'exact' })
          .eq("user_id", userToRemove.id)
          .eq("organization_id", organization.id);

        console.log("🔴 Delete operation completed");
        console.log("🔴 Delete result:", { deleteResult, error: memberError, count });

        if (memberError) {
          console.error("🔴 Error from database:", memberError);
          throw memberError;
        }

        if (count === 0) {
          console.error("🔴 No rows deleted - user may not exist in organization");
          throw new Error("User not found in this organization");
        }

        console.log("✅ Successfully deleted", count, "row(s)");

        // Recalculate actual user count from database
        console.log("🔴 Recalculating user count...");
        const { data: { session } } = await supabase.auth.getSession();
        const { error: usageError } = await supabase.functions.invoke('update-org-usage', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
        
        if (usageError) {
          console.error("🔴 Failed to update usage:", usageError);
        } else {
          console.log("✅ User count recalculated successfully");
        }

        toast.success("User removed from organization");
      }

      console.log("🔴 Refreshing user list...");
      // Force immediate refresh
      await fetchUsers();
      
      // Also refresh organization context to update limits
      if (window.location.pathname.includes('/users')) {
        window.location.reload();
      }
      
    } catch (error: any) {
      console.error("🔴 ERROR in handleRemoveUser:", error);
      toast.error(error.message || "Failed to remove user");
    } finally {
      console.log("🔴 Closing dialog");
      setUserToRemove(null);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: string = "";
    let bVal: string = "";
    
    if (sortColumn === "full_name") {
      aVal = a.full_name || "";
      bVal = b.full_name || "";
    } else if (sortColumn === "created_at") {
      return sortDirection === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      aVal = String(a[sortColumn as keyof OrgUser] || "");
      bVal = String(b[sortColumn as keyof OrgUser] || "");
    }
    
    return sortDirection === "asc" 
      ? aVal.localeCompare(bVal) 
      : bVal.localeCompare(aVal);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleInviteUser)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin - Full access to all settings and billing</SelectItem>
                            <SelectItem value="manager">Case Manager - Can create and manage cases</SelectItem>
                            <SelectItem value="investigator">Investigator - Can view and update assigned cases</SelectItem>
                            <SelectItem value="vendor">Vendor - External collaborator with limited access</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Send Invite</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-6">
        <div className="mb-4 text-sm text-muted-foreground">
          Total Users: {filteredUsers.filter(u => u.status === 'active').length} active, {filteredUsers.filter(u => u.status === 'pending').length} pending
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Case Manager</SelectItem>
                <SelectItem value="investigator">Investigator</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
          </Select>
          <ColumnVisibility
            columns={COLUMNS}
            visibility={visibility}
            onToggle={toggleColumn}
            onReset={resetToDefaults}
          />
        </div>

        {/* Entry count */}
        <div className="text-sm text-muted-foreground mb-4">
          Showing {sortedUsers.length} user{sortedUsers.length !== 1 ? 's' : ''}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isVisible("color") && (
                  <SortableTableHead
                    column=""
                    label="Color"
                    sortColumn=""
                    sortDirection="asc"
                    onSort={() => {}}
                  />
                )}
                {isVisible("full_name") && (
                  <SortableTableHead
                    column="full_name"
                    label="Name"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("email") && (
                  <SortableTableHead
                    column="email"
                    label="Email"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("role") && (
                  <SortableTableHead
                    column="role"
                    label="Role"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("status") && (
                  <SortableTableHead
                    column="status"
                    label="Status"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("created_at") && (
                  <SortableTableHead
                    column="created_at"
                    label="Joined"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("actions") && (
                  <SortableTableHead
                    column=""
                    label="Actions"
                    sortColumn=""
                    sortDirection="asc"
                    onSort={() => {}}
                    className="text-right"
                  />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    {isVisible("color") && (
                      <TableCell>
                        {user.status === 'active' && isAdmin ? (
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
                        ) : user.status === 'active' ? (
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-border ml-2"
                            style={{ backgroundColor: user.color || "#6366f1" }}
                          />
                        ) : (
                          <div className="w-6 h-6" />
                        )}
                      </TableCell>
                    )}
                    {isVisible("full_name") && (
                      <TableCell className="font-medium">
                        {user.full_name || "—"}
                      </TableCell>
                    )}
                    {isVisible("email") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.email}
                          {user.status === 'pending' && (
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isVisible("role") && (
                      <TableCell>
                        {isAdmin && user.status === 'active' ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'manager' | 'investigator' | 'vendor')}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Case Manager</SelectItem>
                              <SelectItem value="investigator">Investigator</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <RoleBadge role={user.role} />
                        )}
                      </TableCell>
                    )}
                    {isVisible("status") && (
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                    )}
                    {isVisible("created_at") && (
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/users/${user.id}`)}
                            >
                              View
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToRemove(user)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.email} from the organization?
              {userToRemove?.status === 'active' ? ' They will lose access to all cases and data.' : ' This will cancel their pending invitation.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <ScrollProgress />
    </div>
  );
};

export default Users;
