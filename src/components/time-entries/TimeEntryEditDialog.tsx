import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  case_id: string;
  date: string;
  case_title: string;
  case_number: string;
  description: string;
  hours: number;
  pay_rate: number;
  pay_total: number;
  status: string;
  user_id: string;
  user_name: string | null;
}

interface TimeEntryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntry | null;
  onSuccess: () => void;
}

export function TimeEntryEditDialog({ 
  open, 
  onOpenChange, 
  entry, 
  onSuccess 
}: TimeEntryEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (entry) {
      setHours(entry.hours?.toString() || "");
      setRate(entry.pay_rate?.toString() || "");
      setNotes(entry.description || "");
    }
  }, [entry]);

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  const handleSubmit = async () => {
    if (!entry) return;

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from("time_entries")
        .update({
          hours: parseFloat(hours) || 0,
          rate: parseFloat(rate) || 0,
          total: total,
          notes: notes,
        })
        .eq("id", entry.id);

      if (error) throw error;

      toast.success("Time entry updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      toast.error(`Failed to update time entry: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {entry && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{entry.case_number}</span> - {entry.case_title}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rate">Hourly Rate ($)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Description</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter description..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-lg font-bold">${total.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
