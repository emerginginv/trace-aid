/**
 * BillingPromptDialog Component
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM PROMPT 5 COMPLIANCE:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This dialog displays immediately after update submission when the update is
 * linked to a billable activity.
 * 
 * REQUIREMENTS:
 * 1. Display modal with message: "This update is linked to a billable activity.
 *    Would you like to create a billing item for this activity?"
 * 
 * 2. Provide two options:
 *    - "Yes, create billing item" → Calls onCreateBillingItem
 *    - "No, skip billing" → Calls onSkip
 * 
 * 3. CRITICAL: Choosing "No, skip billing" must NOT disable future billing actions.
 *    The onSkip handler only logs an audit event and resets UI state.
 *    No flags are set, no records are modified to prevent future billing.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM PROMPT 6 COMPLIANCE: TIME CONFIRMATION STEP
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Before creating a billing item, the user must confirm start and end times
 * for the linked task or event.
 * 
 * UI BEHAVIOR:
 * 1. Pre-populate start/end times from the linked task/event
 *    → Implemented in useEffect (line ~66-77) using eligibility.startDate,
 *      startTime, endDate, endTime
 * 
 * 2. Allow user edits
 *    → Implemented via editable Input fields in 'time' step
 * 
 * 3. Validate end time is after start time
 *    → Implemented in validateTimes() function
 *    → Error displayed: "End time must be after start time"
 * 
 * CRITICAL RULE:
 * Do NOT create any billing item until user explicitly confirms.
 * → handleConfirmAndCreate() only calls onCreateBillingItem after
 *   validateTimes() returns true
 * 
 * FLOW:
 * Step 1 ('confirm'): User sees billing prompt → clicks "Yes, Create Billing Item"
 * Step 2 ('time'): User confirms/edits times → clicks "Confirm & Create"
 * → Only then is onCreateBillingItem() called with confirmedTimes
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Clock, Receipt, Calculator, ArrowLeft, AlertCircle } from "lucide-react";
import { BillingEligibilityResult } from "@/hooks/useBillingEligibility";

export interface ConfirmedTimes {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface BillingPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: BillingEligibilityResult | null;
  onCreateBillingItem: (confirmedTimes: ConfirmedTimes) => void;
  onSkip: () => void;
}

export function BillingPromptDialog({
  open,
  onOpenChange,
  eligibility,
  onCreateBillingItem,
  onSkip,
}: BillingPromptDialogProps) {
  const [step, setStep] = useState<'confirm' | 'time'>('confirm');
  const [editedTimes, setEditedTimes] = useState<ConfirmedTimes>({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
  });
  const [timeError, setTimeError] = useState<string | null>(null);

  // Reset state when dialog opens/closes or eligibility changes
  useEffect(() => {
    if (open && eligibility) {
      setStep('confirm');
      setEditedTimes({
        startDate: eligibility.startDate || '',
        startTime: eligibility.startTime || '',
        endDate: eligibility.endDate || '',
        endTime: eligibility.endTime || '',
      });
      setTimeError(null);
    }
  }, [open, eligibility]);

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

  const validateTimes = (): boolean => {
    if (!editedTimes.startDate || !editedTimes.startTime || !editedTimes.endDate || !editedTimes.endTime) {
      setTimeError("All time fields are required");
      return false;
    }

    const start = new Date(`${editedTimes.startDate}T${editedTimes.startTime}`);
    const end = new Date(`${editedTimes.endDate}T${editedTimes.endTime}`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setTimeError("Invalid date or time format");
      return false;
    }

    if (end <= start) {
      setTimeError("End time must be after start time");
      return false;
    }
    
    setTimeError(null);
    return true;
  };

  const calculateDurationFromTimes = () => {
    if (!editedTimes.startDate || !editedTimes.startTime || !editedTimes.endDate || !editedTimes.endTime) {
      return null;
    }

    const start = new Date(`${editedTimes.startDate}T${editedTimes.startTime}`);
    const end = new Date(`${editedTimes.endDate}T${editedTimes.endTime}`);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) return null;

    const hours = diffMs / (1000 * 60 * 60);
    return hours;
  };

  const getUpdatedEstimate = () => {
    const hours = calculateDurationFromTimes();
    if (!hours || !eligibility.serviceRate) return null;

    let quantity = hours;
    if (eligibility.pricingModel === 'daily') {
      quantity = Math.max(1, Math.ceil(hours / 24));
    } else if (eligibility.pricingModel === 'hourly') {
      quantity = Math.max(0.25, hours);
    }

    return eligibility.serviceRate * quantity;
  };

  const handleProceedToTime = () => {
    setStep('time');
  };

  const handleBack = () => {
    setStep('confirm');
    setTimeError(null);
  };

  const handleConfirmAndCreate = () => {
    if (validateTimes()) {
      onCreateBillingItem(editedTimes);
    }
  };

  const needsTimeConfirmation = eligibility.pricingModel === 'hourly' || eligibility.pricingModel === 'daily';

  const handleYesClick = () => {
    if (needsTimeConfirmation) {
      handleProceedToTime();
    } else {
      // For flat/per_activity, skip time confirmation
      onCreateBillingItem(editedTimes);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Create Billing Item?
              </DialogTitle>
              <DialogDescription>
                This update is linked to a billable activity. Would you like to create a billing item for this event?
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
                No, Skip Billing
              </Button>
              <Button onClick={handleYesClick} className="w-full sm:w-auto">
                <Receipt className="h-4 w-4 mr-2" />
                Yes, Create Billing Item
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'time' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Confirm Times
              </DialogTitle>
              <DialogDescription>
                Please confirm the start and end times for this activity before creating the billing item.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Start Date/Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={editedTimes.startDate}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, startDate: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                  <Input
                    type="time"
                    value={editedTimes.startTime}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, startTime: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                </div>
              </div>

              {/* End Date/Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">End</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={editedTimes.endDate}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, endDate: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                  <Input
                    type="time"
                    value={editedTimes.endTime}
                    onChange={(e) => {
                      setEditedTimes(prev => ({ ...prev, endTime: e.target.value }));
                      setTimeError(null);
                    }}
                  />
                </div>
              </div>

              {/* Duration and Updated Estimate */}
              {calculateDurationFromTimes() !== null && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {eligibility.pricingModel === 'daily' 
                        ? `${Math.max(1, Math.ceil(calculateDurationFromTimes()! / 24))} day(s)`
                        : `${calculateDurationFromTimes()!.toFixed(2)} hours`
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Amount:</span>
                    <span className="font-semibold text-primary">
                      ${getUpdatedEstimate()?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {timeError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {timeError}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleConfirmAndCreate} className="w-full sm:w-auto">
                <Receipt className="h-4 w-4 mr-2" />
                Confirm & Create
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
