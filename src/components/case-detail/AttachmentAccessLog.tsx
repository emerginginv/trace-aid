import { format, formatDistanceToNow } from "date-fns";
import { Link2, RefreshCw, Clock, ShieldOff, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface AccessLogEntry {
  id: string;
  access_token: string;
  attachment_id: string;
  attachment_type: string;
  created_at: string;
  created_by_user_id: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  last_accessed_at: string | null;
  access_count: number;
}

export interface ProfileInfo {
  id: string;
  full_name: string | null;
  email: string;
}

interface AttachmentAccessLogProps {
  logs: AccessLogEntry[];
  profiles: Record<string, ProfileInfo>;
  isLoading?: boolean;
  onRefresh?: () => void;
}

type AccessStatus = "active" | "expired" | "revoked";

const getAccessStatus = (log: AccessLogEntry): { status: AccessStatus; label: string } => {
  if (log.revoked_at) {
    return { status: "revoked", label: "Revoked" };
  }
  if (log.expires_at && new Date(log.expires_at) < new Date()) {
    return { status: "expired", label: "Expired" };
  }
  return { status: "active", label: "Active" };
};

const StatusBadge = ({ status, label }: { status: AccessStatus; label: string }) => {
  const styles: Record<AccessStatus, string> = {
    active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    expired: "bg-muted text-muted-foreground border-border",
    revoked: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const icons: Record<AccessStatus, React.ReactNode> = {
    active: <CheckCircle className="h-3 w-3" />,
    expired: <Clock className="h-3 w-3" />,
    revoked: <ShieldOff className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", styles[status])}>
      {icons[status]}
      {label}
    </Badge>
  );
};

const AccessLogCard = ({ 
  log, 
  profiles 
}: { 
  log: AccessLogEntry; 
  profiles: Record<string, ProfileInfo>;
}) => {
  const { status, label } = getAccessStatus(log);
  const creator = profiles[log.created_by_user_id];
  const revoker = log.revoked_by_user_id ? profiles[log.revoked_by_user_id] : null;

  const creatorName = creator?.full_name || creator?.email || "Unknown User";
  const revokerName = revoker?.full_name || revoker?.email || "Unknown User";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">
                Created {format(new Date(log.created_at), "PPP 'at' p")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              By: {creatorName}
            </p>
            {log.expires_at && status === "active" && (
              <p className="text-sm text-muted-foreground">
                Expires: {format(new Date(log.expires_at), "PPP 'at' p")}
                <span className="text-xs ml-1">
                  ({formatDistanceToNow(new Date(log.expires_at), { addSuffix: true })})
                </span>
              </p>
            )}
            {log.expires_at && status === "expired" && (
              <p className="text-sm text-muted-foreground">
                Expired: {format(new Date(log.expires_at), "PPP 'at' p")}
              </p>
            )}
            {!log.expires_at && status === "active" && (
              <p className="text-sm text-muted-foreground">
                No expiration set
              </p>
            )}
          </div>
          <StatusBadge status={status} label={label} />
        </div>

        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
          {log.access_count > 0 ? (
            <span>
              Accessed {log.access_count} time{log.access_count !== 1 ? "s" : ""}
              {log.last_accessed_at && (
                <span className="ml-1">
                  (last: {format(new Date(log.last_accessed_at), "PP")})
                </span>
              )}
            </span>
          ) : (
            <span className="italic">Never accessed</span>
          )}
        </div>

        {log.revoked_at && (
          <div className="mt-2 text-sm text-destructive">
            Revoked on {format(new Date(log.revoked_at), "PPP 'at' p")} by {revokerName}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="mt-3 pt-3 border-t">
            <Skeleton className="h-3 w-28" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export function AttachmentAccessLog({ 
  logs, 
  profiles, 
  isLoading, 
  onRefresh 
}: AttachmentAccessLogProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No access links have been created for this attachment.</p>
      </div>
    );
  }

  const activeCount = logs.filter(l => getAccessStatus(l).status === "active").length;
  const expiredCount = logs.filter(l => getAccessStatus(l).status === "expired").length;
  const revokedCount = logs.filter(l => getAccessStatus(l).status === "revoked").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {logs.length} link{logs.length !== 1 ? "s" : ""} total
          <span className="mx-2">•</span>
          <span className="text-green-600 dark:text-green-400">{activeCount} active</span>
          {expiredCount > 0 && (
            <>
              <span className="mx-2">•</span>
              <span>{expiredCount} expired</span>
            </>
          )}
          {revokedCount > 0 && (
            <>
              <span className="mx-2">•</span>
              <span className="text-destructive">{revokedCount} revoked</span>
            </>
          )}
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <AccessLogCard key={log.id} log={log} profiles={profiles} />
        ))}
      </div>
    </div>
  );
}
