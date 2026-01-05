import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { FileKey, ChevronLeft, ChevronRight } from "lucide-react";

interface SharingAuditTableProps {
  timeRange: { startDate: Date; endDate: Date };
}

type LinkStatus = "all" | "active" | "expired" | "revoked";

export function SharingAuditTable({ timeRange }: SharingAuditTableProps) {
  const { organization } = useOrganization();
  const [statusFilter, setStatusFilter] = useState<LinkStatus>("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["sharing-audit-table", organization?.id, timeRange.startDate, timeRange.endDate, statusFilter, page],
    queryFn: async () => {
      if (!organization?.id) return { items: [], total: 0 };

      let query = supabase
        .from("attachment_access")
        .select("*", { count: "exact" })
        .eq("organization_id", organization.id)
        .gte("created_at", timeRange.startDate.toISOString())
        .lte("created_at", timeRange.endDate.toISOString())
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply status filter
      const now = new Date().toISOString();
      if (statusFilter === "revoked") {
        query = query.not("revoked_at", "is", null);
      } else if (statusFilter === "expired") {
        query = query.is("revoked_at", null).lt("expires_at", now);
      } else if (statusFilter === "active") {
        query = query.is("revoked_at", null).or(`expires_at.is.null,expires_at.gt.${now}`);
      }

      const { data: accessData, error: accessError, count } = await query;

      if (accessError) throw accessError;

      if (!accessData?.length) return { items: [], total: count || 0 };

      // Get unique user IDs
      const userIds = new Set<string>();
      accessData.forEach((item) => {
        if (item.created_by_user_id) userIds.add(item.created_by_user_id);
        if (item.revoked_by_user_id) userIds.add(item.revoked_by_user_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Get attachment names
      const caseAttachmentIds = accessData
        .filter((a) => a.attachment_type === "case")
        .map((a) => a.attachment_id);
      const subjectAttachmentIds = accessData
        .filter((a) => a.attachment_type === "subject")
        .map((a) => a.attachment_id);

      const [caseAttachments, subjectAttachments] = await Promise.all([
        caseAttachmentIds.length > 0
          ? supabase
              .from("case_attachments")
              .select("id, file_name")
              .in("id", caseAttachmentIds)
          : { data: [] },
        subjectAttachmentIds.length > 0
          ? supabase
              .from("subject_attachments")
              .select("id, file_name")
              .in("id", subjectAttachmentIds)
          : { data: [] },
      ]);

      const attachmentMap = new Map([
        ...(caseAttachments.data || []).map((a) => [a.id, a.file_name] as const),
        ...(subjectAttachments.data || []).map((a) => [a.id, a.file_name] as const),
      ]);

      // Calculate status for each item
      const nowDate = new Date();
      const items = accessData.map((item) => {
        let status: "active" | "expired" | "revoked" = "active";
        if (item.revoked_at) {
          status = "revoked";
        } else if (item.expires_at && new Date(item.expires_at) < nowDate) {
          status = "expired";
        }

        return {
          ...item,
          status,
          creatorName: profileMap.get(item.created_by_user_id)?.full_name ||
                       profileMap.get(item.created_by_user_id)?.email ||
                       "Unknown",
          revokedByName: item.revoked_by_user_id
            ? profileMap.get(item.revoked_by_user_id)?.full_name ||
              profileMap.get(item.revoked_by_user_id)?.email ||
              "Unknown"
            : null,
          fileName: attachmentMap.get(item.attachment_id) || "Unknown file",
        };
      });

      return { items, total: count || 0 };
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileKey className="h-4 w-4" />
            Sharing Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil((auditData?.total || 0) / pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileKey className="h-4 w-4" />
          Sharing Audit Log
        </CardTitle>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as LinkStatus); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {!auditData?.items?.length ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No sharing activity in this period
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Attachment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Accesses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Revoked By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.creatorName}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={item.fileName}>
                        {item.fileName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.attachment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "active"
                              ? "default"
                              : item.status === "revoked"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.access_count}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.expires_at
                          ? format(new Date(item.expires_at), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.revokedByName || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, auditData.total)} of {auditData.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
