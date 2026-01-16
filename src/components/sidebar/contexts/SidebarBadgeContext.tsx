import React, { createContext, useContext } from "react";
import { usePendingCaseRequestsCount } from "@/hooks/usePendingCaseRequests";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarBadges {
  pendingCaseRequests: number;
}

const SidebarBadgeContext = createContext<SidebarBadges>({
  pendingCaseRequests: 0,
});

export function SidebarBadgeProvider({ children }: { children: React.ReactNode }) {
  const { hasPermission } = usePermissions();
  const canViewRequests = hasPermission("view_case_requests");
  
  // Only fetch count if user has permission to view case requests
  const pendingCount = usePendingCaseRequestsCount();

  const badges: SidebarBadges = {
    pendingCaseRequests: canViewRequests ? pendingCount : 0,
  };

  return (
    <SidebarBadgeContext.Provider value={badges}>
      {children}
    </SidebarBadgeContext.Provider>
  );
}

export function useSidebarBadges() {
  return useContext(SidebarBadgeContext);
}
