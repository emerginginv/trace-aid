import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Building2, TrendingUp, CheckCircle2, Calendar, Bell, DollarSign, LayoutDashboard } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import VendorDashboard from "./VendorDashboard";
const Dashboard = () => {
  const { isVendor, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState({
    totalCases: 0,
    openCases: 0,
    closedCases: 0,
    totalAccounts: 0,
    pendingTasks: 0,
    upcomingEvents: 0,
    recentUpdates: 0,
    totalExpenses: 0
  });
  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all counts in parallel
      const [
        casesResult,
        accountsResult,
        allCasesData,
        statusPicklistsData,
        pendingTasksResult,
        upcomingEventsResult,
        recentUpdatesResult,
        totalExpensesResult
      ] = await Promise.all([
        supabase.from("cases").select("*", { count: "exact", head: true }),
        supabase.from("accounts").select("*", { count: "exact", head: true }),
        supabase.from("cases").select("status"),
        supabase.from("picklists").select("value, status_type").eq("type", "case_status").eq("is_active", true),
        supabase.from("case_activities").select("*", { count: "exact", head: true }).eq("activity_type", "task").eq("completed", false),
        supabase.from("case_activities").select("*", { count: "exact", head: true }).eq("activity_type", "event").not("due_date", "is", null).gte("due_date", new Date().toISOString().split('T')[0]),
        supabase.from("case_updates").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("case_finances").select("*", { count: "exact", head: true }).eq("finance_type", "expense")
      ]);

      // Calculate open vs closed cases
      let openCasesCount = 0;
      let closedCasesCount = 0;
      if (allCasesData.data && statusPicklistsData.data) {
        allCasesData.data.forEach((caseItem) => {
          const statusPicklist = statusPicklistsData.data.find((s) => s.value === caseItem.status);
          if (statusPicklist?.status_type === "open") {
            openCasesCount++;
          } else if (statusPicklist?.status_type === "closed") {
            closedCasesCount++;
          }
        });
      }

      setStats({
        totalCases: casesResult.count || 0,
        openCases: openCasesCount,
        closedCases: closedCasesCount,
        totalAccounts: accountsResult.count || 0,
        pendingTasks: pendingTasksResult.count || 0,
        upcomingEvents: upcomingEventsResult.count || 0,
        recentUpdates: recentUpdatesResult.count || 0,
        totalExpenses: totalExpensesResult.count || 0
      });
    };
    fetchDashboardData();
  }, []);
  const statCards = [
    {
      title: "Open Cases",
      value: stats.openCases,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Closed Cases",
      value: stats.closedCases,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Total Cases",
      value: stats.totalCases,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      title: "Accounts",
      value: stats.totalAccounts,
      icon: Building2,
      color: "text-accent",
      bgColor: "bg-accent/10"
    }
  ];

  const activityCards = [
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      title: "Recent Updates",
      subtitle: "Last 7 days",
      value: stats.recentUpdates,
      icon: Bell,
      color: "text-info",
      bgColor: "bg-info/10"
    },
    {
      title: "Total Expenses",
      value: stats.totalExpenses,
      icon: DollarSign,
      color: "text-warning",
      bgColor: "bg-warning/10"
    }
  ];
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVendor) {
    return <VendorDashboard />;
  }
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your organization.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>Cases</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Activities</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="group hover-lift border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.bgColor} p-2.5 rounded-lg transition-transform group-hover:scale-110`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.slice(0, 3).map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.bgColor} p-2.5 rounded-lg`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activityCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      {stat.subtitle && (
                        <p className="text-xs text-muted-foreground/70 mt-1">{stat.subtitle}</p>
                      )}
                    </div>
                    <div className={`${stat.bgColor} p-2.5 rounded-lg`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;