import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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

const Users = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<OrgUser | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectedUserForColor, setSelectedUserForColor] = useState<OrgUser | null>(null);
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { isAdmin } = useUserRole();

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
    if (organization?.id) {
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

    try {
      const { error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: values.email,
          role: values.role,
          organizationId: organization.id,
        }
      });

      if (error) throw error;

      toast.success(`Invite sent to ${values.email}`);
      setInviteDialogOpen(false);
      form.reset();
      fetchUsers();
    } catch (error: any) {
      console.error("Error sending invite:", error);
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
    if (!userToRemove || !organization?.id) return;

    try {
      if (userToRemove.status === 'pending') {
        // Remove invite
        const { error } = await supabase
          .from("organization_invites")
          .delete()
          .eq("id", userToRemove.id);

        if (error) throw error;
        toast.success("Invite cancelled");
      } else {
        // Remove member
        const { error: memberError } = await supabase
          .from("organization_members")
          .delete()
          .eq("user_id", userToRemove.id)
          .eq("organization_id", organization.id);

        if (memberError) throw memberError;

        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userToRemove.id);

        if (roleError) throw roleError;

        toast.success("User removed from organization");
      }

      fetchUsers();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user");
    } finally {
      setUserToRemove(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
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
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
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
                    <TableCell className="font-medium">
                      {user.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.email}
                        {user.status === 'pending' && (
                          <Mail className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
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
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
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
    </div>
  );
};

export default Users;
