import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RotateCcw, Check, Settings2, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SectionCustomizationRow } from "./SectionCustomizationRow";
import { ReportPreviewPanel } from "./ReportPreviewPanel";
import { generatePreview, buildCustomization, PreviewResult } from "@/lib/reportPreview";
import { OrganizationProfile } from "@/lib/organizationProfile";
import { CaseVariables } from "@/lib/caseVariables";
import {
  type ReportTemplate,
  type TemplateSection,
  type SectionCustomization,
  type TemplateCustomization,
  validateCustomization,
} from "@/lib/reportTemplates";
import { useIsMobile } from "@/hooks/use-mobile";

interface TemplateCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate;
  initialCustomization?: TemplateCustomization;
  onApply: (customization: TemplateCustomization) => void;
  // Optional context for preview
  orgProfile?: OrganizationProfile | null;
  caseVariables?: CaseVariables | null;
}

export function TemplateCustomizer({
  open,
  onOpenChange,
  template,
  initialCustomization,
  onApply,
  orgProfile = null,
  caseVariables = null,
}: TemplateCustomizerProps) {
  const isMobile = useIsMobile();
  
  // State for section order (just IDs)
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  
  // State for all customizations by section ID
  const [customizations, setCustomizations] = useState<Map<string, SectionCustomization>>(new Map());
  
  // Validation error
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Preview state
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<"customize" | "preview">("customize");

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
      setMobileTab("customize");
    }
  }, [open, template, initialCustomization]);

  // Generate preview with debouncing
  useEffect(() => {
    if (!open || !template) {
      setPreview(null);
      return;
    }

    setIsGeneratingPreview(true);
    
    const timeoutId = setTimeout(() => {
      try {
        const customization = buildCustomization(template.id, customizations);
        const result = generatePreview({
          template,
          customization: customizations.size > 0 ? customization : null,
          orgProfile,
          caseVariables,
        });
        setPreview(result);
      } catch (error) {
        console.error("Error generating preview:", error);
      } finally {
        setIsGeneratingPreview(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [open, template, customizations, orgProfile, caseVariables]);

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

  const handleSectionHover = useCallback((sectionId: string | null) => {
    setHighlightedSectionId(sectionId);
  }, []);

  const handlePreviewSectionClick = useCallback((sectionId: string) => {
    // Could expand that section in the customizer
    setHighlightedSectionId(sectionId);
  }, []);

  // Get sections in current order
  const orderedSections = useMemo(() => 
    sectionOrder
      .map(id => template.sections.find(s => s.id === id))
      .filter((s): s is TemplateSection => s !== undefined),
    [sectionOrder, template.sections]
  );

  // Count modifications
  const modificationCount = customizations.size;
  const hasModifications = modificationCount > 0;

  // Section list component (shared between desktop and mobile)
  const sectionList = (
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
            onHover={handleSectionHover}
            isHighlighted={highlightedSectionId === section.id}
          />
        ))}
      </SortableContext>
    </DndContext>
  );

  // Mobile layout with tabs
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-[90vh] max-w-full p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              Customize Template
              {hasModifications && (
                <Badge variant="secondary" className="text-xs">
                  {modificationCount} change{modificationCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {template.name}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "customize" | "preview")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="customize" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="customize" className="flex-1 overflow-hidden m-0 mt-2">
              {validationError && (
                <Alert variant="destructive" className="mx-4 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
              <ScrollArea className="h-full px-4">
                <div className="space-y-2 pb-4">
                  {sectionList}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
              <ReportPreviewPanel
                preview={preview}
                isLoading={isGeneratingPreview}
                highlightedSectionId={highlightedSectionId}
                onSectionClick={handlePreviewSectionClick}
                className="h-full"
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-row gap-2 border-t p-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasModifications}
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleApply} size="sm">
              <Check className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop layout with side-by-side panels
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Customize Template
                {hasModifications && (
                  <Badge variant="secondary" className="text-xs">
                    {modificationCount} change{modificationCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Customize section headers, visibility, and mappings. Drag to reorder sections.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Template:</span>
              <span className="font-medium text-foreground">{template.name}</span>
              {template.isSystemTemplate && (
                <Badge variant="outline" className="text-xs">System</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Main content area with two panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Customization */}
          <div className="w-1/2 flex flex-col border-r">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sections</span>
            </div>

            {validationError && (
              <Alert variant="destructive" className="mx-4 mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {sectionList}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 flex flex-col">
            <ReportPreviewPanel
              preview={preview}
              isLoading={isGeneratingPreview}
              highlightedSectionId={highlightedSectionId}
              onSectionClick={handlePreviewSectionClick}
              className="h-full"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex-row gap-2 border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasModifications}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
