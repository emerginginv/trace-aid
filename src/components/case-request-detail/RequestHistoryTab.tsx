import { format } from "date-fns";
import { Send, CheckCircle, XCircle, UserCheck, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HistoryEvent {
  id: string;
  type: 'submitted' | 'matched' | 'approved' | 'declined';
  date: string;
  description: string;
}

interface RequestHistoryTabProps {
  submittedAt: string;
  reviewedAt: string | null;
  status: string;
  matchedAccountId: string | null;
  declineReason: string | null;
}

export function RequestHistoryTab({
  submittedAt,
  reviewedAt,
  status,
  matchedAccountId,
  declineReason,
}: RequestHistoryTabProps) {
  // Build timeline events
  const events: HistoryEvent[] = [
    {
      id: 'submitted',
      type: 'submitted',
      date: submittedAt,
      description: 'Request submitted via public form',
    },
  ];

  if (matchedAccountId) {
    events.push({
      id: 'matched',
      type: 'matched',
      date: reviewedAt || submittedAt, // Use reviewed date if available
      description: 'Client matched to existing account',
    });
  }

  if (status.toLowerCase() === 'approved' && reviewedAt) {
    events.push({
      id: 'approved',
      type: 'approved',
      date: reviewedAt,
      description: 'Request approved and case created',
    });
  }

  if (status.toLowerCase() === 'declined' && reviewedAt) {
    events.push({
      id: 'declined',
      type: 'declined',
      date: reviewedAt,
      description: declineReason || 'Request declined',
    });
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getEventIcon = (type: HistoryEvent['type']) => {
    switch (type) {
      case 'submitted':
        return Send;
      case 'matched':
        return UserCheck;
      case 'approved':
        return CheckCircle;
      case 'declined':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getEventColor = (type: HistoryEvent['type']) => {
    switch (type) {
      case 'submitted':
        return 'text-primary bg-primary/10';
      case 'matched':
        return 'text-info bg-info/10';
      case 'approved':
        return 'text-success bg-success/10';
      case 'declined':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card>
      <CardContent className="py-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {events.map((event, index) => {
              const Icon = getEventIcon(event.type);
              const colorClass = getEventColor(event.type);

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
                  <div className="flex-1 pt-1.5">
                    <p className="font-medium">{event.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.date), 'MMM d, yyyy h:mm a')}
                    </p>
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
