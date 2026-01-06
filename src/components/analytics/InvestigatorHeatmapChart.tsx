import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, getDay, getHours } from "date-fns";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";
import { cn } from "@/lib/utils";

interface InvestigatorHeatmapChartProps {
  organizationId: string;
  timeRange: ResolvedTimeRange;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function InvestigatorHeatmapChart({ organizationId, timeRange }: InvestigatorHeatmapChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["investigator-heatmap", organizationId, timeRange],
    queryFn: async () => {
      // Fetch all activities (updates, events, tasks)
      const [updatesRes, activitiesRes, financesRes] = await Promise.all([
        supabase
          .from("case_updates")
          .select("id, created_at, user_id")
          .eq("organization_id", organizationId)
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString()),
        supabase
          .from("case_activities")
          .select("id, created_at, user_id")
          .eq("organization_id", organizationId)
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString()),
        supabase
          .from("case_finances")
          .select("id, created_at, user_id")
          .eq("organization_id", organizationId)
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString()),
      ]);

      if (updatesRes.error) throw updatesRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (financesRes.error) throw financesRes.error;

      // Combine all activities
      const allActivities = [
        ...(updatesRes.data || []),
        ...(activitiesRes.data || []),
        ...(financesRes.data || []),
      ];

      // Create heatmap grid (7 days x 24 hours)
      const heatmapGrid: number[][] = Array.from({ length: 7 }, () => 
        Array.from({ length: 24 }, () => 0)
      );

      // Populate grid
      for (const activity of allActivities) {
        const date = parseISO(activity.created_at);
        const dayOfWeek = getDay(date);
        const hour = getHours(date);
        heatmapGrid[dayOfWeek][hour]++;
      }

      // Find max for color scaling
      const maxValue = Math.max(...heatmapGrid.flat(), 1);

      // Get busiest times
      const flattened = heatmapGrid.flatMap((row, day) => 
        row.map((count, hour) => ({ day, hour, count }))
      ).sort((a, b) => b.count - a.count);

      const busiestPeriods = flattened.slice(0, 5).filter(p => p.count > 0);

      return {
        grid: heatmapGrid,
        maxValue,
        totalActivities: allActivities.length,
        busiestPeriods,
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investigator Activity Heatmap</CardTitle>
          <CardDescription>When team members are most active (updates, activities, and finance entries)</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const grid = data?.grid || [];
  const maxValue = data?.maxValue || 1;

  const getIntensity = (value: number) => {
    if (value === 0) return 0;
    return Math.ceil((value / maxValue) * 5);
  };

  const getColorClass = (intensity: number) => {
    switch (intensity) {
      case 0: return "bg-muted";
      case 1: return "bg-primary/20";
      case 2: return "bg-primary/40";
      case 3: return "bg-primary/60";
      case 4: return "bg-primary/80";
      case 5: return "bg-primary";
      default: return "bg-muted";
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12a";
    if (hour === 12) return "12p";
    return hour < 12 ? `${hour}a` : `${hour - 12}p`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investigator Activity Heatmap</CardTitle>
        <CardDescription>
          {data?.totalActivities || 0} activities recorded
          {data?.busiestPeriods && data.busiestPeriods.length > 0 && (
            <> &bull; Busiest: {DAYS[data.busiestPeriods[0].day]} {formatHour(data.busiestPeriods[0].hour)}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data?.totalActivities === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            No activity data in this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="w-10" /> {/* Spacer for day labels */}
                {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
                  <div 
                    key={hour} 
                    className="flex-1 text-xs text-muted-foreground text-center"
                    style={{ minWidth: "36px" }}
                  >
                    {formatHour(hour)}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <TooltipProvider>
                {DAYS.map((day, dayIndex) => (
                  <div key={day} className="flex items-center mb-1">
                    <div className="w-10 text-xs text-muted-foreground font-medium">
                      {day}
                    </div>
                    <div className="flex flex-1 gap-0.5">
                      {HOURS.map(hour => {
                        const value = grid[dayIndex]?.[hour] || 0;
                        const intensity = getIntensity(value);
                        return (
                          <Tooltip key={hour}>
                            <TooltipTrigger asChild>
                              <div 
                                className={cn(
                                  "h-6 flex-1 rounded-sm cursor-pointer transition-colors hover:ring-2 hover:ring-ring",
                                  getColorClass(intensity)
                                )}
                                style={{ minWidth: "12px" }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{day} {formatHour(hour)}</p>
                              <p className="text-muted-foreground">{value} activities</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TooltipProvider>

              {/* Legend */}
              <div className="flex items-center justify-end mt-4 gap-2">
                <span className="text-xs text-muted-foreground">Less</span>
                {[0, 1, 2, 3, 4, 5].map(intensity => (
                  <div 
                    key={intensity}
                    className={cn("h-4 w-4 rounded-sm", getColorClass(intensity))}
                  />
                ))}
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
