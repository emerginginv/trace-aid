import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Calendar, Clock, MapPin, ExternalLink, Link2Off } from "lucide-react";
import { format } from "date-fns";

interface LinkedActivity {
  id: string;
  title: string;
  activity_type: string;
  status: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  address: string | null;
  is_scheduled: boolean;
}

interface CaseInfo {
  id: string;
  title: string;
  case_number: string;
  status: string;
  account_name?: string | null;
}

interface UpdateSidebarProps {
  caseInfo: CaseInfo;
  linkedActivity: LinkedActivity | null;
  onViewCase: () => void;
}

export const UpdateSidebar = ({
  caseInfo,
  linkedActivity,
  onViewCase,
}: UpdateSidebarProps) => {
  return (
    <div className="space-y-4">
      {/* Case Context Card */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Case Context
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="font-medium leading-snug">{caseInfo.title}</p>
            <p className="text-sm text-muted-foreground">{caseInfo.case_number}</p>
          </div>
          {caseInfo.account_name && (
            <p className="text-sm text-muted-foreground">{caseInfo.account_name}</p>
          )}
          <Badge variant="outline" className="capitalize">
            {caseInfo.status}
          </Badge>
          <div>
            <Button 
              variant="link" 
              className="px-0 h-auto text-sm" 
              onClick={onViewCase}
            >
              View Case →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Linked Activity Card */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Linked Activity
          </h2>
        </CardHeader>
        <CardContent>
          {linkedActivity ? (
            <div className="space-y-2">
              <p className="font-medium leading-snug">{linkedActivity.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{linkedActivity.activity_type}</Badge>
                <Badge variant="outline" className="capitalize">
                  {linkedActivity.status}
                </Badge>
              </div>
              {linkedActivity.due_date && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(linkedActivity.due_date), "MMM d, yyyy")}
                </p>
              )}
              {linkedActivity.start_time && linkedActivity.end_time && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {linkedActivity.start_time} - {linkedActivity.end_time}
                </p>
              )}
              {linkedActivity.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{linkedActivity.address}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Link2Off className="h-4 w-4" />
              No linked activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
