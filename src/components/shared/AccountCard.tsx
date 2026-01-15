import { Phone, Mail, User, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EntityStatusPill, deriveAccountStatus, type AccountStatus } from "./EntityStatusPill";
import { cn } from "@/lib/utils";

export interface AccountCardData {
  id: string;
  name: string;
  status?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  primary_contact_name?: string | null;
  case_count?: number;
}

interface AccountCardProps {
  account: AccountCardData;
  onClick?: () => void;
  variant?: 'card' | 'list-item';
  showCaseCount?: boolean;
  className?: string;
}

export function AccountCard({ 
  account, 
  onClick, 
  variant = 'card',
  showCaseCount = true,
  className 
}: AccountCardProps) {
  const displayStatus = deriveAccountStatus(account.status);

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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{account.name}</span>
            <EntityStatusPill status={displayStatus} />
          </div>
          {account.industry && (
            <p className="text-xs text-muted-foreground mt-0.5">{account.industry}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {account.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {account.phone}
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
      {/* Header: Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-base leading-tight truncate flex-1">
          {account.name}
        </h3>
        <EntityStatusPill status={displayStatus} />
      </div>

      {/* Type row: Industry */}
      {account.industry && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{account.industry}</span>
        </div>
      )}

      {/* Primary Contact */}
      {account.primary_contact_name && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <User className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{account.primary_contact_name}</span>
        </div>
      )}

      {/* Phone */}
      {account.phone && (
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{account.phone}</span>
        </div>
      )}

      {/* Email */}
      {account.email && (
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{account.email}</span>
        </div>
      )}

      {/* Footer: Case count */}
      {showCaseCount && account.case_count !== undefined && account.case_count > 0 && (
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          {account.case_count} {account.case_count === 1 ? 'Case' : 'Cases'}
        </div>
      )}
    </Card>
  );
}
