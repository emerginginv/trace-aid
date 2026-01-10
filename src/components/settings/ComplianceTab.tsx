import * as React from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Shield, 
  Clock, 
  FileText, 
  UserX, 
  AlertTriangle, 
  Download, 
  Loader2,
  CheckCircle2,
  XCircle,
  Scale,
  Calendar
} from "lucide-react";

interface ComplianceDashboard {
  retention_days: number;
  gdpr_enabled: boolean;
  legal_hold: boolean;
  legal_hold_reason: string | null;
  pending_dsrs: number;
  completed_dsrs: number;
  blocked_dsrs: number;
  cases_due_purge: number;
}

interface DataSubjectRequest {
  id: string;
  subject_identifier: string;
  subject_email: string | null;
  request_type: 'access' | 'erasure' | 'rectification';
  status: string;
  reason: string | null;
  blocked_reason: string | null;
  created_at: string;
  completed_at: string | null;
  export_expires_at: string | null;
}

export function ComplianceTab() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [retentionDays, setRetentionDays] = React.useState<number>(365);
  const [gdprEnabled, setGdprEnabled] = React.useState(false);
  const [newDsrOpen, setNewDsrOpen] = React.useState(false);
  const [dsrForm, setDsrForm] = React.useState({
    subject_identifier: "",
    subject_email: "",
    request_type: "access" as 'access' | 'erasure' | 'rectification',
    reason: ""
  });

  // Fetch compliance dashboard
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['compliance-dashboard', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      const { data, error } = await supabase.rpc('get_compliance_dashboard', {
        p_organization_id: currentOrganization.id
      });
      if (error) throw error;
      return data as unknown as ComplianceDashboard;
    },
    enabled: !!currentOrganization?.id
  });

  // Fetch DSRs
  const { data: dsrs, isLoading: dsrsLoading } = useQuery({
    queryKey: ['data-subject-requests', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await supabase
        .from('data_subject_requests')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DataSubjectRequest[];
    },
    enabled: !!currentOrganization?.id
  });

  // Update retention settings
  const updateRetention = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) throw new Error("No organization");
      const { data, error } = await supabase.rpc('update_org_retention_settings', {
        p_organization_id: currentOrganization.id,
        p_default_retention_days: retentionDays,
        p_gdpr_enabled: gdprEnabled
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Retention settings updated");
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    }
  });

  // Submit DSR
  const submitDsr = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) throw new Error("No organization");
      const { data, error } = await supabase.rpc('submit_dsr', {
        p_organization_id: currentOrganization.id,
        p_subject_identifier: dsrForm.subject_identifier,
        p_subject_email: dsrForm.subject_email || null,
        p_request_type: dsrForm.request_type,
        p_reason: dsrForm.reason || null
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Data subject request submitted");
      setNewDsrOpen(false);
      setDsrForm({ subject_identifier: "", subject_email: "", request_type: "access", reason: "" });
      queryClient.invalidateQueries({ queryKey: ['data-subject-requests'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    }
  });

  // Process DSR (export or erasure)
  const processDsr = useMutation({
    mutationFn: async ({ dsrId, type }: { dsrId: string; type: 'access' | 'erasure' }) => {
      const rpcName = type === 'access' ? 'process_subject_export' : 'process_subject_erasure';
      const { data, error } = await supabase.rpc(rpcName, { p_dsr_id: dsrId });
      if (error) throw error;
      return data as unknown as { success: boolean; data?: object; blocked?: boolean; reason?: string };
    },
    onSuccess: (result, variables) => {
      if (result.blocked) {
        toast.error(`Request blocked: ${result.reason}`);
      } else if (variables.type === 'access' && result.data) {
        // Download the export
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subject-data-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export downloaded successfully");
      } else {
        toast.success("Request processed successfully");
      }
      queryClient.invalidateQueries({ queryKey: ['data-subject-requests'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to process request");
    }
  });

  // Initialize form from dashboard
  React.useEffect(() => {
    if (dashboard) {
      setRetentionDays(dashboard.retention_days);
      setGdprEnabled(dashboard.gdpr_enabled);
    }
  }, [dashboard]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'blocked_legal_hold':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Blocked</Badge>;
      case 'denied':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'access':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"><FileText className="w-3 h-3 mr-1" />Access</Badge>;
      case 'erasure':
        return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"><UserX className="w-3 h-3 mr-1" />Erasure</Badge>;
      case 'rectification':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"><FileText className="w-3 h-3 mr-1" />Rectification</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retention Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.retention_days || 365} days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending DSRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pending_dsrs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed DSRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard?.completed_dsrs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cases Due for Purge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{dashboard?.cases_due_purge || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Hold Status */}
      {dashboard?.legal_hold && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Scale className="w-5 h-5" />
              Legal Hold Active
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-300">
              {dashboard.legal_hold_reason || "No reason specified"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              All data deletion and purge operations are suspended until the legal hold is lifted.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Retention Policies
          </CardTitle>
          <CardDescription>
            Configure how long data is retained after cases are closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>GDPR Compliance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable enhanced privacy features for GDPR compliance
              </p>
            </div>
            <Switch
              checked={gdprEnabled}
              onCheckedChange={setGdprEnabled}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="retention-days">Default Retention Period (Days)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="retention-days"
                type="number"
                min={30}
                max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 365)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                ≈ {Math.round(retentionDays / 365 * 10) / 10} years
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Closed cases will be purged after this period unless under legal hold
            </p>
          </div>
          <Button 
            onClick={() => updateRetention.mutate()}
            disabled={updateRetention.isPending}
          >
            {updateRetention.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Retention Settings
          </Button>
        </CardContent>
      </Card>

      {/* Data Subject Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Data Subject Requests
              </CardTitle>
              <CardDescription>
                Manage access, erasure, and rectification requests
              </CardDescription>
            </div>
            <Dialog open={newDsrOpen} onOpenChange={setNewDsrOpen}>
              <DialogTrigger asChild>
                <Button>New Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Data Subject Request</DialogTitle>
                  <DialogDescription>
                    Create a new data access, erasure, or rectification request
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject-id">Subject Identifier *</Label>
                    <Input
                      id="subject-id"
                      placeholder="Name or unique identifier"
                      value={dsrForm.subject_identifier}
                      onChange={(e) => setDsrForm(f => ({ ...f, subject_identifier: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject-email">Subject Email</Label>
                    <Input
                      id="subject-email"
                      type="email"
                      placeholder="email@example.com"
                      value={dsrForm.subject_email}
                      onChange={(e) => setDsrForm(f => ({ ...f, subject_email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Request Type *</Label>
                    <Select 
                      value={dsrForm.request_type} 
                      onValueChange={(v) => setDsrForm(f => ({ ...f, request_type: v as typeof dsrForm.request_type }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="access">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Right of Access (Export)
                          </div>
                        </SelectItem>
                        <SelectItem value="erasure">
                          <div className="flex items-center gap-2">
                            <UserX className="w-4 h-4" />
                            Right to Erasure (Anonymize)
                          </div>
                        </SelectItem>
                        <SelectItem value="rectification">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Right to Rectification
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason / Notes</Label>
                    <Textarea
                      id="reason"
                      placeholder="Optional notes about this request"
                      value={dsrForm.reason}
                      onChange={(e) => setDsrForm(f => ({ ...f, reason: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewDsrOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => submitDsr.mutate()}
                    disabled={!dsrForm.subject_identifier || submitDsr.isPending}
                  >
                    {submitDsr.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {dsrsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : dsrs && dsrs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dsrs.map((dsr) => (
                  <TableRow key={dsr.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dsr.subject_identifier}</p>
                        {dsr.subject_email && (
                          <p className="text-sm text-muted-foreground">{dsr.subject_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRequestTypeBadge(dsr.request_type)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(dsr.status)}
                        {dsr.blocked_reason && (
                          <p className="text-xs text-destructive">{dsr.blocked_reason}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(dsr.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dsr.status === 'submitted' && (
                        <Button
                          size="sm"
                          onClick={() => processDsr.mutate({ dsrId: dsr.id, type: dsr.request_type as 'access' | 'erasure' })}
                          disabled={processDsr.isPending}
                        >
                          {processDsr.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : dsr.request_type === 'access' ? (
                            <>
                              <Download className="w-4 h-4 mr-1" />
                              Export
                            </>
                          ) : (
                            "Process"
                          )}
                        </Button>
                      )}
                      {dsr.status === 'completed' && dsr.request_type === 'access' && dsr.export_expires_at && (
                        <span className="text-xs text-muted-foreground">
                          Expires {format(new Date(dsr.export_expires_at), 'MMM d')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No data subject requests yet</p>
              <p className="text-sm">Submit a request to export or anonymize subject data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}