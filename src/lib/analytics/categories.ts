import { 
  Briefcase, 
  DollarSign, 
  Clock, 
  Activity, 
  FileText, 
  Shield,
  type LucideIcon 
} from "lucide-react";
import type { MetricCategory } from "./types";

export interface AnalyticsCategoryLink {
  label: string;
  href: string;
  description?: string;
}

export interface AnalyticsCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  iconBg: string;
  metricCategory?: MetricCategory;
  links: AnalyticsCategoryLink[];
}

export const ANALYTICS_CATEGORIES: AnalyticsCategory[] = [
  {
    id: "cases",
    title: "Case Analytics",
    description: "Track case volume, status distribution, closure rates, and case lifecycle metrics",
    icon: Briefcase,
    gradient: "from-primary/10 to-primary/5",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    metricCategory: "cases",
    links: [
      { label: "Dashboard", href: "/analytics/cases", description: "View case metrics" },
      { label: "Reports", href: "/analytics/cases/reports", description: "Generate case reports" }
    ]
  },
  {
    id: "finances",
    title: "Budget & Financial Analytics",
    description: "Revenue tracking, expense summaries, budget utilization, and profitability analysis",
    icon: DollarSign,
    gradient: "from-emerald-500/10 to-emerald-500/5",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    metricCategory: "finances",
    links: [
      { label: "Dashboard", href: "/analytics/finances", description: "View financial metrics" },
      { label: "Reports", href: "/analytics/finances/reports", description: "Generate financial reports" }
    ]
  },
  {
    id: "time-expense",
    title: "Time & Expense Analytics",
    description: "Billable hours analysis, expense categorization, and resource utilization",
    icon: Clock,
    gradient: "from-blue-500/10 to-blue-500/5",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    links: [
      { label: "Dashboard", href: "/analytics/time-expense", description: "View time & expense metrics" },
      { label: "Reports", href: "/analytics/time-expense/reports", description: "Generate time reports" }
    ]
  },
  {
    id: "activities",
    title: "Activity & Operations Analytics",
    description: "Task completion rates, event tracking, update frequency, and workflow efficiency",
    icon: Activity,
    gradient: "from-purple-500/10 to-purple-500/5",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
    metricCategory: "activities",
    links: [
      { label: "Dashboard", href: "/analytics/activities", description: "View activity metrics" },
      { label: "Reports", href: "/analytics/activities/reports", description: "Generate activity reports" }
    ]
  },
  {
    id: "reports",
    title: "Report & Output Analytics",
    description: "Report template usage, generation history, and document analytics",
    icon: FileText,
    gradient: "from-amber-500/10 to-amber-500/5",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    links: [
      { label: "Dashboard", href: "/analytics/reports", description: "View report metrics" },
      { label: "Templates", href: "/settings?tab=templates", description: "Manage report templates" }
    ]
  },
  {
    id: "system",
    title: "System & Security Analytics",
    description: "User activity, storage usage, audit logs, and security metrics",
    icon: Shield,
    gradient: "from-rose-500/10 to-rose-500/5",
    iconColor: "text-rose-500",
    iconBg: "bg-rose-500/10",
    metricCategory: "storage",
    links: [
      { label: "Dashboard", href: "/analytics/system", description: "View system metrics" },
      { label: "Audit Log", href: "/analytics/system/audit", description: "View audit logs" }
    ]
  }
];

export function getCategoryById(id: string): AnalyticsCategory | undefined {
  return ANALYTICS_CATEGORIES.find(cat => cat.id === id);
}
