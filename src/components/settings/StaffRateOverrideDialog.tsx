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
import { StaffPricingItem } from "@/hooks/useStaffPricing";

interface StaffRateOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StaffPricingItem | null;
  staffName: string;
  onSave: (data: {
    customRate: number;
    effectiveDate: string | null;
    endDate: string | null;
    notes: string | null;
  }) => void;
  isSaving: boolean;
}

export function StaffRateOverrideDialog({
  open,
  onOpenChange,
  item,
  staffName,
  onSave,
  isSaving,
}: StaffRateOverrideDialogProps) {
  const [customRate, setCustomRate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (item) {
      setCustomRate(item.customRate?.toString() || item.defaultRate?.toString() || "");
      setEffectiveDate(item.effectiveDate || new Date().toISOString().split("T")[0]);
      setEndDate(item.endDate || "");
      setNotes(item.notes || "");
    }
  }, [item]);

  const handleSave = () => {
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

  const getRateTypeLabel = (rateType: string) => {
    switch (rateType) {
      case "hourly":
        return "/hr";
      case "variable":
        return "/unit";
      case "fixed":
        return " flat";
      default:
        return "";
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Custom Rate</DialogTitle>
          <DialogDescription>
            Set a custom cost rate for <strong>{staffName}</strong> on{" "}
            <strong>{item.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Default Rate</Label>
            <p className="text-sm">
              ${item.defaultRate?.toFixed(2) || "0.00"}
              {getRateTypeLabel(item.rateType)}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customRate">Custom Rate ($)</Label>
            <Input
              id="customRate"
              type="number"
              step="0.01"
              min="0"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              placeholder="Enter custom rate"
            />
            <p className="text-xs text-muted-foreground">
              This rate will be used for {item.rateType === "hourly" ? "hourly pay" : item.rateType === "variable" ? "per-unit reimbursement" : "flat pay"}
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
              placeholder="Reason for custom rate, contract details, etc."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !customRate}>
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
      </DialogContent>
    </Dialog>
  );
}
