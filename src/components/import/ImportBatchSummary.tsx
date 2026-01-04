import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  CheckCircle2, XCircle, Clock, RotateCcw, Database,
  Calendar, User, FileText, Download, AlertTriangle
} from "lucide-react";
import { getEntityDisplayName } from "@/lib/csvParser";

interface ImportBatchSummaryProps {
  batch: any;
}

export function ImportBatchSummary({ batch }: ImportBatchSummaryProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [recordStats, setRecordStats] = useState<Record<string, { total: number; success: number; failed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch import logs
        const { data: logsData } = await supabase
          .from("import_logs")
          .select("*")
          .eq("batch_id", batch.id)
          .order("created_at", { ascending: true });
        
        setLogs(logsData || []);
        
        // Fetch import records to get stats by entity
        const { data: recordsData } = await supabase
          .from("import_records")
          .select("entity_type, status")
          .eq("batch_id", batch.id);
        
        if (recordsData) {
          const stats: Record<string, { total: number; success: number; failed: number }> = {};
          recordsData.forEach(record => {
            if (!stats[record.entity_type]) {
              stats[record.entity_type] = { total: 0, success: 0, failed: 0 };
            }
            stats[record.entity_type].total++;
            if (record.status === 'imported') {
              stats[record.entity_type].success++;
            } else if (record.status === 'failed') {
              stats[record.entity_type].failed++;
            }
          });
          setRecordStats(stats);
        }
      } catch (err) {
        console.error("Failed to fetch batch details:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDetails();
  }, [batch.id]);
  
  const successCount = batch.processed_records - batch.failed_records;
  const successRate = batch.total_records > 0 
    ? Math.round((successCount / batch.total_records) * 100) 
    : 100;
  
  const getStatusIcon = () => {
    if (batch.status === 'rolled_back') {
      return <RotateCcw className="h-6 w-6 text-destructive" />;
    }
    if (batch.status === 'completed' && batch.failed_records === 0) {
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
    if (batch.status === 'completed' && batch.failed_records > 0) {
      return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    }
    if (batch.status === 'failed') {
      return <XCircle className="h-6 w-6 text-destructive" />;
    }
    return <Clock className="h-6 w-6 text-muted-foreground" />;
  };
  
  const handleDownloadLog = () => {
    const logContent = logs.map(log => 
      `[${format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}] ${log.event_type}: ${log.message}`
    ).join("\n");
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-log-${batch.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle>
                  {batch.source_system_name || batch.source_system}
                </CardTitle>
                <CardDescription className="font-mono">
                  Batch ID: {batch.id}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={batch.status === 'completed' && batch.failed_records === 0 
                ? "outline" 
                : "destructive"
              }
              className={batch.status === 'completed' && batch.failed_records === 0 
                ? "border-green-500 text-green-600" 
                : ""
              }
            >
              {batch.status === 'rolled_back' ? 'Rolled Back' : batch.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Database className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{batch.total_records}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">
                {batch.status === 'rolled_back' ? 0 : successCount}
              </p>
              <p className="text-sm text-muted-foreground">Imported</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <XCircle className="h-5 w-5 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">
                {batch.failed_records}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {batch.status === 'rolled_back' ? '0%' : `${successRate}%`}
              </p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Import Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Started: {format(new Date(batch.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                {batch.completed_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Completed: {format(new Date(batch.completed_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>By: {batch.profiles?.full_name || batch.profiles?.email || "Unknown"}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadLog}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Log
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Records by Entity */}
      {Object.keys(recordStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Records by Entity Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(recordStats).map(([entityType, stats]) => (
                  <TableRow key={entityType}>
                    <TableCell className="font-medium">
                      {getEntityDisplayName(entityType)}
                    </TableCell>
                    <TableCell className="text-right">{stats.total}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {batch.status === 'rolled_back' ? 0 : stats.success}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {stats.failed}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Import Timeline */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Timeline</CardTitle>
            <CardDescription>
              Chronological log of import events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-auto">
              {logs.map((log, idx) => (
                <div 
                  key={log.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="text-muted-foreground font-mono text-xs min-w-[80px]">
                    {format(new Date(log.created_at), "HH:mm:ss")}
                  </div>
                  <div className={`flex-1 ${
                    log.event_type === 'failed' || log.event_type === 'rolled_back' 
                      ? 'text-destructive' 
                      : log.event_type === 'completed' 
                        ? 'text-green-600'
                        : ''
                  }`}>
                    <Badge 
                      variant="outline" 
                      className="mr-2 text-xs"
                    >
                      {log.event_type}
                    </Badge>
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
