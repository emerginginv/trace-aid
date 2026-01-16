import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { APP_VERSION, GIT_COMMIT, BUILD_TIME } from "@/config/version";
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
import { SidebarBadgeProvider } from "@/components/sidebar/contexts/SidebarBadgeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar() {
  const { role, isVendor } = useUserRole();
  const { userProfile, orgSettings, settingsLoading } = useSidebarData();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <SidebarBranding orgSettings={orgSettings} isLoading={settingsLoading} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarBadgeProvider>
          {isVendor && <VendorAlert />}
          <SidebarNavigation
            menuGroups={menuGroups}
            userRole={role as UserRole | null}
          />
        </SidebarBadgeProvider>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <UserProfileDropdown userProfile={userProfile} />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-xs text-muted-foreground text-center mt-2 cursor-help">
              v{APP_VERSION}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <div>Build: {BUILD_TIME}</div>
              <div>Commit: {GIT_COMMIT === 'local' || GIT_COMMIT === 'local-dev' ? GIT_COMMIT : GIT_COMMIT.slice(0, 7)}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
}
