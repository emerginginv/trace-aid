import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  Bell,
  Clock,
  ExternalLink
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface ServiceComponent {
  id: string;
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  updated_at: string;
}

interface IncidentUpdate {
  id: string;
  message: string;
  status_snapshot: string;
  posted_at: string;
}

interface Incident {
  id: string;
  title: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  summary: string;
  started_at: string;
  resolved_at?: string;
  affected_components: string[];
  updates?: IncidentUpdate[];
}

interface StatusData {
  overall_status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  components: ServiceComponent[];
  active_incidents: Incident[];
  recent_incidents: Incident[];
  last_updated: string;
}

const statusConfig = {
  operational: {
    label: "All Systems Operational",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    badgeVariant: "default" as const
  },
  degraded: {
    label: "Degraded Performance",
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    badgeVariant: "secondary" as const
  },
  partial_outage: {
    label: "Partial Outage",
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    badgeVariant: "secondary" as const
  },
  major_outage: {
    label: "Major Outage",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    badgeVariant: "destructive" as const
  }
};

const severityColors = {
  minor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
};

const incidentStatusLabels = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved"
};

export default function StatusPage() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['status-page'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_status_page_data');
      if (error) throw error;
      return data as unknown as StatusData;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    try {
      const { data, error } = await supabase.rpc('subscribe_to_status', {
        p_email: email
      });
      
      if (error) throw error;
      
      toast.success("Subscribed! You'll receive updates about service status.");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe");
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading status...</div>
      </div>
    );
  }

  const overallStatus = statusData?.overall_status || 'operational';
  const StatusIcon = statusConfig[overallStatus].icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
                CaseWyze
              </Link>
              <p className="text-muted-foreground text-sm mt-1">System Status</p>
            </div>
            <Link to="/trust" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              Trust Center <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Overall Status Banner */}
        <Card className={`${statusConfig[overallStatus].bgColor} border-0`}>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-3">
              <StatusIcon className={`h-10 w-10 ${statusConfig[overallStatus].color}`} />
              <h1 className={`text-2xl font-bold ${statusConfig[overallStatus].color}`}>
                {statusConfig[overallStatus].label}
              </h1>
            </div>
            <p className="text-center text-muted-foreground mt-2 text-sm">
              Last updated: {statusData?.last_updated 
                ? format(new Date(statusData.last_updated), "PPpp")
                : "Unknown"
              }
            </p>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        {statusData?.active_incidents && statusData.active_incidents.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-5 w-5" />
                Active Incidents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {statusData.active_incidents.map((incident) => (
                <div key={incident.id} className="border-l-4 border-orange-500 pl-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{incident.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={severityColors[incident.severity]}>
                          {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {incidentStatusLabels[incident.status]}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(incident.started_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {incident.updates && incident.updates.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {incident.updates.map((update) => (
                        <div key={update.id} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(update.posted_at), "PPp")}
                            <Badge variant="outline" className="text-xs">
                              {incidentStatusLabels[update.status_snapshot as keyof typeof incidentStatusLabels]}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground">{update.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Service Components */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>Current status of all system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {statusData?.components?.map((component) => {
                const config = statusConfig[component.status];
                const Icon = config.icon;
                return (
                  <div key={component.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{component.name}</h3>
                      {component.description && (
                        <p className="text-sm text-muted-foreground">{component.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className={`text-sm font-medium ${config.color}`}>
                        {component.status === 'operational' ? 'Operational' : config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subscribe to Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Get Notified
            </CardTitle>
            <CardDescription>
              Subscribe to receive email notifications about service incidents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" disabled={isSubscribing}>
                {isSubscribing ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Incident History */}
        {statusData?.recent_incidents && statusData.recent_incidents.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Incident History</CardTitle>
                      <CardDescription>Past incidents from the last 90 days</CardDescription>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {statusData.recent_incidents.map((incident) => (
                    <div key={incident.id} className="border-l-2 border-muted pl-4 py-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium text-foreground">{incident.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{incident.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={severityColors[incident.severity]} variant="secondary">
                              {incident.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(incident.started_at), "PP")}
                              {incident.resolved_at && (
                                <> — Resolved {format(new Date(incident.resolved_at), "PP")}</>
                              )}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Resolved
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-8">
          <p>
            For more information about our security practices, visit our{" "}
            <Link to="/trust" className="text-primary hover:underline">
              Trust Center
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
