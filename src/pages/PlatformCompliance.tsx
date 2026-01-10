import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Shield, 
  FileCheck, 
  Users, 
  AlertTriangle, 
  FileText, 
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DashboardData {
  controls: { total: number; by_category: Record<string, number> };
  evidence: { total: number; last_30_days: number };
  reviews: { pending: number; in_progress: number; completed: number };
  incidents: { open: number; resolved: number };
  changes_last_30_days: number;
}

export default function PlatformCompliance() {
  const { isPlatformStaff, isLoading: authLoading } = useImpersonation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['soc2-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_soc2_dashboard');
      if (error) throw error;
      return data as unknown as DashboardData;
    },
    enabled: isPlatformStaff
  });

  // Controls
  const { data: controls } = useQuery({
    queryKey: ['soc2-controls'],
    queryFn: async () => {
      const { data, error } = await supabase.from('soc2_controls').select('*').order('control_code');
      if (error) throw error;
      return data;
    },
    enabled: isPlatformStaff
  });

  // Evidence
  const { data: evidence } = useQuery({
    queryKey: ['control-evidence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_evidence')
        .select('*, soc2_controls(control_code, title)')
        .order('collected_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isPlatformStaff
  });

  // Access Reviews
  const { data: reviews } = useQuery({
    queryKey: ['access-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isPlatformStaff
  });

  // Incidents
  const { data: incidents } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isPlatformStaff
  });

  // Changes
  const { data: changes } = useQuery({
    queryKey: ['change-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isPlatformStaff
  });

  // Mutations
  const collectRlsEvidence = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('collect_rls_evidence');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("RLS evidence collected");
      queryClient.invalidateQueries({ queryKey: ['control-evidence'] });
      queryClient.invalidateQueries({ queryKey: ['soc2-dashboard'] });
    },
    onError: () => toast.error("Failed to collect evidence")
  });

  const collectAuditEvidence = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('collect_audit_evidence', { p_days: 30 });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Audit evidence collected");
      queryClient.invalidateQueries({ queryKey: ['control-evidence'] });
      queryClient.invalidateQueries({ queryKey: ['soc2-dashboard'] });
    },
    onError: () => toast.error("Failed to collect evidence")
  });

  if (authLoading) {
    return <div className="container py-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!isPlatformStaff) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Platform staff only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            SOC-2 Compliance
          </h1>
          <p className="text-muted-foreground">Controls, evidence, and audit readiness</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="reviews">Access Reviews</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {dashboardLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : dashboard ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.controls?.total || 0}</div>
                    <p className="text-xs text-muted-foreground">Active controls</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Evidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.evidence?.last_30_days || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.reviews?.in_progress || 0}</div>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Incidents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{dashboard.incidents?.open || 0}</div>
                    <p className="text-xs text-muted-foreground">Open incidents</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => collectRlsEvidence.mutate()} disabled={collectRlsEvidence.isPending}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Collect RLS Evidence
                </Button>
                <Button variant="outline" size="sm" onClick={() => collectAuditEvidence.mutate()} disabled={collectAuditEvidence.isPending}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Collect Audit Evidence
                </Button>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Controls */}
        <TabsContent value="controls">
          <Card>
            <CardHeader>
              <CardTitle>SOC-2 Control Catalog</CardTitle>
              <CardDescription>Controls mapped to CaseWyze implementation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {controls?.map((control: any) => (
                  <div key={control.id} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{control.control_code}</Badge>
                        <Badge>{control.category}</Badge>
                      </div>
                      <p className="font-medium mt-1">{control.title}</p>
                      <p className="text-sm text-muted-foreground">{control.description}</p>
                      {control.implementation_notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Implementation:</strong> {control.implementation_notes}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">{control.frequency}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <CardTitle>Control Evidence</CardTitle>
              <CardDescription>Collected evidence for audit</CardDescription>
            </CardHeader>
            <CardContent>
              {evidence?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No evidence collected yet</p>
              ) : (
                <div className="divide-y">
                  {evidence?.map((ev: any) => (
                    <div key={ev.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{ev.soc2_controls?.control_code}</Badge>
                          <span className="font-medium">{ev.description}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(ev.collected_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{ev.evidence_type}</Badge>
                        <Badge variant="secondary">{ev.source}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Reviews */}
        <TabsContent value="reviews">
          <AccessReviewsTab reviews={reviews || []} />
        </TabsContent>

        {/* Incidents */}
        <TabsContent value="incidents">
          <IncidentsTab incidents={incidents || []} />
        </TabsContent>

        {/* Changes */}
        <TabsContent value="changes">
          <ChangesTab changes={changes || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Access Reviews Tab Component
function AccessReviewsTab({ reviews }: { reviews: any[] }) {
  const queryClient = useQueryClient();
  const [showNewReview, setShowNewReview] = useState(false);
  const [reviewType, setReviewType] = useState("quarterly");

  const startReview = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('start_access_review', { 
        p_org_id: null, 
        p_type: reviewType 
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Access review started`);
      setShowNewReview(false);
      queryClient.invalidateQueries({ queryKey: ['access-reviews'] });
    },
    onError: () => toast.error("Failed to start review")
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Access Reviews</CardTitle>
          <CardDescription>Quarterly reviews of elevated access</CardDescription>
        </div>
        <Dialog open={showNewReview} onOpenChange={setShowNewReview}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Start Review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Access Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Review Type</Label>
                <Select value={reviewType} onValueChange={setReviewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="triggered">Triggered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => startReview.mutate()} disabled={startReview.isPending}>
                Start Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No access reviews yet</p>
        ) : (
          <div className="divide-y">
            {reviews.map((review: any) => (
              <div key={review.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{review.review_type} Review</span>
                    <Badge variant={review.status === 'completed' ? 'default' : review.status === 'in_progress' ? 'secondary' : 'outline'}>
                      {review.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {review.status === 'completed' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Incidents Tab Component
function IncidentsTab({ incidents }: { incidents: any[] }) {
  const queryClient = useQueryClient();
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [severity, setSeverity] = useState("low");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const logIncident = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('log_security_incident', {
        p_severity: severity,
        p_title: title,
        p_description: description
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Incident ${data.incident_number} logged`);
      setShowNewIncident(false);
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
    },
    onError: () => toast.error("Failed to log incident")
  });

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Security Incidents</CardTitle>
          <CardDescription>Incident tracking and resolution</CardDescription>
        </div>
        <Dialog open={showNewIncident} onOpenChange={setShowNewIncident}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" />Log Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Security Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief incident title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description" rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => logIncident.mutate()} disabled={logIncident.isPending || !title || !description}>
                Log Incident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No security incidents</p>
        ) : (
          <div className="divide-y">
            {incidents.map((incident: any) => (
              <div key={incident.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                    <span className="font-medium">{incident.incident_number}</span>
                    <span>{incident.title}</span>
                  </div>
                  <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>
                    {incident.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Detected: {format(new Date(incident.detected_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Changes Tab Component
function ChangesTab({ changes }: { changes: any[] }) {
  const queryClient = useQueryClient();
  const [showNewChange, setShowNewChange] = useState(false);
  const [changeType, setChangeType] = useState("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("low");
  const [ticket, setTicket] = useState("");

  const logChange = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('log_platform_change', {
        p_type: changeType,
        p_title: title,
        p_description: description,
        p_impact: impact,
        p_ticket: ticket || null
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Change logged");
      setShowNewChange(false);
      setTitle("");
      setDescription("");
      setTicket("");
      queryClient.invalidateQueries({ queryKey: ['change-log'] });
    },
    onError: () => toast.error("Failed to log change")
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Change Log</CardTitle>
          <CardDescription>Platform changes and deployments</CardDescription>
        </div>
        <Dialog open={showNewChange} onOpenChange={setShowNewChange}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Log Change</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Platform Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={changeType} onValueChange={setChangeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="schema">Schema</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="configuration">Configuration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Change title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What changed" rows={3} />
              </div>
              <div>
                <Label>Impact Level</Label>
                <Select value={impact} onValueChange={setImpact}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ticket Reference (optional)</Label>
                <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="JIRA-123" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => logChange.mutate()} disabled={logChange.isPending || !title || !description}>
                Log Change
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No changes logged</p>
        ) : (
          <div className="divide-y">
            {changes.map((change: any) => (
              <div key={change.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <Badge variant="outline">{change.change_type}</Badge>
                    <span className="font-medium">{change.title}</span>
                    {change.ticket_reference && (
                      <Badge variant="secondary">{change.ticket_reference}</Badge>
                    )}
                  </div>
                  <Badge variant={change.impact_level === 'critical' ? 'destructive' : 'secondary'}>
                    {change.impact_level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{change.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(change.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
