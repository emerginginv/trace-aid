import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, ShieldCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor' | 'owner' | 'member';

interface AccessGroup {
  id: string;
  name: string;
  description: string | null;
  require_validation: boolean;
  default_verification: boolean;
  refresh_last_update: boolean;
  include_in_documents: boolean;
  is_active: boolean;
}

const SYSTEM_ROLES: { value: AppRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'vendor', label: 'Vendor' },
];

export function AccessGroupsTab() {
  const { organization } = useOrganization();
  const { isAdmin } = useUserRole();
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
  const [groupRoles, setGroupRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    require_validation: false,
    default_verification: false,
    refresh_last_update: true,
    include_in_documents: true,
    selectedRoles: [] as AppRole[],
  });

  useEffect(() => {
    if (organization?.id) {
      fetchAccessGroups();
    }
  }, [organization?.id]);

  const fetchAccessGroups = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data: groups, error: groupsError } = await supabase
        .from("access_groups")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (groupsError) throw groupsError;

      const { data: roles, error: rolesError } = await supabase
        .from("access_group_roles")
        .select("access_group_id, role");

      if (rolesError) throw rolesError;

      const rolesMap: Record<string, AppRole[]> = {};
      roles?.forEach((r: any) => {
        if (!rolesMap[r.access_group_id]) rolesMap[r.access_group_id] = [];
        rolesMap[r.access_group_id].push(r.role as AppRole);
      });

      setAccessGroups((groups as any) || []);
      setGroupRoles(rolesMap);
    } catch (error) {
      console.error("Error fetching access groups:", error);
      toast.error("Failed to load access groups");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (group?: AccessGroup) => {
    if (group) {
      setEditingGroupId(group.id);
      setFormData({
        name: group.name,
        description: group.description || "",
        require_validation: group.require_validation,
        default_verification: group.default_verification,
        refresh_last_update: group.refresh_last_update,
        include_in_documents: group.include_in_documents,
        selectedRoles: groupRoles[group.id] || [],
      });
    } else {
      setEditingGroupId(null);
      setFormData({
        name: "",
        description: "",
        require_validation: false,
        default_verification: false,
        refresh_last_update: true,
        include_in_documents: true,
        selectedRoles: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (formData.selectedRoles.length === 0) {
      toast.error("At least one role must be selected");
      return;
    }

    setSaving(true);
    try {
      let groupId = editingGroupId;

      if (editingGroupId) {
        const { error } = await supabase
          .from("access_groups")
          .update({
            name: formData.name,
            description: formData.description,
            require_validation: formData.require_validation,
            default_verification: formData.default_verification,
            refresh_last_update: formData.refresh_last_update,
            include_in_documents: formData.include_in_documents,
          })
          .eq("id", editingGroupId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("access_groups")
          .insert({
            organization_id: organization!.id,
            name: formData.name,
            description: formData.description,
            require_validation: formData.require_validation,
            default_verification: formData.default_verification,
            refresh_last_update: formData.refresh_last_update,
            include_in_documents: formData.include_in_documents,
          })
          .select()
          .single();
        if (error) throw error;
        groupId = data.id;
      }

      // Sync roles
      if (groupId) {
        await supabase
          .from("access_group_roles")
          .delete()
          .eq("access_group_id", groupId);

        if (formData.selectedRoles.length > 0) {
          const { error } = await supabase
            .from("access_group_roles")
            .insert(
              formData.selectedRoles.map(role => ({
                access_group_id: groupId,
                role
              })) as any
            );
          if (error) throw error;
        }
      }

      toast.success(`Access group ${editingGroupId ? "updated" : "created"} successfully`);
      setIsDialogOpen(false);
      fetchAccessGroups();
    } catch (error) {
      console.error("Error saving access group:", error);
      toast.error("Failed to save access group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this access group? This will reset visibility for any content using this group.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("access_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Access group deleted");
      fetchAccessGroups();
    } catch (error) {
      console.error("Error deleting access group:", error);
      toast.error("Failed to delete access group");
    }
  };

  const toggleRole = (role: AppRole) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
    }));
  };

  if (loading && accessGroups.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Access Groups
            </CardTitle>
            <CardDescription>
              Manage visibility containers for case updates, files, and other case content.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} disabled={!isAdmin}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-center">Validation</TableHead>
                <TableHead className="text-center">Refresh</TableHead>
                <TableHead className="text-center">Docs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No access groups defined yet.
                  </TableCell>
                </TableRow>
              ) : (
                accessGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      <div>{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {group.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {groupRoles[group.id]?.map((role) => (
                          <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {SYSTEM_ROLES.find(r => r.value === role)?.label || role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={group.require_validation ? "warning" : "success"} className="text-[10px]">
                        {group.require_validation ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {group.refresh_last_update ? (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">Enabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {group.include_in_documents ? (
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(group)} disabled={!isAdmin}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)} disabled={!isAdmin}>
                          <Trash2 className="h-4 w-4 text-destructive/70" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroupId ? "Edit" : "Create"} Access Group</DialogTitle>
            <DialogDescription>
              Configure the visibility and behavior rules for this access group.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Client Access, Internal Only"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
              <Textarea
                id="notes"
                className="col-span-3"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Explanatory notes about this group..."
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Require Validation?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          If enabled, case updates created with this access group will require manual validation.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <RadioGroup 
                  value={formData.require_validation ? "yes" : "no"}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, require_validation: val === "yes" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="rv-yes" />
                    <Label htmlFor="rv-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="rv-no" />
                    <Label htmlFor="rv-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Default Verification?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          If enabled, the option to enable identity verification for link access is pre-selected.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <RadioGroup 
                  value={formData.default_verification ? "yes" : "no"}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, default_verification: val === "yes" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="dv-yes" />
                    <Label htmlFor="dv-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="dv-no" />
                    <Label htmlFor="dv-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Refresh "Last Update"?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          When enabled, the system will refresh the "Last Update" date, indicating a substantive update.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <RadioGroup 
                  value={formData.refresh_last_update ? "yes" : "no"}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, refresh_last_update: val === "yes" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="rlu-yes" />
                    <Label htmlFor="rlu-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="rlu-no" />
                    <Label htmlFor="rlu-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Include in Documents?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          If enabled, updates can be included in generated documents via variables.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <RadioGroup 
                  value={formData.include_in_documents ? "yes" : "no"}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, include_in_documents: val === "yes" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="iid-yes" />
                    <Label htmlFor="iid-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="iid-no" />
                    <Label htmlFor="iid-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base">* Limit Access To</Label>
              <div className="grid grid-cols-2 gap-4 border rounded-md p-4 bg-muted/30">
                {SYSTEM_ROLES.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`role-${role.value}`} 
                      checked={formData.selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <Label htmlFor={`role-${role.value}`} className="font-normal cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Name and at least one role must be selected.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingGroupId ? "Update Group" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
