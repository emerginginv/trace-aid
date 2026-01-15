import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import { BudgetConsumption } from "@/hooks/useBudgetConsumption";

interface BudgetBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consumption: BudgetConsumption;
  onSaveAsNonBillable: () => void;
  activityTitle?: string;
}

export function BudgetBlockedDialog({
  open,
  onOpenChange,
  consumption,
  onSaveAsNonBillable,
  activityTitle,
}: BudgetBlockedDialogProps) {
  const hoursOver = consumption.hoursAuthorized > 0 
    ? Math.abs(consumption.hoursRemaining) 
    : 0;
  const amountOver = consumption.amountAuthorized > 0 
    ? Math.abs(consumption.amountRemaining) 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatHours = (value: number) => {
    return value.toFixed(1);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Budget Exceeded - Hard Cap</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This case is over its hard budget cap. Billable activities cannot 
                be added until the budget is increased.
              </p>
              
              {/* Budget details */}
              <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                {consumption.hoursAuthorized > 0 && (
                  <div className="flex justify-between">
                    <span>Hours:</span>
                    <span className="font-medium text-destructive">
                      {formatHours(consumption.hoursConsumed)} / {formatHours(consumption.hoursAuthorized)}
                      {hoursOver > 0 && ` (${formatHours(hoursOver)} over)`}
                    </span>
                  </div>
                )}
                {consumption.amountAuthorized > 0 && (
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(consumption.amountConsumed)} / {formatCurrency(consumption.amountAuthorized)}
                      {amountOver > 0 && ` (${formatCurrency(amountOver)} over)`}
                    </span>
                  </div>
                )}
              </div>
              
              <p className="text-muted-foreground">
                Would you like to save {activityTitle ? `"${activityTitle}"` : "this activity"} as a non-billable note instead?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSaveAsNonBillable}>
            Save as Non-Billable Note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
