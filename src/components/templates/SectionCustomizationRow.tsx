import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UpdateTypeMappingEditor } from "./UpdateTypeMappingEditor";
import { EventTypeMappingEditor } from "./EventTypeMappingEditor";
import type {
  TemplateSection,
  SectionCustomization,
  CollectionConfig,
  UpdateTypeMapping,
  EventTypeMapping,
  EventDisplayConfig,
  SectionType,
} from "@/lib/reportTemplates";
import { SECTION_TYPE_LABELS } from "@/lib/reportTemplates";

interface SectionCustomizationRowProps {
  section: TemplateSection;
  customization: SectionCustomization | undefined;
  onCustomizationChange: (customization: SectionCustomization) => void;
  isDragging?: boolean;
}

export function SectionCustomizationRow({
  section,
  customization,
  onCustomizationChange,
  isDragging,
}: SectionCustomizationRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get effective values (customized or original)
  const effectiveTitle = customization?.customTitle ?? section.title;
  const effectiveVisible = customization?.isVisible ?? section.isVisible;

  // Get effective collection config
  const effectiveCollectionConfig: CollectionConfig | null = section.collectionConfig
    ? {
        ...section.collectionConfig,
        ...customization?.collectionConfigOverride,
        updateTypeMapping: customization?.collectionConfigOverride?.updateTypeMapping
          ? { ...section.collectionConfig.updateTypeMapping, ...customization.collectionConfigOverride.updateTypeMapping }
          : section.collectionConfig.updateTypeMapping,
        eventTypeMapping: customization?.collectionConfigOverride?.eventTypeMapping
          ? { ...section.collectionConfig.eventTypeMapping, ...customization.collectionConfigOverride.eventTypeMapping }
          : section.collectionConfig.eventTypeMapping,
        eventDisplayConfig: customization?.collectionConfigOverride?.eventDisplayConfig
          ? { ...section.collectionConfig.eventDisplayConfig, ...customization.collectionConfigOverride.eventDisplayConfig }
          : section.collectionConfig.eventDisplayConfig,
      }
    : null;

  const handleTitleChange = (newTitle: string) => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      customTitle: newTitle || undefined,
    });
  };

  const handleVisibilityToggle = () => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      isVisible: !effectiveVisible,
    });
  };

  const handleUpdateMappingChange = (mapping: UpdateTypeMapping) => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      collectionConfigOverride: {
        ...customization?.collectionConfigOverride,
        updateTypeMapping: mapping,
      },
    });
  };

  const handleEventMappingChange = (mapping: EventTypeMapping) => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      collectionConfigOverride: {
        ...customization?.collectionConfigOverride,
        eventTypeMapping: mapping,
      },
    });
  };

  const handleEventDisplayConfigChange = (config: EventDisplayConfig) => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      collectionConfigOverride: {
        ...customization?.collectionConfigOverride,
        eventDisplayConfig: config,
      },
    });
  };

  const handleSortOrderChange = (sortOrder: 'asc' | 'desc') => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      collectionConfigOverride: {
        ...customization?.collectionConfigOverride,
        sortOrder,
      },
    });
  };

  const handleLimitChange = (limit: number | null) => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      collectionConfigOverride: {
        ...customization?.collectionConfigOverride,
        limit,
      },
    });
  };

  const hasExpandableContent = section.sectionType === 'update_collection' || section.sectionType === 'event_collection';
  const isModified = customization && (
    customization.customTitle !== undefined ||
    customization.isVisible !== undefined ||
    customization.collectionConfigOverride !== undefined
  );

  const getSectionTypeColor = (type: SectionType) => {
    switch (type) {
      case 'static_text': return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'case_variable_block': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'update_collection': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'event_collection': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg bg-card transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary/50' : ''
      } ${!effectiveVisible ? 'opacity-60' : ''}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Expand Toggle (only for collection sections) */}
          {hasExpandableContent ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          {/* Title Input */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                value={effectiveTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false);
                  if (e.key === 'Escape') {
                    handleTitleChange(section.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="h-8 text-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-left w-full text-sm font-medium hover:bg-muted/50 rounded px-2 py-1 -ml-2 truncate"
              >
                {effectiveTitle}
                {isModified && (
                  <span className="ml-2 text-xs text-primary">(modified)</span>
                )}
              </button>
            )}
          </div>

          {/* Section Type Badge */}
          <Badge variant="outline" className={`text-xs shrink-0 ${getSectionTypeColor(section.sectionType)}`}>
            {SECTION_TYPE_LABELS[section.sectionType]}
          </Badge>

          {/* Visibility Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleVisibilityToggle}
                >
                  {effectiveVisible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {effectiveVisible ? 'Hide section' : 'Show section'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Expandable Content */}
        <CollapsibleContent>
          <div className="border-t px-3 py-4 bg-muted/20">
            {section.sectionType === 'update_collection' && (
              <UpdateTypeMappingEditor
                mapping={effectiveCollectionConfig?.updateTypeMapping ?? null}
                sortOrder={effectiveCollectionConfig?.sortOrder ?? 'asc'}
                limit={effectiveCollectionConfig?.limit ?? null}
                onMappingChange={handleUpdateMappingChange}
                onSortOrderChange={handleSortOrderChange}
                onLimitChange={handleLimitChange}
              />
            )}

            {section.sectionType === 'event_collection' && (
              <EventTypeMappingEditor
                mapping={effectiveCollectionConfig?.eventTypeMapping ?? null}
                displayConfig={effectiveCollectionConfig?.eventDisplayConfig ?? null}
                sortOrder={effectiveCollectionConfig?.sortOrder ?? 'asc'}
                limit={effectiveCollectionConfig?.limit ?? null}
                onMappingChange={handleEventMappingChange}
                onDisplayConfigChange={handleEventDisplayConfigChange}
                onSortOrderChange={handleSortOrderChange}
                onLimitChange={handleLimitChange}
              />
            )}

            {section.sectionType === 'static_text' && (
              <p className="text-sm text-muted-foreground italic">
                Static text content cannot be edited during customization.
              </p>
            )}

            {section.sectionType === 'case_variable_block' && (
              <p className="text-sm text-muted-foreground italic">
                Variable selection cannot be changed during customization.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
