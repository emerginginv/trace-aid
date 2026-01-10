import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Crown, ArrowRight } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorCode?: string;
  message?: string;
  requiredPlan?: string;
  currentUsage?: number;
  limit?: number;
  onUpgrade: () => void;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  errorCode,
  message,
  requiredPlan,
  currentUsage,
  limit,
  onUpgrade
}: UpgradeDialogProps) {
  const getTitle = () => {
    switch (errorCode) {
      case 'PLAN_LIMIT_SEATS_REACHED':
        return "Team Member Limit Reached";
      case 'PLAN_LIMIT_CASES_REACHED':
        return "Case Limit Reached";
      case 'PLAN_LIMIT_STORAGE_REACHED':
        return "Storage Limit Reached";
      case 'PLAN_FEATURE_NOT_AVAILABLE':
        return "Feature Not Available";
      case 'SUBSCRIPTION_INACTIVE':
        return "Subscription Required";
      default:
        return "Upgrade Required";
    }
  };

  const getDescription = () => {
    if (message) return message;
    
    switch (errorCode) {
      case 'PLAN_LIMIT_SEATS_REACHED':
        return `You've reached your limit of ${limit} team members. Upgrade to add more users to your organization.`;
      case 'PLAN_LIMIT_CASES_REACHED':
        return `You've reached your limit of ${limit} cases. Upgrade for unlimited case creation.`;
      case 'PLAN_LIMIT_STORAGE_REACHED':
        return "You've reached your storage limit. Upgrade your plan or add a storage addon.";
      case 'PLAN_FEATURE_NOT_AVAILABLE':
        return `This feature requires ${requiredPlan || 'a higher plan'}. Upgrade to unlock it.`;
      case 'SUBSCRIPTION_INACTIVE':
        return "An active subscription is required to use this feature. Please subscribe to continue.";
      default:
        return "Upgrade your plan to continue with this action.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-warning/20">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <DialogTitle>{getTitle()}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {currentUsage !== undefined && limit !== undefined && (
          <div className="py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{currentUsage}</p>
                <p className="text-muted-foreground">Current</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-2xl font-bold">{limit}</p>
                <p className="text-muted-foreground">Limit</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={onUpgrade}>
            <Crown className="h-4 w-4 mr-2" />
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeDialog;
