import { BarChart3 } from "lucide-react";
import { ANALYTICS_CATEGORIES } from "@/lib/analytics/categories";
import { AnalyticsCategoryCard } from "@/components/analytics/AnalyticsCategoryCard";

const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 border border-border/50">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Analytics & Reports
            </h1>
          </div>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Insights, metrics, and reports across your organization. Explore dashboards by category or generate custom reports.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -z-0" />
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {ANALYTICS_CATEGORIES.map((category) => (
          <AnalyticsCategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
};

export default Analytics;
