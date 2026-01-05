import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { UserPlus, Search, Trash2, Mail, Loader2, Palette, Download, FileSpreadsheet, FileText, LayoutGrid, List, Users as UsersIcon, CheckCheck } from "lucide-react";
import { ResponsiveButton } from "@/components/ui/responsive-button";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleBadge } from "@/components/RoleBadge";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";

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
  useSetBreadcrumbs([{ label: "Users" }]);
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<OrgUser | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectedUserForColor, setSelectedUserForColor] = useState<OrgUser | null>(null);
  const { sortColumn, sortDirection, handleSort } = useSortPreference("users", "full_name", "asc");
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
      
      const { data, error } = await supabase.rpc('get_organization_users', {
        org_id: organization.id
      });

      console.log("RPC Response - Data:", data, "Error:", error);
      if (error) throw error;
      
      const userIds = (data || []).filter((u: any) => u.status === 'active').map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, color')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.color]) || []);
      
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
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
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
        const { error } = await supabase
          .from("organization_invites")
          .delete()
          .eq("id", userToRemove.id);

        if (error) throw error;
        toast.success("Invite cancelled");
      } else {
        const { data: deleteResult, error: memberError, count } = await supabase
          .from("organization_members")
          .delete({ count: 'exact' })
          .eq("user_id", userToRemove.id)
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
      }

      await fetchUsers();
      
      if (window.location.pathname.includes('/users')) {
        window.location.reload();
      }
    } catch (error: any) {
      console.error("ERROR in handleRemoveUser:", error);
      toast.error(error.message || "Failed to remove user");
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

  const EXPORT_COLUMNS: ExportColumn[] = [
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Joined", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  ];

  const handleExportCSV = () => exportToCSV(sortedUsers, EXPORT_COLUMNS, "users");
  const handleExportPDF = () => exportToPDF(sortedUsers, EXPORT_COLUMNS, "Users Report", "users");

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
          <p className="text-muted-foreground mt-2">
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ResponsiveButton
              icon={<Download className="h-4 w-4" />}
              label="Export"
              variant="outline"
              size="sm"
              className="h-10"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 w-7 p-0"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedUsers.length} user{sortedUsers.length !== 1 ? 's' : ''} ({filteredUsers.filter(u => u.status === 'active').length} active, {filteredUsers.filter(u => u.status === 'pending').length} pending)
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UsersIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No users yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Invite team members to your organization
            </p>
            {isAdmin && (
              <Button className="gap-2" onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="w-4 h-4" />
                Invite First User
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No users match your search criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedUsers.map((user) => (
            <Card 
              key={user.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => user.status === 'active' && navigate(`/users/${user.id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-10 h-10 rounded-full border-2 border-border flex-shrink-0"
                    style={{ backgroundColor: user.color || "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{user.full_name || "—"}</div>
                    <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                      {user.email}
                      {user.status === 'pending' && <Mail className="h-3 w-3" />}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <RoleBadge role={user.role} />
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {user.status === 'active' && isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserForColor(user);
                        setColorDialogOpen(true);
                      }}
                    >
                      <Palette className="w-4 h-4 mr-1" />
                      Color
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserToRemove(user);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {sortedUsers.map((user) => (
              <Card 
                key={user.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => user.status === 'active' && navigate(`/users/${user.id}`)}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-border"
                      style={{ backgroundColor: user.color || "#6366f1" }}
                    />
                    <div>
                      <div className="font-medium">{user.full_name || "—"}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        {user.email}
                        {user.status === 'pending' && <Mail className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <RoleBadge role={user.role} />
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToRemove(user);
                        }}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
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
          </Card>
        </>
      )}

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
