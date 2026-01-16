import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { APP_VERSION } from "@/config/version";
import { useUserRole } from "@/hooks/useUserRole";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import {
  SidebarBranding,
  SidebarNavigation,
  VendorAlert,
  useSidebarData,
  menuGroups,
  UserRole,
} from "@/components/sidebar";

export function AppSidebar() {
  const { role, isVendor } = useUserRole();
  const { userProfile, orgSettings } = useSidebarData();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <SidebarBranding orgSettings={orgSettings} />
      </SidebarHeader>

      <SidebarContent>
        {isVendor && <VendorAlert />}
        <SidebarNavigation
          menuGroups={menuGroups}
          userRole={role as UserRole | null}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <UserProfileDropdown userProfile={userProfile} />
        <div className="text-xs text-muted-foreground text-center mt-2">
          v{APP_VERSION}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
