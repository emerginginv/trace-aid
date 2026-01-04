import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, AlertCircle, Search, Filter, ChevronDown, 
  Download, XCircle, Info
} from "lucide-react";
import { getEntityDisplayName } from "@/lib/csvParser";
import type { ImportErrorCode } from "@/types/import";

interface ImportErrorReviewProps {
  batchId: string;
}

interface ErrorEntry {
  id: string;
  entity_type: string;
  external_record_id: string | null;
  error_code: string;
  error_message: string;
  error_details: unknown;
  created_at: string;
}

interface WarningEntry {
  id: string;
  entity_type: string;
  external_record_id: string | null;
  event_type: string;
  message: string;
  details: unknown;
  created_at: string;
}

const ERROR_CODE_LABELS: Record<string, { label: string; severity: 'error' | 'warning' }> = {
  VALIDATION_FAILED: { label: 'Validation Failed', severity: 'error' },
  REFERENCE_NOT_FOUND: { label: 'Missing Reference', severity: 'error' },
  DUPLICATE_RECORD: { label: 'Duplicate Record', severity: 'warning' },
  DATABASE_ERROR: { label: 'Database Error', severity: 'error' },
  CONSTRAINT_VIOLATION: { label: 'Constraint Violation', severity: 'error' },
  TRANSACTION_FAILED: { label: 'Transaction Failed', severity: 'error' },
  ROLLBACK_FAILED: { label: 'Rollback Failed', severity: 'error' },
  UNKNOWN_ERROR: { label: 'Unknown Error', severity: 'error' },
};

export function ImportErrorReview({ batchId }: ImportErrorReviewProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [warnings, setWarnings] = useState<WarningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [errorCodeFilter, setErrorCodeFilter] = useState<string>("all");
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  
  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const fetchErrorsAndWarnings = async () => {
      setIsLoading(true);
      try {
        // Fetch errors
        const { data: errorsData } = await supabase
          .from("import_errors")
          .select("*")
          .eq("batch_id", batchId)
          .order("created_at", { ascending: true });
        
        setErrors(errorsData || []);
        
        // Fetch warnings from logs (record_failed events that aren't in errors)
        const { data: warningsData } = await supabase
          .from("import_logs")
          .select("*")
          .eq("batch_id", batchId)
          .eq("event_type", "record_failed")
          .order("created_at", { ascending: true });
        
        // Transform warnings
        const transformedWarnings: WarningEntry[] = (warningsData || []).map(log => ({
          id: log.id,
          entity_type: log.entity_type || 'unknown',
          external_record_id: log.external_record_id,
          event_type: log.event_type,
          message: log.message,
          details: log.details as Record<string, unknown> | null,
          created_at: log.created_at,
        }));
        
        setWarnings(transformedWarnings);
      } catch (err) {
        console.error("Failed to fetch errors:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchErrorsAndWarnings();
  }, [batchId]);
  
  // Get unique entity types
  const entityTypes = useMemo(() => {
    const types = new Set<string>();
    errors.forEach(e => types.add(e.entity_type));
    warnings.forEach(w => types.add(w.entity_type));
    return Array.from(types);
  }, [errors, warnings]);
  
  // Get unique error codes
  const errorCodes = useMemo(() => {
    return Array.from(new Set(errors.map(e => e.error_code)));
  }, [errors]);
  
  // Filter and combine items
  const filteredItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'error' | 'warning';
      entityType: string;
      externalRecordId: string | null;
      code?: string;
      message: string;
      details: unknown;
      createdAt: string;
    }> = [];
    
    if (showErrors) {
      errors.forEach(e => {
        items.push({
          id: e.id,
          type: 'error',
          entityType: e.entity_type,
          externalRecordId: e.external_record_id,
          code: e.error_code,
          message: e.error_message,
          details: e.error_details,
          createdAt: e.created_at,
        });
      });
    }
    
    if (showWarnings) {
      warnings.forEach(w => {
        // Avoid duplicates if warning is already in errors
        if (!errors.find(e => e.external_record_id === w.external_record_id && e.entity_type === w.entity_type)) {
          items.push({
            id: w.id,
            type: 'warning',
            entityType: w.entity_type,
            externalRecordId: w.external_record_id,
            message: w.message,
            details: w.details,
            createdAt: w.created_at,
          });
        }
      });
    }
    
    // Apply filters
    return items.filter(item => {
      // Entity filter
      if (entityFilter !== 'all' && item.entityType !== entityFilter) return false;
      
      // Error code filter
      if (errorCodeFilter !== 'all' && item.code !== errorCodeFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.externalRecordId?.toLowerCase().includes(query) ||
          item.message.toLowerCase().includes(query) ||
          item.entityType.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [errors, warnings, showErrors, showWarnings, entityFilter, errorCodeFilter, searchQuery]);
  
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleDownloadErrors = () => {
    const headers = "Type,Entity,External ID,Error Code,Message\n";
    const rows = filteredItems.map(item => 
      `"${item.type}","${item.entityType}","${item.externalRecordId || ''}","${item.code || ''}","${item.message.replace(/"/g, '""')}"`
    ).join("\n");
    
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${batchId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold mb-2">No Errors or Warnings</h3>
          <p className="text-muted-foreground">
            This import completed without any issues.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className={errors.length > 0 ? "border-destructive/30" : ""}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{errors.length}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={warnings.length > 0 ? "border-yellow-500/30" : ""}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{warnings.length}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Issues
              </CardTitle>
              <CardDescription>
                {filteredItems.length} of {errors.length + warnings.length} issues shown
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getEntityDisplayName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={errorCodeFilter} onValueChange={setErrorCodeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Error Code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Codes</SelectItem>
                {errorCodes.map(code => (
                  <SelectItem key={code} value={code}>
                    {ERROR_CODE_LABELS[code]?.label || code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Button
                variant={showErrors ? "default" : "outline"}
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Errors
              </Button>
              <Button
                variant={showWarnings ? "default" : "outline"}
                size="sm"
                onClick={() => setShowWarnings(!showWarnings)}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Warnings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Issues List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No issues match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <Collapsible key={item.id} asChild open={expandedRows.has(item.id)}>
                    <>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(item.id)}
                      >
                        <TableCell>
                          {item.type === 'error' ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              Warning
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getEntityDisplayName(item.entityType)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.externalRecordId || '-'}
                        </TableCell>
                        <TableCell>
                          {item.code && (
                            <Badge variant="outline" className="text-xs">
                              {ERROR_CODE_LABELS[item.code]?.label || item.code}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.message}
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className={`h-4 w-4 transition-transform ${
                                expandedRows.has(item.id) ? 'rotate-180' : ''
                              }`} />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="py-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium text-sm mb-1">Full Message</h4>
                                <p className="text-sm text-muted-foreground">{item.message}</p>
                              </div>
                              {item.details && Object.keys(item.details).length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-1">Details</h4>
                                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                                    {JSON.stringify(item.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
