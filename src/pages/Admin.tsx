import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgIsolationAudit } from "@/components/OrgIsolationAudit";
import { Shield, Database, CreditCard, Users, RefreshCw } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

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

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (roleLoading) return;

      // Only super admins should access this page
      if (role !== 'admin') {
        navigate('/dashboard');
        return;
      }

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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      // Get organization memberships and roles for all users
      const userIds = profiles?.map(p => p.id) || [];
      
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('user_id, organization_id, role, organizations(name)')
        .in('user_id', userIds);

      if (orgError) throw orgError;

      // Map the data together - create one row per organization membership
      // Users can belong to multiple organizations, so they may appear multiple times
      const usersWithOrgs: SystemUser[] = [];
      
      profiles?.forEach(profile => {
        const userOrgMembers = orgMembers?.filter(om => om.user_id === profile.id) || [];
        
        if (userOrgMembers.length > 0) {
          // Add one row for each organization the user belongs to
          userOrgMembers.forEach(orgMember => {
            usersWithOrgs.push({
              ...profile,
              organization_id: orgMember.organization_id,
              organization_name: (orgMember.organizations as any)?.name || null,
              role: orgMember.role,
            });
          });
        } else {
          // User has no organization - show them with null values
          usersWithOrgs.push({
            ...profile,
            organization_id: null,
            organization_name: null,
            role: null,
          });
        }
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemUsers.map((user) => (
                        <TableRow key={user.id}>
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
    </div>
  );
};

export default Admin;
