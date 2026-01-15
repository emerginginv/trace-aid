import { Phone, Mail, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EntityStatusPill, deriveContactStatus } from "./EntityStatusPill";
import { cn } from "@/lib/utils";

export interface ContactCardData {
  id: string;
  first_name: string;
  last_name: string;
  status?: string | null;
  role?: string | null;
  organization_name?: string | null;
  phone?: string | null;
  email?: string | null;
  case_count?: number;
  last_activity_date?: string | null;
}

interface ContactCardProps {
  contact: ContactCardData;
  onClick?: () => void;
  variant?: 'card' | 'list-item';
  showFooter?: boolean;
  className?: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function ContactCard({ 
  contact, 
  onClick, 
  variant = 'card',
  showFooter = true,
  className 
}: ContactCardProps) {
  const displayStatus = deriveContactStatus(contact.status);
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();

  // Build role + organization string
  const roleOrgParts = [contact.role, contact.organization_name].filter(Boolean);
  const roleOrgString = roleOrgParts.length > 0 
    ? (contact.role && contact.organization_name 
        ? `${contact.role} at ${contact.organization_name}` 
        : roleOrgParts[0])
    : null;

  if (variant === 'list-item') {
    return (
      <div 
        className={cn(
          "flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors",
          className
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(contact.first_name, contact.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{fullName}</span>
              <EntityStatusPill status={displayStatus} />
            </div>
            {roleOrgString && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{roleOrgString}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials(contact.first_name, contact.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight truncate">
              {fullName}
            </h3>
            <EntityStatusPill status={displayStatus} />
          </div>
        </div>
      </div>

      {/* Role + Organization */}
      {roleOrgString && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{roleOrgString}</span>
        </div>
      )}

      {/* Phone */}
      {contact.phone && (
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{contact.phone}</span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{contact.email}</span>
        </div>
      )}

      {/* Footer: Case count or last activity */}
      {showFooter && (contact.case_count !== undefined && contact.case_count > 0) && (
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          {contact.case_count} {contact.case_count === 1 ? 'Case' : 'Cases'}
        </div>
      )}
    </Card>
  );
}
