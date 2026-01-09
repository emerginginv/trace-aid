import { format } from "date-fns";
import { Building2, User, Calendar, Users, AlertTriangle, FileText } from "lucide-react";

interface PdfGeneralInfoProps {
  showClientContact?: boolean;
  account: { name: string } | null;
  contact: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  caseManager: { full_name: string | null; email: string } | null;
  investigators: { full_name: string | null; email: string }[];
  dueDate: string | null;
  createdAt: string | null;
  closedAt: string | null;
  referenceNumber: string | null;
  expedited: boolean | null;
  feeWaiver: boolean | null;
  purposeOfRequest: string | null;
}

export function PdfGeneralInfo({
  showClientContact = true,
  account,
  contact,
  caseManager,
  investigators,
  dueDate,
  createdAt,
  closedAt,
  referenceNumber,
  expedited,
  feeWaiver,
  purposeOfRequest,
}: PdfGeneralInfoProps) {
  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        General Information
      </h2>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        {/* Client - conditionally rendered */}
        {showClientContact && (
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">Client:</span>
              <span className="ml-2 font-medium">{account?.name || "Not assigned"}</span>
            </div>
          </div>
        )}
        
        {/* Contact - conditionally rendered */}
        {showClientContact && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">Contact:</span>
              <span className="ml-2 font-medium">
                {contact ? `${contact.first_name} ${contact.last_name}` : "Not assigned"}
              </span>
              {contact?.email && (
                <span className="text-muted-foreground ml-1">({contact.email})</span>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-muted-foreground">Case Manager:</span>
            <span className="ml-2 font-medium">
              {caseManager?.full_name || caseManager?.email || "Not assigned"}
            </span>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-muted-foreground">Investigators:</span>
            <span className="ml-2 font-medium">
              {investigators.length > 0 
                ? investigators.map(i => i.full_name || i.email).join(", ")
                : "None assigned"}
            </span>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-muted-foreground">Created:</span>
            <span className="ml-2 font-medium">
              {createdAt ? format(new Date(createdAt), "MMM d, yyyy") : "N/A"}
            </span>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-muted-foreground">Due Date:</span>
            <span className="ml-2 font-medium">
              {dueDate ? format(new Date(dueDate), "MMM d, yyyy") : "Not set"}
            </span>
          </div>
        </div>
        
        {referenceNumber && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">Reference #:</span>
              <span className="ml-2 font-medium">{referenceNumber}</span>
            </div>
          </div>
        )}
        
        {closedAt && (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">Closed:</span>
              <span className="ml-2 font-medium">
                {format(new Date(closedAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        )}
        
        {(expedited || feeWaiver) && (
          <div className="col-span-2 flex items-center gap-4 mt-2">
            {expedited && (
              <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Expedited</span>
              </div>
            )}
            {feeWaiver && (
              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <span className="font-medium">Fee Waiver Requested</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {purposeOfRequest && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground font-medium mb-1">Purpose of Request:</p>
          <p className="text-sm">{purposeOfRequest}</p>
        </div>
      )}
    </div>
  );
}
