import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/ui/notification-center";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleBadge } from "@/components/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { HeaderProgressIndicator } from "@/components/ui/header-progress-indicator";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { useBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { HelpButton } from "@/components/help-center";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role } = useUserRole();
  const { items: breadcrumbItems } = useBreadcrumbs();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        setUserName(data?.full_name || user.email || 'User');
      }
    };
    fetchUserName();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <ImpersonationBanner />
          <header className="sticky top-0 z-10 border-b bg-card px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 relative">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <SidebarTrigger />
              {breadcrumbItems.length > 0 && (
                <BreadcrumbNav 
                  items={breadcrumbItems} 
                  className="hidden sm:flex" 
                  showHome={true}
                />
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {role && (
                <div className="hidden sm:flex items-center gap-3">
                  <RoleBadge role={role} />
                </div>
              )}
              <HelpButton />
              <NotificationCenter />
            </div>
            <HeaderProgressIndicator />
          </header>
          <div className="flex-1 p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
        <ScrollProgress />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;