import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, ArrowRight } from "lucide-react";
import { HelpTooltip } from "@/components/ui/tooltip";

interface IntakePhaseBannerProps {
  status: string;
}

interface StatusContent {
  description: string;
  whatsNext: string;
}

const STATUS_CONTENT: Record<string, StatusContent> = {
  pending: {
    description: "This request is being evaluated. Review the information, match to a client, then approve or decline.",
    whatsNext: "Match to client account → Approve to create case",
  },
  under_review: {
    description: "Staff is actively reviewing this request. Client matching must be completed before approval.",
    whatsNext: "Complete client matching → Approve to create case",
  },
  approved: {
    description: "This request has been approved and a case has been created from it.",
    whatsNext: "Navigate to the created case to continue work",
  },
  declined: {
    description: "This request was declined. The decline reason has been recorded.",
    whatsNext: "No further action required",
  },
};

export function IntakePhaseBanner({ status }: IntakePhaseBannerProps) {
  const normalizedStatus = status.toLowerCase();
  const content = STATUS_CONTENT[normalizedStatus] || STATUS_CONTENT.pending;
  
  const isActive = normalizedStatus === "pending" || normalizedStatus === "under_review";
  
  return (
    <Alert 
      variant="default" 
      className={`mb-6 ${isActive ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20" : "border-muted"}`}
    >
      <Info className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
      <AlertDescription className="ml-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">Intake Phase</span>
              <Badge 
                variant="outline" 
                className={isActive ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" : ""}
              >
                {status}
              </Badge>
              <HelpTooltip 
                content="Intake is the evaluation phase before a case is created. No billable work should occur during intake. Once approved, a full case is created with all management capabilities."
                side="right"
              />
            </div>
            <p className="text-sm text-muted-foreground">{content.description}</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{content.whatsNext}</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
