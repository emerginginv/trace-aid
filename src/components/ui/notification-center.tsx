import { useState, useEffect } from "react";
import { Bell, Check, X, AlertCircle, Info, CheckCircle } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { ScrollArea } from "./scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high";
  link?: string | null;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    
    // Set up realtime subscription for instant updates
    const channel = supabase
      .channel('notification-center-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as any;
          
          // Map database type to component type
          let displayType: Notification['type'] = 'info';
          if (newNotification.type === 'expense' || newNotification.type === 'task') displayType = 'success';
          if (newNotification.priority === 'high') displayType = 'warning';
          
          const mappedNotification: Notification = {
            id: newNotification.id,
            title: newNotification.title,
            message: newNotification.message,
            type: displayType,
            timestamp: new Date(newNotification.timestamp),
            read: newNotification.read,
            priority: (newNotification.priority || 'medium') as Notification['priority'],
            link: newNotification.link,
          };
          
          setNotifications((prev) => [mappedNotification, ...prev]);
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const updatedNotification = payload.new as any;
          setNotifications((prev) =>
            prev.map((n) => 
              n.id === updatedNotification.id 
                ? { ...n, read: updatedNotification.read }
                : n
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization_id
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!orgMember?.organization_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', orgMember.organization_id)
        .order('timestamp', { ascending: false })
        .limit(10); // Only show 10 most recent in popup

      if (error) throw error;

      // Map database response to our notification type
      const mappedData: Notification[] = (data || []).map(item => {
        // Map database type to component type
        let displayType: Notification['type'] = 'info';
        if (item.type === 'expense' || item.type === 'task') displayType = 'success';
        if (item.priority === 'high') displayType = 'warning';
        
        return {
          id: item.id,
          title: item.title,
          message: item.message,
          type: displayType,
          timestamp: new Date(item.timestamp),
          read: item.read,
          priority: (item.priority || 'medium') as Notification['priority'],
          link: item.link,
        };
      });

      setNotifications(mappedData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const removeNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error removing notification:', error);
      toast.error('Failed to remove notification');
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="badge-notification">{unreadCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 glass-card" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state py-12">
              <Bell className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications
                .sort((a, b) => {
                  // Sort by priority first, then by timestamp
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  if (a.priority !== b.priority) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  }
                  return b.timestamp.getTime() - a.timestamp.getTime();
                })
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-muted/50 relative cursor-pointer",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => {
                      if (notification.link) {
                        navigate(notification.link);
                      }
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    {!notification.read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                    )}
                    
                    <div className="flex gap-3 pl-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mt-1"
                            onClick={() => removeNotification(notification.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
