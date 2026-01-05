import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { HelpCircle } from "lucide-react";
import type { UpdateTypeMapping } from "@/lib/reportTemplates";

// Default update types if none are found in picklists
const DEFAULT_UPDATE_TYPES = [
  'Surveillance',
  'Case Update',
  'Interview',
  'Accounting',
  'Client Contact',
  '3rd Party Contact',
  'Review',
  'Other'
];

interface UpdateTypeMappingEditorProps {
  mapping: UpdateTypeMapping | null;
  sortOrder: 'asc' | 'desc';
  limit: number | null;
  onMappingChange: (mapping: UpdateTypeMapping) => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
  onLimitChange: (limit: number | null) => void;
  isReadOnly?: boolean;
}

export function UpdateTypeMappingEditor({
  mapping,
  sortOrder,
  limit,
  onMappingChange,
  onSortOrderChange,
  onLimitChange,
  isReadOnly = false,
}: UpdateTypeMappingEditorProps) {
  const { organization } = useOrganization();
  const [availableUpdateTypes, setAvailableUpdateTypes] = useState<string[]>(DEFAULT_UPDATE_TYPES);

  // Fetch update types from picklists
  useEffect(() => {
    async function fetchUpdateTypes() {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .from('picklists')
        .select('value')
        .eq('type', 'update_type')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        // Deduplicate update types to prevent React key conflicts
        const uniqueTypes = [...new Set(data.map(item => item.value))];
        setAvailableUpdateTypes(uniqueTypes);
      }
    }

    fetchUpdateTypes();
  }, [organization?.id]);

  // Initialize mapping with defaults if null
  const currentMapping: UpdateTypeMapping = mapping || {
    updateTypes: [],
    includeAll: true,
    allowDuplicates: false,
  };

  const handleIncludeAllChange = (checked: boolean) => {
    onMappingChange({
      ...currentMapping,
      includeAll: checked,
      // Clear selection when switching to include all
      updateTypes: checked ? [] : currentMapping.updateTypes,
    });
  };

  const handleUpdateTypeToggle = (updateType: string, checked: boolean) => {
    const newTypes = checked
      ? [...currentMapping.updateTypes, updateType]
      : currentMapping.updateTypes.filter(t => t !== updateType);

    onMappingChange({
      ...currentMapping,
      updateTypes: newTypes,
      // If selecting individual types, disable include all
      includeAll: false,
    });
  };

  const handleAllowDuplicatesChange = (checked: boolean) => {
    onMappingChange({
      ...currentMapping,
      allowDuplicates: checked,
    });
  };

  const handleLimitChange = (value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    onLimitChange(isNaN(numValue as number) ? null : numValue);
  };

  return (
    <div className="space-y-4">
      {/* Sort Order */}
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
              <SelectItem value="asc">Oldest First (Chronological)</SelectItem>
              <SelectItem value="desc">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1 w-32">
          <Label className="text-xs">Limit (optional)</Label>
          <Input
            type="number"
            min="1"
            placeholder="No limit"
            value={limit ?? ''}
            onChange={(e) => handleLimitChange(e.target.value)}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Include All Toggle */}
      <div className="border rounded-md p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-all-updates"
            checked={currentMapping.includeAll}
            onCheckedChange={(checked) => handleIncludeAllChange(checked === true)}
            disabled={isReadOnly}
          />
          <Label htmlFor="include-all-updates" className="text-sm font-medium cursor-pointer">
            Include all update types
          </Label>
        </div>

        {!currentMapping.includeAll && (
          <>
            <div className="border-t pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Select update types to include in this section:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableUpdateTypes.map((updateType, index) => (
                  <div key={`${updateType}-${index}`} className="flex items-center gap-2">
                    <Checkbox
                      id={`update-type-${updateType}`}
                      checked={currentMapping.updateTypes.includes(updateType)}
                      onCheckedChange={(checked) =>
                        handleUpdateTypeToggle(updateType, checked === true)
                      }
                      disabled={isReadOnly}
                    />
                    <Label
                      htmlFor={`update-type-${updateType}`}
                      className="text-sm cursor-pointer"
                    >
                      {updateType}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected types preview */}
            {currentMapping.updateTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                {currentMapping.updateTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            )}

            {currentMapping.updateTypes.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No update types selected. This section will be empty in reports.
              </p>
            )}
          </>
        )}
      </div>

      {/* Allow Duplicates */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="allow-duplicates"
          checked={currentMapping.allowDuplicates}
          onCheckedChange={(checked) => handleAllowDuplicatesChange(checked === true)}
          disabled={isReadOnly}
        />
        <Label htmlFor="allow-duplicates" className="text-sm cursor-pointer">
          Allow same update in multiple sections
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                When disabled, each update will only appear in the first matching section.
                Enable this if you want the same update to appear in multiple sections
                (e.g., a Surveillance update appearing in both "Activity Log" and "Summary" sections).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
