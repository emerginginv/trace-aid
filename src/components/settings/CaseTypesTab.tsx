import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SUBJECT_CATEGORIES, SubjectCategoryValue } from "@/hooks/useSubjectTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, GripVertical, FolderKanban, Clock, DollarSign, Ban, AlertCircle, Users, Car, MapPin, Package, Building2 } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type BudgetStrategy = 'disabled' | 'hours_only' | 'money_only' | 'both';

interface CaseType {
  id: string;
  organization_id: string;
  name: string;
  tag: string;
  description: string | null;
  color: string;
  is_active: boolean;
  display_order: number;
  reference_label_1: string | null;
  reference_label_2: string | null;
  reference_label_3: string | null;
  budget_strategy: BudgetStrategy;
  budget_required: boolean;
  default_due_days: number | null;
  due_date_required: boolean;
  allowed_service_ids: string[];
  allowed_subject_types: string[]; // These are now hardcoded category values
  default_subject_type: string | null;
  allow_on_public_form: boolean;
}

interface CaseService {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

const BUDGET_STRATEGIES = [
  { value: 'both', label: 'Hours and Money', icon: <><Clock className="h-3 w-3" /><DollarSign className="h-3 w-3" /></> },
  { value: 'hours_only', label: 'Hours Only', icon: <Clock className="h-3 w-3" /> },
  { value: 'money_only', label: 'Money Only', icon: <DollarSign className="h-3 w-3" /> },
  { value: 'disabled', label: 'Disabled', icon: <Ban className="h-3 w-3" /> },
];

// Icons for subject categories
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

function SortableCaseTypeRow({ caseType, onEdit, onDelete }: { 
  caseType: CaseType; 
  onEdit: (ct: CaseType) => void; 
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: caseType.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const budgetInfo = BUDGET_STRATEGIES.find(b => b.value === caseType.budget_strategy);

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
        className="w-3 h-3 rounded-full flex-shrink-0" 
        style={{ backgroundColor: caseType.color }}
      />
      
      <Badge variant="outline" className="font-mono text-xs w-12 justify-center">
        {caseType.tag}
      </Badge>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{caseType.name}</span>
          {!caseType.is_active && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
        {caseType.description && (
          <p className="text-xs text-muted-foreground truncate">{caseType.description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-1 text-muted-foreground" title={`Budget: ${budgetInfo?.label}`}>
        {budgetInfo?.icon}
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(caseType)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(caseType.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function CaseTypesTab() {
  const { organization } = useOrganization();
  const { subjectTypes: dynamicSubjectTypes, loading: subjectTypesLoading } = useSubjectTypes({ activeOnly: true });
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [services, setServices] = useState<CaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCaseType, setEditingCaseType] = useState<CaseType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    tag: string;
    description: string;
    color: string;
    is_active: boolean;
    reference_label_1: string;
    reference_label_2: string;
    reference_label_3: string;
    budget_strategy: BudgetStrategy;
    budget_required: boolean;
    default_due_days: string;
    due_date_required: boolean;
    allowed_service_ids: string[];
    allowed_subject_types: string[];
    default_subject_type: string;
    allow_on_public_form: boolean;
  }>({
    name: '',
    tag: '',
    description: '',
    color: DEFAULT_COLORS[0],
    is_active: true,
    reference_label_1: '',
    reference_label_2: '',
    reference_label_3: '',
    budget_strategy: 'both',
    budget_required: false,
    default_due_days: '',
    due_date_required: false,
    allowed_service_ids: [] as string[],
    allowed_subject_types: [] as string[],
    default_subject_type: '',
    allow_on_public_form: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (organization?.id) {
      fetchCaseTypes();
      fetchServices();
    }
  }, [organization?.id]);

  const fetchCaseTypes = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('case_types')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order');

      if (error) throw error;
      setCaseTypes((data || []) as CaseType[]);
    } catch (error) {
      console.error('Error fetching case types:', error);
      toast.error('Failed to load case types');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('case_services')
        .select('id, name, code, is_active')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = caseTypes.findIndex(ct => ct.id === active.id);
    const newIndex = caseTypes.findIndex(ct => ct.id === over.id);
    
    const newOrder = arrayMove(caseTypes, oldIndex, newIndex);
    setCaseTypes(newOrder);

    // Update display_order in database
    try {
      const updates = newOrder.map((ct, index) => ({
        id: ct.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('case_types')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
      fetchCaseTypes();
    }
  };

  const openCreateDialog = () => {
    setEditingCaseType(null);
    setFormData({
      name: '',
      tag: '',
      description: '',
      color: DEFAULT_COLORS[caseTypes.length % DEFAULT_COLORS.length],
      is_active: true,
      reference_label_1: '',
      reference_label_2: '',
      reference_label_3: '',
      budget_strategy: 'both',
      budget_required: false,
      default_due_days: '',
      due_date_required: false,
      allowed_service_ids: [],
      allowed_subject_types: [],
      default_subject_type: '',
      allow_on_public_form: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (caseType: CaseType) => {
    setEditingCaseType(caseType);
    setFormData({
      name: caseType.name,
      tag: caseType.tag,
      description: caseType.description || '',
      color: caseType.color,
      is_active: caseType.is_active,
      reference_label_1: caseType.reference_label_1 || '',
      reference_label_2: caseType.reference_label_2 || '',
      reference_label_3: caseType.reference_label_3 || '',
      budget_strategy: caseType.budget_strategy,
      budget_required: caseType.budget_required,
      default_due_days: caseType.default_due_days?.toString() || '',
      due_date_required: caseType.due_date_required,
      allowed_service_ids: caseType.allowed_service_ids || [],
      allowed_subject_types: caseType.allowed_subject_types || [],
      default_subject_type: caseType.default_subject_type || '',
      allow_on_public_form: caseType.allow_on_public_form,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organization?.id) return;
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error('Name and Tag are required');
      return;
    }
    if (formData.tag.length < 2 || formData.tag.length > 4) {
      toast.error('Tag must be 2-4 characters');
      return;
    }

    try {
      const payload = {
        organization_id: organization.id,
        name: formData.name.trim(),
        tag: formData.tag.trim().toUpperCase(),
        description: formData.description.trim() || null,
        color: formData.color,
        is_active: formData.is_active,
        reference_label_1: formData.reference_label_1.trim() || null,
        reference_label_2: formData.reference_label_2.trim() || null,
        reference_label_3: formData.reference_label_3.trim() || null,
        budget_strategy: formData.budget_strategy,
        budget_required: formData.budget_required,
        default_due_days: formData.default_due_days ? parseInt(formData.default_due_days) : null,
        due_date_required: formData.due_date_required,
        allowed_service_ids: formData.allowed_service_ids,
        allowed_subject_types: formData.allowed_subject_types,
        default_subject_type: formData.default_subject_type || null,
        allow_on_public_form: formData.allow_on_public_form,
      };

      if (editingCaseType) {
        const { error } = await supabase
          .from('case_types')
          .update(payload)
          .eq('id', editingCaseType.id);
        if (error) throw error;
        toast.success('Case type updated');
      } else {
        const { error } = await supabase
          .from('case_types')
          .insert({ ...payload, display_order: caseTypes.length });
        if (error) throw error;
        toast.success('Case type created');
      }

      setDialogOpen(false);
      fetchCaseTypes();
    } catch (error: any) {
      console.error('Error saving case type:', error);
      if (error.code === '23505') {
        toast.error('A case type with this name already exists');
      } else {
        toast.error('Failed to save case type');
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('case_types')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      toast.success('Case type deleted');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchCaseTypes();
    } catch (error) {
      console.error('Error deleting case type:', error);
      toast.error('Failed to delete case type');
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_service_ids: prev.allowed_service_ids.includes(serviceId)
        ? prev.allowed_service_ids.filter(id => id !== serviceId)
        : [...prev.allowed_service_ids, serviceId]
    }));
  };

  const toggleSubjectType = (subjectType: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_subject_types: prev.allowed_subject_types.includes(subjectType)
        ? prev.allowed_subject_types.filter(st => st !== subjectType)
        : [...prev.allowed_subject_types, subjectType]
    }));
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
                <FolderKanban className="h-5 w-5" />
                Case Types
              </CardTitle>
              <CardDescription>
                Configure investigation types with linked services, budget strategies, and reference labels
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Case Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {caseTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No case types configured yet</p>
              <p className="text-sm">Click "Add Case Type" to create your first one</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={caseTypes.map(ct => ct.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {caseTypes.map(caseType => (
                    <SortableCaseTypeRow
                      key={caseType.id}
                      caseType={caseType}
                      onEdit={openEditDialog}
                      onDelete={confirmDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingCaseType ? 'Edit Case Type' : 'Create Case Type'}
            </DialogTitle>
            <DialogDescription>
              Configure how this type of investigation should be handled
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <Accordion type="multiple" defaultValue={['basic', 'budget']} className="space-y-2">
              {/* Basic Information */}
              <AccordionItem value="basic" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Basic Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Insurance - Workers Comp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tag">Tag (2-4 chars) *</Label>
                      <Input
                        id="tag"
                        value={formData.tag}
                        onChange={e => setFormData(prev => ({ ...prev, tag: e.target.value.toUpperCase().slice(0, 4) }))}
                        placeholder="WC"
                        maxLength={4}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Internal description of this case type"
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
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Reference Labels */}
              <AccordionItem value="references" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Reference Labels
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Define custom reference fields for this case type (e.g., Claim Number, Policy Number)
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Reference Label 1</Label>
                      <Input
                        value={formData.reference_label_1}
                        onChange={e => setFormData(prev => ({ ...prev, reference_label_1: e.target.value }))}
                        placeholder="Claim Number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reference Label 2</Label>
                      <Input
                        value={formData.reference_label_2}
                        onChange={e => setFormData(prev => ({ ...prev, reference_label_2: e.target.value }))}
                        placeholder="SIU Number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reference Label 3</Label>
                      <Input
                        value={formData.reference_label_3}
                        onChange={e => setFormData(prev => ({ ...prev, reference_label_3: e.target.value }))}
                        placeholder="Insured"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Budget Configuration */}
              <AccordionItem value="budget" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Budget Configuration
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Budget Strategy</Label>
                    <Select
                      value={formData.budget_strategy}
                      onValueChange={(value: 'disabled' | 'hours_only' | 'money_only' | 'both') => 
                        setFormData(prev => ({ ...prev, budget_strategy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUDGET_STRATEGIES.map(strategy => (
                          <SelectItem key={strategy.value} value={strategy.value}>
                            <div className="flex items-center gap-2">
                              {strategy.icon}
                              <span>{strategy.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.budget_strategy !== 'disabled' && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="budget_required"
                        checked={formData.budget_required}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, budget_required: checked }))}
                      />
                      <Label htmlFor="budget_required">Budget is required when creating cases</Label>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Due Date Settings */}
              <AccordionItem value="due_date" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Due Date Settings
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="default_due_days">Default Due Date (days from creation)</Label>
                    <Input
                      id="default_due_days"
                      type="number"
                      min="0"
                      value={formData.default_due_days}
                      onChange={e => setFormData(prev => ({ ...prev, default_due_days: e.target.value }))}
                      placeholder="Leave blank for no default"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="due_date_required"
                      checked={formData.due_date_required}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, due_date_required: checked }))}
                    />
                    <Label htmlFor="due_date_required">Due date is required when creating cases</Label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Case Services */}
              <AccordionItem value="services" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Allowed Services ({formData.allowed_service_ids.length} selected)
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which services are available for this case type. Leave empty to allow all services.
                  </p>
                  {services.length === 0 ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      No services configured. Add services in the Case Services tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {services.map(service => (
                        <div key={service.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`service-${service.id}`}
                            checked={formData.allowed_service_ids.includes(service.id)}
                            onCheckedChange={() => toggleService(service.id)}
                          />
                          <Label htmlFor={`service-${service.id}`} className="font-normal cursor-pointer">
                            {service.name}
                            {service.code && <span className="text-muted-foreground ml-1">({service.code})</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Subject Types */}
              <AccordionItem value="subjects" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Subject Types ({formData.allowed_subject_types.length} selected)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Select which subject types are allowed for this case type. Leave empty to allow all.
                  </p>
                  {subjectTypesLoading ? (
                    <div className="text-sm text-muted-foreground">Loading subject types...</div>
                  ) : dynamicSubjectTypes.length === 0 ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      No subject types configured. Add subject types in the Subject Types tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {dynamicSubjectTypes.map(subjectType => (
                        <div key={subjectType.code} className="flex items-center gap-2">
                          <Checkbox
                            id={`subject-${subjectType.code}`}
                            checked={formData.allowed_subject_types.includes(subjectType.code)}
                            onCheckedChange={() => toggleSubjectType(subjectType.code)}
                          />
                          <Label htmlFor={`subject-${subjectType.code}`} className="font-normal cursor-pointer">
                            {subjectType.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.allowed_subject_types.length > 0 && (
                    <div className="space-y-2">
                      <Label>Default Subject Type</Label>
                      <Select
                        value={formData.default_subject_type}
                        onValueChange={value => setFormData(prev => ({ ...prev, default_subject_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select default..." />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.allowed_subject_types.map(code => {
                            const st = dynamicSubjectTypes.find(s => s.code === code);
                            return (
                              <SelectItem key={code} value={code}>
                                {st?.name || code}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Options */}
              <AccordionItem value="options" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  Options
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="allow_on_public_form"
                      checked={formData.allow_on_public_form}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, allow_on_public_form: checked }))}
                    />
                    <Label htmlFor="allow_on_public_form">Allow on public case request form</Label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCaseType ? 'Save Changes' : 'Create Case Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Case Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}