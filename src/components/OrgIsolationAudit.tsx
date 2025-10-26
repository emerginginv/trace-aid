import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export function OrgIsolationAudit() {
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);

  const runAudit = async () => {
    setLoading(true);
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
          <Button
            onClick={runAudit}
            disabled={loading}
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

            {/* Results Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Orphaned Rows</TableHead>
                    <TableHead className="text-right">Invalid Org</TableHead>
                    <TableHead>Sample IDs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditData.results
                    .sort((a, b) => {
                      // Sort by severity: critical > warning > info
                      const severityOrder = { critical: 0, warning: 1, info: 2 };
                      return severityOrder[a.severity] - severityOrder[b.severity];
                    })
                    .map((result) => (
                      <TableRow key={result.table}>
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
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Help Text */}
            {auditData.summary.critical_issues > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Recommended Actions</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>Review the sample IDs to understand which records are affected</li>
                    <li>Use database migrations to backfill organization_id values</li>
                    <li>Consider setting NOT NULL constraints on organization_id columns</li>
                    <li>Audit application code to ensure all inserts include organization_id</li>
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
  );
}
