import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Calendar } from "lucide-react";
import {
  type EventTypeMapping,
  type EventDisplayConfig,
  DEFAULT_EVENT_TYPES,
  EVENT_GROUP_OPTIONS,
} from "@/lib/reportTemplates";

interface EventTypeMappingEditorProps {
  mapping: EventTypeMapping | null;
  displayConfig: EventDisplayConfig | null;
  sortOrder: 'asc' | 'desc';
  limit: number | null;
  onMappingChange: (mapping: EventTypeMapping) => void;
  onDisplayConfigChange: (config: EventDisplayConfig) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onLimitChange: (limit: number | null) => void;
  isReadOnly?: boolean;
}

export function EventTypeMappingEditor({
  mapping,
  displayConfig,
  sortOrder,
  limit,
  onMappingChange,
  onDisplayConfigChange,
  onSortOrderChange,
  onLimitChange,
  isReadOnly = false,
}: EventTypeMappingEditorProps) {
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [loading, setLoading] = useState(true);

  // Initialize with defaults if null
  const currentMapping: EventTypeMapping = mapping || {
    eventTypes: [],
    includeAll: true,
    allowDuplicates: false,
  };

  const currentDisplayConfig: EventDisplayConfig = displayConfig || {
    groupBy: 'none',
    showTime: true,
    showAssignee: true,
    showStatus: true,
    showDescription: true,
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const fetchEventTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAvailableEventTypes(DEFAULT_EVENT_TYPES);
        setLoading(false);
        return;
      }

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (orgMember) {
        // Fetch event_type picklist values
        const { data: picklists } = await supabase
          .from("picklists")
          .select("value")
          .eq("type", "event_type")
          .eq("organization_id", orgMember.organization_id)
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (picklists && picklists.length > 0) {
          setAvailableEventTypes(picklists.map(p => p.value));
        } else {
          setAvailableEventTypes(DEFAULT_EVENT_TYPES);
        }
      }
    } catch (error) {
      console.error("Error fetching event types:", error);
      setAvailableEventTypes(DEFAULT_EVENT_TYPES);
    } finally {
      setLoading(false);
    }
  };

  const handleIncludeAllChange = (checked: boolean) => {
    onMappingChange({
      ...currentMapping,
      includeAll: checked,
      eventTypes: checked ? [] : currentMapping.eventTypes,
    });
  };

  const handleEventTypeToggle = (eventType: string, checked: boolean) => {
    const eventTypes = checked
      ? [...currentMapping.eventTypes, eventType]
      : currentMapping.eventTypes.filter(t => t !== eventType);

    onMappingChange({
      ...currentMapping,
      eventTypes,
      includeAll: false,
    });
  };

  const handleAllowDuplicatesChange = (checked: boolean) => {
    onMappingChange({
      ...currentMapping,
      allowDuplicates: checked,
    });
  };

  const handleGroupByChange = (groupBy: 'none' | 'date' | 'type' | 'status') => {
    onDisplayConfigChange({
      ...currentDisplayConfig,
      groupBy,
    });
  };

  const handleDisplayOptionChange = (key: keyof EventDisplayConfig, checked: boolean) => {
    if (key === 'groupBy') return;
    onDisplayConfigChange({
      ...currentDisplayConfig,
      [key]: checked,
    });
  };

  const handleLimitChange = (value: string) => {
    const num = parseInt(value, 10);
    onLimitChange(isNaN(num) || num <= 0 ? null : num);
  };

  const selectedCount = currentMapping.includeAll 
    ? availableEventTypes.length 
    : currentMapping.eventTypes.length;

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/30">
      {/* Sort and Limit Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-1 flex-1">
          <Label className="text-xs">Sort Order</Label>
          <Select
            value={sortOrder}
            onValueChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Oldest First</SelectItem>
              <SelectItem value="desc">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-24">
          <Label className="text-xs">Limit</Label>
          <Input
            type="number"
            min="1"
            placeholder="None"
            value={limit ?? ''}
            onChange={(e) => handleLimitChange(e.target.value)}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Grouping */}
      <div className="space-y-1">
        <Label className="text-xs">Grouping</Label>
        <Select
          value={currentDisplayConfig.groupBy}
          onValueChange={(value) => handleGroupByChange(value as 'none' | 'date' | 'type' | 'status')}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_GROUP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Include All Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="include-all-events"
          checked={currentMapping.includeAll}
          onCheckedChange={(checked) => handleIncludeAllChange(checked === true)}
          disabled={isReadOnly}
        />
        <Label htmlFor="include-all-events" className="text-sm cursor-pointer">
          Include all event types
        </Label>
      </div>

      {/* Event Type Selection */}
      {!currentMapping.includeAll && (
        <div className="space-y-2">
          <Label className="text-xs">
            Select event types for this section ({selectedCount} selected)
          </Label>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-background">
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading event types...</p>
            ) : (
              availableEventTypes.map((eventType) => (
                <div key={eventType} className="flex items-center gap-2">
                  <Checkbox
                    id={`event-type-${eventType}`}
                    checked={currentMapping.eventTypes.includes(eventType)}
                    onCheckedChange={(checked) =>
                      handleEventTypeToggle(eventType, checked === true)
                    }
                    disabled={isReadOnly}
                  />
                  <Label
                    htmlFor={`event-type-${eventType}`}
                    className="text-sm cursor-pointer flex items-center gap-1"
                  >
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {eventType}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected Preview */}
      {!currentMapping.includeAll && currentMapping.eventTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {currentMapping.eventTypes.map((eventType) => (
            <Badge key={eventType} variant="secondary" className="text-xs">
              {eventType}
            </Badge>
          ))}
        </div>
      )}

      {/* Display Options */}
      <div className="space-y-2">
        <Label className="text-xs">Display Options</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-time"
              checked={currentDisplayConfig.showTime}
              onCheckedChange={(checked) =>
                handleDisplayOptionChange('showTime', checked === true)
              }
              disabled={isReadOnly}
            />
            <Label htmlFor="show-time" className="text-xs cursor-pointer">
              Show Time
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-assignee"
              checked={currentDisplayConfig.showAssignee}
              onCheckedChange={(checked) =>
                handleDisplayOptionChange('showAssignee', checked === true)
              }
              disabled={isReadOnly}
            />
            <Label htmlFor="show-assignee" className="text-xs cursor-pointer">
              Show Assignee
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-status"
              checked={currentDisplayConfig.showStatus}
              onCheckedChange={(checked) =>
                handleDisplayOptionChange('showStatus', checked === true)
              }
              disabled={isReadOnly}
            />
            <Label htmlFor="show-status" className="text-xs cursor-pointer">
              Show Status
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-description"
              checked={currentDisplayConfig.showDescription}
              onCheckedChange={(checked) =>
                handleDisplayOptionChange('showDescription', checked === true)
              }
              disabled={isReadOnly}
            />
            <Label htmlFor="show-description" className="text-xs cursor-pointer">
              Show Description
            </Label>
          </div>
        </div>
      </div>

      {/* Allow Duplicates */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Checkbox
          id="allow-event-duplicates"
          checked={currentMapping.allowDuplicates}
          onCheckedChange={(checked) => handleAllowDuplicatesChange(checked === true)}
          disabled={isReadOnly}
        />
        <Label htmlFor="allow-event-duplicates" className="text-sm cursor-pointer">
          Allow same event in multiple sections
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                When disabled, each event will only appear in the first matching section. 
                Enable this to allow the same event to appear in multiple sections.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
