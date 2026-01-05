import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  RefreshCw, 
  Link2, 
  CheckCircle, 
  Clock, 
  ShieldOff,
  Filter,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PreviewAuditLog } from "./PreviewAuditLog";

interface Attachment {
  id: string;
  file_name: string;
  file_type?: string;
  name?: string | null;
}

interface AccessLogEntry {
  id: string;
  attachment_id: string;
  created_at: string;
  created_by_user_id: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  last_accessed_at: string | null;
  access_count: number;
}

interface ProfileInfo {
  id: string;
  full_name: string | null;
  email: string;
}

interface CaseAccessAuditPanelProps {
  caseId: string;
  attachments: Attachment[];
  canExport?: boolean;
}

type StatusFilter = "all" | "active" | "expired" | "revoked";

const getAccessStatus = (log: AccessLogEntry): { status: StatusFilter; label: string } => {
  if (log.revoked_at) {
    return { status: "revoked", label: "Revoked" };
  }
  if (log.expires_at && new Date(log.expires_at) < new Date()) {
    return { status: "expired", label: "Expired" };
  }
  return { status: "active", label: "Active" };
};

const StatusBadge = ({ status, label }: { status: StatusFilter; label: string }) => {
  const styles: Record<StatusFilter, string> = {
    all: "",
    active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    expired: "bg-muted text-muted-foreground border-border",
    revoked: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const icons: Record<string, React.ReactNode> = {
    active: <CheckCircle className="h-3 w-3" />,
    expired: <Clock className="h-3 w-3" />,
    revoked: <ShieldOff className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1 w-fit", styles[status])}>
      {icons[status]}
      {label}
    </Badge>
  );
};

export function CaseAccessAuditPanel({
  caseId,
  attachments,
  canExport = false,
}: CaseAccessAuditPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"external" | "internal">("external");
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fileFilter, setFileFilter] = useState<string>("all");

  const attachmentMap = new Map(attachments.map((a) => [a.id, a]));

  const fetchLogs = useCallback(async () => {
    if (attachments.length === 0) return;

    setIsLoading(true);
    try {
      const attachmentIds = attachments.map((a) => a.id);
      
      const { data: logsData, error } = await supabase
        .from("attachment_access")
        .select("*")
        .in("attachment_id", attachmentIds)
        .eq("attachment_type", "case")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const accessLogs = logsData || [];
      setLogs(accessLogs);

      // Collect user IDs for profile lookup
      const userIds = new Set<string>();
      accessLogs.forEach((log) => {
        userIds.add(log.created_by_user_id);
        if (log.revoked_by_user_id) {
          userIds.add(log.revoked_by_user_id);
        }
      });

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", [...userIds]);

        const profilesMap: Record<string, ProfileInfo> = {};
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error fetching access audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [attachments]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const { status } = getAccessStatus(log);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesFile = fileFilter === "all" || log.attachment_id === fileFilter;
    return matchesStatus && matchesFile;
  });

  const handleExportCSV = () => {
    const headers = ["File", "Created By", "Created At", "Status", "Expires At", "Access Count", "Last Accessed", "Revoked At", "Revoked By"];
    
    const rows = filteredLogs.map((log) => {
      const attachment = attachmentMap.get(log.attachment_id);
      const creator = profiles[log.created_by_user_id];
      const revoker = log.revoked_by_user_id ? profiles[log.revoked_by_user_id] : null;
      const { label } = getAccessStatus(log);

      return [
        attachment?.name || attachment?.file_name || "Unknown",
        creator?.full_name || creator?.email || "Unknown",
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        label,
        log.expires_at ? format(new Date(log.expires_at), "yyyy-MM-dd HH:mm:ss") : "Never",
        log.access_count.toString(),
        log.last_accessed_at ? format(new Date(log.last_accessed_at), "yyyy-MM-dd HH:mm:ss") : "Never",
        log.revoked_at ? format(new Date(log.revoked_at), "yyyy-MM-dd HH:mm:ss") : "",
        revoker?.full_name || revoker?.email || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `case-access-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalLinks = logs.length;
  const activeLinks = logs.filter((l) => getAccessStatus(l).status === "active").length;

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6 border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="font-medium">Access Audit Log</span>
            {totalLinks > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalLinks} link{totalLinks !== 1 ? "s" : ""}
                {activeLinks > 0 && (
                  <span className="ml-1 text-green-600 dark:text-green-400">
                    ({activeLinks} active)
                  </span>
                )}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "external" | "internal")}>
            <TabsList className="mb-4">
              <TabsTrigger value="external" className="gap-2">
                <Link2 className="h-4 w-4" />
                External Access
              </TabsTrigger>
              <TabsTrigger value="internal" className="gap-2">
                <Eye className="h-4 w-4" />
                Internal Previews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="external" className="space-y-4 mt-0">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={fileFilter} onValueChange={setFileFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All files" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All files</SelectItem>
                      {attachments.map((attachment) => (
                        <SelectItem key={attachment.id} value={attachment.id}>
                          {attachment.name || attachment.file_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>

                {canExport && filteredLogs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {logs.length === 0
                      ? "No access links have been created for this case."
                      : "No links match the current filters."}
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Accessed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const attachment = attachmentMap.get(log.attachment_id);
                        const creator = profiles[log.created_by_user_id];
                        const { status, label } = getAccessStatus(log);

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {attachment?.name || attachment?.file_name || "Unknown"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {creator?.full_name || creator?.email || "Unknown"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(log.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={status} label={label} />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {log.access_count > 0 ? (
                                <span>{log.access_count} time{log.access_count !== 1 ? "s" : ""}</span>
                              ) : (
                                <span className="italic">Never</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="internal" className="mt-0">
              <PreviewAuditLog caseId={caseId} attachments={attachments} />
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
