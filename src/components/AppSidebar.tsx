import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Briefcase, Users, Building2, Shield, DollarSign, Calendar, FileText, Info, Wallet, Receipt, BarChart3, ClipboardList, ChevronDown, UserSearch, ListTodo, FileEdit, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useOrganization } from "@/contexts/OrganizationContext";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

// Regular menu items (non-collapsible)
const menuGroups = [{
  label: "Navigation",
  items: [{
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/dashboard",
    roles: ['admin', 'manager', 'investigator', 'vendor']
  }, {
    title: "My Cases",
    icon: FileText,
    url: "/cases",
    roles: ['vendor']
  }, {
    title: "Calendar",
    icon: Calendar,
    url: "/calendar",
    roles: ['admin', 'manager', 'investigator']
  }]
}, {
  label: "Finance",
  items: [{
    title: "Retainers",
    icon: Wallet,
    url: "/retainers",
    roles: ['admin', 'manager']
  }, {
    title: "My Expenses",
    icon: DollarSign,
    url: "/my-expenses",
    roles: ['vendor', 'investigator']
  }, {
    title: "Time Entries",
    icon: Clock,
    url: "/time-entries",
    roles: ['admin', 'manager']
  }, {
    title: "Expenses",
    icon: Receipt,
    url: "/expenses",
    roles: ['admin', 'manager']
  }, {
    title: "Invoices",
    icon: FileText,
    url: "/invoices",
    roles: ['admin', 'manager']
  }]
}, {
  label: "Clients",
  items: [{
    title: "Accounts",
    icon: Building2,
    url: "/accounts",
    roles: ['admin', 'manager']
  }, {
    title: "Contacts",
    icon: Users,
    url: "/contacts",
    roles: ['admin', 'manager']
  }]
}, {
  label: "Analytics & Reporting",
  items: [{
    title: "Reports",
    icon: ClipboardList,
    url: "/reports",
    roles: ['admin', 'manager']
  }, {
    title: "Analytics",
    icon: BarChart3,
    url: "/analytics",
    roles: ['admin', 'manager']
  }]
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    role,
    isVendor,
    loading: roleLoading
  } = useUserRole();
  const {
    organization,
    loading: orgLoading
  } = useOrganization();
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    email: string;
    role: string;
    avatar_url: string | null;
  } | null>(null);
  const [orgSettings, setOrgSettings] = useState<{
    logo_url: string | null;
    square_logo_url: string | null;
    company_name: string | null;
  } | null>(null);
  useEffect(() => {
    // CRITICAL: Wait for organization context to finish loading
    if (orgLoading) {
      return;
    }
    const fetchUserProfile = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name, email, avatar_url").eq("id", user.id).maybeSingle();

      // Get role from organization_members for the current organization
      let displayRole = "member";
      if (organization?.id) {
        const {
          data: orgMember
        } = await supabase.from("organization_members").select("role").eq("user_id", user.id).eq("organization_id", organization.id).maybeSingle();
        if (orgMember?.role) {
          displayRole = orgMember.role;
        }
      }
      setUserProfile({
        full_name: profile?.full_name || null,
        email: profile?.email || user.email || "",
        role: displayRole,
        avatar_url: profile?.avatar_url || null
      });
    };
    fetchUserProfile();
  }, [organization?.id, orgLoading]);

  // Fetch organization settings for logo
  useEffect(() => {
    if (orgLoading || !organization?.id) return;
    const fetchOrgSettings = async () => {
      const {
        data
      } = await supabase.from("organization_settings").select("logo_url, square_logo_url, company_name").eq("organization_id", organization.id).maybeSingle();
      setOrgSettings(data);
    };
    fetchOrgSettings();
  }, [organization?.id, orgLoading]);
  return <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          {orgSettings?.square_logo_url ? <>
              <img src={orgSettings.square_logo_url} alt={orgSettings.company_name || "Organization"} className="w-8 h-8 rounded-lg object-contain" />
              <div>
                <h2 className="font-medium text-base truncate max-w-[140px] text-neutral-50">
                  {orgSettings.company_name || "Organization"}
                </h2>
                <p className="text-xs text-sidebar-foreground/60">Case Management</p>
              </div>
            </> : orgSettings?.logo_url ? <>
              <img src={orgSettings.logo_url} alt={orgSettings.company_name || "Organization"} className="w-8 h-8 rounded-lg object-contain" />
              <div>
                <h2 className="text-sky-300 font-medium text-base truncate max-w-[140px]">
                  {orgSettings.company_name || "Organization"}
                </h2>
                <p className="text-xs text-sidebar-foreground/60">Case Management</p>
              </div>
            </> : <>
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sky-300 font-medium text-base">CaseWyze</h2>
                <p className="text-xs text-sidebar-foreground/60">Case Management</p>
              </div>
            </>}
        </div>
        
        {/* Organization Switcher - shown when user belongs to multiple orgs */}
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {isVendor && <div className="px-4 pt-2 pb-4">
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Limited Access - Vendor Account
              </AlertDescription>
            </Alert>
          </div>}
        
        {menuGroups.map(group => {
        const visibleItems = group.items.filter(item => !role || item.roles.includes(role));
        if (visibleItems.length === 0 && group.label !== "Navigation") return null;

        // For Navigation group, also check if Cases should be shown
        const showCasesMenu = group.label === "Navigation" && role && ['admin', 'manager', 'investigator'].includes(role);

        return <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Render regular menu items */}
                  {visibleItems.map(item => <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton onClick={() => navigate(item.url)} isActive={location.pathname === item.url} className="w-full">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
                  
                  {/* Render Cases collapsible menu for Navigation group */}
                  {showCasesMenu && (
                    <Collapsible 
                      defaultOpen={location.pathname.startsWith('/cases') || location.pathname === '/subjects' || location.pathname === '/tasks' || location.pathname === '/events' || location.pathname === '/updates'}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full">
                            <Briefcase className="w-4 h-4" />
                            <span>Cases</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton 
                                onClick={() => navigate('/cases')}
                                isActive={location.pathname === '/cases'}
                                className="cursor-pointer"
                              >
                                <Briefcase className="w-4 h-4" />
                                <span>All Cases</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton 
                                onClick={() => navigate('/subjects')}
                                isActive={location.pathname === '/subjects'}
                                className="cursor-pointer"
                              >
                                <UserSearch className="w-4 h-4" />
                                <span>Subjects</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton 
                                onClick={() => navigate('/tasks')}
                                isActive={location.pathname === '/tasks'}
                                className="cursor-pointer"
                              >
                                <ListTodo className="w-4 h-4" />
                                <span>Tasks</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton 
                                onClick={() => navigate('/events')}
                                isActive={location.pathname === '/events'}
                                className="cursor-pointer"
                              >
                                <Calendar className="w-4 h-4" />
                                <span>Events</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton 
                                onClick={() => navigate('/updates')}
                                isActive={location.pathname === '/updates'}
                                className="cursor-pointer"
                              >
                                <FileEdit className="w-4 h-4" />
                                <span>Updates</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>;
      })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <UserProfileDropdown userProfile={userProfile} />
      </SidebarFooter>
    </Sidebar>;
}