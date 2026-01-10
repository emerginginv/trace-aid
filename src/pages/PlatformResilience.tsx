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
import { format } from "date-fns";
import { 
  Shield, Database, Clock, AlertTriangle, CheckCircle, 
  XCircle, HardDrive, RefreshCw, Plus, Activity
} from "lucide-react";

interface DashboardData {
  objectives: {
    rpo_hours: number;
    rto_hours: number;
    backup_retention_days: number;
    restore_test_frequency_days: number;
  };
  last_backups: Record<string, { id: string; completed_at: string; status: string; size_bytes: number } | null>;
  last_restore_test: { id: string; completed_at: string; status: string; environment: string } | null;
  active_disaster: { id: string; severity: string; declared_at: string; description: string } | null;
  backup_count_30d: number;
  restore_test_count_90d: number;
  disaster_count_ytd: number;
}

interface Backup {
  id: string;
  backup_type: string;
  location: string;
  description: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  size_bytes: number | null;
  retention_expires_at: string;
}

interface RestoreTest {
  id: string;
  backup_id: string | null;
  restore_type: string;
  environment: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  validated_by_name: string | null;
  notes: string | null;
}

interface DisasterEvent {
  id: string;
  incident_id: string | null;
  severity: string;
  description: string;
  declared_at: string;
  declared_by_name: string | null;
  recovery_started_at: string | null;
  recovery_completed_at: string | null;
  outcome_summary: string | null;
}

