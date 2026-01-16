import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, MapPin } from "lucide-react";

interface RequestStatusPanelProps {
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  clientName: string | null;
  clientAddress: {
    address1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
}

export function RequestStatusPanel({
  status,
  submittedAt,
  reviewedAt,
  contactFirstName,
  contactLastName,
  contactEmail,
  contactPhone,
  clientName,
  clientAddress,
}: RequestStatusPanelProps) {
  const contactName = [contactFirstName, contactLastName].filter(Boolean).join(' ');
  const fullAddress = [
    clientAddress.address1,
    [clientAddress.city, clientAddress.state].filter(Boolean).join(', '),
    clientAddress.zip,
  ].filter(Boolean).join(' • ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} showPulse={status.toLowerCase() === 'pending'} />
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Submitted: {format(new Date(submittedAt), 'MMM d, yyyy h:mm a')}</p>
          {reviewedAt && (
            <p>Reviewed: {format(new Date(reviewedAt), 'MMM d, yyyy h:mm a')}</p>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-3">Requested By</h4>
          <div className="space-y-2 text-sm">
            {contactName && (
              <p className="font-medium">{contactName}</p>
            )}
            
            {contactEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${contactEmail}`} className="hover:underline">
                  {contactEmail}
                </a>
              </div>
            )}

            {contactPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${contactPhone}`} className="hover:underline">
                  {contactPhone}
                </a>
              </div>
            )}

            {clientName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{clientName}</span>
              </div>
            )}

            {fullAddress && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5" />
                <span>{fullAddress}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
