import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDurationDetailed } from "@/hooks/use-case-status-history";

interface StatusHistoryEntry {
  id: string;
  to_status: string;
  entered_at: string;
  exited_at: string | null;
}

interface EditStatusDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyEntry: StatusHistoryEntry;
  onSuccess: () => void;
}

export function EditStatusDatesDialog({ 
  open, 
  onOpenChange, 
  historyEntry,
  onSuccess 
}: EditStatusDatesDialogProps) {
  const [enteredAt, setEnteredAt] = useState('');
  const [exitedAt, setExitedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Convert ISO date to datetime-local format
  const toDateTimeLocal = (isoDate: string | null): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    // Adjust for local timezone
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };
  
  // Convert datetime-local to ISO format
  const toISODate = (localDate: string): string | null => {
    if (!localDate) return null;
    return new Date(localDate).toISOString();
  };
  
  // Initialize form values when entry changes
  useEffect(() => {
    if (historyEntry) {
      setEnteredAt(toDateTimeLocal(historyEntry.entered_at));
      setExitedAt(toDateTimeLocal(historyEntry.exited_at));
      setError(null);
    }
  }, [historyEntry]);
  
  // Calculate live duration preview
  const durationPreview = useMemo(() => {
    if (!enteredAt) return null;
    
    const entered = new Date(enteredAt);
    let exited: Date;
    
    if (exitedAt) {
      exited = new Date(exitedAt);
    } else {
      exited = new Date(); // Use now for current status
    }
    
    const diffSeconds = Math.floor((exited.getTime() - entered.getTime()) / 1000);
    
    if (diffSeconds < 0) {
      return { valid: false, text: 'Invalid: exit before entry' };
    }
    
    return { valid: true, text: formatDurationDetailed(diffSeconds) };
  }, [enteredAt, exitedAt]);
  
  const handleSave = async () => {
    setError(null);
    
    // Validation
    if (!enteredAt) {
      setError('Entry time is required');
      return;
    }
    
    if (exitedAt && new Date(enteredAt) >= new Date(exitedAt)) {
      setError('Entry time must be before exit time');
      return;
    }
    
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Call the database function
      const { data, error: rpcError } = await supabase.rpc('update_status_history_dates', {
        p_history_id: historyEntry.id,
        p_entered_at: toISODate(enteredAt),
        p_exited_at: exitedAt ? toISODate(exitedAt) : null,
        p_user_id: user.id,
      });
      
      if (rpcError) throw rpcError;
      
      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update dates');
      }
      
      toast({
        title: 'Dates updated',
        description: 'Status history dates have been updated successfully.',
      });
      
      onSuccess();
    } catch (err: any) {
      console.error('Error updating dates:', err);
      setError(err.message || 'Failed to update dates');
    } finally {
      setSaving(false);
    }
  };
  
  const hasChanges = useMemo(() => {
    const originalEntered = toDateTimeLocal(historyEntry.entered_at);
    const originalExited = toDateTimeLocal(historyEntry.exited_at);
    return enteredAt !== originalEntered || exitedAt !== originalExited;
  }, [enteredAt, exitedAt, historyEntry]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Status Dates</DialogTitle>
          <DialogDescription>
            Adjust entry and exit times for "{historyEntry.to_status}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Status Name (read-only) */}
          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <p className="font-medium">{historyEntry.to_status}</p>
          </div>
          
          {/* Entered At */}
          <div className="space-y-2">
            <Label htmlFor="entered-at">Entry Time</Label>
            <Input
              id="entered-at"
              type="datetime-local"
              value={enteredAt}
              onChange={(e) => setEnteredAt(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Exited At */}
          <div className="space-y-2">
            <Label htmlFor="exited-at">Exit Time</Label>
            <Input
              id="exited-at"
              type="datetime-local"
              value={exitedAt}
              onChange={(e) => setExitedAt(e.target.value)}
              disabled={historyEntry.exited_at === null}
              className="w-full"
            />
            {historyEntry.exited_at === null && (
              <p className="text-xs text-muted-foreground">
                This is the current status - exit time cannot be set
              </p>
            )}
          </div>
          
          {/* Duration Preview */}
          {durationPreview && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Duration: {' '}
                <span className={durationPreview.valid ? 'font-medium' : 'text-destructive'}>
                  {durationPreview.text}
                </span>
              </span>
            </div>
          )}
          
          {/* Warning */}
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
              Editing dates will mark this entry as manually overridden. 
              If you change the exit time, the next entry's start time will be adjusted automatically.
            </AlertDescription>
          </Alert>
          
          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges || (durationPreview && !durationPreview.valid)}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
