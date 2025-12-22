import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface OrganizationSwitcherProps {
  open: boolean;
  onClose: () => void;
  onSelect: (orgId: string) => void;
  userId: string;
  currentOrgId?: string;
}

export function OrganizationSwitcher({ 
  open, 
  onClose, 
  onSelect, 
  userId,
  currentOrgId 
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>(currentOrgId || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchOrganizations();
    }
  }, [open, userId]);

  useEffect(() => {
    if (currentOrgId) {
      setSelectedOrg(currentOrgId);
    }
  }, [currentOrgId]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data: memberships, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", userId);

      if (memberError) {
        console.error("Error fetching memberships:", memberError);
        return;
      }

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        return;
      }

      // Fetch organization details for each membership
      const orgIds = memberships.map(m => m.organization_id);
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      if (orgError) {
        console.error("Error fetching organizations:", orgError);
        return;
      }

      // Combine org details with roles
      const orgsWithRoles = orgs?.map(org => {
        const membership = memberships.find(m => m.organization_id === org.id);
        return {
          id: org.id,
          name: org.name,
          role: membership?.role || "member"
        };
      }) || [];

      setOrganizations(orgsWithRoles);

      // Auto-select if only one org or if no current selection
      if (orgsWithRoles.length === 1) {
        setSelectedOrg(orgsWithRoles[0].id);
      } else if (!selectedOrg && orgsWithRoles.length > 0) {
        setSelectedOrg(orgsWithRoles[0].id);
      }
    } catch (error) {
      console.error("Error in fetchOrganizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedOrg) {
      onSelect(selectedOrg);
      onClose();
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      manager: "Manager",
      investigator: "Investigator",
      vendor: "Vendor",
      member: "Member"
    };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Organization
          </DialogTitle>
          <DialogDescription>
            You belong to multiple organizations. Please select which one you'd like to work in.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No organizations found.
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedOrg} onValueChange={setSelectedOrg}>
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedOrg === org.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedOrg(org.id)}
                >
                  <RadioGroupItem value={org.id} id={org.id} />
                  <Label
                    htmlFor={org.id}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {getRoleLabel(org.role)}
                      </p>
                    </div>
                    {selectedOrg === org.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={handleConfirm}
                disabled={!selectedOrg}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
