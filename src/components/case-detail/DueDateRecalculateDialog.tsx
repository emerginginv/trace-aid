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
import { Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface DueDateRecalculateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeepCurrent: () => void;
  onUpdateToNew: () => void;
  currentDueDate: Date | null;
  newDueDate: Date;
  defaultDays: number;
  caseTypeName?: string;
}

export function DueDateRecalculateDialog({
  open,
  onOpenChange,
  onKeepCurrent,
  onUpdateToNew,
  currentDueDate,
  newDueDate,
  defaultDays,
  caseTypeName,
}: DueDateRecalculateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recalculate Due Date?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                The selected case type{caseTypeName ? ` "${caseTypeName}"` : ""} has a default due date of{" "}
                <strong>{defaultDays} days</strong> from today.
              </p>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Due Date</p>
                  <p className="font-medium text-foreground">
                    {currentDueDate ? format(currentDueDate, "PPP") : "Not set"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-1">New Due Date</p>
                  <p className="font-medium text-foreground">
                    {format(newDueDate, "PPP")}
                  </p>
                </div>
              </div>
              
              <p className="text-sm">
                Would you like to update the due date to the new calculated value?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepCurrent}>
            Keep Current
          </AlertDialogCancel>
          <AlertDialogAction onClick={onUpdateToNew}>
            Update to New Date
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
