import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Download, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  Clock, 
  FileArchive,
  Loader2,
  RefreshCcw,
  XCircle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface OrganizationExport {
  id: string;
  status: string;
  export_type: string;
  file_path: string | null;
  file_size_bytes: number | null;
  expires_at: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface OffboardingStatus {
  success: boolean;
  organization: {
    id: string;
    name: string;
    status: string;
    deleted_at: string | null;
    deletion_scheduled_for: string | null;
    retention_days: number;
    legal_hold: boolean;
    legal_hold_reason: string | null;
    legal_hold_set_at: string | null;
  } | null;
  deletion: {
    id: string;
    status: string;
    reason: string;
    scheduled_for: string;
    created_at: string;
  } | null;
  exports: OrganizationExport[];
}

export function DataComplianceTab() {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [offboardingStatus, setOffboardingStatus] = useState<OffboardingStatus | null>(null);
  
  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState("full");
  const [requestingExport, setRequestingExport] = useState(false);
  
  // Legal hold dialog
  const [showLegalHoldDialog, setShowLegalHoldDialog] = useState(false);
  const [legalHoldReason, setLegalHoldReason] = useState("");
  const [settingLegalHold, setSettingLegalHold] = useState(false);
  
  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [requestingDelete, setRequestingDelete] = useState(false);
  
  // Cancel deletion
  const [cancelingDeletion, setCancelingDeletion] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadOffboardingStatus();
    }
  }, [organization?.id]);

  const loadOffboardingStatus = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_org_offboarding_status', {
        p_organization_id: organization.id
      });
      
      if (error) throw error;
      setOffboardingStatus(data as unknown as OffboardingStatus);
    } catch (error: any) {
      console.error("Error loading offboarding status:", error);
      toast.error("Failed to load data compliance status");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExport = async () => {
    if (!organization?.id) return;
    
    try {
      setRequestingExport(true);
      const { data, error } = await supabase.rpc('request_org_export', {
        p_organization_id: organization.id,
        p_export_type: exportType
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to request export");
        return;
      }
      
      toast.success(result.message || "Export requested successfully");
      setShowExportDialog(false);
      loadOffboardingStatus();
    } catch (error: any) {
      console.error("Error requesting export:", error);
      toast.error(error.message || "Failed to request export");
    } finally {
      setRequestingExport(false);
    }
  };

  const handleSetLegalHold = async (enable: boolean) => {
    if (!organization?.id) return;
    
    if (enable && !legalHoldReason.trim()) {
      toast.error("Please provide a reason for the legal hold");
      return;
    }
    
    try {
      setSettingLegalHold(true);
      const { data, error } = await supabase.rpc('set_org_legal_hold', {
        p_organization_id: organization.id,
        p_enable: enable,
        p_reason: enable ? legalHoldReason.trim() : null
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to update legal hold");
        return;
      }
      
      toast.success(result.message || "Legal hold updated");
      setShowLegalHoldDialog(false);
      setLegalHoldReason("");
      loadOffboardingStatus();
    } catch (error: any) {
      console.error("Error setting legal hold:", error);
      toast.error(error.message || "Failed to update legal hold");
    } finally {
      setSettingLegalHold(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!organization?.id) return;
    
    if (!deleteReason.trim()) {
      toast.error("Please provide a reason for deletion");
      return;
    }
    
    if (deleteConfirmation !== organization.name) {
      toast.error("Please type the organization name exactly to confirm");
      return;
    }
    
    try {
      setRequestingDelete(true);
      const { data, error } = await supabase.rpc('request_org_deletion', {
        p_organization_id: organization.id,
        p_reason: deleteReason.trim()
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to request deletion");
        return;
      }
      
      toast.success(result.message || "Deletion requested");
      setShowDeleteDialog(false);
      setDeleteReason("");
      setDeleteConfirmation("");
      loadOffboardingStatus();
    } catch (error: any) {
      console.error("Error requesting deletion:", error);
      toast.error(error.message || "Failed to request deletion");
    } finally {
      setRequestingDelete(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!organization?.id) return;
    
    try {
      setCancelingDeletion(true);
      const { data, error } = await supabase.rpc('cancel_org_deletion', {
        p_organization_id: organization.id
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to cancel deletion");
        return;
      }
      
      toast.success(result.message || "Deletion canceled");
      loadOffboardingStatus();
    } catch (error: any) {
      console.error("Error canceling deletion:", error);
      toast.error(error.message || "Failed to cancel deletion");
    } finally {
      setCancelingDeletion(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getExportStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'ready':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const org = offboardingStatus?.organization;
  const deletion = offboardingStatus?.deletion;
  const exports = offboardingStatus?.exports || [];
  const isPendingDeletion = org?.status === 'pending_deletion';
  const isLegalHold = org?.legal_hold;

  return (
    <div className="space-y-6">
      {/* Pending Deletion Banner */}
      {isPendingDeletion && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Organization Scheduled for Deletion</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              This organization is scheduled for permanent deletion on{" "}
              <strong>{org?.deletion_scheduled_for ? format(new Date(org.deletion_scheduled_for), 'PPP') : 'Unknown'}</strong>.
              {org?.deletion_scheduled_for && (
                <span className="text-muted-foreground ml-1">
                  ({formatDistanceToNow(new Date(org.deletion_scheduled_for), { addSuffix: true })})
                </span>
              )}
            </p>
            <p className="text-sm">
              All data will be permanently removed after this date. You can still export your data or cancel the deletion before then.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancelDeletion}
              disabled={cancelingDeletion}
              className="mt-2"
            >
              {cancelingDeletion && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Deletion
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Legal Hold Banner */}
      {isLegalHold && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Legal Hold Active</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p>This organization is under legal hold. Deletion is blocked until the hold is removed.</p>
            {org?.legal_hold_reason && (
              <p className="mt-1 text-sm"><strong>Reason:</strong> {org.legal_hold_reason}</p>
            )}
            {org?.legal_hold_set_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Set on {format(new Date(org.legal_hold_set_at), 'PPP')}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Exports Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5" />
                Data Exports
              </CardTitle>
              <CardDescription>
                Export your organization's data for backup or migration
              </CardDescription>
            </div>
            <Button onClick={() => setShowExportDialog(true)}>
              <Download className="w-4 h-4 mr-2" />
              Request Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileArchive className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No exports yet</p>
              <p className="text-sm">Request an export to download your data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((exp) => (
                <div 
                  key={exp.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getExportStatusBadge(exp.status)}
                      <span className="text-sm font-medium capitalize">
                        {exp.export_type.replace('_', ' ')} Export
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested {formatDistanceToNow(new Date(exp.created_at), { addSuffix: true })}
                      {exp.file_size_bytes && ` • ${formatFileSize(exp.file_size_bytes)}`}
                      {exp.expires_at && exp.status === 'ready' && (
                        ` • Expires ${formatDistanceToNow(new Date(exp.expires_at), { addSuffix: true })}`
                      )}
                    </div>
                    {exp.error_message && (
                      <p className="text-xs text-destructive">{exp.error_message}</p>
                    )}
                  </div>
                  {exp.status === 'ready' && exp.file_path && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={exp.file_path} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Hold Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Legal Hold
          </CardTitle>
          <CardDescription>
            Prevent data deletion for legal, compliance, or regulatory requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="legal-hold" className="text-base">Legal Hold Status</Label>
              <p className="text-sm text-muted-foreground">
                {isLegalHold 
                  ? "Legal hold is active. Organization cannot be deleted." 
                  : "No legal hold in place."}
              </p>
            </div>
            <Switch 
              id="legal-hold"
              checked={isLegalHold || false}
              onCheckedChange={(checked) => {
                if (checked) {
                  setShowLegalHoldDialog(true);
                } else {
                  handleSetLegalHold(false);
                }
              }}
              disabled={settingLegalHold}
            />
          </div>
          
          {isLegalHold && org?.legal_hold_reason && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Hold Reason:</p>
              <p className="text-sm text-muted-foreground">{org.legal_hold_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Organization */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Organization
          </CardTitle>
          <CardDescription>
            Permanently delete this organization and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action cannot be undone. All data including cases, contacts, documents, 
              and attachments will be permanently deleted after a {org?.retention_days || 30}-day retention period.
            </AlertDescription>
          </Alert>
          
          {!isPendingDeletion && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLegalHold}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isLegalHold ? "Deletion Blocked by Legal Hold" : "Request Organization Deletion"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Data Export</DialogTitle>
            <DialogDescription>
              Choose what data to include in your export
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Export (All Data)</SelectItem>
                  <SelectItem value="cases_only">Cases Only</SelectItem>
                  <SelectItem value="attachments_only">Attachments Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Exports are available for download for 7 days after completion.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestExport} disabled={requestingExport}>
              {requestingExport && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Request Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legal Hold Dialog */}
      <Dialog open={showLegalHoldDialog} onOpenChange={setShowLegalHoldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Legal Hold</DialogTitle>
            <DialogDescription>
              Provide a reason for placing this organization under legal hold
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hold-reason">Reason for Legal Hold *</Label>
              <Textarea
                id="hold-reason"
                placeholder="e.g., Pending litigation, regulatory investigation, audit requirement..."
                value={legalHoldReason}
                onChange={(e) => setLegalHoldReason(e.target.value)}
                rows={3}
              />
            </div>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                While under legal hold, this organization cannot be deleted.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLegalHoldDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSetLegalHold(true)} disabled={settingLegalHold || !legalHoldReason.trim()}>
              {settingLegalHold && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enable Legal Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{organization?.name}</strong> and all its data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason for Deletion *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Please provide a reason for deleting this organization..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <strong>{organization?.name}</strong> to confirm
              </Label>
              <Input
                id="delete-confirm"
                placeholder="Organization name"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </div>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>Organization access will be disabled immediately</li>
                  <li>Data will be permanently deleted after {org?.retention_days || 30} days</li>
                  <li>Custom domains will be deactivated</li>
                  <li>Stripe subscription will be canceled</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRequestDeletion} 
              disabled={requestingDelete || deleteConfirmation !== organization?.name || !deleteReason.trim()}
            >
              {requestingDelete && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
