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
import { AlertCircle, RotateCcw, Check, Settings2, Eye, FileText, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionCustomizationRow } from "./SectionCustomizationRow";
import { ReportPreviewPanel } from "./ReportPreviewPanel";
import { HeaderFooterConfigEditor } from "./HeaderFooterConfigEditor";
import { generatePreview, buildCustomization, PreviewResult } from "@/lib/reportPreview";
import { OrganizationProfile } from "@/lib/organizationProfile";
import { CaseVariables } from "@/lib/caseVariables";
import {
  type ReportTemplate,
  type TemplateSection,
  type SectionCustomization,
  type TemplateCustomization,
  type CoverPageConfig,
  type SubjectFilterConfig,
  type HeaderFooterConfig,
  validateCustomization,
  getDefaultCoverPageConfig,
  getDefaultSubjectFilterConfig,
  getDefaultHeaderFooterConfig,
  hasHeaderFooterChanges,
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
  
  // Cover page config state
  const [coverPageConfig, setCoverPageConfig] = useState<CoverPageConfig>(getDefaultCoverPageConfig());
  
  // Subject filter config state
  const [subjectFilterConfig, setSubjectFilterConfig] = useState<SubjectFilterConfig>(getDefaultSubjectFilterConfig());
  
  // Header/footer config state
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>(getDefaultHeaderFooterConfig());
  
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
        
        // Initialize cover page config
        setCoverPageConfig(initialCustomization.coverPageConfig || getDefaultCoverPageConfig());
        
        // Initialize subject filter config
        setSubjectFilterConfig(initialCustomization.subjectFilterConfig || getDefaultSubjectFilterConfig());
        
        // Initialize header/footer config
        setHeaderFooterConfig(initialCustomization.headerFooterConfig || getDefaultHeaderFooterConfig());
      } else {
        setCustomizations(new Map());
        setCoverPageConfig(getDefaultCoverPageConfig());
        setSubjectFilterConfig(getDefaultSubjectFilterConfig());
        setHeaderFooterConfig(getDefaultHeaderFooterConfig());
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
        const customization = buildCustomization(template.id, customizations, coverPageConfig, subjectFilterConfig, headerFooterConfig);
        const result = generatePreview({
          template,
          customization: customizations.size > 0 || coverPageConfig || subjectFilterConfig || headerFooterConfig ? customization : null,
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
  }, [open, template, customizations, coverPageConfig, subjectFilterConfig, headerFooterConfig, orgProfile, caseVariables]);

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
    setCoverPageConfig(getDefaultCoverPageConfig());
    setSubjectFilterConfig(getDefaultSubjectFilterConfig());
    setHeaderFooterConfig(getDefaultHeaderFooterConfig());
    setValidationError(null);
  }, [template]);

  const handleApply = useCallback(() => {
    // Build the customization object
    const templateCustomization: TemplateCustomization = {
      templateId: template.id,
      sectionCustomizations: Array.from(customizations.values()),
      coverPageConfig,
      subjectFilterConfig,
      headerFooterConfig,
    };

    // Validate
    const validation = validateCustomization(template, templateCustomization);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid customization');
      return;
    }

    onApply(templateCustomization);
    onOpenChange(false);
  }, [template, customizations, coverPageConfig, subjectFilterConfig, headerFooterConfig, onApply, onOpenChange]);

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

  // Count modifications - include cover page, subject filter, and header/footer changes
  const defaultCoverConfig = getDefaultCoverPageConfig();
  const defaultSubjectConfig = getDefaultSubjectFilterConfig();
  const hasCoverPageChanges = coverPageConfig.showPreparedBy !== defaultCoverConfig.showPreparedBy ||
    coverPageConfig.showCompanyNameWithLogo !== defaultCoverConfig.showCompanyNameWithLogo;
  const hasSubjectFilterChanges = subjectFilterConfig.includeVehicles !== defaultSubjectConfig.includeVehicles ||
    subjectFilterConfig.includeLocations !== defaultSubjectConfig.includeLocations ||
    subjectFilterConfig.includeItems !== defaultSubjectConfig.includeItems;
  const hasHFChanges = hasHeaderFooterChanges(headerFooterConfig);
  const modificationCount = customizations.size + (hasCoverPageChanges ? 1 : 0) + (hasSubjectFilterChanges ? 1 : 0) + (hasHFChanges ? 1 : 0);
  const hasModifications = modificationCount > 0;

  // Cover page settings component
  const coverPageSettings = (
    <Card className="mb-3 border-border/60 shadow-sm">
      <CardHeader className="py-2.5 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Cover Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="showPreparedBy" className="text-sm cursor-pointer leading-tight">
            Show "Prepared by" section
          </Label>
          <Switch
            id="showPreparedBy"
            checked={coverPageConfig.showPreparedBy}
            onCheckedChange={(checked) => setCoverPageConfig(prev => ({
              ...prev,
              showPreparedBy: checked
            }))}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="showCompanyName" className="text-sm cursor-pointer leading-tight">
            Show company name with logo
          </Label>
          <Switch
            id="showCompanyName"
            checked={coverPageConfig.showCompanyNameWithLogo}
            onCheckedChange={(checked) => setCoverPageConfig(prev => ({
              ...prev,
              showCompanyNameWithLogo: checked
            }))}
          />
        </div>
      </CardContent>
    </Card>
  );

  // Subject display settings component
  const subjectDisplaySettings = (
    <Card className="mb-3 border-border/60 shadow-sm">
      <CardHeader className="py-2.5 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Subject Display
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="includeVehicles" className="text-sm cursor-pointer leading-tight">
            Include vehicles
          </Label>
          <Switch
            id="includeVehicles"
            checked={subjectFilterConfig.includeVehicles}
            onCheckedChange={(checked) => setSubjectFilterConfig(prev => ({
              ...prev,
              includeVehicles: checked
            }))}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="includeLocations" className="text-sm cursor-pointer leading-tight">
            Include locations
          </Label>
          <Switch
            id="includeLocations"
            checked={subjectFilterConfig.includeLocations}
            onCheckedChange={(checked) => setSubjectFilterConfig(prev => ({
              ...prev,
              includeLocations: checked
            }))}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="includeItems" className="text-sm cursor-pointer leading-tight">
            Include items
          </Label>
          <Switch
            id="includeItems"
            checked={subjectFilterConfig.includeItems}
            onCheckedChange={(checked) => setSubjectFilterConfig(prev => ({
              ...prev,
              includeItems: checked
            }))}
          />
        </div>
      </CardContent>
    </Card>
  );

  // Header/footer settings component
  const headerFooterSettings = (
    <HeaderFooterConfigEditor
      config={headerFooterConfig}
      onChange={setHeaderFooterConfig}
    />
  );

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
        <div className="space-y-2">
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
        </div>
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
                  {coverPageSettings}
                  {subjectDisplaySettings}
                  {headerFooterSettings}
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
      <DialogContent className="w-full max-w-7xl h-[90vh] p-0 flex flex-col gap-0">
        {/* Compact Header */}
        <DialogHeader className="px-5 py-3 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-base font-semibold">
                Customize Report
              </DialogTitle>
              {hasModifications && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400">
                  {modificationCount} unsaved change{modificationCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{template.name}</span>
              {template.isSystemTemplate && (
                <Badge variant="outline" className="text-xs">System</Badge>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Customize section headers, visibility, and mappings. Drag to reorder sections.
          </DialogDescription>
        </DialogHeader>

        {/* Main content area with two panels */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel - Customization (fixed width) */}
          <div className="w-[360px] flex-shrink-0 flex flex-col border-r bg-background">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sections</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Drag to reorder
              </span>
            </div>

            {validationError && (
              <Alert variant="destructive" className="mx-3 mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{validationError}</AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1">
              <div className="p-3">
                {coverPageSettings}
                {subjectDisplaySettings}
                {headerFooterSettings}
                <div className="text-xs text-muted-foreground mb-2 px-1 font-medium uppercase tracking-wide">
                  Report Sections
                </div>
                {sectionList}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Preview (fluid width) */}
          <div className="flex-1 flex flex-col min-w-0 bg-muted/30">
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
        <DialogFooter className="flex-row gap-2 border-t px-5 py-3 bg-muted/20 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasModifications}
            className="text-muted-foreground"
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
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
