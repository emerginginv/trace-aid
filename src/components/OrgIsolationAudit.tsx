import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, CheckCircle2, Info, Loader2, Trash2, Download, Settings } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AuditResult {
  table: string;
  orphaned_count: number;
  null_org_count: number;
  invalid_org_count: number;
  sample_ids: string[];
  severity: 'critical' | 'warning' | 'info';
}

interface AuditResponse {
  success: boolean;
  timestamp: string;
  summary: {
    tables_audited: number;
    critical_issues: number;
    total_orphaned: number;
    total_invalid: number;
  };
  results: AuditResult[];
}

interface FixResult {
  table: string;
  backfilled_count: number;
  deleted_count: number;
  errors: string[];
  sample_ids: string[];
}

interface FixResponse {
  success: boolean;
  dry_run: boolean;
  timestamp: string;
  summary: {
    tables_fixed: number;
    total_backfilled: number;
    total_deleted: number;
    total_errors: number;
  };
  results: FixResult[];
  audit_log: any[];
}

export function OrgIsolationAudit() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [fixData, setFixData] = useState<FixResponse | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [fixAllMode, setFixAllMode] = useState(false);


  const runAudit = async () => {
    setLoading(true);
    setFixData(null); // Clear previous fix results
    try {
      const { data, error } = await supabase.functions.invoke('audit-org-isolation', {
        method: 'POST',
      });

      if (error) throw error;

      setAuditData(data);
      
      if (data.summary.critical_issues > 0) {
        toast.error(`Audit found ${data.summary.total_orphaned} rows without org_id`);
      } else {
        toast.success('✅ No org isolation issues detected');
      }
    } catch (error) {
      console.error('Audit error:', error);
      toast.error('Failed to run audit');
    } finally {
      setLoading(false);
    }
  };

  const handleFixSelected = () => {
    if (selectedTables.size === 0) {
      toast.error('Please select at least one table to fix');
      return;
    }
    setFixAllMode(false);
    setConfirmDialogOpen(true);
  };

  const handleFixAll = () => {
    setFixAllMode(true);
    setConfirmDialogOpen(true);
  };

  const executeFix = async (dryRun: boolean = false) => {
    setFixing(true);
    setConfirmDialogOpen(false);
    
    try {
      const tablesToFix = fixAllMode ? undefined : Array.from(selectedTables);
      
      const { data, error } = await supabase.functions.invoke('fix-org-isolation', {
        body: {
          tables: tablesToFix,
          dryRun,
        },
      });

      if (error) throw error;

      setFixData(data);
      
      if (data.summary.total_errors > 0) {
        toast.warning(
          `Fix completed with errors: ${data.summary.total_backfilled} backfilled, ${data.summary.total_deleted} deleted, ${data.summary.total_errors} errors`
        );
      } else {
        toast.success(
          `✅ ${dryRun ? 'Dry run complete' : 'Fix successful'}: ${data.summary.total_backfilled} backfilled, ${data.summary.total_deleted} deleted`
        );
      }

      // Clear selections and re-run audit
      setSelectedTables(new Set());
      if (!dryRun) {
        setTimeout(() => runAudit(), 1000);
      }
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Failed to fix issues');
    } finally {
      setFixing(false);
    }
  };

  const toggleTableSelection = (table: string) => {
    const newSelection = new Set(selectedTables);
    if (newSelection.has(table)) {
      newSelection.delete(table);
    } else {
      newSelection.add(table);
    }
    setSelectedTables(newSelection);
  };

  const selectAllCritical = () => {
    if (!auditData) return;
    const criticalTables = auditData.results
      .filter(r => r.severity === 'critical')
      .map(r => r.table);
    setSelectedTables(new Set(criticalTables));
  };

  const downloadAuditLog = () => {
    if (!fixData?.audit_log) return;
    
    const blob = new Blob([JSON.stringify(fixData.audit_log, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-isolation-fix-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Audit log downloaded');
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <Info className="h-4 w-4 text-warning" />;
      case 'info':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Organization Isolation Audit
              </CardTitle>
              <CardDescription>
                Scan all tables for data that's missing organization_id or linked to invalid organizations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={runAudit}
                disabled={loading || fixing}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Run Audit
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {auditData && (
            <>
              {/* Summary Alert */}
              <Alert variant={auditData.summary.critical_issues > 0 ? "destructive" : "default"}>
                <AlertTitle className="flex items-center gap-2">
                  {auditData.summary.critical_issues > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Security Issues Detected
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      All Clear
                    </>
                  )}
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <div>Scanned {auditData.summary.tables_audited} tables at {new Date(auditData.timestamp).toLocaleString()}</div>
                    {auditData.summary.critical_issues > 0 ? (
                      <>
                        <div className="font-semibold">
                          Found {auditData.summary.total_orphaned} orphaned rows across {auditData.summary.critical_issues} tables
                        </div>
                        {auditData.summary.total_invalid > 0 && (
                          <div>Plus {auditData.summary.total_invalid} rows with invalid organization IDs</div>
                        )}
                      </>
                    ) : (
                      <div className="font-semibold">No organization isolation issues found</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              {auditData.summary.critical_issues > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleFixAll}
                    disabled={fixing}
                    variant="destructive"
                  >
                    {fixing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        Fix All Issues
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleFixSelected}
                    disabled={fixing || selectedTables.size === 0}
                    variant="secondary"
                  >
                    Fix Selected ({selectedTables.size})
                  </Button>
                  <Button
                    onClick={selectAllCritical}
                    disabled={fixing}
                    variant="outline"
                  >
                    Select All Critical
                  </Button>
                  {fixData?.audit_log && fixData.audit_log.length > 0 && (
                    <Button
                      onClick={downloadAuditLog}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Audit Log
                    </Button>
                  )}
                </div>
              )}

              {/* Fix Results */}
              {fixData && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Fix Results</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <div>✅ Backfilled: {fixData.summary.total_backfilled} records</div>
                      <div>🗑️ Deleted: {fixData.summary.total_deleted} records</div>
                      {fixData.summary.total_errors > 0 && (
                        <div className="text-destructive">⚠️ Errors: {fixData.summary.total_errors}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Completed at {new Date(fixData.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Results Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        {auditData.summary.critical_issues > 0 && (
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedTables.size > 0 && selectedTables.size === auditData.results.filter(r => r.severity === 'critical').length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllCritical();
                                } else {
                                  setSelectedTables(new Set());
                                }
                              }}
                            />
                          </div>
                        )}
                      </TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orphaned Rows</TableHead>
                      <TableHead className="text-right">Invalid Org</TableHead>
                      <TableHead>Sample IDs</TableHead>
                      {fixData && <TableHead>Fix Results</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.results
                      .sort((a, b) => {
                        const severityOrder = { critical: 0, warning: 1, info: 2 };
                        return severityOrder[a.severity] - severityOrder[b.severity];
                      })
                      .map((result) => {
                        const fixResult = fixData?.results.find(f => f.table === result.table);
                        return (
                          <TableRow key={result.table}>
                            <TableCell>
                              {result.severity === 'critical' && (
                                <div className="flex items-center justify-center">
                                  <Checkbox
                                    checked={selectedTables.has(result.table)}
                                    onCheckedChange={() => toggleTableSelection(result.table)}
                                  />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{result.table}</TableCell>
                            <TableCell>
                              <Badge variant={getSeverityColor(result.severity)} className="flex items-center gap-1 w-fit">
                                {getSeverityIcon(result.severity)}
                                {result.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {result.orphaned_count >= 0 ? (
                                <span className={result.orphaned_count > 0 ? 'text-destructive font-semibold' : ''}>
                                  {result.orphaned_count}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {result.invalid_org_count >= 0 ? (
                                <span className={result.invalid_org_count > 0 ? 'text-warning font-semibold' : ''}>
                                  {result.invalid_org_count}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {result.sample_ids.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {result.sample_ids.slice(0, 3).map((id) => (
                                    <code key={id} className="text-xs bg-muted px-1 py-0.5 rounded">
                                      {id.substring(0, 8)}...
                                    </code>
                                  ))}
                                  {result.sample_ids.length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{result.sample_ids.length - 3} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            {fixData && (
                              <TableCell>
                                {fixResult ? (
                                  <div className="text-xs space-y-0.5">
                                    {fixResult.backfilled_count > 0 && (
                                      <div className="text-success">✓ {fixResult.backfilled_count} fixed</div>
                                    )}
                                    {fixResult.deleted_count > 0 && (
                                      <div className="text-muted-foreground">🗑 {fixResult.deleted_count} deleted</div>
                                    )}
                                    {fixResult.errors.length > 0 && (
                                      <div className="text-destructive">⚠ {fixResult.errors.length} errors</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </div>

            {/* Help Text */}
            {auditData.summary.critical_issues > 0 && !fixData && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How Automated Fix Works</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li><strong>Backfill:</strong> Links orphaned records to their user's organization</li>
                    <li><strong>Delete:</strong> Removes records where the user no longer exists in any organization</li>
                    <li><strong>Audit Log:</strong> All changes are logged and can be downloaded for review</li>
                    <li><strong>Selective Fix:</strong> Choose specific tables or fix all at once</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {!auditData && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Run Audit" to scan for organization isolation issues</p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Confirmation Dialog */}
    <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Fix Operation</AlertDialogTitle>
          <AlertDialogDescription>
            {fixAllMode ? (
              <div className="space-y-2">
                <p>This will automatically fix <strong>all tables</strong> with orphaned records:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Backfill missing organization_id values by linking to user's organization</li>
                  <li>Delete records where users no longer exist in any organization</li>
                  <li>All changes will be logged in the audit trail</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <p>This will fix the following tables:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {Array.from(selectedTables).map(table => (
                    <li key={table} className="font-mono">{table}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 text-sm font-semibold">This action cannot be undone. Continue?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => executeFix(false)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Fix Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
