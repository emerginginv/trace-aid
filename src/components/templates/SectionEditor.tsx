import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Trash2, GripVertical, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import {
  type TemplateSection,
  type SectionType,
  type VariableBlockConfig,
  type VariableLayout,
  type CollectionConfig,
  type UpdateTypeMapping,
  type EventTypeMapping,
  type EventDisplayConfig,
  SECTION_TYPE_LABELS,
  AVAILABLE_CASE_VARIABLES,
  getDefaultUpdateCollectionConfig,
  getDefaultEventCollectionConfig,
} from "@/lib/reportTemplates";
import { UpdateTypeMappingEditor } from "./UpdateTypeMappingEditor";
import { EventTypeMappingEditor } from "./EventTypeMappingEditor";

interface SectionEditorProps {
  section: TemplateSection;
  onUpdate: (updates: Partial<TemplateSection>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function SectionEditor({
  section,
  onUpdate,
  onDelete,
  isReadOnly = false,
  dragHandleProps,
}: SectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTitleChange = (title: string) => {
    onUpdate({ title });
  };

  const handleTypeChange = (sectionType: SectionType) => {
    const updates: Partial<TemplateSection> = { sectionType };
    
    // Reset configs when type changes
    if (sectionType === 'static_text') {
      updates.content = '<p></p>';
      updates.variableConfig = null;
      updates.collectionConfig = null;
    } else if (sectionType === 'case_variable_block') {
      updates.content = null;
      updates.variableConfig = {
        variables: [],
        layout: 'table',
        showLabels: true,
      };
      updates.collectionConfig = null;
    } else if (sectionType === 'update_collection') {
      updates.content = null;
      updates.variableConfig = null;
      updates.collectionConfig = getDefaultUpdateCollectionConfig();
    } else if (sectionType === 'event_collection') {
      updates.content = null;
      updates.variableConfig = null;
      updates.collectionConfig = getDefaultEventCollectionConfig();
    } else {
      updates.content = null;
      updates.variableConfig = null;
      updates.collectionConfig = null;
    }
    
    onUpdate(updates);
  };

  const handleContentChange = (content: string) => {
    onUpdate({ content });
  };

  const handleVariableToggle = (variableKey: string, checked: boolean) => {
    const currentConfig = section.variableConfig || {
      variables: [],
      layout: 'table' as VariableLayout,
      showLabels: true,
    };
    
    const variables = checked
      ? [...currentConfig.variables, variableKey]
      : currentConfig.variables.filter(v => v !== variableKey);
    
    onUpdate({
      variableConfig: {
        ...currentConfig,
        variables,
      },
    });
  };

  const handleLayoutChange = (layout: VariableLayout) => {
    const currentConfig = section.variableConfig || {
      variables: [],
      layout: 'table' as VariableLayout,
      showLabels: true,
    };
    
    onUpdate({
      variableConfig: {
        ...currentConfig,
        layout,
      },
    });
  };

  const handleShowLabelsChange = (showLabels: boolean) => {
    const currentConfig = section.variableConfig || {
      variables: [],
      layout: 'table' as VariableLayout,
      showLabels: true,
    };
    
    onUpdate({
      variableConfig: {
        ...currentConfig,
        showLabels,
      },
    });
  };

  const handleVisibilityToggle = () => {
    onUpdate({ isVisible: !section.isVisible });
  };

  // Update collection config handlers
  const handleUpdateMappingChange = (updateTypeMapping: UpdateTypeMapping) => {
    const currentConfig = section.collectionConfig || getDefaultUpdateCollectionConfig();
    onUpdate({
      collectionConfig: {
        ...currentConfig,
        updateTypeMapping,
      },
    });
  };

  const handleSortOrderChange = (sortOrder: 'asc' | 'desc') => {
    const defaultConfig = section.sectionType === 'event_collection' 
      ? getDefaultEventCollectionConfig() 
      : getDefaultUpdateCollectionConfig();
    const currentConfig = section.collectionConfig || defaultConfig;
    onUpdate({
      collectionConfig: {
        ...currentConfig,
        sortOrder,
      },
    });
  };

  const handleLimitChange = (limit: number | null) => {
    const defaultConfig = section.sectionType === 'event_collection' 
      ? getDefaultEventCollectionConfig() 
      : getDefaultUpdateCollectionConfig();
    const currentConfig = section.collectionConfig || defaultConfig;
    onUpdate({
      collectionConfig: {
        ...currentConfig,
        limit,
      },
    });
  };

  // Event collection config handlers
  const handleEventMappingChange = (eventTypeMapping: EventTypeMapping) => {
    const currentConfig = section.collectionConfig || getDefaultEventCollectionConfig();
    onUpdate({
      collectionConfig: {
        ...currentConfig,
        eventTypeMapping,
      },
    });
  };

  const handleEventDisplayConfigChange = (eventDisplayConfig: EventDisplayConfig) => {
    const currentConfig = section.collectionConfig || getDefaultEventCollectionConfig();
    onUpdate({
      collectionConfig: {
        ...currentConfig,
        eventDisplayConfig,
      },
    });
  };

  // Group variables by category
  const variablesByCategory = AVAILABLE_CASE_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_CASE_VARIABLES>);

  return (
    <Card className={`${!section.isVisible ? 'opacity-60' : ''}`}>
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          {!isReadOnly && dragHandleProps && (
            <div 
              className="cursor-move text-muted-foreground touch-none"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <CardTitle className="text-sm font-medium truncate">
                {section.title || 'Untitled Section'}
              </CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {SECTION_TYPE_LABELS[section.sectionType]}
              </span>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVisibilityToggle}
                title={section.isVisible ? 'Hide section' : 'Show section'}
              >
                {section.isVisible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
          {/* Section Title */}
          <div className="space-y-1">
            <Label htmlFor={`title-${section.id}`} className="text-xs">
              Section Title
            </Label>
            <Input
              id={`title-${section.id}`}
              value={section.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={isReadOnly}
              placeholder="Enter section title"
            />
          </div>

          {/* Section Type */}
          <div className="space-y-1">
            <Label className="text-xs">Section Type</Label>
            <Select
              value={section.sectionType}
              onValueChange={(value) => handleTypeChange(value as SectionType)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SECTION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific content */}
          {section.sectionType === 'static_text' && (
            <div className="space-y-1">
              <Label className="text-xs">Content</Label>
              <div className="border rounded-md">
                <RichTextEditor
                  value={section.content || ''}
                  onChange={handleContentChange}
                  placeholder="Enter static text content. Use the Insert Placeholder dropdown to add dynamic values."
                  showPlaceholderDropdown={!isReadOnly}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use placeholders like {"{{company_name}}"}, {"{{current_date}}"}, {"{{case_manager}}"} for dynamic values.
              </p>
            </div>
          )}

          {section.sectionType === 'case_variable_block' && (
            <div className="space-y-4">
              {/* Layout options */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Layout</Label>
                  <Select
                    value={section.variableConfig?.layout || 'table'}
                    onValueChange={(value) => handleLayoutChange(value as VariableLayout)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="inline">Inline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox
                    id={`show-labels-${section.id}`}
                    checked={section.variableConfig?.showLabels ?? true}
                    onCheckedChange={(checked) => handleShowLabelsChange(checked === true)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor={`show-labels-${section.id}`} className="text-xs">
                    Show Labels
                  </Label>
                </div>
              </div>

              {/* Variable selection */}
              <div className="space-y-2">
                <Label className="text-xs">Variables to Display</Label>
                <div className="border rounded-md p-3 space-y-4 max-h-60 overflow-y-auto">
                  {Object.entries(variablesByCategory).map(([category, variables]) => (
                    <div key={category} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{category}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {variables.map((variable) => (
                          <div key={variable.key} className="flex items-center gap-2">
                            <Checkbox
                              id={`var-${section.id}-${variable.key}`}
                              checked={section.variableConfig?.variables.includes(variable.key) ?? false}
                              onCheckedChange={(checked) =>
                                handleVariableToggle(variable.key, checked === true)
                              }
                              disabled={isReadOnly}
                            />
                            <Label
                              htmlFor={`var-${section.id}-${variable.key}`}
                              className="text-xs cursor-pointer"
                            >
                              {variable.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section.sectionType === 'update_collection' && (
            <div className="space-y-3">
              <Label className="text-xs font-medium">Update Type Mapping</Label>
              <UpdateTypeMappingEditor
                mapping={section.collectionConfig?.updateTypeMapping || null}
                sortOrder={section.collectionConfig?.sortOrder || 'asc'}
                limit={section.collectionConfig?.limit || null}
                onMappingChange={handleUpdateMappingChange}
                onSortOrderChange={handleSortOrderChange}
                onLimitChange={handleLimitChange}
                isReadOnly={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Selected updates will be inserted in chronological order when generating reports.
              </p>
            </div>
          )}

          {section.sectionType === 'event_collection' && (
            <div className="space-y-3">
              <Label className="text-xs font-medium">Event Type Mapping</Label>
              <EventTypeMappingEditor
                mapping={section.collectionConfig?.eventTypeMapping || null}
                displayConfig={section.collectionConfig?.eventDisplayConfig || null}
                sortOrder={section.collectionConfig?.sortOrder || 'asc'}
                limit={section.collectionConfig?.limit || null}
                onMappingChange={handleEventMappingChange}
                onDisplayConfigChange={handleEventDisplayConfigChange}
                onSortOrderChange={handleSortOrderChange}
                onLimitChange={handleLimitChange}
                isReadOnly={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Selected events will be inserted as structured records when generating reports.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
