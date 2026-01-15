/**
 * QuickBillDialog Component
 * 
 * A streamlined dialog for the "Quick Bill" workflow that combines:
 * - Event completion
 * - Update creation  
 * - Billing item generation
 * 
 * All in a single confirmation dialog.
 */

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
import {
  DollarSign,
  Clock,
  Receipt,
  Calculator,
  Zap,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { QuickBillEligibility, useQuickBill } from "@/hooks/useQuickBill";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QuickBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  caseId: string;
  organizationId: string;
  onSuccess: () => void;
}

export function QuickBillDialog({
  open,
  onOpenChange,
  eventId,
  caseId,
  organizationId,
  onSuccess,
}: QuickBillDialogProps) {
  const { checkEligibility, executeQuickBill, completeWithoutBilling, isProcessing } = useQuickBill();
  
  const [eligibility, setEligibility] = useState<QuickBillEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [workSummary, setWorkSummary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);

  // Load eligibility when dialog opens
  useEffect(() => {
    if (open && eventId) {
      loadEligibility();
    }
  }, [open, eventId]);

  const loadEligibility = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkEligibility(eventId);
      
      if (!result) {
        setError("This event is not eligible for Quick Bill");
        setEligibility(null);
      } else {
        setEligibility(result);
        
        // Pre-fill work summary
        const eventDate = result.eventDate 
          ? format(new Date(result.eventDate), "MMMM d, yyyy")
          : format(new Date(), "MMMM d, yyyy");
        setWorkSummary(`Completed ${result.eventTitle} on ${eventDate}.`);
        
        // Pre-fill times from eligibility if available
        if (result.startDate) setStartDate(result.startDate);
        if (result.startTime) setStartTime(result.startTime);
        if (result.endDate) setEndDate(result.endDate);
        if (result.endTime) setEndTime(result.endTime);
        
        // Default to today if no dates
        if (!result.startDate) {
          const today = new Date().toISOString().split("T")[0];
          setStartDate(today);
          setEndDate(today);
        }
      }
    } catch (err) {
      console.error("Error loading eligibility:", err);
      setError("Failed to check eligibility");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWorkSummary("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setTimeError(null);
    setError(null);
    setEligibility(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const needsTimeConfirmation = 
    eligibility?.pricingModel === "hourly" || 
    eligibility?.pricingModel === "daily";

  const validateTimes = (): boolean => {
    if (!needsTimeConfirmation) return true;
    
    if (!startDate || !startTime || !endDate || !endTime) {
      setTimeError("All time fields are required");
      return false;
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

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

  const calculateDuration = (): number | null => {
    if (!startDate || !startTime || !endDate || !endTime) return null;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) return null;

    return diffMs / (1000 * 60 * 60); // Hours
  };

  const getEstimatedAmount = (): number | null => {
    if (!eligibility?.serviceRate) return null;

    if (needsTimeConfirmation) {
      const hours = calculateDuration();
      if (!hours) return null;

      let quantity = hours;
      if (eligibility.pricingModel === "daily") {
        quantity = Math.max(1, Math.ceil(hours / 24));
      }
      return eligibility.serviceRate * quantity;
    }

    return eligibility.estimatedAmount || null;
  };

  const handleQuickBill = async () => {
    if (!workSummary.trim()) {
      toast({
        title: "Work Summary Required",
        description: "Please enter a work summary to create the billing item.",
        variant: "destructive",
      });
      return;
    }

    if (!validateTimes()) return;

    const result = await executeQuickBill({
      eventId,
      caseId,
      organizationId,
      workSummary: workSummary.trim(),
      startDate: needsTimeConfirmation ? startDate : undefined,
      startTime: needsTimeConfirmation ? startTime : undefined,
      endDate: needsTimeConfirmation ? endDate : undefined,
      endTime: needsTimeConfirmation ? endTime : undefined,
    });

    if (result.success) {
      toast({
        title: "Quick Bill Complete",
        description: "Event completed and billing item created successfully.",
      });

      if (result.budgetWarning?.isForecastWarning) {
        toast({
          title: result.budgetWarning.isForecastExceeded ? "Budget Warning" : "Budget Notice",
          description: result.budgetWarning.isForecastExceeded
            ? "Budget forecast exceeded"
            : "Approaching budget limit",
          variant: result.budgetWarning.isForecastExceeded ? "destructive" : "default",
        });
      }

      handleClose();
      onSuccess();
    } else {
      toast({
        title: "Quick Bill Failed",
        description: result.error || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSkipBilling = async () => {
    if (!workSummary.trim()) {
      toast({
        title: "Work Summary Required",
        description: "Please enter a work summary to complete the event.",
        variant: "destructive",
      });
      return;
    }

    const result = await completeWithoutBilling(
      eventId,
      caseId,
      organizationId,
      workSummary.trim()
    );

    if (result.success) {
      toast({
        title: "Event Completed",
        description: "Event marked as completed without billing.",
      });
      handleClose();
      onSuccess();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete event",
        variant: "destructive",
      });
    }
  };

  const formatRate = (rate?: number, model?: string) => {
    if (!rate) return "Rate not set";
    const unit = model === "hourly" ? "/hr" : 
                 model === "daily" ? "/day" : 
                 model === "flat" ? " flat" : 
                 "/activity";
    return `$${rate.toFixed(2)}${unit}`;
  };

  const formatQuantity = () => {
    if (!needsTimeConfirmation) {
      return eligibility?.pricingModel === "flat" ? "Flat rate" : "1 activity";
    }

    const hours = calculateDuration();
    if (!hours) return "Enter times above";

    if (eligibility?.pricingModel === "daily") {
      const days = Math.max(1, Math.ceil(hours / 24));
      return `${days} day${days !== 1 ? "s" : ""}`;
    }

    return `${hours.toFixed(2)} hours`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Bill
          </DialogTitle>
          <DialogDescription>
            Complete this event and create a billing item in one step.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : eligibility ? (
          <div className="space-y-4 py-2">
            {/* Event Info */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{eligibility.eventTitle}</p>
                  {eligibility.eventDescription && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {eligibility.eventDescription}
                    </p>
                  )}
                </div>
                {eligibility.isCompleted && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Receipt className="h-3 w-3" />
                  {eligibility.serviceName}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatRate(eligibility.serviceRate, eligibility.pricingModel)}
                </span>
              </div>
            </div>

            {/* Work Summary */}
            <div className="space-y-2">
              <Label htmlFor="workSummary" className="text-sm font-medium">
                Work Summary <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="workSummary"
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                placeholder="Describe the work completed..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This will be saved as a billing update linked to this event.
              </p>
            </div>

            {/* Time Confirmation (for hourly/daily) */}
            {needsTimeConfirmation && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Confirm Times</Label>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setTimeError(null);
                        }}
                      />
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          setTimeError(null);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setTimeError(null);
                        }}
                      />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setTimeError(null);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {timeError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {timeError}
                  </div>
                )}
              </div>
            )}

            {/* Billing Summary */}
            <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration/Quantity
                </span>
                <span className="font-medium">{formatQuantity()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  Estimated Amount
                </span>
                <span className="font-semibold text-primary">
                  {getEstimatedAmount() !== null
                    ? `$${getEstimatedAmount()!.toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              This will complete the event, create an update, and add a pending billing item for review.
            </p>
          </div>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkipBilling}
            disabled={loading || !!error || isProcessing}
            className="w-full sm:w-auto"
          >
            Skip Billing
          </Button>
          <Button
            onClick={handleQuickBill}
            disabled={loading || !!error || isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Complete & Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
