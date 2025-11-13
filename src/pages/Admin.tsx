import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgIsolationAudit } from "@/components/OrgIsolationAudit";
import { Shield, Database, CreditCard, Users } from "lucide-react";
import { Loader2 } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);

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
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>
                View and manage all organization subscriptions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Subscription management features coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Users Tab */}
        <TabsContent value="system-users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Users</CardTitle>
              <CardDescription>
                View all users across all organizations in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                System user management features coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
