import { User, AlertTriangle, Bot, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface UpdateAuditSectionProps {
  createdAt: string;
  updatedAt?: string | null;
  createdBy: UserProfile | null;
  isLegacyBilling?: boolean;
  isAiSummary?: boolean;
  aiApprovedBy?: UserProfile | null;
}

export const UpdateAuditSection = ({
  createdAt,
  updatedAt,
  createdBy,
  isLegacyBilling = false,
  isAiSummary = false,
  aiApprovedBy,
}: UpdateAuditSectionProps) => {
  const wasEdited = updatedAt && new Date(updatedAt) > new Date(createdAt);

  return (
    <div className="border-t pt-4 mt-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {/* Created by */}
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          Created by {createdBy?.full_name || createdBy?.email || "Unknown"} on{" "}
          {format(new Date(createdAt), "MMM d, yyyy 'at' h:mm a")}
        </span>

        {/* Last edited */}
        {wasEdited && (
          <>
            <span>•</span>
            <span>
              Last edited {format(new Date(updatedAt!), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </>
        )}

        {/* Legacy Billing flag */}
        {isLegacyBilling && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Legacy Billing
            </span>
          </>
        )}

        {/* AI Generated flag */}
        {isAiSummary && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1 text-blue-600">
              <Bot className="h-3 w-3" />
              AI Generated
              {aiApprovedBy && (
                <span className="flex items-center gap-0.5 ml-1">
                  <CheckCircle className="h-3 w-3" />
                  Approved by {aiApprovedBy.full_name || aiApprovedBy.email}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
