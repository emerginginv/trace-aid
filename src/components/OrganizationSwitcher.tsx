import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from "sonner";

interface UserOrganization {
  id: string;
  name: string;
  subdomain: string | null;
  logo_url: string | null;
  is_current: boolean;
  primary_domain: string | null;
}

export function OrganizationSwitcher() {
  const { organization } = useOrganization();
  const { tenantSubdomain, isCustomDomain } = useTenant();
  const [userOrgs, setUserOrgs] = useState<UserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmSwitch, setConfirmSwitch] = useState<UserOrganization | null>(null);

  useEffect(() => {
    const fetchUserOrganizations = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_organizations');
        
        if (error) {
          console.error("[OrgSwitcher] Error fetching organizations:", error);
          return;
        }

        setUserOrgs(data || []);
      } catch (err) {
        console.error("[OrgSwitcher] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrganizations();
  }, [organization?.id]);

  // Don't show switcher if user only belongs to one org
  if (userOrgs.length <= 1) {
    return null;
  }

  const handleOrgSelect = (org: UserOrganization) => {
    // Don't switch if already on this org
    if (org.id === organization?.id) {
      return;
    }

    // Show confirmation dialog
    setConfirmSwitch(org);
  };

  const handleConfirmSwitch = () => {
    if (!confirmSwitch) return;

    // Log audit event locally
    console.log("[OrgSwitcher] [AUDIT] ORG_SWITCHED:", {
      from: organization?.id,
      to: confirmSwitch.id,
      domain: confirmSwitch.primary_domain
    });

    // Determine target URL
    let targetUrl: string;
    
    if (confirmSwitch.primary_domain) {
      // Use the primary domain (either custom domain or subdomain.casewyze.com)
      const protocol = window.location.protocol;
      targetUrl = `${protocol}//${confirmSwitch.primary_domain}/dashboard`;
    } else if (confirmSwitch.subdomain) {
      // Fallback to subdomain construction
      const protocol = window.location.protocol;
      targetUrl = `${protocol}//${confirmSwitch.subdomain}.casewyze.com/dashboard`;
    } else {
      toast.error("Unable to switch - organization has no configured domain");
      setConfirmSwitch(null);
      return;
    }

    toast.info(`Switching to ${confirmSwitch.name}...`);
    
    // Perform hard redirect - NEVER mutate OrganizationContext in place
    window.location.href = targetUrl;
  };

  const getOrgInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between px-2 h-auto py-2 hover:bg-sidebar-accent"
          >
            <div className="flex items-center gap-2 min-w-0">
              {organization?.logo_url ? (
                <Avatar className="h-6 w-6 rounded">
                  <AvatarImage src={organization.logo_url} />
                  <AvatarFallback className="rounded bg-primary/10 text-primary text-xs">
                    {getOrgInitials(organization.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <span className="text-xs font-medium truncate text-sidebar-foreground/70">
                {userOrgs.length} organizations
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Organization
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {userOrgs.map((org) => {
            const isCurrent = org.id === organization?.id;
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleOrgSelect(org)}
                className="cursor-pointer"
                disabled={isCurrent}
              >
                <div className="flex items-center gap-3 w-full">
                  {org.logo_url ? (
                    <Avatar className="h-8 w-8 rounded">
                      <AvatarImage src={org.logo_url} />
                      <AvatarFallback className="rounded bg-muted text-xs">
                        {getOrgInitials(org.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {org.subdomain ? `${org.subdomain}.casewyze.com` : "No subdomain"}
                    </p>
                  </div>
                  {isCurrent ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmSwitch} onOpenChange={() => setConfirmSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to <strong>{confirmSwitch?.name}</strong> at{" "}
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {confirmSwitch?.primary_domain || confirmSwitch?.subdomain + ".casewyze.com"}
              </span>
              . Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              Switch Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}