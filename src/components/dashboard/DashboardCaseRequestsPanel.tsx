import { useNavigate } from "react-router-dom";
import { ClipboardList, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelListItem } from "@/components/shared/Panel/PanelListItem";
import { Button } from "@/components/ui/button";
import { BasePanelSkeleton } from "@/components/shared/Panel/BasePanel";
import { PendingCaseRequest } from "@/hooks/usePendingCaseRequests";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DashboardCaseRequestsPanelProps {
  requests: PendingCaseRequest[];
  count: number;
  isLoading: boolean;
}

export function DashboardCaseRequestsPanel({
  requests,
  count,
  isLoading,
}: DashboardCaseRequestsPanelProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleRequestClick = (request: PendingCaseRequest) => {
    navigate(`/cases/requests/${request.id}`);
  };

  const handleViewAll = () => {
    navigate("/cases/requests");
  };

  const isEmpty = requests.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Pending Requests</CardTitle>
          {count > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
              {count}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleViewAll}
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
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
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <BasePanelSkeleton />
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No pending case requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <PanelListItem
                  key={request.id}
                  onClick={() => handleRequestClick(request)}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium leading-tight truncate">
                          {request.request_number || "New Request"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {request.submitted_client_name && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {request.submitted_client_name}
                          </span>
                        )}
                        {request.submitted_client_name && request.primarySubjectName && (
                          <span className="text-xs text-muted-foreground">•</span>
                        )}
                        {request.primarySubjectName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {request.primarySubjectName}
                          </span>
                        )}
                        {(request.submitted_client_name || request.primarySubjectName) && (
                          <span className="text-xs text-muted-foreground">•</span>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </PanelListItem>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
