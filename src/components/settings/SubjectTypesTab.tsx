import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, GripVertical, Users, Car, MapPin, Package, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SubjectType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

const ICON_OPTIONS = [
  { value: 'user', label: 'Person', icon: Users },
  { value: 'car', label: 'Vehicle', icon: Car },
  { value: 'map-pin', label: 'Location', icon: MapPin },
  { value: 'package', label: 'Item', icon: Package },
  { value: 'building-2', label: 'Business', icon: Building2 },
];

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444', '#22c55e', '#06b6d4', '#f97316'
];

function getIconComponent(iconName: string) {
  const option = ICON_OPTIONS.find(o => o.value === iconName);
  return option?.icon || Users;
}

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

  const Icon = getIconComponent(subjectType.icon);

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: subjectType.color + '20' }}
      >
        <Icon className="h-4 w-4" style={{ color: subjectType.color }} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{subjectType.name}</span>
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
      
      <Button variant="ghost" size="icon" onClick={() => onEdit(subjectType)}>
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SubjectTypesTab() {
  const { organization } = useOrganization();
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubjectType, setEditingSubjectType] = useState<SubjectType | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'user',
    color: DEFAULT_COLORS[0],
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subjectTypes.findIndex(st => st.id === active.id);
    const newIndex = subjectTypes.findIndex(st => st.id === over.id);
    
    const newOrder = arrayMove(subjectTypes, oldIndex, newIndex);
    setSubjectTypes(newOrder);

    try {
      const updates = newOrder.map((st, index) => ({
        id: st.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('subject_types')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
      fetchSubjectTypes();
    }
  };

  const openCreateDialog = () => {
    setEditingSubjectType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      icon: 'user',
      color: DEFAULT_COLORS[subjectTypes.length % DEFAULT_COLORS.length],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (subjectType: SubjectType) => {
    setEditingSubjectType(subjectType);
    setFormData({
      name: subjectType.name,
      code: subjectType.code,
      description: subjectType.description || '',
      icon: subjectType.icon,
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
        name: formData.name.trim(),
        code: formData.code.trim().toLowerCase().replace(/\s+/g, '_'),
        description: formData.description.trim() || null,
        icon: formData.icon,
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
        const { error } = await supabase
          .from('subject_types')
          .insert({ ...payload, display_order: subjectTypes.length });
        if (error) throw error;
        toast.success('Subject type created');
      }

      setDialogOpen(false);
      fetchSubjectTypes();
    } catch (error: any) {
      console.error('Error saving subject type:', error);
      if (error.code === '23505') {
        toast.error('A subject type with this name or code already exists');
      } else {
        toast.error('Failed to save subject type');
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subject Types
              </CardTitle>
              <CardDescription>
                Configure the types of subjects that can be added to cases (e.g., Person, Vehicle, Location)
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subjectTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subject types configured yet</p>
              <p className="text-sm">Click "Add Subject Type" to create your first one</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={subjectTypes.map(st => st.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {subjectTypes.map(subjectType => (
                    <SortableSubjectTypeRow
                      key={subjectType.id}
                      subjectType={subjectType}
                      onEdit={openEditDialog}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Subject types cannot be deleted to preserve data integrity. Deactivate a subject type to hide it from new case creation while preserving existing subjects.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubjectType ? 'Edit Subject Type' : 'Create Subject Type'}
            </DialogTitle>
            <DialogDescription>
              Configure a type of subject that can be added to cases
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Person, Vehicle, Location"
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
                placeholder="e.g., person, vehicle, location"
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
              <Label>Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map(option => {
                  const OptionIcon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-2 rounded-lg border-2 transition-all ${formData.icon === option.value ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
                      onClick={() => setFormData(prev => ({ ...prev, icon: option.value }))}
                      title={option.label}
                    >
                      <OptionIcon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
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
              {editingSubjectType ? 'Save Changes' : 'Create Subject Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
