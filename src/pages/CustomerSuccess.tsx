import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { 
  Users, AlertTriangle, CheckCircle, XCircle, 
  TrendingUp, Calendar, Shield, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSuccessOverview {
  summary: {
    total_organizations: number;
    healthy: number;
    watch: number;
    at_risk: number;
    total_sla_breaches: number;
  };
  at_risk_orgs: Array<{
    id: string;
    name: string;
    plan: string;
    risk_level: string;
    risk_factors: string[];
    active_users: number;
    sla_breaches: number;
  }>;
  upcoming_renewals: Array<{
    org_id: string;
    org_name: string;
    contract_title: string;
    expiration_date: string;
    days_until_expiry: number;
  }>;
  recent_breaches: Array<{
    id: string;
    org_id: string;
    org_name: string;
    metric: string;
    measured_value: number;
    target_value: number;
    created_at: string;
    resolved: boolean;
  }>;
}

const riskColors: Record<string, string> = {
  healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  watch: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  at_risk: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const metricLabels: Record<string, string> = {
  availability: "Availability",
  response_time: "Response Time",
  support_response: "Support Response",
};

export default function CustomerSuccess() {
  useSetBreadcrumbs([
    { label: "Platform", href: "/platform-security" },
    { label: "Customer Success" }
  ]);

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ["customer-success-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_customer_success_overview");
      if (error) throw error;
      return data as unknown as CustomerSuccessOverview;
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Success</h1>
          <p className="text-muted-foreground">
            Monitor customer health, SLA performance, and renewal risks
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Organizations</p>
                <p className="text-3xl font-bold">{overview?.summary.total_organizations || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy</p>
                <p className="text-3xl font-bold text-green-600">{overview?.summary.healthy || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-3xl font-bold text-red-600">
                  {(overview?.summary.at_risk || 0) + (overview?.summary.watch || 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Breaches (90d)</p>
                <p className="text-3xl font-bold">{overview?.summary.total_sla_breaches || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-Risk Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              At-Risk Organizations
            </CardTitle>
            <CardDescription>
              Organizations requiring attention based on health signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!overview?.at_risk_orgs || overview.at_risk_orgs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-5 w-5 mr-2" />
                All organizations are healthy
              </div>
            ) : (
              <div className="space-y-3">
                {overview.at_risk_orgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{org.name}</span>
                        <Badge className={cn("text-xs", riskColors[org.risk_level])}>
                          {org.risk_level.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{org.active_users} active users</span>
                        <span>{org.sla_breaches} SLA breaches</span>
                      </div>
                      {org.risk_factors && org.risk_factors.length > 0 && (
                        <p className="text-xs text-destructive">
                          {org.risk_factors.join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {org.plan}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Renewals
            </CardTitle>
            <CardDescription>
              Contracts expiring in the next 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!overview?.upcoming_renewals || overview.upcoming_renewals.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No upcoming renewals
              </div>
            ) : (
              <div className="space-y-3">
                {overview.upcoming_renewals.map((renewal, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <span className="font-medium">{renewal.org_name}</span>
                      <p className="text-sm text-muted-foreground">{renewal.contract_title}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={renewal.days_until_expiry <= 30 ? "destructive" : "secondary"}
                      >
                        {renewal.days_until_expiry} days
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(renewal.expiration_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Recent SLA Breaches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Recent SLA Breaches
          </CardTitle>
          <CardDescription>
            SLA violations across all organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!overview?.recent_breaches || overview.recent_breaches.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-5 w-5 mr-2" />
              No recent SLA breaches
            </div>
          ) : (
            <div className="space-y-3">
              {overview.recent_breaches.map((breach) => (
                <div
                  key={breach.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{breach.org_name}</span>
                      <Badge variant={breach.resolved ? "secondary" : "destructive"}>
                        {breach.resolved ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {metricLabels[breach.metric] || breach.metric}: {breach.measured_value}% (Target: {breach.target_value}%)
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(breach.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}