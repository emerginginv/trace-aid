import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { 
  Shield, AlertTriangle, Plus, CheckCircle, XCircle, Clock, 
  RefreshCw, Bug, FileSearch, AlertCircle, BarChart3
} from "lucide-react";

interface Metrics {
  open_vulnerabilities: Record<string, number>;
  overdue_count: number;
  accepted_risk_count: number;
  avg_remediation_days: number | null;
  sla_compliance_pct: number | null;
  pending_reports: number;
  recent_pentests: number;
}

interface PenTest {
  id: string;
  vendor_name: string;
  test_type: string;
  scope: string;
  start_date: string;
  end_date: string | null;
  overall_risk: string | null;
  status: string;
  findings_count_critical: number;
  findings_count_high: number;
  findings_count_medium: number;
  findings_count_low: number;
  created_at: string;
}

interface Vulnerability {
  id: string;
  source: string;
  title: string;
  description: string;
  severity: string;
  affected_component: string;
  status: string;
  discovered_at: string;
  sla_due_at: string | null;
  closed_at: string | null;
}

interface SecurityReportItem {
  id: string;
  reporter_email: string;
  reporter_name: string | null;
  description: string;
  submitted_at: string;
  status: string;
  triaged_at: string | null;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  informational: 'bg-gray-400'
};

