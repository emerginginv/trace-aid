import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, History, AlertTriangle, Bot, CheckCircle } from "lucide-react";
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
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" />
          Activity & Audit
        </div>

        {/* Created Info */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</p>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {createdBy?.full_name || createdBy?.email || "Unknown user"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(createdAt), "MMMM d, yyyy 'at' h:mm:ss a")}</span>
          </div>
        </div>

        {/* Last Edited (only if edited after creation) */}
        {wasEdited && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Edited</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(updatedAt!), "MMMM d, yyyy 'at' h:mm:ss a")}</span>
            </div>
          </div>
        )}

        {/* Flags */}
        {(isLegacyBilling || isAiSummary) && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Flags</p>
            <div className="flex flex-wrap gap-3">
              {isLegacyBilling && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700">Legacy Billing</p>
                    <p className="text-xs text-amber-600/80">Imported from legacy system</p>
                  </div>
                </div>
              )}
              {isAiSummary && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700">AI Generated</p>
                    {aiApprovedBy ? (
                      <p className="text-xs text-blue-600/80 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approved by: {aiApprovedBy.full_name || aiApprovedBy.email}
                      </p>
                    ) : (
                      <p className="text-xs text-blue-600/80">Pending approval</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
