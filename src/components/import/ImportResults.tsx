import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle2, AlertCircle, Download, RefreshCw, 
  FileText, Database, ExternalLink 
} from "lucide-react";
import { EntityProgress } from "./ImportProgress";
import { getEntityDisplayName } from "@/lib/csvParser";
import { useNavigate } from "react-router-dom";

interface ImportResultsProps {
  batchId: string | null;
  progress: EntityProgress[];
  onStartNew: () => void;
}

export function ImportResults({ batchId, progress, onStartNew }: ImportResultsProps) {
  const navigate = useNavigate();
  
  const totalProcessed = progress.reduce((acc, p) => acc + p.processed, 0);
  const totalErrors = progress.reduce((acc, p) => acc + p.errors, 0);
  const successCount = totalProcessed - totalErrors;
  const successRate = totalProcessed > 0 ? Math.round((successCount / totalProcessed) * 100) : 100;
  
  const handleDownloadErrorLog = () => {
    // Create a simple error log CSV
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
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          {totalErrors === 0 ? (
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
          {totalErrors === 0 ? 'Import Successful!' : 'Import Complete with Errors'}
        </h2>
        <p className="text-muted-foreground">
          {totalErrors === 0 
            ? 'All records have been successfully imported into CaseWyze'
            : `${successCount} records imported, ${totalErrors} failed`
          }
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalProcessed}</p>
            <p className="text-sm text-muted-foreground">Total Processed</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/30">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{successCount}</p>
            <p className="text-sm text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        
        <Card className={totalErrors > 0 ? "border-destructive/30" : ""}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className={`h-8 w-8 mx-auto mb-2 ${totalErrors > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <p className={`text-2xl font-bold ${totalErrors > 0 ? "text-destructive" : ""}`}>
              {totalErrors}
            </p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{successRate}%</p>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Batch ID */}
      {batchId && (
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
                    {p.processed - p.errors}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.errors > 0 ? (
                      <span className="text-destructive">{p.errors}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.errors === 0 ? (
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
        {totalErrors > 0 && (
          <Button variant="outline" onClick={handleDownloadErrorLog}>
            <Download className="h-4 w-4 mr-2" />
            Download Error Log
          </Button>
        )}
        
        <Button variant="outline" onClick={() => navigate('/cases')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Cases
        </Button>
        
        <Button onClick={onStartNew}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Start New Import
        </Button>
      </div>
      
      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>
          Import batch records are stored for audit purposes and can be used for rollback if needed.
        </p>
        <p>
          Contact support if you need assistance with failed records.
        </p>
      </div>
    </div>
  );
}
