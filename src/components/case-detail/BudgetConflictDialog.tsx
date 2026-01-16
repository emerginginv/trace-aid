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
import { AlertTriangle, DollarSign, Clock } from "lucide-react";

interface CurrentBudget {
  budget_type: string;
  total_budget_hours: number | null;
  total_budget_amount: number | null;
}

interface BudgetConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  currentBudget: CurrentBudget | null;
  newStrategy: string;
  newCaseTypeName: string;
}

export function BudgetConflictDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  currentBudget,
  newStrategy,
  newCaseTypeName,
}: BudgetConflictDialogProps) {
  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  // Determine what will be affected
  const getAffectedData = () => {
    if (!currentBudget) return null;

    if (newStrategy === 'disabled') {
      return {
        title: "Budget Will Be Removed",
        description: `Changing to "${newCaseTypeName}" will disable budgets. The existing budget configuration will be removed.`,
        affectedItems: [
          currentBudget.total_budget_hours ? `${currentBudget.total_budget_hours} hours budget` : null,
          currentBudget.total_budget_amount ? `$${currentBudget.total_budget_amount.toLocaleString()} dollar budget` : null,
        ].filter(Boolean) as string[],
      };
    }

    if (newStrategy === 'hours_only' && currentBudget.total_budget_amount) {
      return {
        title: "Dollar Budget Will Be Cleared",
        description: `Changing to "${newCaseTypeName}" uses hours-only budgets. The dollar budget amount will be cleared.`,
        affectedItems: [
          `$${currentBudget.total_budget_amount.toLocaleString()} dollar budget will be removed`,
        ],
      };
    }

    if (newStrategy === 'money_only' && currentBudget.total_budget_hours) {
      return {
        title: "Hours Budget Will Be Cleared",
        description: `Changing to "${newCaseTypeName}" uses money-only budgets. The hours budget will be cleared.`,
        affectedItems: [
          `${currentBudget.total_budget_hours} hours budget will be removed`,
        ],
      };
    }

    return null;
  };

  const affectedData = getAffectedData();

  if (!affectedData) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>{affectedData.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{affectedData.description}</p>
              
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Affected budget data:</p>
                <ul className="space-y-1.5">
                  {affectedData.affectedItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      {item.includes('hours') ? (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-foreground font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-amber-600 dark:text-amber-400 text-sm">
                This budget data will be permanently removed if you continue.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
