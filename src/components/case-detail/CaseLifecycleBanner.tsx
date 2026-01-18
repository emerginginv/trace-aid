import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Info, ChevronDown, ChevronUp, Shield, Scale, FolderKanban } from "lucide-react";

interface CaseLifecycleBannerProps {
  statusKey: string | null;
  phase: "intake" | "execution" | null;
}

interface PhaseContent {
  title: string;
  description: string;
  whatsNext: string;
  variant: "default" | "info";
  icon?: React.ReactNode;
}

const PHASE_CONTENT: Record<string, PhaseContent> = {
  // Intake Phase
  requested: {
    title: "Intake Phase",
    description: "This request is being evaluated. Focus on gathering information and verifying request details. No billable work should occur.",
    whatsNext: "Review request details, match to client, then approve or decline.",
    variant: "info",
  },
  under_review: {
    title: "Intake Phase - Under Review",
    description: "This request is under staff review. Client matching must be completed before approval.",
    whatsNext: "Complete client matching, then approve to create an active case.",
    variant: "info",
  },
  approved: {
    title: "Request Approved",
    description: "This request has been approved and a case has been created.",
    whatsNext: "Navigate to the case to begin work.",
    variant: "default",
  },
  declined: {
    title: "Request Declined",
    description: "This request was declined. The decline reason should be documented.",
    whatsNext: "No further action required. Request is closed.",
    variant: "default",
  },
  // Execution Phase
  new: {
    title: "Execution Phase - New Case",
    description: "This case is ready for assignment. Configure team and set expectations before work begins.",
    whatsNext: "Assign investigators, set up budget if needed, then move to Active when fieldwork starts.",
    variant: "info",
  },
  assigned: {
    title: "Execution Phase - Assigned",
    description: "Investigators have been assigned. Work is pending to begin.",
    whatsNext: "Start fieldwork and move to Active status.",
    variant: "info",
  },
  active: {
    title: "Execution Phase - Active",
    description: "Investigation in progress. All activities, time entries, and expenses are being tracked.",
    whatsNext: "Complete work, document findings, then move to Completed for final review.",
    variant: "default",
  },
  on_hold: {
    title: "Execution Phase - On Hold",
    description: "Case is paused. Time entries are disabled. Use this when waiting for external factors.",
    whatsNext: "Document the hold reason in updates. Resume to Active when ready to continue.",
    variant: "info",
  },
  awaiting_client: {
    title: "Execution Phase - Awaiting Client",
    description: "Case is waiting for client response. Document what you're waiting for in updates.",
    whatsNext: "Return to Active when client information is received.",
    variant: "info",
  },
  awaiting_records: {
    title: "Execution Phase - Awaiting Records",
    description: "Case is waiting for external records or documents.",
    whatsNext: "Return to Active when records are received.",
    variant: "info",
  },
  completed: {
    title: "Execution Phase - Completed",
    description: "Investigation complete. Final reports and invoicing can proceed.",
    whatsNext: "Generate final report, create invoice, then close the case.",
    variant: "default",
  },
  closed: {
    title: "Case Closed",
    description: "Case is closed and read-only. The complete audit trail is preserved for compliance.",
    whatsNext: "No further action. Case preserved for reference and reporting.",
    variant: "default",
  },
  cancelled: {
    title: "Case Cancelled",
    description: "Case was terminated before completion. The audit trail is preserved.",
    whatsNext: "No further action. Case preserved for reference.",
    variant: "default",
  },
};

export function CaseLifecycleBanner({ statusKey, phase }: CaseLifecycleBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const content = statusKey ? PHASE_CONTENT[statusKey] : null;
  
  if (!content) return null;
  
  const isIntake = phase === "intake";
  
  return (
    <Alert variant="default" className="mb-4 border-primary/20 bg-primary/5">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="ml-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">{content.title}</span>
              <Badge variant="outline" className="text-xs">
                {isIntake ? "Intake" : "Execution"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{content.description}</p>
            <p className="text-sm mt-1">
              <span className="font-medium text-foreground">Next:</span>{" "}
              <span className="text-muted-foreground">{content.whatsNext}</span>
            </p>
          </div>
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Why this matters
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-primary" />
                    Protects Investigators
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clear phase boundaries mean you always know what's expected. Status restrictions prevent accidental billing errors. The audit trail documents every decision, protecting you if work is ever questioned.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Scale className="h-4 w-4 text-primary" />
                    Improves Defensibility
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When opposing counsel examines your work, the Case Century creates an unbroken chain from request through closure. Every status change, timestamp, and file upload is logged as evidence of proper procedure.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    Improves Organization
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Status-driven workflow means cases don't get lost. Hold cases are visible, nothing slips through the cracks. Managers see at a glance which cases need attention and which are progressing normally.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </AlertDescription>
    </Alert>
  );
}
