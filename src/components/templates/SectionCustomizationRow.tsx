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
import { cn } from "@/lib/utils";

interface SectionCustomizationRowProps {
  section: TemplateSection;
  customization: SectionCustomization | undefined;
  onCustomizationChange: (customization: SectionCustomization) => void;
  isDragging?: boolean;
  onHover?: (sectionId: string | null) => void;
  isHighlighted?: boolean;
}

export function SectionCustomizationRow({
  section,
  customization,
  onCustomizationChange,
  isDragging,
  onHover,
  isHighlighted,
}: SectionCustomizationRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleMouseEnter = () => onHover?.(section.id);
  const handleMouseLeave = () => onHover?.(null);

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

  const handleShowAuthorChange = (showAuthor: boolean) => {
    onCustomizationChange({
      sectionId: section.id,
      ...customization,
      collectionConfigOverride: {
        ...customization?.collectionConfigOverride,
        showAuthor,
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
      case 'static_text': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'case_variable_block': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'update_collection': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'event_collection': return 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-card transition-all duration-150",
        "hover:border-primary/30 hover:shadow-sm",
        isDragging && "shadow-lg ring-2 ring-primary/50 z-50",
        !effectiveVisible && "opacity-50 bg-muted/30",
        isHighlighted && "ring-2 ring-primary border-primary/50 shadow-md"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-2.5">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Expand Toggle (only for collection sections) */}
          {hasExpandableContent ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
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
                className="h-7 text-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  "text-left w-full text-sm font-medium hover:bg-muted/50 rounded px-2 py-1 -ml-2 truncate transition-colors",
                  !effectiveVisible && "text-muted-foreground"
                )}
              >
                {effectiveTitle}
                {isModified && (
                  <span className="ml-1.5 text-xs text-primary/70">•</span>
                )}
              </button>
            )}
          </div>

          {/* Section Type Badge */}
          <Badge variant="secondary" className={cn("text-[10px] shrink-0 font-normal px-1.5 py-0", getSectionTypeColor(section.sectionType))}>
            {SECTION_TYPE_LABELS[section.sectionType]}
          </Badge>

          {/* Visibility Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0",
                    effectiveVisible ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
                  )}
                  onClick={handleVisibilityToggle}
                >
                  {effectiveVisible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
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
          <div className="border-t px-3 py-3 bg-muted/30">
            {section.sectionType === 'update_collection' && (
              <UpdateTypeMappingEditor
                mapping={effectiveCollectionConfig?.updateTypeMapping ?? null}
                sortOrder={effectiveCollectionConfig?.sortOrder ?? 'asc'}
                limit={effectiveCollectionConfig?.limit ?? null}
                showAuthor={effectiveCollectionConfig?.showAuthor !== false}
                onMappingChange={handleUpdateMappingChange}
                onSortOrderChange={handleSortOrderChange}
                onLimitChange={handleLimitChange}
                onShowAuthorChange={handleShowAuthorChange}
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
