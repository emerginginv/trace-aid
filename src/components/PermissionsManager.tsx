import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Shield } from "lucide-react";
import { DelayedTooltip, HelpTooltip } from "@/components/ui/tooltip";
import { SecurityNote } from "@/components/shared/SecurityNote";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor' | 'owner' | 'member';

type Permission = {
  id: string;
  role: AppRole;
  feature_key: string;
  allowed: boolean;
};

type FeatureGroup = {
  name: string;
  helpText?: string;
  features: Array<{
    key: string;
    label: string;
    description?: string;
  }>;
};

const featureGroups: FeatureGroup[] = [
  {
    name: "Cases",
    helpText: "Controls who can create, view, edit, and close cases. View permission is required for all other case actions.",
    features: [
      { key: "view_cases", label: "View Cases" },
      { key: "add_cases", label: "Add Cases" },
      { key: "edit_cases", label: "Edit Cases" },
      { key: "delete_cases", label: "Delete Cases" },
    ],
  },
  {
    name: "Case Requests",
    helpText: "Manage incoming case requests from clients. Approval permission allows converting requests to active cases.",
    features: [
      { key: "view_case_requests", label: "View Case Requests", description: "View submitted case requests" },
      { key: "approve_case_requests", label: "Approve/Decline Requests", description: "Accept or decline case requests" },
      { key: "delete_case_requests", label: "Delete Case Requests", description: "Permanently delete case requests" },
      { key: "manage_case_request_forms", label: "Manage Request Forms", description: "Create and configure public intake forms" },
    ],
  },
  {
    name: "Activities",
    helpText: "Activities track scheduled work like surveillance, interviews, and appointments.",
    features: [
      { key: "view_activities", label: "View Activities" },
      { key: "add_activities", label: "Add Activities" },
      { key: "edit_activities", label: "Edit Activities" },
      { key: "delete_activities", label: "Delete Activities" },
    ],
  },
  {
    name: "Attachments",
    helpText: "Files and documents attached to cases. May contain sensitive evidence or legal documents.",
    features: [
      { key: "view_attachments", label: "View Attachments" },
      { key: "add_attachments", label: "Add Attachments" },
      { key: "edit_attachments", label: "Edit Attachments" },
      { key: "delete_attachments", label: "Delete Attachments" },
    ],
  },
  {
    name: "Subjects",
    helpText: "Subject data includes personal information like SSNs and addresses. Restricting view access hides subject details entirely.",
    features: [
      { key: "view_subjects", label: "View Subjects" },
      { key: "add_subjects", label: "Add Subjects" },
      { key: "edit_subjects", label: "Edit Subjects" },
      { key: "delete_subjects", label: "Delete Subjects" },
    ],
  },
  {
    name: "Updates",
    helpText: "Case updates document investigation progress. Edit/delete permissions can be scoped to 'own' entries only for investigators.",
    features: [
      { key: "view_updates", label: "View Updates" },
      { key: "add_updates", label: "Add Updates" },
      { key: "edit_updates", label: "Edit All Updates", description: "Edit any update in the organization" },
      { key: "edit_own_updates", label: "Edit Own Updates", description: "Edit updates you created" },
      { key: "delete_updates", label: "Delete All Updates", description: "Delete any update in the organization" },
      { key: "delete_own_updates", label: "Delete Own Updates", description: "Delete updates you created" },
    ],
  },
  {
    name: "Contacts",
    helpText: "Client contacts and representatives. May include privileged communication details.",
    features: [
      { key: "view_contacts", label: "View Contacts" },
      { key: "add_contacts", label: "Add Contacts" },
      { key: "edit_contacts", label: "Edit Contacts" },
      { key: "delete_contacts", label: "Delete Contacts" },
    ],
  },
  {
    name: "Accounts",
    helpText: "Client accounts and organizations. Contains billing relationships and contract information.",
    features: [
      { key: "view_accounts", label: "View Accounts" },
      { key: "add_accounts", label: "Add Accounts" },
      { key: "edit_accounts", label: "Edit Accounts" },
      { key: "delete_accounts", label: "Delete Accounts" },
    ],
  },
  {
    name: "Finances",
    helpText: "Financial access includes time entries, expenses, and invoices. Billing rates are always restricted to Admin/Manager.",
    features: [
      { key: "view_finances", label: "View Finances" },
      { key: "add_finances", label: "Add Finances" },
      { key: "edit_finances", label: "Edit Finances" },
      { key: "delete_finances", label: "Delete Finances" },
    ],
  },
  {
    name: "Reports & Calendar",
    helpText: "Reports are client-facing deliverables. Calendar shows scheduled activities.",
    features: [
      { key: "view_reports", label: "View Reports" },
      { key: "view_calendar", label: "View Calendar" },
    ],
  },
  {
    name: "Administration",
    helpText: "Admin-only features for user management, permissions, and organization settings. These permissions cannot be delegated to non-admin roles.",
    features: [
      { key: "manage_users", label: "Manage Users" },
      { key: "manage_permissions", label: "Manage Permissions" },
      { key: "view_billing", label: "View Billing" },
    ],
  },
  {
    name: "Notifications",
    helpText: "System notifications about case updates, assignments, and deadlines.",
    features: [
      { key: "view_notifications", label: "View Notifications" },
    ],
  },
];

