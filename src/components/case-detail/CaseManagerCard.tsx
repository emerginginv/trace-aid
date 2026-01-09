import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Smartphone, Pencil, X } from "lucide-react";

interface CaseManagerProfile {
  id: string;
  full_name: string | null;
  email: string;
  mobile_phone?: string | null;
  office_phone?: string | null;
  avatar_url?: string | null;
}

interface CaseManagerCardProps {
  manager: CaseManagerProfile;
  label: "Case Manager 1" | "Case Manager 2";
  isPrimary: boolean;
  onChangeClick: () => void;
  onRemove?: () => void;
  canEdit: boolean;
}

export function CaseManagerCard({
  manager,
  label,
  isPrimary,
  onChangeClick,
  onRemove,
  canEdit,
}: CaseManagerCardProps) {
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
    // Simple formatting - just return as-is if already formatted
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
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          {manager.avatar_url && (
            <AvatarImage src={manager.avatar_url} alt={manager.full_name || manager.email} />
          )}
          <AvatarFallback className="text-sm font-medium">
            {getInitials(manager.full_name, manager.email)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name and Role */}
          <div>
            <p className="font-medium text-sm truncate">
              {manager.full_name || manager.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPrimary ? "Primary Case Manager" : "Secondary Case Manager"}
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-1">
            {/* Email */}
            <a
              href={`mailto:${manager.email}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate group-hover:underline">{manager.email}</span>
            </a>

            {/* Mobile Phone */}
            {manager.mobile_phone && (
              <a
                href={`tel:${manager.mobile_phone}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
              >
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                <span className="group-hover:underline">
                  {formatPhoneNumber(manager.mobile_phone)}
                </span>
              </a>
            )}

            {/* Office Phone */}
            {manager.office_phone && (
              <a
                href={`tel:${manager.office_phone}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="group-hover:underline">
                  {formatPhoneNumber(manager.office_phone)}
                </span>
              </a>
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onChangeClick}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Change
              </Button>
              {!isPrimary && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onRemove}
                >
                  <X className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
