import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  DollarSign,
  Settings,
  Calendar,
  ArrowRight,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "task" | "case" | "activity" | "user" | "expense" | "settings";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  priority?: "low" | "medium" | "high";
}

const MOCK_NOTIFICATIONS: Notification[] = [
  // Task Notifications
  {
    id: "1",
    type: "task",
    title: "Task Assigned",
    message: "New surveillance task assigned to you for Case #00123",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    read: false,
    link: "/cases/cd39ffcb-bc6d-4c57-ac77-362067266228",
    priority: "high",
  },
  {
    id: "2",
    type: "task",
    title: "Task Due Soon",
    message: "Background check report due in 2 hours",
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    read: false,
    link: "/cases/cd39ffcb-bc6d-4c57-ac77-362067266228",
    priority: "high",
  },
  {
    id: "3",
    type: "task",
    title: "Task Completed",
    message: "Interview documentation task marked as complete",
    timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
    read: true,
    priority: "low",
  },

  // Case Management
  {
    id: "4",
    type: "case",
    title: "Case Status Changed",
    message: 'Case #00456 status updated to "In Progress"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    read: false,
    link: "/cases",
    priority: "medium",
  },
  {
    id: "5",
    type: "case",
    title: "Case Assigned",
    message: "New insurance fraud case assigned to you",
    timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
    read: false,
    link: "/cases",
    priority: "high",
  },

  // Activity Log
  {
    id: "6",
    type: "activity",
    title: "New Update",
    message: "Sarah added a surveillance update to Case #00123",
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
    read: true,
    link: "/cases/cd39ffcb-bc6d-4c57-ac77-362067266228",
    priority: "low",
  },
  {
    id: "7",
    type: "activity",
    title: "File Uploaded",
    message: "3 new photos uploaded to Case #00789",
    timestamp: new Date(Date.now() - 1000 * 60 * 360), // 6 hours ago
    read: true,
    link: "/cases",
    priority: "low",
  },

  // User/Admin
  {
    id: "8",
    type: "user",
    title: "New User Added",
    message: "Michael Chen joined as Investigator",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    link: "/settings",
    priority: "low",
  },
  {
    id: "9",
    type: "user",
    title: "Role Changed",
    message: "Emily Rodriguez promoted to Senior Investigator",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    read: true,
    link: "/settings",
    priority: "medium",
  },

  // Expenses
  {
    id: "10",
    type: "expense",
    title: "Expense Approved",
    message: "Travel expense of $450.00 approved",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: false,
    link: "/finance",
    priority: "medium",
  },
  {
    id: "11",
    type: "expense",
    title: "Expense Added",
    message: "New surveillance equipment expense pending approval",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    link: "/finance",
    priority: "low",
  },

  // Settings
  {
    id: "12",
    type: "settings",
    title: "Picklist Updated",
    message: "New case status 'Under Review' added to system",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    read: true,
    link: "/settings",
    priority: "low",
  },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState("all");

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "task":
        return <CheckCircle2 className="h-5 w-5" />;
      case "case":
        return <FileText className="h-5 w-5" />;
      case "activity":
        return <Calendar className="h-5 w-5" />;
      case "user":
        return <Users className="h-5 w-5" />;
      case "expense":
        return <DollarSign className="h-5 w-5" />;
      case "settings":
        return <Settings className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "task":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "case":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "activity":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "user":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "expense":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "settings":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityBadge = (priority?: Notification["priority"]) => {
    if (!priority) return null;
    
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      high: { variant: "destructive", label: "High" },
      medium: { variant: "default", label: "Medium" },
      low: { variant: "secondary", label: "Low" },
    };

    const config = variants[priority];
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const filterNotifications = (type: string) => {
    if (type === "all") return notifications;
    if (type === "tasks") return notifications.filter(n => n.type === "task");
    if (type === "cases") return notifications.filter(n => n.type === "case" || n.type === "activity");
    if (type === "system") return notifications.filter(n => n.type === "user" || n.type === "settings" || n.type === "expense");
    return notifications;
  };

  const groupByDate = (notifs: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    notifs.forEach(notif => {
      const notifDate = new Date(notif.timestamp);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      if (notifDay.getTime() === today.getTime()) {
        groups.Today.push(notif);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(notif);
      } else {
        groups.Earlier.push(notif);
      }
    });

    return groups;
  };

  const filteredNotifications = filterNotifications(activeTab);
  const groupedNotifications = groupByDate(filteredNotifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on important events and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="default" className="text-sm">
              {unreadCount} Unread
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All
            {activeTab === "all" && notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {activeTab === "tasks" && filterNotifications("tasks").length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {filterNotifications("tasks").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cases">
            Cases
            {activeTab === "cases" && filterNotifications("cases").length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {filterNotifications("cases").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system">
            System
            {activeTab === "system" && filterNotifications("system").length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {filterNotifications("system").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      You're all caught up! Check back later for updates.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => {
                      if (notifs.length === 0) return null;
                      
                      return (
                        <div key={dateGroup}>
                          <div className="px-6 py-3 bg-muted/50">
                            <h3 className="text-sm font-semibold text-muted-foreground">
                              {dateGroup}
                            </h3>
                          </div>
                          <div className="divide-y">
                            {notifs.map((notification) => (
                              <div
                                key={notification.id}
                                className={`flex items-start gap-4 p-4 sm:p-6 hover:bg-muted/50 transition-colors ${
                                  !notification.read ? "bg-primary/5" : ""
                                }`}
                              >
                                <div
                                  className={`flex-shrink-0 p-2 rounded-full border ${getTypeColor(
                                    notification.type
                                  )}`}
                                >
                                  {getIcon(notification.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-semibold text-sm">
                                        {notification.title}
                                      </h4>
                                      {!notification.read && (
                                        <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                                      )}
                                      {getPriorityBadge(notification.priority)}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0"
                                      onClick={() => dismissNotification(notification.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <p className="text-sm text-muted-foreground mb-2">
                                    {notification.message}
                                  </p>

                                  <div className="flex items-center gap-4 flex-wrap">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(notification.timestamp, {
                                        addSuffix: true,
                                      })}
                                    </span>

                                    {notification.link && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-xs"
                                        onClick={() => {
                                          markAsRead(notification.id);
                                          // In a real app, navigate to notification.link
                                        }}
                                      >
                                        View Details
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                      </Button>
                                    )}

                                    {!notification.read && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-xs"
                                        onClick={() => markAsRead(notification.id)}
                                      >
                                        Mark as Read
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
