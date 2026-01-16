import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  Clock, 
  Eye,
  Edit,
  Link as LinkIcon,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface HistoryEvent {
  id: string;
  action: string;
  description: string | null;
  performed_by: string | null;
  performed_at: string;
  metadata: Record<string, any> | null;
  performer?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface RequestHistoryTabProps {
  requestId: string;
  organizationId: string;
  // Fallback props for requests without history records
  submittedAt: string;
  reviewedAt: string | null;
  status: string;
  matchedAccountId: string | null;
  declineReason: string | null;
}

export function RequestHistoryTab({
  requestId,
  organizationId,
  submittedAt,
  reviewedAt,
  status,
  matchedAccountId,
  declineReason,
}: RequestHistoryTabProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('case_request_history')
          .select(`
            id,
            action,
            description,
            performed_by,
            performed_at,
            metadata
          `)
          .eq('case_request_id', requestId)
          .order('performed_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Fetch performer profiles for events with performed_by
          const performerIds = [...new Set(data.filter(e => e.performed_by).map(e => e.performed_by))];
          
          let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
          
          if (performerIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', performerIds);
            
            if (profiles) {
              profiles.forEach(p => {
                profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              });
            }
          }

          const eventsWithProfiles = data.map(event => ({
            ...event,
            metadata: event.metadata as Record<string, any> | null,
            performer: event.performed_by ? profilesMap[event.performed_by] : undefined
          }));

          setEvents(eventsWithProfiles);
        } else {
          // No history records found, use fallback
          setUseFallback(true);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
        setUseFallback(true);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [requestId]);

  // Build fallback events from status fields (for backward compatibility)
  const getFallbackEvents = (): HistoryEvent[] => {
    const fallbackEvents: HistoryEvent[] = [
      {
        id: 'submitted',
        action: 'created',
        description: 'Request submitted via public form',
        performed_by: null,
        performed_at: submittedAt,
        metadata: null,
      },
    ];

    if (matchedAccountId) {
      fallbackEvents.push({
        id: 'matched',
        action: 'client_matched',
        description: 'Client matched to existing account',
        performed_by: null,
        performed_at: reviewedAt || submittedAt,
        metadata: null,
      });
    }

    if (status.toLowerCase() === 'approved' && reviewedAt) {
      fallbackEvents.push({
        id: 'approved',
        action: 'approved',
        description: 'Request approved and case created',
        performed_by: null,
        performed_at: reviewedAt,
        metadata: null,
      });
    }

    if (status.toLowerCase() === 'declined' && reviewedAt) {
      fallbackEvents.push({
        id: 'declined',
        action: 'declined',
        description: declineReason || 'Request declined',
        performed_by: null,
        performed_at: reviewedAt,
        metadata: { reason: declineReason },
      });
    }

    return fallbackEvents.sort((a, b) => 
      new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
    );
  };

  const displayEvents = useFallback ? getFallbackEvents() : events;

  const getEventIcon = (action: string) => {
    switch (action) {
      case 'created':
        return Send;
      case 'viewed':
        return Eye;
      case 'client_matched':
      case 'contact_matched':
        return UserCheck;
      case 'approved':
        return CheckCircle;
      case 'declined':
        return XCircle;
      case 'edited':
        return Edit;
      default:
        return Clock;
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'text-primary bg-primary/10';
      case 'viewed':
        return 'text-muted-foreground bg-muted';
      case 'client_matched':
      case 'contact_matched':
        return 'text-info bg-info/10';
      case 'approved':
        return 'text-success bg-success/10';
      case 'declined':
        return 'text-destructive bg-destructive/10';
      case 'edited':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getEventTitle = (action: string) => {
    switch (action) {
      case 'created':
        return 'Request Submitted';
      case 'viewed':
        return 'Request Viewed';
      case 'client_matched':
        return 'Client Matched';
      case 'contact_matched':
        return 'Contact Matched';
      case 'approved':
        return 'Request Approved';
      case 'declined':
        return 'Request Declined';
      case 'edited':
        return 'Request Edited';
      default:
        return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (displayEvents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No history</p>
          <p className="text-sm">No events have been recorded for this request.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {displayEvents.map((event, index) => {
              const Icon = getEventIcon(event.action);
              const colorClass = getEventColor(event.action);

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full",
                    colorClass
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <p className="font-medium">{getEventTitle(event.action)}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      {event.performer && (
                        <>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={event.performer.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {event.performer.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{event.performer.full_name || 'Unknown user'}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{format(new Date(event.performed_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    
                    {/* Metadata display */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 p-2 rounded-md bg-muted text-sm">
                        {event.metadata.case_number && (
                          <p className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Case: {event.metadata.case_number}
                          </p>
                        )}
                        {event.metadata.account_name && (
                          <p>Account: {event.metadata.account_name}</p>
                        )}
                        {event.metadata.reason && event.action === 'declined' && (
                          <p>Reason: {event.metadata.reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
