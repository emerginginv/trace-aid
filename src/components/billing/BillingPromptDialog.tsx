import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Receipt, X, Calculator } from "lucide-react";
import { BillingEligibilityResult } from "@/hooks/useBillingEligibility";

interface BillingPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: BillingEligibilityResult | null;
  onCreateBillingItem: () => void;
  onSkip: () => void;
  onNeverAsk?: () => void;
}

export function BillingPromptDialog({
  open,
  onOpenChange,
  eligibility,
  onCreateBillingItem,
  onSkip,
  onNeverAsk,
}: BillingPromptDialogProps) {
  if (!eligibility || !eligibility.isEligible) return null;

  const formatRate = (rate?: number, unit?: string) => {
    if (!rate) return "Rate not set";
    const unitLabel = unit === "hour" ? "/hr" : 
                      unit === "day" ? "/day" : 
                      unit === "flat" ? " flat" : 
                      unit === "activity" ? "/activity" :
                      `/${unit}`;
    return `$${rate.toFixed(2)}${unitLabel}`;
  };

  const formatQuantity = (quantity?: number, pricingModel?: string) => {
    if (!quantity) return null;
    
    switch (pricingModel) {
      case "hourly":
        return `${quantity.toFixed(2)} hours`;
      case "daily":
        return `${quantity} day${quantity !== 1 ? 's' : ''}`;
      case "per_activity":
        return "1 activity";
      case "flat":
        return "Flat rate";
      default:
        return `${quantity} unit${quantity !== 1 ? 's' : ''}`;
    }
  };

  const formatEstimate = (amount?: number) => {
    if (!amount) return null;
    return `$${amount.toFixed(2)}`;
  };

  const getPricingModelLabel = (model?: string) => {
    switch (model) {
      case "hourly": return "Hourly";
      case "daily": return "Daily";
      case "per_activity": return "Per Activity";
      case "flat": return "Flat Rate";
      default: return model || "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Create Billing Item?
          </DialogTitle>
          <DialogDescription>
            This activity is linked to a billable service. Would you like to create a billing item for review?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Activity Info */}
          {eligibility.activityTitle && (
            <div className="text-sm">
              <span className="text-muted-foreground">Activity:</span>{" "}
              <span className="font-medium">{eligibility.activityTitle}</span>
            </div>
          )}
          
          {/* Service Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{eligibility.serviceName}</span>
              <span className="text-sm text-muted-foreground">
                {formatRate(eligibility.serviceRate, eligibility.priceUnit)}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getPricingModelLabel(eligibility.pricingModel)}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Billable
              </span>
            </div>

            {/* Quantity and Estimate */}
            {(eligibility.quantity || eligibility.estimatedAmount) && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    {formatQuantity(eligibility.quantity, eligibility.pricingModel)}
                  </span>
                  {eligibility.estimatedAmount && (
                    <span className="font-semibold text-primary">
                      Est. {formatEstimate(eligibility.estimatedAmount)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Creating a billing item does not finalize the charge. All billing items require explicit approval before being added to an invoice.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
            Skip for Now
          </Button>
          {onNeverAsk && (
            <Button 
              variant="ghost" 
              onClick={onNeverAsk}
              className="w-full sm:w-auto text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Don't Ask Again
            </Button>
          )}
          <Button onClick={onCreateBillingItem} className="w-full sm:w-auto">
            <Receipt className="h-4 w-4 mr-2" />
            Create Billing Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
