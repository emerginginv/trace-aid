import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  LogOut,
  Shield,
  DollarSign,
  Settings,
  Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Cases", icon: Briefcase, url: "/cases" },
  { title: "Calendar", icon: Calendar, url: "/calendar" },
  { title: "Finance", icon: DollarSign, url: "/finance" },
  { title: "Accounts", icon: Building2, url: "/accounts" },
  { title: "Contacts", icon: Users, url: "/contacts" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserProfile({
        full_name: profile?.full_name || null,
        email: profile?.email || user.email || "",
        role: userRole?.role || "User",
      });
    };

    fetchUserProfile();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">PI Case Manager</h2>
            <p className="text-xs text-sidebar-foreground/60">Professional Tools</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
        {/* Settings and Sign Out buttons */}
        <div className="flex gap-2">
          <SidebarMenuButton
            onClick={() => navigate("/settings")}
            className="flex-1 justify-center"
          >
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
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" alt={userProfile.full_name || userProfile.email} />
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