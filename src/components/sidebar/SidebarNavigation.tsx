import { useNavigate, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { MenuGroup, UserRole } from "./types";
import { useSidebarBadges } from "./contexts/SidebarBadgeContext";

interface SidebarNavigationProps {
  menuGroups: MenuGroup[];
  userRole: UserRole | null;
}

export function SidebarNavigation({ menuGroups, userRole }: SidebarNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const badges = useSidebarBadges();

  return (
    <>
      {menuGroups.map((group) => {
        const visibleItems = group.items.filter(
          (item) => !userRole || item.roles.includes(userRole)
        );

        if (visibleItems.length === 0 && group.label !== "Navigation") {
          return null;
        }

        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  // Get badge count from context if item has a badgeKey
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.url)}
                        isActive={location.pathname === item.url}
                        className="w-full"
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {badgeCount > 0 && (
                        <SidebarMenuBadge className="bg-amber-500 text-white">
                          {badgeCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}
