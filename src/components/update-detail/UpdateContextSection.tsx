import { Card, CardContent } from "@/components/ui/card";
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

interface UpdateContextSectionProps {
  caseInfo: CaseInfo;
  linkedActivity: LinkedActivity | null;
  onViewCase: () => void;
}

export const UpdateContextSection = ({
  caseInfo,
  linkedActivity,
  onViewCase,
}: UpdateContextSectionProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          Context
        </div>

        {/* Case Reference */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Case Reference</p>
          <Card className="bg-muted/30 border-muted">
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {caseInfo.title || caseInfo.case_number}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({caseInfo.case_number})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {caseInfo.status}
                    </Badge>
                    {caseInfo.account_name && (
                      <span>Account: {caseInfo.account_name}</span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onViewCase}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Case
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Linked Activity */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Linked Activity</p>
          {linkedActivity ? (
            <Card className="bg-muted/30 border-muted">
              <CardContent className="py-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={linkedActivity.is_scheduled ? "default" : "secondary"}>
                      {linkedActivity.activity_type}
                    </Badge>
                    <span className="font-medium">{linkedActivity.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="capitalize">
                      {linkedActivity.status}
                    </Badge>
                    {linkedActivity.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(linkedActivity.due_date), "MMM d, yyyy")}
                      </span>
                    )}
                    {linkedActivity.start_time && linkedActivity.end_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {linkedActivity.start_time} - {linkedActivity.end_time}
                      </span>
                    )}
                  </div>
                  {linkedActivity.address && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {linkedActivity.address}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-4 border border-dashed rounded-lg">
              <Link2Off className="h-4 w-4" />
              No linked activity
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
