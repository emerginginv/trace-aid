import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Zap, Settings2, AlertCircle } from "lucide-react";
import { 
  useCaseStatusTriggers, 
  TRIGGER_EVENT_TYPES, 
  EVENT_TYPE_LABELS, 
  EVENT_TYPE_DESCRIPTIONS,
  TriggerEventType 
} from "@/hooks/use-case-status-triggers";
import { useCaseStatuses } from "@/hooks/use-case-statuses";

interface CaseStatusTriggersCardProps {
  workflow?: string;
}

export function CaseStatusTriggersCard({ workflow = 'standard' }: CaseStatusTriggersCardProps) {
  const { 
    triggers, 
    isLoading, 
    getTriggerByEvent, 
    setTriggerForEvent, 
    toggleTrigger,
    setAllowOverride,
    isSaving 
  } = useCaseStatusTriggers(workflow);
  
  const { activeStatuses, isLoading: statusesLoading } = useCaseStatuses();
  const [expandedEvents, setExpandedEvents] = useState<Set<TriggerEventType>>(new Set());
  
  const toggleExpand = (eventType: TriggerEventType) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  };
  
  const handleStatusChange = async (eventType: TriggerEventType, statusId: string) => {
    await setTriggerForEvent(eventType, statusId === 'none' ? null : statusId);
  };
  
  const handleToggle = async (eventType: TriggerEventType) => {
    await toggleTrigger(eventType);
  };
  
  const handleAllowOverrideChange = async (eventType: TriggerEventType, checked: boolean) => {
    await setAllowOverride(eventType, checked);
  };
  
  // Filter statuses to only show active ones
  const availableStatuses = activeStatuses.filter(s => 
    s.workflows?.includes(workflow) || s.workflows?.length === 0
  );
  
  if (isLoading || statusesLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  const enabledCount = triggers.filter(t => t.enabled).length;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <CardTitle>Automatic Status Triggers</CardTitle>
          {enabledCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {enabledCount} active
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure events that automatically advance case status. Triggers only fire if the case hasn't already reached or passed the target status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {TRIGGER_EVENT_TYPES.map((eventType) => {
            const trigger = getTriggerByEvent(eventType);
            const isExpanded = expandedEvents.has(eventType);
            const hasConfig = !!trigger?.target_status_id;
            
            return (
              <div 
                key={eventType} 
                className="border rounded-lg overflow-hidden"
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4 bg-card hover:bg-accent/50 transition-colors">
                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium cursor-default">
                        {EVENT_TYPE_LABELS[eventType]}
                      </Label>
                      {trigger?.enabled && trigger?.target_status && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: trigger.target_status.color || undefined,
                            color: trigger.target_status.color || undefined
                          }}
                        >
                          → {trigger.target_status.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {EVENT_TYPE_DESCRIPTIONS[eventType]}
                    </p>
                  </div>
                  
                  {/* Status selector */}
                  <Select
                    value={trigger?.target_status_id || 'none'}
                    onValueChange={(value) => handleStatusChange(eventType, value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="No action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No action</SelectItem>
                      {availableStatuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            {status.color && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: status.color }}
                              />
                            )}
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Enable toggle */}
                  <Switch
                    checked={trigger?.enabled ?? false}
                    onCheckedChange={() => handleToggle(eventType)}
                    disabled={!hasConfig || isSaving}
                    aria-label={`Enable ${EVENT_TYPE_LABELS[eventType]} trigger`}
                  />
                  
                  {/* Expand button */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(eventType)}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={!hasConfig}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                </div>
                
                {/* Expanded settings */}
                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    {hasConfig && (
                      <div className="px-4 pb-4 pt-2 bg-muted/30 border-t">
                        <div className="flex items-start gap-3">
                          <Settings2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`override-${eventType}`}
                                checked={trigger?.allow_override_manual ?? false}
                                onCheckedChange={(checked) => 
                                  handleAllowOverrideChange(eventType, checked === true)
                                }
                                disabled={isSaving}
                              />
                              <Label 
                                htmlFor={`override-${eventType}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                Allow override of manual status changes
                              </Label>
                            </div>
                            
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              <span>
                                When disabled, this trigger will not fire if the current status was set manually by a user.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
        
        {/* Info section */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            How Triggers Work
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Triggers only fire if the case hasn't already reached or passed the target status</li>
            <li>By default, triggers won't override manual status changes made by users</li>
            <li>Triggers won't fire if the current status is read-only</li>
            <li>All trigger executions are logged for auditing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
