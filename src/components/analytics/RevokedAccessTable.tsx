import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { ShieldOff } from "lucide-react";

interface RevokedAccessTableProps {
  timeRange: { startDate: Date; endDate: Date };
}

export function RevokedAccessTable({ timeRange }: RevokedAccessTableProps) {
  const { organization } = useOrganization();

  const { data: revokedData, isLoading } = useQuery({
    queryKey: ["revoked-access-events", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get revoked access records
      const { data: accessData, error: accessError } = await supabase
        .from("attachment_access")
        .select("id, attachment_id, attachment_type, revoked_at, revoked_by_user_id, created_by_user_id, created_at")
        .eq("organization_id", organization.id)
        .not("revoked_at", "is", null)
        .gte("revoked_at", timeRange.startDate.toISOString())
        .lte("revoked_at", timeRange.endDate.toISOString())
        .order("revoked_at", { ascending: false })
        .limit(20);

      if (accessError) throw accessError;

      if (!accessData?.length) return [];

      // Get unique user IDs
      const userIds = new Set<string>();
      accessData.forEach((item) => {
        if (item.revoked_by_user_id) userIds.add(item.revoked_by_user_id);
        if (item.created_by_user_id) userIds.add(item.created_by_user_id);
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

      return accessData.map((item) => ({
        ...item,
        revokedByName: profileMap.get(item.revoked_by_user_id || "")?.full_name || 
                       profileMap.get(item.revoked_by_user_id || "")?.email || 
                       "Unknown",
        creatorName: profileMap.get(item.created_by_user_id)?.full_name || 
                     profileMap.get(item.created_by_user_id)?.email || 
                     "Unknown",
        fileName: attachmentMap.get(item.attachment_id) || "Unknown file",
      }));
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-destructive" />
            Revoked Access Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-destructive" />
          Revoked Access Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!revokedData?.length ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No revocation events in this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revoked At</TableHead>
                  <TableHead>Revoked By</TableHead>
                  <TableHead>Original Creator</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(item.revoked_at!), "MMM d, yyyy")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.revoked_at!), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.revokedByName}</TableCell>
                    <TableCell>{item.creatorName}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.fileName}>
                      {item.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.attachment_type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
