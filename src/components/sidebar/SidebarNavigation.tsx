import { useNavigate, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MenuGroup, UserRole } from "./types";

interface SidebarNavigationProps {
  menuGroups: MenuGroup[];
  userRole: UserRole | null;
}

export function SidebarNavigation({ menuGroups, userRole }: SidebarNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
                {visibleItems.map((item) => (
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
        );
      })}
    </>
  );
}
