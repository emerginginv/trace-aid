import { getAllEntitiesSorted } from "@/lib/templateColumnDefinitions";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Users, UserCircle, Briefcase, 
  UserSearch, Link, FileText, Calendar, 
  Clock, Receipt, Wallet, TrendingUp, ArrowDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportOrderDiagramProps {
  currentEntity?: string;
  completedEntities?: string[];
  compact?: boolean;
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  organization: Building2,
  accounts: Users,
  contacts: UserCircle,
  cases: Briefcase,
  subjects: UserSearch,
  case_subjects: Link,
  case_updates: FileText,
  case_activities: Calendar,
  time_entries: Clock,
  expenses: Receipt,
  budgets: Wallet,
  budget_adjustments: TrendingUp,
};

export function ImportOrderDiagram({ 
  currentEntity, 
  completedEntities = [],
  compact = false
}: ImportOrderDiagramProps) {
  const entities = getAllEntitiesSorted();
  
  const getStatus = (entityType: string) => {
    if (completedEntities.includes(entityType)) return 'completed';
    if (currentEntity === entityType) return 'current';
    return 'pending';
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {entities.map((entity, index) => {
          const Icon = ENTITY_ICONS[entity.entityType] || FileText;
          const status = getStatus(entity.entityType);
          
          return (
            <div key={entity.entityType} className="flex items-center gap-1">
              <Badge 
                variant={status === 'completed' ? 'default' : status === 'current' ? 'secondary' : 'outline'}
                className={cn(
                  "gap-1",
                  status === 'completed' && 'bg-green-500',
                  status === 'current' && 'bg-primary animate-pulse'
                )}
              >
                <Icon className="h-3 w-3" />
                <span className="text-xs">{index + 1}</span>
              </Badge>
              {index < entities.length - 1 && (
                <ArrowDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entities.map((entity, index) => {
        const Icon = ENTITY_ICONS[entity.entityType] || FileText;
        const status = getStatus(entity.entityType);
        const hasDependencies = entity.dependsOn.length > 0;
        
        return (
          <div key={entity.entityType} className="flex items-stretch gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  status === 'completed' && 'bg-green-500 border-green-500 text-white',
                  status === 'current' && 'bg-primary border-primary text-primary-foreground animate-pulse',
                  status === 'pending' && 'bg-muted border-muted-foreground/30 text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {index < entities.length - 1 && (
                <div 
                  className={cn(
                    "w-0.5 flex-1 min-h-[8px]",
                    completedEntities.includes(entity.entityType) 
                      ? 'bg-green-500' 
                      : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-medium">{entity.displayName}</span>
                {hasDependencies && (
                  <Badge variant="outline" className="text-xs">
                    Needs: {entity.dependsOn.map(d => {
                      const depEntity = entities.find(e => e.entityType === d);
                      return depEntity?.displayName || d;
                    }).join(', ')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {entity.description}
              </p>
            </div>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 mt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-muted border" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}
