import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { 
  CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle,
  ChevronRight, Database, User
} from "lucide-react";

interface ImportBatchListProps {
  batches: any[];
  onSelectBatch: (batch: any) => void;
}

const getStatusIcon = (status: string, rollback?: boolean) => {
  if (rollback || status === 'rolled_back') {
    return <RotateCcw className="h-4 w-4 text-destructive" />;
  }
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'processing':
      return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="border-green-500 text-green-600">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'rolled_back':
      return <Badge variant="destructive">Rolled Back</Badge>;
    case 'processing':
      return <Badge variant="secondary">Processing</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function ImportBatchList({ batches, onSelectBatch }: ImportBatchListProps) {
  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Import History</h3>
          <p className="text-muted-foreground">
            You haven't performed any imports yet. Start a new import to see history here.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Import Batches
        </CardTitle>
        <CardDescription>
          {batches.length} import batch{batches.length !== 1 ? 'es' : ''} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Success / Failed</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Imported By</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => {
              const successCount = batch.processed_records - batch.failed_records;
              const hasErrors = batch.failed_records > 0 || batch.status === 'failed' || batch.status === 'rolled_back';
              
              return (
                <TableRow 
                  key={batch.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectBatch(batch)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(batch.status)}
                      {getStatusBadge(batch.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{batch.source_system_name || batch.source_system}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {batch.id.slice(0, 8)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{batch.total_records}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">{successCount}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className={batch.failed_records > 0 ? "text-destructive" : "text-muted-foreground"}>
                        {batch.failed_records}
                      </span>
                      {hasErrors && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(batch.created_at), "MMM d, yyyy")}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(batch.created_at), "h:mm a")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {batch.profiles?.full_name || batch.profiles?.email || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
