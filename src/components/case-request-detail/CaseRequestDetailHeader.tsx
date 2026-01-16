import { Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

interface CaseRequestDetailHeaderProps {
  requestNumber: string | null;
  primarySubjectName: string;
  status: string;
  matchedAccountId: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onDelete: () => void;
  isProcessing: boolean;
}

export function CaseRequestDetailHeader({
  requestNumber,
  primarySubjectName,
  status,
  matchedAccountId,
  onAccept,
  onDecline,
  onDelete,
  isProcessing,
}: CaseRequestDetailHeaderProps) {
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('approve_case_requests');
  const canDelete = hasPermission('delete_case_requests');
  const isPending = status.toLowerCase() === 'pending';

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold">
          {requestNumber || 'Case Request'}
          {primarySubjectName && primarySubjectName !== '—' && (
            <span className="text-muted-foreground font-normal ml-2">
              ({primarySubjectName})
            </span>
          )}
        </h1>
      </div>

      {isPending && (
        <div className="flex items-center gap-2">
          {canApprove && (
            <>
              <Button
                onClick={onAccept}
                disabled={isProcessing || !matchedAccountId}
                title={!matchedAccountId ? "Match a client before accepting" : "Accept request"}
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                variant="outline"
                onClick={onDecline}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
