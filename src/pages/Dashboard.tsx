import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Building2, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    totalContacts: 0,
    totalAccounts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [casesResult, contactsResult, accountsResult] = await Promise.all([
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      const activeCasesResult = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "open");

      setStats({
        totalCases: casesResult.count || 0,
        activeCases: activeCasesResult.count || 0,
        totalContacts: contactsResult.count || 0,
        totalAccounts: accountsResult.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Active Cases",
      value: stats.activeCases,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Cases",
      value: stats.totalCases,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Accounts",
      value: stats.totalAccounts,
      icon: Building2,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Contacts",
      value: stats.totalContacts,
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your investigations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Actions</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create your first case from the Cases page</li>
              <li>Add accounts and contacts to manage your clients</li>
              <li>Track case progress with updates and activities</li>
              <li>Monitor your investigation workflow</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;