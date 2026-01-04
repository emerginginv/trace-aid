import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, RotateCcw, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SectionCustomizationRow } from "./SectionCustomizationRow";
import {
  type ReportTemplate,
  type TemplateSection,
  type SectionCustomization,
  type TemplateCustomization,
  applyCustomizations,
  validateCustomization,
} from "@/lib/reportTemplates";

interface TemplateCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate;
  initialCustomization?: TemplateCustomization;
  onApply: (customization: TemplateCustomization) => void;
}

export function TemplateCustomizer({
  open,
  onOpenChange,
  template,
  initialCustomization,
  onApply,
}: TemplateCustomizerProps) {
  // State for section order (just IDs)
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  
  // State for all customizations by section ID
  const [customizations, setCustomizations] = useState<Map<string, SectionCustomization>>(new Map());
  
  // Validation error
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize state when template changes or dialog opens
  useEffect(() => {
    if (open && template) {
      // Sort sections by display order
      const sortedSections = [...template.sections].sort((a, b) => a.displayOrder - b.displayOrder);
      setSectionOrder(sortedSections.map(s => s.id));
      
      // Initialize customizations from initial or empty
      if (initialCustomization) {
        const customizationMap = new Map<string, SectionCustomization>();
        initialCustomization.sectionCustomizations.forEach(sc => {
          customizationMap.set(sc.sectionId, sc);
        });
        setCustomizations(customizationMap);
      } else {
        setCustomizations(new Map());
      }
      
      setValidationError(null);
    }
  }, [open, template, initialCustomization]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update display order overrides for all moved sections
        const newCustomizations = new Map(customizations);
        newOrder.forEach((sectionId, index) => {
          const existing = newCustomizations.get(sectionId);
          newCustomizations.set(sectionId, {
            sectionId,
            ...existing,
            displayOrderOverride: index + 1,
          });
        });
        setCustomizations(newCustomizations);
        
        return newOrder;
      });
    }
  }, [customizations]);

  const handleSectionCustomizationChange = useCallback((customization: SectionCustomization) => {
    setCustomizations(prev => {
      const updated = new Map(prev);
      updated.set(customization.sectionId, customization);
      return updated;
    });
    setValidationError(null);
  }, []);

  const handleReset = useCallback(() => {
    const sortedSections = [...template.sections].sort((a, b) => a.displayOrder - b.displayOrder);
    setSectionOrder(sortedSections.map(s => s.id));
    setCustomizations(new Map());
    setValidationError(null);
  }, [template]);

  const handleApply = useCallback(() => {
    // Build the customization object
    const templateCustomization: TemplateCustomization = {
      templateId: template.id,
      sectionCustomizations: Array.from(customizations.values()),
    };

    // Validate
    const validation = validateCustomization(template, templateCustomization);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid customization');
      return;
    }

    onApply(templateCustomization);
    onOpenChange(false);
  }, [template, customizations, onApply, onOpenChange]);

  // Get sections in current order
  const orderedSections = sectionOrder
    .map(id => template.sections.find(s => s.id === id))
    .filter((s): s is TemplateSection => s !== undefined);

  // Count modifications
  const modificationCount = customizations.size;
  const hasModifications = modificationCount > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Customize Template
            {hasModifications && (
              <Badge variant="secondary" className="text-xs">
                {modificationCount} change{modificationCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Customize section headers, visibility, and mappings. Drag to reorder sections.
          </SheetDescription>
        </SheetHeader>

        {/* Template Info */}
        <div className="flex items-center gap-2 py-2 border-b">
          <span className="text-sm text-muted-foreground">Template:</span>
          <span className="text-sm font-medium">{template.name}</span>
          {template.isSystemTemplate && (
            <Badge variant="outline" className="text-xs">System</Badge>
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Section List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={verticalListSortingStrategy}
              >
                {orderedSections.map((section) => (
                  <SectionCustomizationRow
                    key={section.id}
                    section={section}
                    customization={customizations.get(section.id)}
                    onCustomizationChange={handleSectionCustomizationChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasModifications}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleApply}>
            <Check className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
