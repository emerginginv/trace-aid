import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { AccountBillingItem } from "@/hooks/useAccountBillingRates";

interface AccountRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AccountBillingItem | null;
  accountName: string;
  onSave: (data: {
    customRate: number;
    effectiveDate: string | null;
    endDate: string | null;
    notes: string | null;
  }) => void;
  isSaving: boolean;
}

export function AccountRateDialog({
  open,
  onOpenChange,
  item,
  accountName,
  onSave,
  isSaving,
}: AccountRateDialogProps) {
  const [customRate, setCustomRate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      // If no custom rate exists, pre-fill with org default if available
      const initialRate = item.customRate ?? item.defaultRate;
      setCustomRate(initialRate?.toString() || "");
      setEffectiveDate(item.effectiveDate || new Date().toISOString().split("T")[0]);
      setEndDate(item.endDate || "");
      setNotes(item.notes || "");
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate < 0) {
      return;
    }

    onSave({
      customRate: rate,
      effectiveDate: effectiveDate || null,
      endDate: endDate || null,
      notes: notes || null,
    });
  };

  const getRateLabel = () => {
    switch (item?.rateType) {
      case "hourly":
        return "Hourly Rate ($)";
      case "variable":
        return "Rate per Unit ($)";
      case "fixed":
        return "Flat Rate ($)";
      default:
        return "Rate ($)";
    }
  };

  const formatDefaultRate = () => {
    if (item?.defaultRate === null) return "Not set";
    const formatted = `$${item.defaultRate.toFixed(2)}`;
    switch (item?.rateType) {
      case "hourly":
        return `${formatted}/hr`;
      case "variable":
        return `${formatted}/unit`;
      case "fixed":
        return formatted;
      default:
        return formatted;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {item?.customRate !== null ? "Edit" : "Set"} Account Rate
            </DialogTitle>
            <DialogDescription>
              Set the billing rate for "{item?.name}" for {accountName}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Organization Default Reference */}
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Organization Default: </span>
              <span className="font-mono font-medium">
                {formatDefaultRate()}
              </span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customRate">{getRateLabel()}</Label>
              <Input
                id="customRate"
                type="number"
                step="0.01"
                min="0"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                This rate will override the organization default for this account only.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this rate..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !customRate}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Rate"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
