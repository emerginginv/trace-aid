import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface CaseCardManagerDisplayProps {
  manager: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    color: string | null;
  } | null;
}

export function CaseCardManagerDisplay({ manager }: CaseCardManagerDisplayProps) {
  if (!manager) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
          <User className="h-3 w-3" />
        </div>
        <span>Unassigned</span>
      </div>
    );
  }

  const initials = manager.full_name
    ? manager.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className="flex items-center gap-2 text-xs">
      <Avatar className="h-5 w-5">
        <AvatarImage src={manager.avatar_url || undefined} alt={manager.full_name || "Case Manager"} />
        <AvatarFallback
          className="text-[10px]"
          style={manager.color ? { backgroundColor: manager.color, color: "#fff" } : undefined}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-muted-foreground">
        <span className="font-medium text-foreground">{manager.full_name || "Unknown"}</span>
      </span>
    </div>
  );
}
