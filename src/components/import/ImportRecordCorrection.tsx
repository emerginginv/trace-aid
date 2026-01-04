import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { 
  AlertTriangle, Edit2, RotateCcw, Check, X, Save, 
  Upload, FileText, Info, Loader2
} from "lucide-react";
import { getEntityDisplayName } from "@/lib/csvParser";
import type { MappingConfig, DEFAULT_MAPPING_CONFIG } from "@/types/import";

interface ImportRecordCorrectionProps {
  batchId: string;
  originalBatch: any;
  onReimportComplete: () => void;
}

interface FailedRecord {
  id: string;
  entity_type: string;
  external_record_id: string;
  source_data: Record<string, unknown>;
  error_message: string | null;
  status: string;
  selected: boolean;
  correctedData: Record<string, unknown>;
  hasChanges: boolean;
}

export function ImportRecordCorrection({ batchId, originalBatch, onReimportComplete }: ImportRecordCorrectionProps) {
  const { organization } = useOrganization();
  const [failedRecords, setFailedRecords] = useState<FailedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReimporting, setIsReimporting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FailedRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Fetch failed records
  useEffect(() => {
    const fetchFailedRecords = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("import_records")
          .select("*")
          .eq("batch_id", batchId)
          .eq("status", "failed")
          .order("entity_type", { ascending: true });
        
        if (error) throw error;
        
        const records: FailedRecord[] = (data || []).map(record => ({
          id: record.id,
          entity_type: record.entity_type,
          external_record_id: record.external_record_id,
          source_data: record.source_data as Record<string, unknown>,
          error_message: record.error_message,
          status: record.status,
          selected: false,
          correctedData: { ...(record.source_data as Record<string, unknown>) },
          hasChanges: false,
        }));
        
        setFailedRecords(records);
      } catch (err) {
        console.error("Failed to fetch failed records:", err);
        toast.error("Failed to load failed records");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFailedRecords();
  }, [batchId]);
  
  const selectedCount = useMemo(() => 
    failedRecords.filter(r => r.selected).length
  , [failedRecords]);
  
  const correctedCount = useMemo(() => 
    failedRecords.filter(r => r.hasChanges).length
  , [failedRecords]);
  
  const toggleSelectAll = (checked: boolean) => {
    setFailedRecords(prev => prev.map(r => ({ ...r, selected: checked })));
  };
  
  const toggleSelect = (id: string) => {
    setFailedRecords(prev => prev.map(r => 
      r.id === id ? { ...r, selected: !r.selected } : r
    ));
  };
  
  const handleEditRecord = (record: FailedRecord) => {
    setEditingRecord(record);
    setEditFormData({ ...record.correctedData });
  };
  
  const handleSaveEdit = () => {
    if (!editingRecord) return;
    
    // Check if data actually changed
    const hasChanges = JSON.stringify(editFormData) !== JSON.stringify(editingRecord.source_data);
    
    setFailedRecords(prev => prev.map(r => 
      r.id === editingRecord.id 
        ? { ...r, correctedData: { ...editFormData }, hasChanges, selected: hasChanges ? true : r.selected }
        : r
    ));
    
    setEditingRecord(null);
    setEditFormData({});
    toast.success("Record updated");
  };
  
  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditFormData({});
  };
  
  const handleStartReimport = () => {
    const recordsToReimport = failedRecords.filter(r => r.selected);
    if (recordsToReimport.length === 0) {
      toast.error("Please select at least one record to re-import");
      return;
    }
    setShowConfirmDialog(true);
  };
  
  const handleConfirmReimport = async () => {
    if (!organization?.id) return;
    
    setIsReimporting(true);
    setShowConfirmDialog(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const recordsToReimport = failedRecords.filter(r => r.selected);
      
      // Create a NEW import batch (original remains immutable)
      const { data: newBatch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          source_system: `Correction of ${originalBatch.id.slice(0, 8)}`,
          source_system_name: `Re-import from ${originalBatch.source_system_name || originalBatch.source_system}`,
          mapping_config: originalBatch.mapping_config,
          status: 'pending',
          total_records: recordsToReimport.length,
        })
        .select()
        .single();
      
      if (batchError) throw batchError;
      
      // Log that this is a correction batch
      await supabase.from("import_logs").insert({
        batch_id: newBatch.id,
        event_type: 'started',
        message: `Re-import correction batch created from original batch ${batchId}. Correcting ${recordsToReimport.length} record(s).`,
        details: {
          original_batch_id: batchId,
          corrected_record_ids: recordsToReimport.map(r => r.id),
        },
      });
      
      // Create new import_records for the corrected data
      const newRecords = recordsToReimport.map(record => ({
        batch_id: newBatch.id,
        entity_type: record.entity_type,
        external_record_id: `CORR-${record.external_record_id}`,
        source_data: JSON.parse(JSON.stringify(record.correctedData)),
        status: 'pending' as const,
      }));
      
      const { error: recordsError } = await supabase
        .from("import_records")
        .insert(newRecords);
      
      if (recordsError) throw recordsError;
      
      // Call the execute-import edge function
      const response = await supabase.functions.invoke('execute-import', {
        body: {
          batchId: newBatch.id,
          organizationId: organization.id,
          userId: user.id,
          sourceSystemName: `Correction of ${originalBatch.source_system_name || originalBatch.source_system}`,
          entities: groupRecordsByEntity(recordsToReimport),
          mappingConfig: originalBatch.mapping_config || {
            updateTypes: [],
            eventTypes: [],
            unmappedAction: 'use_original',
          },
        },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const result = response.data;
      
      if (result.success) {
        toast.success(`Successfully re-imported ${result.successCount} record(s)`);
        
        // Remove successfully imported records from the list
        setFailedRecords(prev => prev.filter(r => !r.selected));
      } else {
        toast.error(`Re-import completed with ${result.failedCount} error(s)`);
      }
      
      onReimportComplete();
      
    } catch (err) {
      console.error("Re-import failed:", err);
      toast.error(`Re-import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsReimporting(false);
    }
  };
  
  // Helper to group records by entity type
  const groupRecordsByEntity = (records: FailedRecord[]) => {
    const groups: Record<string, Array<{ externalRecordId: string; data: Record<string, unknown>; sourceData: Record<string, unknown> }>> = {};
    
    records.forEach(record => {
      if (!groups[record.entity_type]) {
        groups[record.entity_type] = [];
      }
      groups[record.entity_type].push({
        externalRecordId: `CORR-${record.external_record_id}`,
        data: record.correctedData,
        sourceData: record.source_data,
      });
    });
    
    return Object.entries(groups).map(([entityType, recs]) => ({
      entityType,
      records: recs,
    }));
  };
  
  // Get editable fields for an entity type
  const getEditableFields = (record: FailedRecord) => {
    const data = record.correctedData;
    return Object.keys(data).filter(key => 
      !key.startsWith('_') && 
      key !== 'id' && 
      key !== 'created_at' &&
      key !== 'updated_at'
    );
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
  
  if (failedRecords.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold mb-2">No Failed Records</h3>
          <p className="text-muted-foreground">
            All records from this import batch were processed successfully.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Immutable Import Batches</AlertTitle>
        <AlertDescription>
          Original import batches cannot be modified. When you re-import corrected records, 
          a new batch will be created maintaining full audit trail. The original batch ID 
          will be referenced in the new batch for traceability.
        </AlertDescription>
      </Alert>
      
      {/* Summary & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Correct Failed Records
              </CardTitle>
              <CardDescription>
                {failedRecords.length} failed record(s) • {selectedCount} selected • {correctedCount} corrected
              </CardDescription>
            </div>
            <Button 
              onClick={handleStartReimport}
              disabled={selectedCount === 0 || isReimporting}
            >
              {isReimporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Re-import Selected ({selectedCount})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedCount === failedRecords.length}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Checkbox 
                      checked={record.selected}
                      onCheckedChange={() => toggleSelect(record.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {getEntityDisplayName(record.entity_type)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.external_record_id}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm text-destructive truncate block">
                      {record.error_message || 'Unknown error'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {record.hasChanges ? (
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Corrected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditRecord(record)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => handleCancelEdit()}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Edit {editingRecord && getEntityDisplayName(editingRecord.entity_type)} Record
            </DialogTitle>
            <DialogDescription>
              External ID: {editingRecord?.external_record_id}
            </DialogDescription>
          </DialogHeader>
          
          {editingRecord && (
            <>
              {/* Show original error */}
              {editingRecord.error_message && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Original Error</AlertTitle>
                  <AlertDescription>{editingRecord.error_message}</AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-4">
                  {getEditableFields(editingRecord).map((field) => {
                    const value = editFormData[field];
                    const isObject = typeof value === 'object' && value !== null;
                    
                    return (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={field} className="capitalize">
                          {field.replace(/_/g, ' ')}
                        </Label>
                        {isObject ? (
                          <Textarea
                            id={field}
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                setEditFormData(prev => ({
                                  ...prev,
                                  [field]: JSON.parse(e.target.value)
                                }));
                              } catch {
                                // Invalid JSON, keep as string
                              }
                            }}
                            className="font-mono text-xs"
                            rows={4}
                          />
                        ) : (
                          <Input
                            id={field}
                            value={String(value ?? '')}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [field]: e.target.value
                            }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Re-import Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Re-import</DialogTitle>
            <DialogDescription>
              You are about to re-import {selectedCount} corrected record(s).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>New Batch Created</AlertTitle>
              <AlertDescription>
                A new import batch will be created for these records. The original 
                batch ({batchId.slice(0, 8)}) will remain unchanged for audit purposes.
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground">
              <p><strong>Records to re-import:</strong> {selectedCount}</p>
              <p><strong>Corrected records:</strong> {correctedCount}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReimport}>
              <Upload className="h-4 w-4 mr-2" />
              Start Re-import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
