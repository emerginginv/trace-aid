/**
 * Create Billing Item Button
 * 
 * PART 7: Reusable "Create Billing Item" action component.
 * 
 * This button:
 * - Re-runs eligibility checks before allowing billing
 * - Opens BillingPromptDialog if eligible
 * - Requires time confirmation per existing flow
 * - Respects all safeguards (flat-fee, already-billed, etc.)
 * 
 * Can be used in:
 * - Update view (if linked to task/event)
 * - Service Instance view
 * - Time & Expense detail page
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUpdateBillingEligibility, UpdateBillingEligibilityResult } from "@/hooks/useUpdateBillingEligibility";
import { useBillingItemCreation } from "@/hooks/useBillingItemCreation";
import { BillingPromptDialog, ConfirmedTimes } from "@/components/billing/BillingPromptDialog";
import { getBudgetForecastWarningMessage } from "@/lib/budgetUtils";
import { logBillingAudit } from "@/lib/billingAuditLogger";

interface CreateBillingItemButtonProps {
  activityId: string;
  updateId?: string;
  /** The update's description/narrative - required for billing eligibility */
  updateDescription?: string | null;
  organizationId: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onSuccess?: () => void;
}

export function CreateBillingItemButton({
  activityId,
  updateId,
  updateDescription,
  organizationId,
  variant = "outline",
  size = "sm",
  className,
  onSuccess,
}: CreateBillingItemButtonProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [billingPromptOpen, setBillingPromptOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<UpdateBillingEligibilityResult | null>(null);
  
  const { evaluate: evaluateBillingEligibility, reset: resetBillingEligibility } = useUpdateBillingEligibility();
  const { createBillingItem, isCreating } = useBillingItemCreation();

  const handleClick = async () => {
    setIsChecking(true);
    
    try {
      // Re-run eligibility checks - pass updateDescription for narrative validation
      const result = await evaluateBillingEligibility({ 
        linkedActivityId: activityId,
        updateDescription 
      });
      
      // Log diagnostic info
      console.log('[Billing Diagnostics] Create Billing Later - Eligibility check:', {
        activityId,
        updateId,
        billingEligible: result.isEligible,
        reason: result.reason,
        activityAlreadyBilled: result.activityAlreadyBilled,
      });
      
      if (!result.isEligible) {
        toast({
          title: "Cannot Create Billing Item",
          description: result.reason || "This activity is not eligible for billing",
          variant: "destructive",
        });
        return;
      }
      
      // Log that billing prompt is being shown
      await logBillingAudit({
        action: 'billing_prompt_shown',
        organizationId,
        metadata: {
          updateId,
          activityId,
          caseServiceInstanceId: result.serviceInstanceId,
          caseId: result.caseId,
          serviceName: result.serviceName,
          pricingModel: result.pricingModel,
          source: 'create_billing_later',
        },
      });
      
      setEligibilityResult(result);
      setBillingPromptOpen(true);
    } catch (error) {
      console.error("Error checking billing eligibility:", error);
      toast({
        title: "Error",
        description: "Failed to check billing eligibility",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateBillingItem = async (confirmedTimes: ConfirmedTimes) => {
    if (!eligibilityResult || !eligibilityResult.isEligible) return;
    
    // Calculate quantity based on confirmed times
    let quantity = eligibilityResult.quantity!;
    const pricingModel = eligibilityResult.pricingModel;
    let startTimeISO: string | undefined;
    let endTimeISO: string | undefined;
    
    if ((pricingModel === 'hourly' || pricingModel === 'daily') && 
        confirmedTimes.startDate && confirmedTimes.startTime && 
        confirmedTimes.endDate && confirmedTimes.endTime) {
      const start = new Date(`${confirmedTimes.startDate}T${confirmedTimes.startTime}`);
      const end = new Date(`${confirmedTimes.endDate}T${confirmedTimes.endTime}`);
      const diffMs = end.getTime() - start.getTime();
      
      startTimeISO = start.toISOString();
      endTimeISO = end.toISOString();
      
      if (diffMs > 0) {
        if (pricingModel === 'hourly') {
          quantity = Math.max(0.25, diffMs / (1000 * 60 * 60));
        } else if (pricingModel === 'daily') {
          quantity = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
      }
    }
    
    // Log time confirmation
    await logBillingAudit({
      action: 'time_confirmed',
      organizationId: eligibilityResult.organizationId!,
      metadata: {
        updateId,
        activityId: eligibilityResult.activityId,
        caseServiceInstanceId: eligibilityResult.serviceInstanceId,
        caseId: eligibilityResult.caseId,
        pricingModel: eligibilityResult.pricingModel,
        confirmedTimes: confirmedTimes.startDate ? {
          startDate: confirmedTimes.startDate,
          startTime: confirmedTimes.startTime,
          endDate: confirmedTimes.endDate,
          endTime: confirmedTimes.endTime,
        } : undefined,
        source: 'create_billing_later',
      },
    });
    
    const result = await createBillingItem({
      activityId: eligibilityResult.activityId!,
      caseServiceInstanceId: eligibilityResult.serviceInstanceId!,
      caseId: eligibilityResult.caseId!,
      organizationId: eligibilityResult.organizationId!,
      accountId: eligibilityResult.accountId,
      serviceName: eligibilityResult.serviceName!,
      pricingModel: eligibilityResult.pricingModel!,
      quantity,
      rate: eligibilityResult.serviceRate!,
      pricingProfileId: eligibilityResult.pricingProfileId,
      pricingRuleSnapshot: eligibilityResult.pricingRuleSnapshot,
      updateId,
      startTime: startTimeISO,
      endTime: endTimeISO,
    });

    if (result.success) {
      toast({
        title: "Billing Item Created",
        description: `Pending billing item created for ${eligibilityResult.serviceName}`,
      });
      
      if (result.budgetWarning?.isForecastWarning) {
        toast({
          title: result.budgetWarning.isForecastExceeded ? "Budget Warning" : "Budget Notice",
          description: getBudgetForecastWarningMessage(
            result.budgetWarning.isForecastExceeded,
            result.budgetWarning.hardCap
          ),
          variant: result.budgetWarning.isForecastExceeded ? "destructive" : "default",
        });
      }
      
      onSuccess?.();
    } else {
      toast({
        title: "Billing Error",
        description: result.error || "Failed to create billing item",
        variant: "destructive",
      });
    }

    // Clean up
    setBillingPromptOpen(false);
    setEligibilityResult(null);
    resetBillingEligibility();
  };

  const handleSkipBilling = async () => {
    if (eligibilityResult) {
      await logBillingAudit({
        action: 'billing_skipped',
        organizationId: eligibilityResult.organizationId!,
        metadata: {
          updateId,
          activityId: eligibilityResult.activityId,
          caseServiceInstanceId: eligibilityResult.serviceInstanceId,
          caseId: eligibilityResult.caseId,
          serviceName: eligibilityResult.serviceName,
          reason: 'user_declined',
          source: 'create_billing_later',
        },
      });
    }
    
    setBillingPromptOpen(false);
    setEligibilityResult(null);
    resetBillingEligibility();
  };

  const isIconOnly = size === "icon";

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isChecking || isCreating}
        title="Create Billing Item"
      >
        {isChecking ? (
          <Loader2 className={`h-4 w-4 animate-spin ${isIconOnly ? "" : "mr-2"}`} />
        ) : (
          <DollarSign className={`h-4 w-4 ${isIconOnly ? "" : "mr-2"}`} />
        )}
        {!isIconOnly && "Create Billing Item"}
      </Button>
      
      <BillingPromptDialog
        open={billingPromptOpen}
        onOpenChange={setBillingPromptOpen}
        eligibility={eligibilityResult}
        onCreateBillingItem={handleCreateBillingItem}
        onSkip={handleSkipBilling}
      />
    </>
  );
}
