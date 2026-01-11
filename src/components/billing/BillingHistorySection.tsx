import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Receipt, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { formatBillingEventType, getBillingEventIcon } from "@/lib/billingUtils";
import { useBillingHistory, BillingEvent } from "@/hooks/useBillingHistory";
import { format } from "date-fns";

interface BillingHistorySectionProps {
  organizationId: string | undefined;
}

function EventIcon({ type }: { type: 'success' | 'error' | 'warning' | 'info' }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
}

export function BillingHistorySection({ organizationId }: BillingHistorySectionProps) {
  const { data: events, isLoading, error } = useBillingHistory(organizationId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          <CardTitle>Billing History</CardTitle>
        </div>
        <CardDescription>
          Recent billing events and subscription changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Unable to load billing history</p>
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No billing history yet</p>
            <p className="text-sm">Events will appear here after subscription activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {events.map((event: BillingEvent) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <EventIcon type={getBillingEventIcon(event.event_type)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {formatBillingEventType(event.event_type)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.created_at
                        ? format(new Date(event.created_at), 'MMM d, yyyy h:mm a')
                        : 'Unknown date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
