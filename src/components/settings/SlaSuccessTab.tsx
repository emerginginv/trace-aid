import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useEntitlements } from "@/hooks/use-entitlements";
import { isEnterprisePlan } from "@/lib/planDetection";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Shield, CheckCircle, AlertTriangle, XCircle, 
  TrendingUp, Users, FolderOpen, Lock, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlaList } from "./SlaList";

// Updated interface to match the corrected RPC function response
interface SlaSummary {
  slas: Array<{
    id: string;
    name: string;
    metric: string;
    target_value: number;
    measurement_period: string;
    is_active: boolean;
    latest_measurement: {
      measured_value: number;
      is_met: boolean;
      measured_at: string;
    } | null;
  }>;
  recent_breaches: Array<{
    id: string;
    sla_id: string;
    metric: string;
    target_value: number;
    actual_value: number;
    breach_start: string;
    breach_end: string | null;
    resolved: boolean;
    created_at: string;
  }>;
  account_health: {
    risk_level: string;
    active_users_count: number;
    cases_created: number;
    feature_adoption_score: number;
  } | null;
}

// Helper to format target values with correct units
const formatTargetValue = (metric: string, value: number): string => {
  switch (metric) {
    case "availability":
      return `${value}%`;
    case "response_time":
      return `${value}ms`;
    case "support_response":
      return `${value}hrs`;
    default:
      return `${value}`;
  }
};

const metricLabels: Record<string, string> = {
  availability: "System Availability",
  response_time: "Response Time",
  support_response: "Support Response Time",
};

const riskColors: Record<string, string> = {
  healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  watch: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  at_risk: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const riskIcons: Record<string, React.ReactNode> = {
  healthy: <CheckCircle className="h-4 w-4" />,
  watch: <AlertTriangle className="h-4 w-4" />,
  at_risk: <XCircle className="h-4 w-4" />,
};

export function SlaSuccessTab() {
  const { organization } = useOrganization();
  const { entitlements } = useEntitlements();
  const { isAdmin, isManager } = useUserRole();
  
  // Check enterprise status via entitlements (includes trial awareness) or fallback to org tier
  const isEnterprise = isEnterprisePlan(
    entitlements?.subscription_tier,
    entitlements?.subscription_product_id
  ) || isEnterprisePlan(organization?.subscription_tier, organization?.subscription_product_id);
  
  // Allow admins and managers to configure SLAs
  const canManageSlas = isAdmin || isManager;

  const { data: summary, isLoading } = useQuery({
    queryKey: ["sla-summary", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const { data, error } = await supabase.rpc("get_organization_sla_summary", {
        p_organization_id: organization.id,
      });
      if (error) throw error;
      return data as unknown as SlaSummary;
    },
    enabled: !!organization?.id && isEnterprise,
  });

  if (!isEnterprise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            SLA & Customer Success
          </CardTitle>
          <CardDescription>
            Track SLA performance and usage metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              SLA tracking and success metrics are available on the Enterprise plan.
              Upgrade to access contractual SLA monitoring, breach tracking, and usage insights.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA & Success Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SLA Configuration - Admin/Manager only */}
      {canManageSlas && <SlaList />}
      
      {/* Health Overview */}
      {summary?.account_health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Account Health
            </CardTitle>
            <CardDescription>
              Overview of your organization's platform health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Badge className={cn("text-sm px-3 py-1", riskColors[summary.account_health.risk_level] || riskColors.healthy)}>
                {riskIcons[summary.account_health.risk_level] || riskIcons.healthy}
                <span className="ml-1 capitalize">{(summary.account_health.risk_level || "healthy").replace("_", " ")}</span>
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.account_health.active_users_count}</p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-full bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.account_health.cases_created}</p>
                  <p className="text-xs text-muted-foreground">Cases Created</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(summary.account_health.feature_adoption_score || 0)}%</p>
                  <p className="text-xs text-muted-foreground">Feature Adoption</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SLA Performance & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SLA Performance & Status
          </CardTitle>
          <CardDescription>
            Current performance against your configured SLAs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!summary?.slas || summary.slas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {canManageSlas 
                ? "Configure SLAs above to start tracking performance."
                : "No SLAs configured yet. Contact your administrator to set up SLA monitoring."}
            </p>
          ) : (
            <div className="space-y-4">
              {summary.slas.map((sla) => (
                <div
                  key={sla.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sla.name || metricLabels[sla.metric] || sla.metric}</span>
                      {sla.latest_measurement && (
                        <Badge
                          variant={sla.latest_measurement.is_met ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {sla.latest_measurement.is_met ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {sla.latest_measurement.is_met ? "Met" : "Breached"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Target: {formatTargetValue(sla.metric, sla.target_value)} • {sla.measurement_period}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {sla.latest_measurement ? (
                      <>
                        <p className="text-2xl font-bold">
                          {formatTargetValue(sla.metric, sla.latest_measurement.measured_value)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last measured {format(new Date(sla.latest_measurement.measured_at), "MMM d")}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No measurements yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Breaches */}
      {summary?.recent_breaches && summary.recent_breaches.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Recent SLA Breaches
              </CardTitle>
              <CardDescription>
                SLA violations and their resolution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.recent_breaches.map((breach) => (
                  <div
                    key={breach.id}
                    className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{metricLabels[breach.metric] || breach.metric}</span>
                      <Badge variant={breach.resolved ? "secondary" : "destructive"}>
                        {breach.resolved ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Measured: {formatTargetValue(breach.metric, breach.actual_value)} (Target: {formatTargetValue(breach.metric, breach.target_value)})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started: {format(new Date(breach.breach_start), "MMM d, yyyy")}
                      {breach.breach_end && ` - Ended: ${format(new Date(breach.breach_end), "MMM d, yyyy")}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}