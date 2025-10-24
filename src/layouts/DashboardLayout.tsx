import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/ui/notification-center";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleBadge } from "@/components/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role } = useUserRole();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        setUserName(data?.full_name || user.email || 'User');
      }
    };
    fetchUserName();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full min-w-0">
          <header className="sticky top-0 z-10 border-b bg-card px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              {role && (
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{userName}</span>
                  </div>
                  <RoleBadge role={role} />
                </div>
              )}
              <NotificationCenter />
            </div>
          </header>
          <div className="flex-1 p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;