import { Link } from "react-router-dom";
import { Briefcase, DollarSign, Activity, PieChart, FileText, ArrowRight } from "lucide-react";
import { reportCategories, getReportsByCategory } from "@/lib/analytics/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  DollarSign,
  Activity,
  PieChart,
};

export default function ReportsHub() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Reports</h1>
        <p className="text-muted-foreground mt-1">
          Detailed, filterable reports with export capabilities
        </p>
      </div>
      
      {/* Category Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {reportCategories.map((category) => {
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
                  <Badge variant="secondary">{reports.length} reports</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reports.map((report) => (
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
      
      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Access</CardTitle>
          <CardDescription>Jump directly to commonly used reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports/all-cases">All Cases</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports/time-entries">Time Entries</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports/invoices">Invoices</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports/budget-status">Budget Status</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports/tasks">Tasks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
