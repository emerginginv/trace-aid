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
import { getPlanLimits } from "@/lib/planLimits";
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
  stripe_customer_id: string | null;
}

interface StripeSubscriptionData {
  org_id: string;
  product_id: string | null;
  status: string | null;
  trial_end: string | null;
  storage_addon_gb: number;
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
  const [stripeData, setStripeData] = useState<Record<string, StripeSubscriptionData>>({});
  const [adminCounts, setAdminCounts] = useState<Record<string, number>>({});
  
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

      // Fetch Stripe subscription data and admin counts for each organization
      if (data && data.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Fetch subscription data from Stripe for orgs with stripe_customer_id
          const stripeDataMap: Record<string, StripeSubscriptionData> = {};
          const adminCountMap: Record<string, number> = {};
          
          for (const org of data) {
            // Count admin users for this organization
            const { count } = await supabase
              .from('organization_members')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', org.id)
              .eq('role', 'admin');
            
            adminCountMap[org.id] = count || 0;
            
            // Only fetch from Stripe if org has a stripe_customer_id
            if (org.stripe_customer_id) {
              try {
                const response = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ customerId: org.stripe_customer_id }),
                  }
                );
                
                if (response.ok) {
                  const result = await response.json();
                  stripeDataMap[org.id] = {
                    org_id: org.id,
                    product_id: result.product_id,
                    status: result.status,
                    trial_end: result.trial_end,
                    storage_addon_gb: result.storage_addon_gb || 0,
                  };
                }
              } catch (e) {
                console.error('Error fetching Stripe data for org:', org.id, e);
              }
            }
          }
          
          setStripeData(stripeDataMap);
          setAdminCounts(adminCountMap);
        }
      }
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
      // First, get the current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { data: currentUserOrg, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (orgError || !currentUserOrg) {
        toast.error('Could not determine your organization');
        return;
      }

      const myOrgId = currentUserOrg.organization_id;

      // Get organization name
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', myOrgId)
        .single();

      const orgName = orgData?.name || 'Unknown';

      // Get all members of MY organization only
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id, organization_id, role')
        .eq('organization_id', myOrgId);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setSystemUsers([]);
        return;
      }

      // Get profile info for these users
      const userIds = memberships.map(m => m.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Map users with their organization info
      const usersWithOrgs: SystemUser[] = memberships.map(membership => {
        const userProfile = usersData?.find(u => u.id === membership.user_id);
        return {
          id: membership.user_id,
          email: userProfile?.email || 'Unknown',
          full_name: userProfile?.full_name || null,
          created_at: userProfile?.created_at || new Date().toISOString(),
          organization_id: myOrgId,
          organization_name: orgName,
          role: membership.role,
        };
      });

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

  const getTierBadge = (productId: string | null) => {
    const plan = getPlanLimits(productId);
    
    if (!productId || plan.name === "Free Trial") {
      return <Badge variant="outline">Free</Badge>;
    }
    
    // Use product ID to determine variant styling
    const tierVariants: Record<string, "default" | "secondary" | "outline"> = {
      "prod_TagUwxglXyq7Ls": "secondary", // The Investigator
      "prod_TagbsPhNweUFpe": "default", // The Agency
      "prod_Tagc0lPxc1XjVC": "default", // The Enterprise
    };

    const variant = tierVariants[productId] || "outline";
    return <Badge variant={variant}>{plan.name}</Badge>;
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
                      {organizations.map((org) => {
                        // Use Stripe data if available, otherwise fall back to DB data
                        const orgStripeData = stripeData[org.id];
                        const effectiveProductId = orgStripeData?.product_id || org.subscription_product_id;
                        const effectiveStatus = orgStripeData?.status || org.subscription_status;
                        const planLimits = getPlanLimits(effectiveProductId);
                        const currentAdminCount = adminCounts[org.id] || 0;
                        
                        return (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell>{org.billing_email || '-'}</TableCell>
                            <TableCell>{getTierBadge(effectiveProductId)}</TableCell>
                            <TableCell>{getStatusBadge(effectiveStatus)}</TableCell>
                            <TableCell>
                              {currentAdminCount} / {planLimits.max_admin_users}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(org.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
