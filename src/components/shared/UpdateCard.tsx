import { FileText, Calendar, Briefcase, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "./UserAvatar";
import { AIBadge } from "@/components/ui/ai-badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface UpdateCardData {
  id: string;
  title: string;
  description?: string | null;
  update_type: string;
  is_ai_summary?: boolean | null;
  created_at?: string | null;
  case_number?: string;
  case_title?: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

interface UpdateCardProps {
  update: UpdateCardData;
  onClick?: () => void;
  className?: string;
}

const getUpdateTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'Case Update': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Client Contact': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case '3rd-Party Contact': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'Surveillance': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'Accounting': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
};

export function UpdateCard({ update, onClick, className }: UpdateCardProps) {
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
      {/* Header: Title + Type Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate">
            {update.title}
          </h3>
          {update.is_ai_summary && (
            <div className="flex items-center gap-1 text-xs text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)] mt-0.5">
              <Bot className="h-3 w-3" />
              AI Summary
            </div>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs shrink-0", getUpdateTypeBadgeColor(update.update_type))}
        >
          {update.update_type}
        </Badge>
      </div>

      {/* Description preview */}
      {update.description && (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-2">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{update.description}</span>
        </div>
      )}

      {/* Case row */}
      {update.case_number && (
        <div className="flex items-center gap-1.5 text-sm mb-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{update.case_number}</span>
          {update.case_title && (
            <span className="text-muted-foreground truncate">• {update.case_title}</span>
          )}
        </div>
      )}

      {/* Date row */}
      {update.created_at && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{format(new Date(update.created_at), "MMM d, yyyy")}</span>
        </div>
      )}

      {/* Footer: Author */}
      {update.author_name && (
        <div className="flex items-center gap-2 pt-2 border-t mt-3">
          <UserAvatar 
            name={update.author_name} 
            avatarUrl={update.author_avatar} 
            size="sm" 
          />
          <span className="text-sm text-muted-foreground">{update.author_name}</span>
        </div>
      )}
    </Card>
  );
}

export default UpdateCard;
