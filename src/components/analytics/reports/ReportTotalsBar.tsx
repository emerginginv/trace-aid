import { ReportTotalConfig } from "@/lib/analytics/reports/types";
import { formatTotalValue } from "@/lib/analytics/reports/totals";
import { Card, CardContent } from "@/components/ui/card";

interface ReportTotalsBarProps {
  totals: Record<string, number>;
  config: ReportTotalConfig[];
}

export function ReportTotalsBar({ totals, config }: ReportTotalsBarProps) {
  if (!config.length) return null;
  
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3">
        <div className="flex flex-wrap gap-6 items-center justify-center sm:justify-start">
          {config.map((totalConfig) => {
            const value = totals[totalConfig.key];
            if (value === undefined) return null;
            
            return (
              <div key={totalConfig.key} className="text-center sm:text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {totalConfig.label}
                </p>
                <p className="text-lg font-semibold">
                  {formatTotalValue(value, totalConfig.format)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
