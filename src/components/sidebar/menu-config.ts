import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  ClipboardList,
  UserSearch,
  ListTodo,
  FileEdit,
  Clock,
} from "lucide-react";
import { MenuGroup } from "./types";

export const menuGroups: MenuGroup[] = [
  {
    label: "Navigation",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        url: "/dashboard",
        roles: ["admin", "manager", "investigator", "vendor"],
      },
      {
        title: "My Cases",
        icon: FileText,
        url: "/cases",
        roles: ["vendor"],
      },
      {
        title: "Cases",
        icon: Briefcase,
        url: "/cases",
        roles: ["admin", "manager", "investigator"],
      },
      {
        title: "Subjects",
        icon: UserSearch,
        url: "/subjects",
        roles: ["admin", "manager", "investigator"],
      },
      {
        title: "Tasks",
        icon: ListTodo,
        url: "/tasks",
        roles: ["admin", "manager", "investigator"],
      },
      {
        title: "Events",
        icon: Calendar,
        url: "/events",
        roles: ["admin", "manager", "investigator"],
      },
      {
        title: "Updates",
        icon: FileEdit,
        url: "/updates",
        roles: ["admin", "manager", "investigator"],
      },
      {
        title: "Calendar",
        icon: Calendar,
        url: "/calendar",
        roles: ["admin", "manager", "investigator"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Retainers",
        icon: Wallet,
        url: "/retainers",
        roles: ["admin", "manager"],
      },
      {
        title: "My Expenses",
        icon: DollarSign,
        url: "/my-expenses",
        roles: ["vendor", "investigator"],
      },
      {
        title: "Time Entries",
        icon: Clock,
        url: "/time-entries",
        roles: ["admin", "manager"],
      },
      {
        title: "Expenses",
        icon: Receipt,
        url: "/expenses",
        roles: ["admin", "manager"],
      },
      {
        title: "Invoices",
        icon: FileText,
        url: "/invoices",
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "Clients",
    items: [
      {
        title: "Accounts",
        icon: Building2,
        url: "/accounts",
        roles: ["admin", "manager"],
      },
      {
        title: "Contacts",
        icon: Users,
        url: "/contacts",
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "Analytics & Reporting",
    items: [
      {
        title: "Reports",
        icon: ClipboardList,
        url: "/reports",
        roles: ["admin", "manager"],
      },
      {
        title: "Analytics",
        icon: BarChart3,
        url: "/analytics",
        roles: ["admin", "manager"],
      },
    ],
  },
];