export default function PlatformResilience() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Check platform staff status
  const { data: isPlatformStaff } = useQuery({
    queryKey: ['is-platform-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_platform_staff', { p_user_id: (await supabase.auth.getUser()).data.user?.id });
      if (error) return false;
      return data as boolean;
    }
  });

  // Dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dr-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dr_dashboard');
      if (error) throw error;
      return data as unknown as DashboardData;
    },
    enabled: isPlatformStaff === true
  });

  // Backups list
  const { data: backups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_backups', { p_limit: 50 });
      if (error) throw error;
      return data as Backup[];
    },
    enabled: isPlatformStaff === true
  });

  // Restore tests
  const { data: restoreTests } = useQuery({
    queryKey: ['restore-tests'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_restore_tests', { p_limit: 50 });
      if (error) throw error;
      return data as RestoreTest[];
    },
    enabled: isPlatformStaff === true
  });

  // Disaster events
  const { data: disasterEvents } = useQuery({
    queryKey: ['disaster-events'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_disaster_events', { p_limit: 50 });
      if (error) throw error;
      return data as DisasterEvent[];
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
              Platform Resilience is only accessible to platform staff.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Platform Resilience
          </h1>
          <p className="text-muted-foreground">
            Disaster recovery, backups, and restore testing
          </p>
        </div>
      </div>

      {/* Active Disaster Banner */}
      {dashboard?.active_disaster && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Active Disaster Event</p>
                  <p className="text-sm text-muted-foreground">{dashboard.active_disaster.description}</p>
                </div>
              </div>
              <Badge variant="destructive">{dashboard.active_disaster.severity}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="restore-tests">Restore Tests</TabsTrigger>
          <TabsTrigger value="disasters">Disaster Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab dashboard={dashboard} />
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          <BackupsTab backups={backups || []} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="restore-tests" className="space-y-6">
          <RestoreTestsTab restoreTests={restoreTests || []} backups={backups || []} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="disasters" className="space-y-6">
          <DisastersTab disasterEvents={disasterEvents || []} queryClient={queryClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ dashboard }: { dashboard: DashboardData | undefined }) {
  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {/* Recovery Objectives */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RPO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.objectives.rpo_hours} hours</div>
            <p className="text-xs text-muted-foreground">Recovery Point Objective</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.objectives.rto_hours} hours</div>
            <p className="text-xs text-muted-foreground">Recovery Time Objective</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Backup Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.objectives.backup_retention_days} days</div>
            <p className="text-xs text-muted-foreground">Retention period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.objectives.restore_test_frequency_days} days</div>
            <p className="text-xs text-muted-foreground">Restore test cadence</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Last Backups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['database', 'storage', 'config'].map(type => {
              const backup = dashboard.last_backups[type];
              return (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type}</span>
                  {backup ? (
                    <div className="flex items-center gap-2">
                      <Badge variant={backup.status === 'success' ? 'default' : 'destructive'}>
                        {backup.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(backup.completed_at), 'MMM d')}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="outline">No backup</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Restore Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Tests (90 days)</span>
                <Badge variant="secondary">{dashboard.restore_test_count_90d}</Badge>
              </div>
              {dashboard.last_restore_test ? (
                <div className="text-sm text-muted-foreground">
                  Last test: {format(new Date(dashboard.last_restore_test.completed_at), 'MMM d, yyyy')}
                  <Badge variant="outline" className="ml-2">{dashboard.last_restore_test.environment}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No restore tests recorded</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Backups (30 days)</span>
                <Badge variant="secondary">{dashboard.backup_count_30d}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Disasters (YTD)</span>
                <Badge variant={dashboard.disaster_count_ytd > 0 ? 'destructive' : 'secondary'}>
                  {dashboard.disaster_count_ytd}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Backups Tab Component
function BackupsTab({ backups, queryClient }: { backups: Backup[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    backup_type: 'database',
    location: '',
    description: '',
    status: 'success',
    size_bytes: ''
  });

  const logBackupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.rpc('log_backup', {
        p_backup_type: data.backup_type,
        p_location: data.location,
        p_description: data.description || null,
        p_status: data.status,
        p_size_bytes: data.size_bytes ? parseInt(data.size_bytes) : null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Backup logged successfully');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['dr-dashboard'] });
      setDialogOpen(false);
      setFormData({ backup_type: 'database', location: '', description: '', status: 'success', size_bytes: '' });
    },
    onError: (error) => toast.error('Failed to log backup: ' + error.message)
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Backup History</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Log Backup</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Backup</DialogTitle>
              <DialogDescription>Record a backup event for audit purposes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Backup Type</Label>
                <Select value={formData.backup_type} onValueChange={v => setFormData({...formData, backup_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="config">Config</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., s3://backups/2024-01-01/"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size (bytes)</Label>
                <Input 
                  type="number"
                  value={formData.size_bytes} 
                  onChange={e => setFormData({...formData, size_bytes: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => logBackupMutation.mutate(formData)} disabled={!formData.location}>
                Log Backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No backups recorded yet
                </TableCell>
              </TableRow>
            ) : backups.map(backup => (
              <TableRow key={backup.id}>
                <TableCell className="capitalize">{backup.backup_type}</TableCell>
                <TableCell className="font-mono text-xs max-w-[200px] truncate">{backup.location}</TableCell>
                <TableCell>
                  <Badge variant={backup.status === 'success' ? 'default' : 'destructive'}>
                    {backup.status === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {backup.status}
                  </Badge>
                </TableCell>
                <TableCell>{backup.size_bytes ? `${(backup.size_bytes / 1024 / 1024).toFixed(1)} MB` : '-'}</TableCell>
                <TableCell>{backup.completed_at ? format(new Date(backup.completed_at), 'MMM d, yyyy HH:mm') : '-'}</TableCell>
                <TableCell>{format(new Date(backup.retention_expires_at), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Restore Tests Tab Component
function RestoreTestsTab({ restoreTests, backups, queryClient }: { restoreTests: RestoreTest[]; backups: Backup[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    backup_id: '',
    restore_type: 'database',
    environment: 'staging',
    status: 'success',
    notes: '',
    checklist: {
      tables_present: false,
      rls_active: false,
      sample_org_accessible: false,
      no_cross_tenant_access: false
    }
  });

  const logRestoreTestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.rpc('log_restore_test', {
        p_backup_id: data.backup_id || null,
        p_restore_type: data.restore_type,
        p_environment: data.environment,
        p_status: data.status,
        p_validation_checklist: data.checklist,
        p_notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Restore test logged successfully');
      queryClient.invalidateQueries({ queryKey: ['restore-tests'] });
      queryClient.invalidateQueries({ queryKey: ['dr-dashboard'] });
      setDialogOpen(false);
    },
    onError: (error) => toast.error('Failed to log restore test: ' + error.message)
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Restore Tests</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Log Restore Test</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Restore Test</DialogTitle>
              <DialogDescription>Record a restore test for SOC-2 compliance evidence.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Backup (optional)</Label>
                <Select value={formData.backup_id} onValueChange={v => setFormData({...formData, backup_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select backup" /></SelectTrigger>
                  <SelectContent>
                    {backups.filter(b => b.status === 'success').map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.backup_type} - {format(new Date(b.completed_at!), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Restore Type</Label>
                  <Select value={formData.restore_type} onValueChange={v => setFormData({...formData, restore_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="config">Config</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={formData.environment} onValueChange={v => setFormData({...formData, environment: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="isolated">Isolated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Validation Checklist</Label>
                <div className="space-y-2 text-sm">
                  {Object.entries(formData.checklist).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={value}
                        onChange={e => setFormData({
                          ...formData, 
                          checklist: {...formData.checklist, [key]: e.target.checked}
                        })}
                        className="rounded"
                      />
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any observations or issues"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => logRestoreTestMutation.mutate(formData)}>Log Test</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validated By</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restoreTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No restore tests recorded yet
                </TableCell>
              </TableRow>
            ) : restoreTests.map(test => (
              <TableRow key={test.id}>
                <TableCell className="capitalize">{test.restore_type}</TableCell>
                <TableCell><Badge variant="outline">{test.environment}</Badge></TableCell>
                <TableCell>
                  <Badge variant={test.status === 'success' ? 'default' : 'destructive'}>
                    {test.status}
                  </Badge>
                </TableCell>
                <TableCell>{test.validated_by_name || '-'}</TableCell>
                <TableCell>{test.completed_at ? format(new Date(test.completed_at), 'MMM d, yyyy HH:mm') : '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{test.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Disasters Tab Component
function DisastersTab({ disasterEvents, queryClient }: { disasterEvents: DisasterEvent[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    severity: 'minor',
    description: ''
  });

  const declareDisasterMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.rpc('declare_disaster', {
        p_severity: data.severity,
        p_description: data.description
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Disaster declared');
      queryClient.invalidateQueries({ queryKey: ['disaster-events'] });
      queryClient.invalidateQueries({ queryKey: ['dr-dashboard'] });
      setDialogOpen(false);
      setFormData({ severity: 'minor', description: '' });
    },
    onError: (error) => toast.error('Failed: ' + error.message)
  });

  const startRecoveryMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('start_disaster_recovery', { p_event_id: eventId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recovery started');
      queryClient.invalidateQueries({ queryKey: ['disaster-events'] });
    }
  });

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [outcomeData, setOutcomeData] = useState({ summary: '', lessons: '' });

  const completeRecoveryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('complete_disaster_recovery', { 
        p_event_id: selectedEvent,
        p_outcome_summary: outcomeData.summary,
        p_lessons_learned: outcomeData.lessons || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recovery completed');
      queryClient.invalidateQueries({ queryKey: ['disaster-events'] });
      queryClient.invalidateQueries({ queryKey: ['dr-dashboard'] });
      setCompleteDialogOpen(false);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Disaster Events</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" />Declare Disaster</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Declare Disaster Event</DialogTitle>
              <DialogDescription>Record a disaster event that requires recovery action.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={formData.severity} onValueChange={v => setFormData({...formData, severity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the disaster event"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => declareDisasterMutation.mutate(formData)} disabled={!formData.description}>
                Declare
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Complete Recovery Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Recovery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Outcome Summary</Label>
              <Textarea 
                value={outcomeData.summary} 
                onChange={e => setOutcomeData({...outcomeData, summary: e.target.value})}
                placeholder="Describe the recovery outcome"
              />
            </div>
            <div className="space-y-2">
              <Label>Lessons Learned</Label>
              <Textarea 
                value={outcomeData.lessons} 
                onChange={e => setOutcomeData({...outcomeData, lessons: e.target.value})}
                placeholder="Optional: what can be improved"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => completeRecoveryMutation.mutate()} disabled={!outcomeData.summary}>
              Complete Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Declared</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disasterEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No disaster events recorded
                </TableCell>
              </TableRow>
            ) : disasterEvents.map(event => (
              <TableRow key={event.id}>
                <TableCell>
                  <Badge variant={event.severity === 'critical' ? 'destructive' : event.severity === 'major' ? 'default' : 'secondary'}>
                    {event.severity}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px]">{event.description}</TableCell>
                <TableCell>{format(new Date(event.declared_at), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell>
                  {event.recovery_completed_at ? (
                    <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>
                  ) : event.recovery_started_at ? (
                    <Badge variant="default"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>
                  ) : (
                    <Badge variant="destructive">Declared</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!event.recovery_completed_at && (
                    <div className="flex gap-2">
                      {!event.recovery_started_at && (
                        <Button size="sm" variant="outline" onClick={() => startRecoveryMutation.mutate(event.id)}>
                          Start Recovery
                        </Button>
                      )}
                      {event.recovery_started_at && (
                        <Button size="sm" onClick={() => { setSelectedEvent(event.id); setCompleteDialogOpen(true); }}>
                          Complete
                        </Button>
                      )}
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