// Role definitions with tooltips explaining each role's scope
const roles: Array<{ value: AppRole; label: string; tooltip: string; isLocked?: boolean }> = [
  {
    value: "owner",
    label: "Owner",
    tooltip: "Highest level of access. Owner permissions are locked for security.",
    isLocked: true,
  },
  {
    value: "admin",
    label: "Admin",
    tooltip: "Application management and oversight. Admin permissions are locked for security.",
    isLocked: true,
  },
  { 
    value: "manager", 
    label: "Manager", 
    tooltip: "Case oversight and client management. Cannot modify user permissions.",
  },
  { 
    value: "investigator", 
    label: "Investigator", 
    tooltip: "Fieldwork and case documentation. Financial data visibility is restricted.",
  },
  { 
    value: "vendor", 
    label: "Vendor", 
    tooltip: "External contractor. Limited to assigned cases with restricted client data visibility.",
  },
];

export function PermissionsManager() {
  const { organization } = useOrganization();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchPermissions();
    }
  }, [organization?.id]);

  const fetchPermissions = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("permissions" as any)
        .select("*")
        .eq("organization_id", organization.id)
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
    if (!organization?.id) {
      toast.error("No organization selected");
      return;
    }

    try {
      const newAllowed = !currentValue;
      const { data, error } = await supabase
        .from("permissions" as any)
        .upsert({ 
          organization_id: organization.id,
          role, 
          feature_key: featureKey, 
          allowed: newAllowed 
        }, {
          onConflict: 'organization_id,role,feature_key'
        })
        .select()
        .single();

      if (error) throw error;

      setPermissions((prev) => {
        const index = prev.findIndex(p => p.role === role && p.feature_key === featureKey);
        if (index >= 0) {
          const newState = [...prev];
          newState[index] = data as any;
          return newState;
        } else {
          return [...prev, data as any];
        }
      });

      toast.success("Permission updated");
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    }
  };

  const getPermissionValue = (role: AppRole, featureKey: string): boolean => {
    // Admins and Owners always have full access in the UI logic too
    if (role === 'admin' || role === 'owner') return true;

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
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>
            Configure which features each role can access. Changes take effect immediately for all users with that role.
          </CardDescription>
          <SecurityNote 
            message="Permission changes are logged for audit compliance" 
            variant="audit-logged" 
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {featureGroups.map((group) => (
              <div key={group.name} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{group.name}</h3>
                  {group.helpText && (
                    <HelpTooltip content={group.helpText} side="right" />
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Feature</th>
                        {roles.map((role) => (
                          <th key={role.value} className="text-center p-2 font-medium">
                            <DelayedTooltip content={role.tooltip} side="top">
                              <span className="inline-flex items-center gap-1 cursor-help">
                                {role.label}
                                {role.isLocked && (
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                )}
                              </span>
                            </DelayedTooltip>
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
                              <DelayedTooltip 
                                content={
                                  role.isLocked 
                                    ? "Admin permissions cannot be modified for security" 
                                    : `Toggle ${feature.label} for ${role.label}`
                                }
                                side="top"
                              >
                                <span>
                                  <Switch
                                    checked={getPermissionValue(role.value, feature.key)}
                                    onCheckedChange={() =>
                                      togglePermission(
                                        role.value,
                                        feature.key,
                                        getPermissionValue(role.value, feature.key)
                                      )
                                    }
                                    disabled={role.isLocked}
                                  />
                                </span>
                              </DelayedTooltip>
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
