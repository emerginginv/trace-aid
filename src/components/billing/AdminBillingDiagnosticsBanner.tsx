/**
 * Admin Billing Diagnostics Banner
 * 
 * PART 3: Admin diagnostics banner that displays billing evaluation results.
 * This banner is ONLY visible to admin users and shows structured diagnostics
 * explaining why billing was or was not triggered.
 * 
 * CRITICAL: Never show this banner to investigators or clients.
 */

import { AlertCircle, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BillingEvaluationDiagnostics } from "@/types/billing";

interface AdminBillingDiagnosticsBannerProps {
  diagnostics: BillingEvaluationDiagnostics | null;
  isAdmin: boolean;
}

export function AdminBillingDiagnosticsBanner({ 
  diagnostics, 
  isAdmin 
}: AdminBillingDiagnosticsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Never render for non-admins
  if (!isAdmin || !diagnostics) {
    return null;
  }

  const DiagnosticItem = ({ 
    label, 
    value, 
    passed 
  }: { 
    label: string; 
    value: boolean; 
    passed?: boolean; 
  }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  );

  return (
    <Alert 
      variant={diagnostics.eligible_for_billing ? "default" : "destructive"}
      className="mt-4 border-dashed border-2"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {diagnostics.eligible_for_billing ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <div>
            <AlertTitle className="flex items-center gap-2">
              <span>Billing Diagnostics</span>
              <Badge variant="outline" className="text-xs">
                Admin Only
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-1">
              {diagnostics.eligible_for_billing 
                ? "Billing eligible - prompt shown to user"
                : `Billing Not Triggered: ${diagnostics.failure_reason || 'Unknown reason'}`
              }
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-1">
          <DiagnosticItem 
            label="Linked activity" 
            value={diagnostics.has_linked_activity} 
          />
          <DiagnosticItem 
            label="Service instance found" 
            value={diagnostics.has_service_instance} 
          />
          <DiagnosticItem 
            label="Service billable" 
            value={diagnostics.service_billable} 
          />
          <DiagnosticItem 
            label="Rate found" 
            value={diagnostics.rate_found} 
          />
          <DiagnosticItem 
            label="Not already billed" 
            value={!diagnostics.already_billed} 
          />
          <div className="flex items-center justify-between py-1 pt-2 border-t">
            <span className="text-sm font-medium">Eligible for billing</span>
            <Badge variant={diagnostics.eligible_for_billing ? "default" : "destructive"}>
              {diagnostics.eligible_for_billing ? 'YES' : 'NO'}
            </Badge>
          </div>
          
          {diagnostics.context && (
            <div className="mt-3 pt-2 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span className="font-medium">Context:</span>
              </div>
              {diagnostics.context.updateId && (
                <div>Update: {diagnostics.context.updateId.slice(0, 8)}...</div>
              )}
              {diagnostics.context.activityId && (
                <div>Activity: {diagnostics.context.activityId.slice(0, 8)}...</div>
              )}
              {diagnostics.context.serviceName && (
                <div>Service: {diagnostics.context.serviceName}</div>
              )}
              {diagnostics.context.pricingModel && (
                <div>Pricing Model: {diagnostics.context.pricingModel}</div>
              )}
              <div className="text-xs opacity-75">
                Evaluated: {new Date(diagnostics.evaluated_at).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      )}
    </Alert>
  );
}
