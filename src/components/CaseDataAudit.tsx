import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, AlertTriangle, CheckCircle2, Info, Loader2, Trash2, Download } from "lucide-react";
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
  };
  results: AuditResult[];
}

interface FixResult {
  table: string;
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
    total_deleted: number;
    total_errors: number;
  };
  results: FixResult[];
  deleted_records: any[];
}

export function CaseDataAudit() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [fixData, setFixData] = useState<FixResponse | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [fixAllMode, setFixAllMode] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    setFixData(null);
    try {
      const { data, error } = await supabase.functions.invoke('audit-case-orphans', {
        method: 'POST',
      });

      if (error) throw error;

      setAuditData(data);
      
      if (data.summary.critical_issues > 0) {
        toast.error(`Found ${data.summary.total_orphaned} orphaned records without valid cases`);
      } else {
        toast.success('✅ No orphaned case data detected');
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
      
      const { data, error } = await supabase.functions.invoke('fix-case-orphans', {
        body: {
          tables: tablesToFix,
          dryRun,
        },
      });

      if (error) throw error;

      setFixData(data);
      
      if (data.summary.total_errors > 0) {
        toast.warning(
          `Fix completed with errors: ${data.summary.total_deleted} deleted, ${data.summary.total_errors} errors`
        );
      } else {
        toast.success(
          `✅ ${dryRun ? 'Dry run complete' : 'Fix successful'}: ${data.summary.total_deleted} records deleted`
        );
      }

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

  const downloadDeletedRecords = () => {
    if (!fixData?.deleted_records || fixData.deleted_records.length === 0) return;
    
    const blob = new Blob([JSON.stringify(fixData.deleted_records, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orphaned-case-data-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Deleted records exported');
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
                <Database className="h-5 w-5" />
                Orphaned Case Data Audit
              </CardTitle>
              <CardDescription>
                Scan for records that reference deleted or non-existent cases
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
                    <Database className="mr-2 h-4 w-4" />
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
              <Alert variant={auditData.summary.critical_issues > 0 ? "destructive" : "default"}>
                <AlertTitle className="flex items-center gap-2">
                  {auditData.summary.critical_issues > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Orphaned Records Detected
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
                      <div className="font-semibold">
                        Found {auditData.summary.total_orphaned} orphaned records across {auditData.summary.critical_issues} tables
                      </div>
                    ) : (
                      <div className="font-semibold">No orphaned case data found</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

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
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All Orphans
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleFixSelected}
                    disabled={fixing || selectedTables.size === 0}
                    variant="secondary"
                  >
                    Delete Selected ({selectedTables.size})
                  </Button>
                  <Button
                    onClick={selectAllCritical}
                    disabled={fixing}
                    variant="outline"
                  >
                    Select All
                  </Button>
                  {fixData?.deleted_records && fixData.deleted_records.length > 0 && (
                    <Button
                      onClick={downloadDeletedRecords}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Deleted Records
                    </Button>
                  )}
                </div>
              )}

              {fixData && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Cleanup Results</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
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
                      <TableHead className="text-right">Orphaned Records</TableHead>
                      <TableHead>Sample IDs</TableHead>
                      {fixData && <TableHead>Cleanup Results</TableHead>}
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
                              <Badge variant={getSeverityColor(result.severity) as any} className="flex items-center gap-1 w-fit">
                                {getSeverityIcon(result.severity)}
                                {result.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={result.orphaned_count > 0 ? 'text-destructive font-semibold' : ''}>
                                {result.orphaned_count}
                              </span>
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
                                    {fixResult.deleted_count > 0 && (
                                      <div className="text-muted-foreground">🗑 {fixResult.deleted_count} deleted</div>
                                    )}
                                    {fixResult.errors.length > 0 && (
                                      <div className="text-destructive">⚠ {fixResult.errors.length} errors</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fixAllMode ? 'all' : selectedTables.size} orphaned records 
              that reference non-existent cases. This action cannot be undone.
              <br /><br />
              These records have no parent case and are inaccessible in the application.
              You can export them before deletion using the "Export Deleted Records" button after the operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeFix(false)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
