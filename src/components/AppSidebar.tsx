import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
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
      <SidebarHeader className="border-b border-sidebar-border p-4 space-y-3">
        <SidebarBranding orgSettings={orgSettings} />
        <OrganizationSwitcher />
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
      </SidebarFooter>
    </Sidebar>
  );
}
