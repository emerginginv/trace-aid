import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, Smartphone, Star, X } from "lucide-react";

interface InvestigatorProfile {
  id: string;
  full_name: string | null;
  email: string;
  mobile_phone?: string | null;
  office_phone?: string | null;
  avatar_url?: string | null;
}

interface InvestigatorCardProps {
  investigator: InvestigatorProfile;
  isPrimary: boolean;
  onSetPrimary: () => void;
  onRemove: () => void;
  canEdit: boolean;
  showSetPrimary: boolean;
}

export function InvestigatorCard({
  investigator,
  isPrimary,
  onSetPrimary,
  onRemove,
  canEdit,
  showSetPrimary,
}: InvestigatorCardProps) {
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isPrimary ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            {investigator.avatar_url && (
              <AvatarImage src={investigator.avatar_url} alt={investigator.full_name || investigator.email} />
            )}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(investigator.full_name, investigator.email)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name and Role */}
            <div>
              <p className="font-medium text-sm truncate">
                {investigator.full_name || investigator.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPrimary ? "Primary Investigator" : "Support Investigator"}
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-1">
              {/* Email */}
              <a
                href={`mailto:${investigator.email}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate group-hover:underline">{investigator.email}</span>
              </a>

              {/* Mobile Phone */}
              {investigator.mobile_phone && (
                <a
                  href={`tel:${investigator.mobile_phone}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span className="group-hover:underline">
                    {formatPhoneNumber(investigator.mobile_phone)}
                  </span>
                </a>
              )}

              {/* Office Phone */}
              {investigator.office_phone && (
                <a
                  href={`tel:${investigator.office_phone}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="group-hover:underline">
                    {formatPhoneNumber(investigator.office_phone)}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Actions - Right side on desktop */}
        {canEdit && (
          <div className="hidden sm:flex flex-col gap-1 shrink-0">
            {showSetPrimary && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onSetPrimary}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Make Primary
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Set as Primary Investigator</TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Actions - Bottom on mobile only */}
      {canEdit && (
        <div className="flex sm:hidden items-center gap-2 mt-3 justify-end">
          {showSetPrimary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={onSetPrimary}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Make Primary
                </Button>
              </TooltipTrigger>
              <TooltipContent>Set as Primary Investigator</TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
