import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";

interface UserActivitySummaryTableProps {
  timeRange: { startDate: Date; endDate: Date };
}

interface UserActivityData {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  updates: number;
  events: number;
  timeEntries: number;
  reports: number;
  shares: number;
  lastActive: Date | null;
}

export function UserActivitySummaryTable({ timeRange }: UserActivitySummaryTableProps) {
  const { organization } = useOrganization();

  const { data: activityData, isLoading } = useQuery({
    queryKey: ["user-activity-summary", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);

      const userIds = members?.map((m) => m.user_id) || [];
      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const [updates, activities, finances, reports, shares] = await Promise.all([
        supabase
          .from("case_updates")
          .select("user_id, created_at")
          .eq("organization_id", organization.id)
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
        supabase
          .from("case_activities")
          .select("user_id, created_at")
          .eq("organization_id", organization.id)
          .eq("activity_type", "event")
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
        supabase
          .from("case_finances")
          .select("user_id, created_at")
          .eq("organization_id", organization.id)
          .eq("finance_type", "time")
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
        supabase
          .from("generated_reports")
          .select("user_id, generated_at")
          .eq("organization_id", organization.id)
          .gte("generated_at", timeRange.startDate.toISOString())
          .lte("generated_at", timeRange.endDate.toISOString()),
        supabase
          .from("attachment_access")
          .select("created_by_user_id, created_at")
          .eq("organization_id", organization.id)
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
      ]);

      const userActivity = new Map<string, UserActivityData>();

      userIds.forEach((userId) => {
        const profile = profileMap.get(userId);
        userActivity.set(userId, {
          userId,
          name: profile?.full_name || "Unknown",
          email: profile?.email || "",
          avatarUrl: profile?.avatar_url || undefined,
          updates: 0,
          events: 0,
          timeEntries: 0,
          reports: 0,
          shares: 0,
          lastActive: null,
        });
      });

      updates.data?.forEach((item) => {
        const user = userActivity.get(item.user_id);
        if (user) {
          user.updates++;
          const date = new Date(item.created_at!);
          if (!user.lastActive || date > user.lastActive) user.lastActive = date;
        }
      });

      activities.data?.forEach((item) => {
        const user = userActivity.get(item.user_id);
        if (user) {
          user.events++;
          const date = new Date(item.created_at);
          if (!user.lastActive || date > user.lastActive) user.lastActive = date;
        }
      });

      finances.data?.forEach((item) => {
        const user = userActivity.get(item.user_id);
        if (user) {
          user.timeEntries++;
          const date = new Date(item.created_at);
          if (!user.lastActive || date > user.lastActive) user.lastActive = date;
        }
      });

      reports.data?.forEach((item) => {
        const user = userActivity.get(item.user_id);
        if (user) {
          user.reports++;
          const date = new Date(item.generated_at);
          if (!user.lastActive || date > user.lastActive) user.lastActive = date;
        }
      });

      shares.data?.forEach((item) => {
        const user = userActivity.get(item.created_by_user_id);
        if (user) {
          user.shares++;
          const date = new Date(item.created_at);
          if (!user.lastActive || date > user.lastActive) user.lastActive = date;
        }
      });

      return Array.from(userActivity.values())
        .filter((u) => u.updates > 0 || u.events > 0 || u.timeEntries > 0 || u.reports > 0 || u.shares > 0)
        .sort((a, b) => {
          if (!a.lastActive) return 1;
          if (!b.lastActive) return -1;
          return b.lastActive.getTime() - a.lastActive.getTime();
        });
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Activity Summary
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
          <Users className="h-4 w-4" />
          User Activity Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!activityData?.length ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No user activity in this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Updates</TableHead>
                  <TableHead className="text-center">Events</TableHead>
                  <TableHead className="text-center">Time Entries</TableHead>
                  <TableHead className="text-center">Reports</TableHead>
                  <TableHead className="text-center">Shares</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityData.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback>
                            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{user.updates}</TableCell>
                    <TableCell className="text-center font-medium">{user.events}</TableCell>
                    <TableCell className="text-center font-medium">{user.timeEntries}</TableCell>
                    <TableCell className="text-center font-medium">{user.reports}</TableCell>
                    <TableCell className="text-center font-medium">{user.shares}</TableCell>
                    <TableCell>
                      {user.lastActive ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(user.lastActive, { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
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