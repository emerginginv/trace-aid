import { Link } from "react-router-dom";
import { TrendingUp, FileText, ArrowRight } from "lucide-react";
import { reportCategories, getReportsByCategory } from "@/lib/analytics/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
};

export default function ReportsHub() {
  useSetBreadcrumbs([{ label: "Reports" }]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Detailed, filterable reports with export capabilities
        </p>
      </div>
      
      {/* Category Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCategories.map(category => {
          const Icon = iconMap[category.icon] || FileText;
          const reports = getReportsByCategory(category.id);
          return (
            <Card key={category.id} className="group hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{reports.length} {reports.length === 1 ? 'report' : 'reports'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reports.map(report => (
                    <Link 
                      key={report.id} 
                      to={`/reports/${report.id}`} 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group/item"
                    >
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {report.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/item:text-foreground transition-colors" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
