import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Briefcase, Users, Building2, LogOut, Shield, DollarSign, Settings, Calendar, FileText, Info, Wallet, Receipt } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { HelpFeedback } from "@/components/HelpFeedback";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/contexts/OrganizationContext";

const allMenuItems = [{
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
  title: "Cases",
  icon: Briefcase,
  url: "/cases",
  roles: ['admin', 'manager', 'investigator']
}, {
  title: "My Expenses",
  icon: DollarSign,
  url: "/expenses",
  roles: ['vendor', 'investigator']
}, {
  title: "Calendar",
  icon: Calendar,
  url: "/calendar",
  roles: ['admin', 'manager', 'investigator']
}, {
  title: "Retainers",
  icon: Wallet,
  url: "/finance",
  roles: ['admin', 'manager', 'investigator']
}, {
  title: "Expenses",
  icon: Receipt,
  url: "/all-expenses",
  roles: ['admin', 'manager', 'investigator']
}, {
  title: "Invoices",
  icon: FileText,
  url: "/all-invoices",
  roles: ['admin', 'manager']
}, {
  title: "Accounts",
  icon: Building2,
  url: "/accounts",
  roles: ['admin', 'manager', 'investigator']
}, {
  title: "Contacts",
  icon: Users,
  url: "/contacts",
  roles: ['admin', 'manager', 'investigator']
}];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    role,
    isVendor
  } = useUserRole();
  const { organization } = useOrganization();
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    email: string;
    role: string;
    avatar_url: string | null;
  } | null>(null);

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => !role || item.roles.includes(role));
  
  useEffect(() => {
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
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", organization.id)
          .maybeSingle();
        
        if (orgMember?.role) {
          displayRole = orgMember.role;
        }
      } else {
        // Fallback to user_roles if no organization context
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (userRole?.role) {
          displayRole = userRole.role;
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
  }, [organization?.id]);

  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sky-300 font-medium text-base">CaseWyze</h2>
            <p className="text-xs text-sidebar-foreground/60">Investigation Management</p>
          </div>
        </div>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {isVendor && (
          <div className="px-4 pt-2 pb-4">
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Limited Access - Vendor Account
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => navigate(item.url)} 
                    isActive={location.pathname === item.url} 
                    className="w-full"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-4">
        {/* Help & Feedback */}
        <HelpFeedback />
        
        {/* Settings and Sign Out buttons */}
        <div className="flex gap-2 rounded bg-transparent">
          <SidebarMenuButton onClick={() => navigate("/settings")} className="flex-1 justify-center">
            <Settings className="w-4 h-4" />
            <span className="sr-only">Settings</span>
          </SidebarMenuButton>
          <SidebarMenuButton onClick={handleSignOut} className="flex-1 justify-center">
            <LogOut className="w-4 h-4" />
            <span className="sr-only">Sign Out</span>
          </SidebarMenuButton>
        </div>

        {/* User Profile Section */}
        {userProfile && (
          <div 
            onClick={() => navigate("/profile")} 
            role="button" 
            tabIndex={0} 
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate("/profile");
              }
            }} 
            className="flex items-center gap-3 p-2 cursor-pointer transition-colors rounded-md bg-transparent"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile.avatar_url || ""} alt={userProfile.full_name || userProfile.email} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userProfile.full_name, userProfile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userProfile.full_name || userProfile.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                {userProfile.role}
              </p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
