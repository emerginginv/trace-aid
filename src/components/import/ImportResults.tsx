import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle2, AlertCircle, Download, RefreshCw, 
  FileText, Database, ExternalLink, RotateCcw, AlertTriangle, XCircle
} from "lucide-react";
import { EntityProgress } from "./ImportProgress";
import { getEntityDisplayName } from "@/lib/csvParser";
import { useNavigate } from "react-router-dom";
import type { ImportExecutionResult, ImportErrorEntry } from "@/types/import";

interface ImportResultsProps {
  batchId: string | null;
  progress: EntityProgress[];
  onStartNew: () => void;
  executionResult?: ImportExecutionResult | null;
}

export function ImportResults({ batchId, progress, onStartNew, executionResult }: ImportResultsProps) {
  const navigate = useNavigate();
  
  const totalProcessed = executionResult?.totalRecords ?? progress.reduce((acc, p) => acc + p.processed, 0);
  const totalErrors = executionResult?.failedRecords ?? progress.reduce((acc, p) => acc + p.errors, 0);
  const successCount = executionResult?.successfulRecords ?? (totalProcessed - totalErrors);
  const successRate = totalProcessed > 0 ? Math.round((successCount / totalProcessed) * 100) : 100;
  const rollbackPerformed = executionResult?.rollbackPerformed ?? false;
  
  const handleDownloadErrorLog = () => {
    // Create a detailed error log CSV
    if (executionResult?.errors && executionResult.errors.length > 0) {
      const headers = "Entity Type,External Record ID,Error Code,Error Message,Timestamp\n";
      const errorRows = executionResult.errors.map((e: ImportErrorEntry) => 
        `"${e.entity_type}","${e.external_record_id || ''}","${e.error_code}","${e.error_message.replace(/"/g, '""')}","${e.created_at}"`
      ).join("\n");
      
      const csvContent = headers + errorRows;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-errors-${batchId || 'unknown'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Fallback to basic progress-based error log
      const errorRows = progress
        .filter(p => p.errors > 0)
        .map(p => `${getEntityDisplayName(p.entityType)},${p.errors} errors,${p.processed}/${p.total} processed`);
      
      const csvContent = "Entity,Status,Progress\n" + errorRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-errors-${batchId || 'unknown'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          {rollbackPerformed ? (
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <RotateCcw className="h-8 w-8 text-destructive" />
            </div>
          ) : totalErrors === 0 ? (
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-semibold">
          {rollbackPerformed 
            ? 'Import Failed - Rolled Back'
            : totalErrors === 0 
              ? 'Import Successful!' 
              : 'Import Complete with Errors'
          }
        </h2>
        <p className="text-muted-foreground">
          {rollbackPerformed 
            ? 'The import failed and all changes have been automatically rolled back. No data was modified.'
            : totalErrors === 0 
              ? 'All records have been successfully imported into CaseWyze'
              : `${successCount} records imported, ${totalErrors} failed`
          }
        </p>
      </div>
      
      {/* Rollback Alert */}
      {rollbackPerformed && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Transaction Rolled Back</AlertTitle>
          <AlertDescription>
            Due to an error during import, all changes have been automatically reversed. 
            Your database remains in its original state. Review the error log below to identify and fix the issues before retrying.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalProcessed}</p>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        
        <Card className={!rollbackPerformed && successCount > 0 ? "border-green-500/30" : ""}>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${!rollbackPerformed && successCount > 0 ? "text-green-500" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${!rollbackPerformed && successCount > 0 ? "text-green-600" : ""}`}>
              {rollbackPerformed ? 0 : successCount}
            </p>
            <p className="text-sm text-muted-foreground">Imported</p>
          </CardContent>
        </Card>
        
        <Card className={totalErrors > 0 ? "border-destructive/30" : ""}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className={`h-8 w-8 mx-auto mb-2 ${totalErrors > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${totalErrors > 0 ? "text-destructive" : ""}`}>
              {totalErrors}
            </p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        
        <Card className={rollbackPerformed ? "border-destructive/30" : ""}>
          <CardContent className="pt-6 text-center">
            {rollbackPerformed ? (
              <>
                <RotateCcw className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">Rolled Back</p>
              </>
            ) : (
              <>
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{successRate}%</p>
              </>
            )}
            <p className="text-sm text-muted-foreground">{rollbackPerformed ? "Status" : "Success Rate"}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Execution Duration */}
      {executionResult && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Import Batch ID</p>
                <p className="font-mono text-sm">{batchId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-mono text-sm">{(executionResult.durationMs / 1000).toFixed(2)}s</p>
              </div>
              <Badge variant={rollbackPerformed ? "destructive" : "outline"}>
                {rollbackPerformed ? "Rolled Back" : "Auditable"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Batch ID (fallback if no executionResult) */}
      {!executionResult && batchId && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Import Batch ID</p>
                <p className="font-mono text-sm">{batchId}</p>
              </div>
              <Badge variant="outline">Auditable</Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error Details */}
      {executionResult?.errors && executionResult.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Error Details
            </CardTitle>
            <CardDescription>
              {executionResult.errors.length} error(s) occurred during import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Error Code</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executionResult.errors.slice(0, 20).map((error, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {getEntityDisplayName(error.entity_type)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {error.external_record_id || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {error.error_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {error.error_message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {executionResult.errors.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing first 20 of {executionResult.errors.length} errors. Download the full error log for complete details.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Results by Entity */}
      <Card>
        <CardHeader>
          <CardTitle>Results by Entity</CardTitle>
          <CardDescription>
            Detailed breakdown of import results for each entity type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Type</TableHead>
                <TableHead className="text-right">Processed</TableHead>
                <TableHead className="text-right">Successful</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress.map((p) => (
                <TableRow key={p.entityType}>
                  <TableCell className="font-medium">
                    {getEntityDisplayName(p.entityType)}
                  </TableCell>
                  <TableCell className="text-right">{p.processed}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {rollbackPerformed ? 0 : p.processed - p.errors}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.errors > 0 || rollbackPerformed ? (
                      <span className="text-destructive">{rollbackPerformed ? p.processed : p.errors}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {rollbackPerformed ? (
                      <Badge variant="destructive">
                        Rolled Back
                      </Badge>
                    ) : p.errors === 0 ? (
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {p.errors} Failed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {(totalErrors > 0 || rollbackPerformed) && (
          <>
            <Button variant="outline" onClick={handleDownloadErrorLog}>
              <Download className="h-4 w-4 mr-2" />
              Download Error Log
            </Button>
            {batchId && (
              <Button variant="outline" onClick={() => navigate(`/import/review?batch=${batchId}`)}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Review & Correct
              </Button>
            )}
          </>
        )}
        
        {!rollbackPerformed && successCount > 0 && (
          <Button variant="outline" onClick={() => navigate('/cases')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Cases
          </Button>
        )}
        
        <Button onClick={onStartNew}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {rollbackPerformed ? 'Try Again' : 'Start New Import'}
        </Button>
      </div>
      
      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>
          Import batch records are stored for audit purposes and can be used for rollback if needed.
        </p>
        {rollbackPerformed && (
          <p className="text-destructive">
            Review the errors above, fix the data issues, and try importing again.
          </p>
        )}
        <p>
          Contact support if you need assistance with failed records.
        </p>
      </div>
    </div>
  );
}
