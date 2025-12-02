import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgIsolationAudit } from "@/components/OrgIsolationAudit";
import { Shield, Database, CreditCard, Users, RefreshCw, Edit, Trash2, Building2, UserCog } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Organization {
  id: string;
  name: string;
  billing_email: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_product_id: string | null;
  current_users_count: number | null;
  max_users: number | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface SystemUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  organization_name: string | null;
  organization_id: string | null;
  role: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form states
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (roleLoading) return;

      // Only super admins should access this page
      if (role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      // Load organizations for dropdowns
      fetchOrganizations();
      setLoading(false);
    };

    checkAdminAccess();
  }, [role, roleLoading, navigate]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchSystemUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      if (!usersData || usersData.length === 0) {
        setSystemUsers([]);
        return;
      }

      console.log(`[DEBUG] Fetched ${usersData.length} users`);

      // Get ALL organization memberships (no filtering by user_id)
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id, organization_id, role');

      if (memberError) {
        console.error('[DEBUG] Error fetching memberships:', memberError);
        throw memberError;
      }

      console.log(`[DEBUG] Fetched ${memberships?.length || 0} total memberships`);

      // Get ALL organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name');

      if (orgsError) {
        console.error('[DEBUG] Error fetching orgs:', orgsError);
        throw orgsError;
      }

      console.log(`[DEBUG] Fetched ${orgsData?.length || 0} organizations`);

      // Create a map of org_id -> org_name for quick lookup
      const orgMap = new Map(orgsData?.map(org => [org.id, org.name]) || []);

      // Map users with their organization info
      const usersWithOrgs: SystemUser[] = [];
      
      usersData.forEach(user => {
        const userMemberships = memberships?.filter(m => m.user_id === user.id) || [];
        
        if (userMemberships.length > 0) {
          // Create one entry per organization membership
          userMemberships.forEach(membership => {
            const orgName = orgMap.get(membership.organization_id);
            if (!orgName) {
              console.warn(`[DEBUG] No org name found for org_id: ${membership.organization_id}, user: ${user.email}`);
            }
            usersWithOrgs.push({
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              created_at: user.created_at,
              organization_id: membership.organization_id,
              organization_name: orgName || 'Unknown',
              role: membership.role,
            });
          });
        } else {
          console.log(`[DEBUG] User ${user.email} has no organization memberships`);
          // User has no organization
          usersWithOrgs.push({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at,
            organization_id: null,
            organization_name: null,
            role: null,
          });
        }
      });

      console.log(`[DEBUG] Final users with orgs: ${usersWithOrgs.length}`);
      setSystemUsers(usersWithOrgs);
    } catch (error) {
      console.error('Error fetching system users:', error);
      toast.error('Failed to load system users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "Active" },
      inactive: { variant: "outline", label: "Inactive" },
      canceled: { variant: "destructive", label: "Canceled" },
      trialing: { variant: "secondary", label: "Trial" },
    };

    const statusInfo = statusMap[status] || { variant: "outline" as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getTierBadge = (tier: string | null) => {
    if (!tier) return <Badge variant="outline">Free</Badge>;
    
    const tierMap: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      free: { variant: "outline", label: "Free" },
      standard: { variant: "secondary", label: "Standard" },
      pro: { variant: "default", label: "Pro" },
      enterprise: { variant: "default", label: "Enterprise" },
    };

    const tierInfo = tierMap[tier.toLowerCase()] || { variant: "outline" as const, label: tier };
    return <Badge variant={tierInfo.variant}>{tierInfo.label}</Badge>;
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          email: editEmail,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setShowEditDialog(false);
      fetchSystemUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleChangeOrg = async () => {
    if (!selectedUser || !selectedOrgId) return;
    
    try {
      // Remove from current organization if exists
      if (selectedUser.organization_id) {
        await supabase
          .from('organization_members')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('organization_id', selectedUser.organization_id);
      }

      // Determine role to use - if user has no role, default to member
      const assignedRole = selectedUser.role || 'member';

      // Add to new organization
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert([{
          user_id: selectedUser.id,
          organization_id: selectedOrgId,
          role: assignedRole as any,
        }]);

      if (insertError) throw insertError;

      // If user had no role, also add to user_roles table
      if (!selectedUser.role) {
        await supabase
          .from('user_roles')
          .insert([{
            user_id: selectedUser.id,
            role: assignedRole as any,
          }]);
      }

      toast.success('Organization assigned successfully');
      setShowOrgDialog(false);
      fetchSystemUsers();
    } catch (error) {
      console.error('Error changing organization:', error);
      toast.error('Failed to assign organization');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      // If user has an organization, update organization_members
      if (selectedUser.organization_id) {
        const { error: orgError } = await supabase
          .from('organization_members')
          .update({ role: selectedRole as any })
          .eq('user_id', selectedUser.id)
          .eq('organization_id', selectedUser.organization_id);

        if (orgError) throw orgError;
      }

      // Always update user_roles table
      // First delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      // Then insert new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: selectedUser.id,
          role: selectedRole as any,
        }]);

      if (roleError) throw roleError;

      toast.success('Role assigned successfully');
      setShowRoleDialog(false);
      fetchSystemUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to assign role');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Call the edge function to delete user from auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: selectedUser.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchSystemUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const openEditDialog = (user: SystemUser) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || '');
    setEditEmail(user.email);
    setShowEditDialog(true);
  };

  const openOrgDialog = async (user: SystemUser) => {
    setSelectedUser(user);
    setSelectedOrgId(user.organization_id || '');
    
    // Load organizations if not already loaded
    if (organizations.length === 0) {
      await fetchOrganizations();
    }
    
    setShowOrgDialog(true);
  };

  const openRoleDialog = (user: SystemUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'member');
    setShowRoleDialog(true);
  };

  const openDeleteDialog = (user: SystemUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          System Administration
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage system-wide settings, subscriptions, and data integrity
        </p>
      </div>

      <Tabs defaultValue="data-integrity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="data-integrity" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data Integrity</span>
            <span className="sm:hidden">Data</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Subscriptions</span>
            <span className="sm:hidden">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="system-users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">System Users</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
        </TabsList>

        {/* Data Integrity Tab */}
        <TabsContent value="data-integrity" className="space-y-6">
          <OrgIsolationAudit />
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscription Management</CardTitle>
                  <CardDescription>
                    View and manage all organization subscriptions across the platform
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOrganizations}
                  disabled={loadingOrgs}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingOrgs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrgs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : organizations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No organizations found</p>
                  <Button onClick={fetchOrganizations} variant="outline" className="mt-4">
                    Load Organizations
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Billing Email</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>{org.billing_email || '-'}</TableCell>
                          <TableCell>{getTierBadge(org.subscription_tier)}</TableCell>
                          <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                          <TableCell>
                            {org.current_users_count || 0} / {org.max_users || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(org.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Users Tab */}
        <TabsContent value="system-users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Users</CardTitle>
                  <CardDescription>
                    View all users across all organizations in the system
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSystemUsers}
                  disabled={loadingUsers}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : systemUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No users found</p>
                  <Button onClick={fetchSystemUsers} variant="outline" className="mt-4">
                    Load Users
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemUsers.map((user, index) => (
                        <TableRow key={`${user.id}-${index}`}>
                          <TableCell className="font-medium">
                            {user.full_name || '-'}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.organization_name || <span className="text-muted-foreground">No org</span>}
                          </TableCell>
                          <TableCell>
                            {user.role ? (
                              <Badge variant="outline" className="capitalize">
                                {user.role}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openOrgDialog(user)}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Change Organization
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(user)}
                                  className="text-destructive"
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
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Organization Dialog */}
      <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Organization</DialogTitle>
            <DialogDescription>
              Assign user to a different organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrgDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeOrg}>Change Organization</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User Role</DialogTitle>
            <DialogDescription>
              {selectedUser?.organization_id 
                ? "Update the user's role and permissions" 
                : "Assign a role to this user. Note: User should also be assigned to an organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="investigator">Investigator</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={!selectedRole}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.full_name || selectedUser?.email}? 
              This action cannot be undone and will remove all user data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
