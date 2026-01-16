import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, Pencil, X } from "lucide-react";

interface ClientContactCardProps {
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
  };
  onChangeClick: () => void;
  onRemove: () => void;
  canEdit: boolean;
  label?: string;
}

export function ClientContactCard({
  contact,
  onChangeClick,
  onRemove,
  canEdit,
  label = "Client Contact",
}: ClientContactCardProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const fullName = `${contact.first_name} ${contact.last_name}`.trim();

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-sm font-medium">
              {getInitials(contact.first_name, contact.last_name)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name and Role */}
            <div>
              <p className="font-medium text-sm truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>

            {/* Contact Info */}
            <div className="space-y-1">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate group-hover:underline">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="group-hover:underline">
                    {formatPhoneNumber(contact.phone)}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Actions - Right side on desktop */}
        {canEdit && (
          <div className="hidden sm:flex flex-col gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={onChangeClick}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Change
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change Client Contact</TooltipContent>
            </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onChangeClick}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Change
              </Button>
            </TooltipTrigger>
            <TooltipContent>Change Client Contact</TooltipContent>
          </Tooltip>
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
