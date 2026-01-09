import { format } from "date-fns";
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  MapPin,
  Phone,
  Mail,
  FileText,
  Camera,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  status: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  description: string | null;
  address: string | null;
  assigned_user?: { id: string; full_name: string | null } | null;
}

interface PdfActivitiesTimelineProps {
  activities: Activity[];
}

export function PdfActivitiesTimeline({ activities }: PdfActivitiesTimelineProps) {
  if (activities.length === 0) {
    return null;
  }

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "call":
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "surveillance":
        return <Camera className="h-4 w-4" />;
      case "site_visit":
      case "field":
        return <MapPin className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, completed: boolean) => {
    if (completed) {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    
    switch (status.toLowerCase()) {
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
            In Progress
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Activities ({activities.length})
      </h2>
      
      <div className="space-y-3">
        {activities.slice(0, 15).map((activity, index) => (
          <div 
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg border border-border bg-card"
          >
            {/* Icon */}
            <div className={`
              shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${activity.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'}
            `}>
              {activity.completed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                getActivityIcon(activity.activity_type)
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-sm">{activity.title}</h4>
                  <p className="text-xs text-muted-foreground capitalize">
                    {activity.activity_type.replace(/_/g, " ")}
                    {activity.assigned_user?.full_name && (
                      <span> • Assigned to {activity.assigned_user.full_name}</span>
                    )}
                  </p>
                </div>
                {getStatusBadge(activity.status, activity.completed || false)}
              </div>
              
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {activity.due_date && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due: {format(new Date(activity.due_date), "MMM d, yyyy")}
                  </div>
                )}
                {activity.completed_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed: {format(new Date(activity.completed_at), "MMM d, yyyy")}
                  </div>
                )}
                {activity.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {activity.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activities.length > 15 && (
          <p className="text-sm text-center text-muted-foreground py-2">
            ... and {activities.length - 15} more activities
          </p>
        )}
      </div>
    </div>
  );
}
