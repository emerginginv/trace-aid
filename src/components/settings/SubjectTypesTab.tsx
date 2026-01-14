import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SUBJECT_CATEGORIES, SubjectCategoryValue, SubjectType } from "@/hooks/useSubjectTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, GripVertical, ChevronDown, Users, Car, MapPin, Package, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CATEGORY_ICONS: Record<SubjectCategoryValue, React.ElementType> = {
  person: Users,
  vehicle: Car,
  location: MapPin,
  item: Package,
  business: Building2,
};

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444', '#22c55e', '#06b6d4', '#f97316'
];

function SortableSubjectTypeRow({ subjectType, onEdit }: { 
  subjectType: SubjectType; 
  onEdit: (st: SubjectType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subjectType.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-3 p-2 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div 
        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: subjectType.color + '20' }}
      >
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subjectType.color }} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{subjectType.name}</span>
          <Badge variant="outline" className="font-mono text-xs">
            {subjectType.code}
          </Badge>
          {!subjectType.is_active && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
        {subjectType.description && (
          <p className="text-xs text-muted-foreground truncate">{subjectType.description}</p>
        )}
      </div>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(subjectType)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface CategorySectionProps {
  category: typeof SUBJECT_CATEGORIES[number];
  types: SubjectType[];
  onEdit: (st: SubjectType) => void;
  onAdd: (category: SubjectCategoryValue) => void;
  onReorder: (types: SubjectType[]) => void;
}

function CategorySection({ category, types, onEdit, onAdd, onReorder }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = CATEGORY_ICONS[category.value];
  const activeCount = types.filter(t => t.is_active).length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = types.findIndex(st => st.id === active.id);
    const newIndex = types.findIndex(st => st.id === over.id);
    
    const newOrder = arrayMove(types, oldIndex, newIndex);
    onReorder(newOrder);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{category.pluralLabel}</span>
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onAdd(category.value); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          {types.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No types configured yet. Click "Add" to create one.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={types.map(st => st.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {types.map(subjectType => (
                    <SortableSubjectTypeRow
                      key={subjectType.id}
                      subjectType={subjectType}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubjectTypesTab() {
  const { organization } = useOrganization();
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubjectType, setEditingSubjectType] = useState<SubjectType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategoryValue>('person');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: DEFAULT_COLORS[0],
    is_active: true,
  });

  useEffect(() => {
    if (organization?.id) {
      fetchSubjectTypes();
    }
  }, [organization?.id]);

  const fetchSubjectTypes = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('subject_types')
        .select('*')
        .eq('organization_id', organization.id)
        .order('category')
        .order('display_order');

      if (error) throw error;
      setSubjectTypes((data || []) as SubjectType[]);
    } catch (error) {
      console.error('Error fetching subject types:', error);
      toast.error('Failed to load subject types');
    } finally {
      setLoading(false);
    }
  };

  const getTypesByCategory = (category: SubjectCategoryValue): SubjectType[] => {
    return subjectTypes.filter(st => st.category === category);
  };

  const handleReorder = async (category: SubjectCategoryValue, reorderedTypes: SubjectType[]) => {
    // Update local state immediately
    const otherTypes = subjectTypes.filter(st => st.category !== category);
    setSubjectTypes([...otherTypes, ...reorderedTypes]);

    // Update database
    try {
      for (let i = 0; i < reorderedTypes.length; i++) {
        await supabase
          .from('subject_types')
          .update({ display_order: i })
          .eq('id', reorderedTypes[i].id);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
      fetchSubjectTypes();
    }
  };

  const openCreateDialog = (category: SubjectCategoryValue) => {
    setEditingSubjectType(null);
    setSelectedCategory(category);
    const typesInCategory = getTypesByCategory(category);
    setFormData({
      name: '',
      code: '',
      description: '',
      color: DEFAULT_COLORS[typesInCategory.length % DEFAULT_COLORS.length],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (subjectType: SubjectType) => {
    setEditingSubjectType(subjectType);
    setSelectedCategory(subjectType.category);
    setFormData({
      name: subjectType.name,
      code: subjectType.code,
      description: subjectType.description || '',
      color: subjectType.color,
      is_active: subjectType.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organization?.id) return;
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Name and Code are required');
      return;
    }

    try {
      const payload = {
        organization_id: organization.id,
        category: selectedCategory,
        name: formData.name.trim(),
        code: formData.code.trim().toLowerCase().replace(/\s+/g, '_'),
        description: formData.description.trim() || null,
        color: formData.color,
        is_active: formData.is_active,
      };

      if (editingSubjectType) {
        const { error } = await supabase
          .from('subject_types')
          .update(payload)
          .eq('id', editingSubjectType.id);
        if (error) throw error;
        toast.success('Subject type updated');
      } else {
        const typesInCategory = getTypesByCategory(selectedCategory);
        const { error } = await supabase
          .from('subject_types')
          .insert({ ...payload, display_order: typesInCategory.length });
        if (error) throw error;
        toast.success('Subject type created');
      }

      setDialogOpen(false);
      fetchSubjectTypes();
    } catch (error: any) {
      console.error('Error saving subject type:', error);
      if (error.code === '23505') {
        toast.error('A subject type with this code already exists in this category');
      } else {
        toast.error('Failed to save subject type');
      }
    }
  };

  const getCategoryLabel = (value: SubjectCategoryValue): string => {
    return SUBJECT_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subject Types
          </CardTitle>
          <CardDescription>
            Configure the types available for each subject category. Categories (Person, Vehicle, etc.) are fixed, 
            but you can customize the types within each category (e.g., Claimant, Witness for People).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SUBJECT_CATEGORIES.map(category => (
            <CategorySection
              key={category.value}
              category={category}
              types={getTypesByCategory(category.value)}
              onEdit={openEditDialog}
              onAdd={openCreateDialog}
              onReorder={(types) => handleReorder(category.value, types)}
            />
          ))}
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Subject types cannot be deleted to preserve data integrity. Deactivate a type to hide it from new subjects while preserving existing data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubjectType ? 'Edit' : 'Add'} {getCategoryLabel(selectedCategory)} Type
            </DialogTitle>
            <DialogDescription>
              Configure a type for the {getCategoryLabel(selectedCategory).toLowerCase()} category
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={selectedCategory === 'person' ? 'e.g., Claimant, Witness' : 'e.g., Truck, Medical Facility'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  code: e.target.value.toLowerCase().replace(/\s+/g, '_') 
                }))}
                placeholder="e.g., claimant, witness"
                className="font-mono"
                disabled={!!editingSubjectType}
              />
              {editingSubjectType && (
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
              <span className="text-xs text-muted-foreground ml-2">
                (Inactive types won't appear when creating new subjects)
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSubjectType ? 'Save Changes' : 'Add Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
