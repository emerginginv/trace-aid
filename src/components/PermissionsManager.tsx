import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor';

type Permission = {
  id: string;
  role: AppRole;
  feature_key: string;
  allowed: boolean;
};

type FeatureGroup = {
  name: string;
  features: Array<{
    key: string;
    label: string;
    description?: string;
  }>;
};

const featureGroups: FeatureGroup[] = [
  {
    name: "Cases",
    features: [
      { key: "view_cases", label: "View Cases" },
      { key: "add_cases", label: "Add Cases" },
      { key: "edit_cases", label: "Edit Cases" },
      { key: "delete_cases", label: "Delete Cases" },
    ],
  },
  {
    name: "Contacts",
    features: [
      { key: "view_contacts", label: "View Contacts" },
      { key: "edit_contacts", label: "Edit Contacts" },
      { key: "delete_contacts", label: "Delete Contacts" },
    ],
  },
  {
    name: "Accounts",
    features: [
      { key: "view_accounts", label: "View Accounts" },
      { key: "edit_accounts", label: "Edit Accounts" },
      { key: "delete_accounts", label: "Delete Accounts" },
    ],
  },
  {
    name: "Finances",
    features: [
      { key: "view_finances", label: "View Finances" },
      { key: "add_finances", label: "Add Finances" },
      { key: "edit_finances", label: "Edit Finances" },
      { key: "delete_finances", label: "Delete Finances" },
    ],
  },
  {
    name: "Reports & Calendar",
    features: [
      { key: "view_reports", label: "View Reports" },
      { key: "view_calendar", label: "View Calendar" },
    ],
  },
  {
    name: "Administration",
    features: [
      { key: "manage_users", label: "Manage Users" },
      { key: "manage_permissions", label: "Manage Permissions" },
      { key: "view_billing", label: "View Billing" },
    ],
  },
  {
    name: "Notifications",
    features: [
      { key: "view_notifications", label: "View Notifications" },
    ],
  },
];

const roles: Array<{ value: AppRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "investigator", label: "Investigator" },
  { value: "vendor", label: "Vendor" },
];

export function PermissionsManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions" as any)
        .select("*")
        .order("role")
        .order("feature_key");

      if (error) throw error;
      setPermissions((data as any) || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (role: AppRole, featureKey: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("permissions" as any)
        .update({ allowed: !currentValue })
        .eq("role", role)
        .eq("feature_key", featureKey);

      if (error) throw error;

      setPermissions((prev) =>
        prev.map((p) =>
          p.role === role && p.feature_key === featureKey
            ? { ...p, allowed: !currentValue }
            : p
        )
      );

      toast.success("Permission updated");
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    }
  };

  const getPermissionValue = (role: AppRole, featureKey: string): boolean => {
    const permission = permissions.find(
      (p) => p.role === role && p.feature_key === featureKey
    );
    return permission?.allowed ?? false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Configure which features each role can access. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {featureGroups.map((group) => (
              <div key={group.name} className="space-y-4">
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Feature</th>
                        {roles.map((role) => (
                          <th key={role.value} className="text-center p-2 font-medium">
                            {role.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.features.map((feature) => (
                        <tr key={feature.key} className="border-b">
                          <td className="p-2">
                            <Label>{feature.label}</Label>
                            {feature.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {feature.description}
                              </p>
                            )}
                          </td>
                          {roles.map((role) => (
                            <td key={role.value} className="text-center p-2">
                              <Switch
                                checked={getPermissionValue(role.value, feature.key)}
                                onCheckedChange={() =>
                                  togglePermission(
                                    role.value,
                                    feature.key,
                                    getPermissionValue(role.value, feature.key)
                                  )
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