export default function PlatformSecurity() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Platform staff check
  const { data: isPlatformStaff } = useQuery({
    queryKey: ['is-platform-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_platform_staff', { 
        p_user_id: (await supabase.auth.getUser()).data.user?.id 
      });
      if (error) return false;
      return data as boolean;
    }
  });

  // Metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_security_metrics');
      if (error) throw error;
      return data as unknown as Metrics;
    },
    enabled: isPlatformStaff === true
  });

  // Pen tests
  const { data: pentests } = useQuery({
    queryKey: ['pentests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('penetration_tests')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as PenTest[];
    },
    enabled: isPlatformStaff === true
  });

  // Vulnerabilities
  const { data: vulnerabilities } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vulnerabilities')
        .select('*')
        .order('discovered_at', { ascending: false });
      if (error) throw error;
      return data as Vulnerability[];
    },
    enabled: isPlatformStaff === true
  });

  // Security reports
  const { data: securityReports } = useQuery({
    queryKey: ['security-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_reports')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as SecurityReportItem[];
    },
    enabled: isPlatformStaff === true
  });

  if (!isPlatformStaff) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Platform Security is only accessible to platform staff.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openVulns = metrics?.open_vulnerabilities || {};
  const totalOpen = Object.values(openVulns).reduce((sum, count) => sum + (count || 0), 0);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Platform Security
          </h1>
          <p className="text-muted-foreground">
            Penetration testing, vulnerability management, and security reports
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pentests">Pen Tests</TabsTrigger>
          <TabsTrigger value="vulnerabilities">
            Vulnerabilities
            {totalOpen > 0 && (
              <Badge variant="destructive" className="ml-2">{totalOpen}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">
            Security Reports
            {(metrics?.pending_reports || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">{metrics?.pending_reports}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab metrics={metrics} />
        </TabsContent>

        <TabsContent value="pentests" className="space-y-6">
          <PenTestsTab pentests={pentests || []} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-6">
          <VulnerabilitiesTab vulnerabilities={vulnerabilities || []} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <SecurityReportsTab reports={securityReports || []} queryClient={queryClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Overview Tab
function OverviewTab({ metrics }: { metrics: Metrics | undefined }) {
  if (!metrics) return null;

  const openVulns = metrics.open_vulnerabilities || {};

  return (
    <div className="space-y-6">
      {/* Alert for overdue */}
      {metrics.overdue_count > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  {metrics.overdue_count} overdue {metrics.overdue_count === 1 ? 'vulnerability' : 'vulnerabilities'}
                </p>
                <p className="text-sm text-muted-foreground">
                  These have exceeded their SLA remediation deadline
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(openVulns).reduce((sum, count) => sum + (count || 0), 0)}
            </div>
            <div className="flex gap-1 mt-2">
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <Badge 
                  key={sev} 
                  variant="outline" 
                  className={`text-xs ${openVulns[sev] > 0 ? '' : 'opacity-40'}`}
                >
                  {sev[0].toUpperCase()}: {openVulns[sev] || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.sla_compliance_pct !== null ? `${metrics.sla_compliance_pct}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Closed within SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Remediation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avg_remediation_days !== null ? `${metrics.avg_remediation_days} days` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Time to close</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accepted Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accepted_risk_count}</div>
            <p className="text-xs text-muted-foreground">With justification</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Remediation SLAs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { severity: 'Critical', days: 7, color: 'text-red-500' },
              { severity: 'High', days: 14, color: 'text-orange-500' },
              { severity: 'Medium', days: 30, color: 'text-yellow-600' },
              { severity: 'Low', days: 90, color: 'text-blue-500' },
              { severity: 'Info', days: 365, color: 'text-gray-500' }
            ].map(sla => (
              <div key={sla.severity}>
                <div className={`text-2xl font-bold ${sla.color}`}>{sla.days}</div>
                <div className="text-sm text-muted-foreground">{sla.severity}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Pen Tests Tab
function PenTestsTab({ pentests, queryClient }: { pentests: PenTest[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    test_type: 'external',
    scope: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.rpc('create_pentest', {
        p_vendor_name: data.vendor_name,
        p_test_type: data.test_type,
        p_scope: data.scope,
        p_start_date: data.start_date,
        p_end_date: data.end_date || null,
        p_notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pen test created');
      queryClient.invalidateQueries({ queryKey: ['pentests'] });
      setDialogOpen(false);
    },
    onError: (error) => toast.error('Failed: ' + error.message)
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Penetration Tests</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Pen Test</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Penetration Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input value={formData.vendor_name} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Test Type</Label>
                <Select value={formData.test_type} onValueChange={v => setFormData({...formData, test_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="web_app">Web Application</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Textarea value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.vendor_name || !formData.scope || !formData.start_date}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pentests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No penetration tests recorded
                </TableCell>
              </TableRow>
            ) : pentests.map(pt => (
              <TableRow key={pt.id}>
                <TableCell className="font-medium">{pt.vendor_name}</TableCell>
                <TableCell className="capitalize">{pt.test_type.replace('_', ' ')}</TableCell>
                <TableCell>
                  {format(new Date(pt.start_date), 'MMM d, yyyy')}
                  {pt.end_date && ` - ${format(new Date(pt.end_date), 'MMM d')}`}
                </TableCell>
                <TableCell>
                  <Badge variant={pt.status === 'completed' ? 'default' : 'secondary'}>
                    {pt.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {pt.overall_risk && (
                    <Badge className={severityColors[pt.overall_risk]}>{pt.overall_risk}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {pt.status === 'completed' && (
                    <div className="flex gap-1">
                      {pt.findings_count_critical > 0 && <Badge variant="destructive">{pt.findings_count_critical}C</Badge>}
                      {pt.findings_count_high > 0 && <Badge className="bg-orange-500">{pt.findings_count_high}H</Badge>}
                      {pt.findings_count_medium > 0 && <Badge className="bg-yellow-500">{pt.findings_count_medium}M</Badge>}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Vulnerabilities Tab
function VulnerabilitiesTab({ vulnerabilities, queryClient }: { vulnerabilities: Vulnerability[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    source: 'internal',
    title: '',
    description: '',
    severity: 'medium',
    affected_component: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.rpc('create_vulnerability', {
        p_source: data.source,
        p_title: data.title,
        p_description: data.description,
        p_severity: data.severity,
        p_affected_component: data.affected_component
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vulnerability created');
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
      queryClient.invalidateQueries({ queryKey: ['security-metrics'] });
      setDialogOpen(false);
    },
    onError: (error) => toast.error('Failed: ' + error.message)
  });

  const isOverdue = (sla: string | null) => sla && isPast(new Date(sla));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vulnerabilities</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Vulnerability</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Vulnerability</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pentest">Pen Test</SelectItem>
                      <SelectItem value="scanner">Scanner</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="responsible_disclosure">Responsible Disclosure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={formData.severity} onValueChange={v => setFormData({...formData, severity: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="informational">Informational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Affected Component</Label>
                <Input value={formData.affected_component} onChange={e => setFormData({...formData, affected_component: e.target.value})} placeholder="e.g., Authentication, API, Database" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.title || !formData.affected_component || !formData.description}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Discovered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vulnerabilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No vulnerabilities recorded
                </TableCell>
              </TableRow>
            ) : vulnerabilities.map(vuln => (
              <TableRow key={vuln.id}>
                <TableCell>
                  <Badge className={severityColors[vuln.severity]}>{vuln.severity}</Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{vuln.title}</TableCell>
                <TableCell>{vuln.affected_component}</TableCell>
                <TableCell>
                  <Badge variant={
                    vuln.status === 'closed' ? 'default' : 
                    vuln.status === 'accepted_risk' ? 'secondary' : 
                    'outline'
                  }>
                    {vuln.status === 'closed' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {vuln.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {vuln.sla_due_at && !['closed', 'accepted_risk'].includes(vuln.status) ? (
                    <div className={isOverdue(vuln.sla_due_at) ? 'text-destructive font-medium' : ''}>
                      {isOverdue(vuln.sla_due_at) ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      ) : (
                        formatDistanceToNow(new Date(vuln.sla_due_at), { addSuffix: true })
                      )}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>{format(new Date(vuln.discovered_at), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Security Reports Tab
function SecurityReportsTab({ reports, queryClient }: { reports: SecurityReportItem[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const triageMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc('triage_security_report', {
        p_report_id: id,
        p_status: status
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report updated');
      queryClient.invalidateQueries({ queryKey: ['security-reports'] });
      queryClient.invalidateQueries({ queryKey: ['security-metrics'] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Security Reports</h2>
        <Button variant="outline" asChild>
          <a href="/security/report" target="_blank">View Public Form</a>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reporter</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No security reports submitted
                </TableCell>
              </TableRow>
            ) : reports.map(report => (
              <TableRow key={report.id}>
                <TableCell>
                  <div>{report.reporter_name || 'Anonymous'}</div>
                  <div className="text-xs text-muted-foreground">{report.reporter_email}</div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">{report.description}</TableCell>
                <TableCell>{format(new Date(report.submitted_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={report.status === 'new' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {report.status === 'new' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => triageMutation.mutate({ id: report.id, status: 'triaged' })}>
                        Triage
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => triageMutation.mutate({ id: report.id, status: 'rejected' })}>
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
