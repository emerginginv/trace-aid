import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CalendarDays,
  ExternalLink 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface CaseService {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  description: string | null;
  schedule_mode: string;
}

interface CaseServiceInstance {
  id: string;
  case_id: string;
  case_service_id: string;
  organization_id: string;
  status: 'scheduled' | 'unscheduled';
  scheduled_at: string | null;
  unscheduled_at: string | null;
  unscheduled_by: string | null;
  unscheduled_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  case_service: CaseService;
}

interface LinkedActivity {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  activity_type: string;
}

interface ServiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceInstance: CaseServiceInstance;
  caseId: string;
  canManage: boolean;
  onStatusChange: () => void;
  onClose: () => void;
}

export const ServiceDetailDialog = ({
  open,
  onOpenChange,
  serviceInstance,
  caseId,
  canManage,
  onStatusChange,
  onClose,
}: ServiceDetailDialogProps) => {
  const [linkedActivities, setLinkedActivities] = useState<LinkedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unscheduling, setUnscheduling] = useState(false);
  const [showUnscheduleForm, setShowUnscheduleForm] = useState(false);
  const [unscheduleReason, setUnscheduleReason] = useState("");

  useEffect(() => {
    if (open && serviceInstance) {
      fetchLinkedActivities();
    }
  }, [open, serviceInstance]);

  const fetchLinkedActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("case_activities")
        .select("id, title, status, due_date, activity_type")
        .eq("case_service_instance_id", serviceInstance.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setLinkedActivities(data || []);
    } catch (error) {
      console.error("Error fetching linked activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnscheduled = async () => {
    if (!canManage) return;
    
    setUnscheduling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("case_service_instances")
        .update({
          status: 'unscheduled',
          unscheduled_at: new Date().toISOString(),
          unscheduled_by: user.id,
          unscheduled_reason: unscheduleReason || null,
        })
        .eq("id", serviceInstance.id);

      if (error) throw error;

      toast({
        title: "Service marked as unscheduled",
        description: "The service has been returned to the scheduling pool.",
      });

      onStatusChange();
    } catch (error) {
      console.error("Error marking service as unscheduled:", error);
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      });
    } finally {
      setUnscheduling(false);
      setShowUnscheduleForm(false);
      setUnscheduleReason("");
    }
  };

  const scheduleMode = serviceInstance.case_service?.schedule_mode || 'primary_investigator';
  const isNoSchedulingRequired = scheduleMode === 'none';

  const getStatusBadge = () => {
    if (isNoSchedulingRequired) {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          No Scheduling Required
        </Badge>
      );
    }
    if (serviceInstance.status === 'scheduled') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        <Clock className="h-3 w-3 mr-1" />
        Unscheduled
      </Badge>
    );
  };

  const getActivityStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return <Badge variant="secondary" className="text-xs">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 text-xs">In Progress</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-700 text-xs">Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">To Do</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-8 rounded-full shrink-0"
              style={{ backgroundColor: serviceInstance.case_service?.color || '#6366f1' }}
            />
            <div>
              <DialogTitle className="text-lg">
                {serviceInstance.case_service?.name || 'Unknown Service'}
              </DialogTitle>
              {serviceInstance.case_service?.code && (
                <DialogDescription className="text-sm">
                  Code: {serviceInstance.case_service.code}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Section */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide">
              Status
            </Label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              {getStatusBadge()}
              {serviceInstance.status === 'scheduled' && serviceInstance.scheduled_at && (
                <span className="text-sm text-muted-foreground">
                  Scheduled on {new Date(serviceInstance.scheduled_at).toLocaleDateString()}
                </span>
              )}
              {serviceInstance.status === 'unscheduled' && serviceInstance.unscheduled_at && (
                <span className="text-sm text-muted-foreground">
                  Unscheduled on {new Date(serviceInstance.unscheduled_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {serviceInstance.unscheduled_reason && (
              <p className="text-xs text-muted-foreground italic pl-1">
                Reason: {serviceInstance.unscheduled_reason}
              </p>
            )}
          </div>

          {/* Description */}
          {serviceInstance.case_service?.description && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">
                Description
              </Label>
              <p className="text-sm">{serviceInstance.case_service.description}</p>
            </div>
          )}

          <Separator />

          {/* Linked Activities */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide">
              Linked Activities
            </Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : linkedActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No activities linked to this service yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {linkedActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    to={`/cases/${caseId}?tab=activities`}
                    className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{activity.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getActivityStatusBadge(activity.status)}
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mark as Unscheduled Section - Hide for schedule_mode = 'none' */}
          {canManage && serviceInstance.status === 'scheduled' && !isNoSchedulingRequired && (
            <>
              <Separator />
              
              {!showUnscheduleForm ? (
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  onClick={() => setShowUnscheduleForm(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark as Unscheduled
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Alert className="bg-transparent border-0 p-0">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm text-amber-800">
                      This will return the service to the scheduling pool for future work. 
                      Existing activities will remain but the service will require re-scheduling.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-sm">
                      Reason (optional)
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Subject relocated, need to reschedule"
                      value={unscheduleReason}
                      onChange={(e) => setUnscheduleReason(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowUnscheduleForm(false);
                        setUnscheduleReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={handleMarkUnscheduled}
                      disabled={unscheduling}
                    >
                      {unscheduling ? "Updating..." : "Mark as Unscheduled"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info for unscheduled services - only show if scheduling is required */}
          {serviceInstance.status === 'unscheduled' && !isNoSchedulingRequired && (
            <Alert className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                This service is unscheduled. You can schedule it by creating an activity 
                from the calendar or activities tab and linking it to this service.
              </AlertDescription>
            </Alert>
          )}

          {/* Info for no scheduling required */}
          {isNoSchedulingRequired && (
            <Alert className="bg-muted/50 border">
              <AlertDescription className="text-sm text-muted-foreground">
                This service does not require scheduling.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
