import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, GripVertical, Briefcase, Info } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CaseService {
  id: string;
  name: string;
  description: string | null;
  schedule_mode: "none" | "primary_investigator" | "activity_based";
  is_active: boolean;
  case_types: string[] | null;
  code: string | null;
  color: string | null;
  display_order: number;
  track_duration: boolean | null;
  track_outcomes: boolean | null;
  requires_scheduling: boolean | null;
  default_duration_minutes: number | null;
}

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
}

const SortableRow = ({ id, children }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px] cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      {children}
    </TableRow>
  );
};

const SCHEDULE_MODE_OPTIONS = [
  { value: "none", label: "None", description: "Manual scheduling only" },
  { value: "primary_investigator", label: "Primary Investigator", description: "Auto-assign to case's primary investigator" },
  { value: "activity_based", label: "Activity-Based", description: "Create activities when service is added" },
];

export function CaseServicesTab() {
  const { organization } = useOrganization();
  const [services, setServices] = useState<CaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<CaseService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<CaseService | null>(null);
  const [saving, setSaving] = useState(false);
  const [caseTypes, setCaseTypes] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schedule_mode: "none" as "none" | "primary_investigator" | "activity_based",
    is_active: true,
    case_types: [] as string[],
    code: "",
    color: "#6366f1",
    track_duration: true,
    track_outcomes: false,
    requires_scheduling: false,
    default_duration_minutes: 60,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (organization?.id) {
      loadServices();
      loadCaseTypes();
    }
  }, [organization?.id]);

  const loadServices = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("case_services")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order");

      if (error) throw error;
      
      // Map the data to ensure schedule_mode is properly typed
      const mappedData: CaseService[] = (data || []).map(service => ({
        ...service,
        schedule_mode: (service.schedule_mode as "none" | "primary_investigator" | "activity_based") || "none",
      }));
      setServices(mappedData);
    } catch (error) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const loadCaseTypes = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("picklists")
        .select("value")
        .eq("organization_id", organization.id)
        .eq("type", "case_type")
        .eq("is_active", true);

      if (error) throw error;
      
      setCaseTypes(data?.map(p => p.value) || []);
    } catch (error) {
      console.error("Error loading case types:", error);
    }
  };

  const openAddDialog = () => {
    setEditingService(null);
    setFormData({
      name: "",
      description: "",
      schedule_mode: "none",
      is_active: true,
      case_types: [],
      code: "",
      color: "#6366f1",
      track_duration: true,
      track_outcomes: false,
      requires_scheduling: false,
      default_duration_minutes: 60,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (service: CaseService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      schedule_mode: service.schedule_mode as "none" | "primary_investigator" | "activity_based",
      is_active: service.is_active,
      case_types: service.case_types || [],
      code: service.code || "",
      color: service.color || "#6366f1",
      track_duration: service.track_duration ?? true,
      track_outcomes: service.track_outcomes ?? false,
      requires_scheduling: service.requires_scheduling ?? false,
      default_duration_minutes: service.default_duration_minutes ?? 60,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        schedule_mode: formData.schedule_mode,
        is_active: formData.is_active,
        case_types: formData.case_types.length > 0 ? formData.case_types : null,
        code: formData.code.trim() || null,
        color: formData.color,
        track_duration: formData.track_duration,
        track_outcomes: formData.track_outcomes,
        requires_scheduling: formData.requires_scheduling,
        default_duration_minutes: formData.default_duration_minutes,
        organization_id: organization.id,
      };

      if (editingService) {
        // Update existing
        const { error } = await supabase
          .from("case_services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Service updated successfully");
      } else {
        // Create new
        const { error } = await supabase
          .from("case_services")
          .insert({
            ...serviceData,
            display_order: services.length,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Service created successfully");
      }

      setDialogOpen(false);
      loadServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      // Check if service is in use
      const { count } = await supabase
        .from("case_service_instances")
        .select("*", { count: "exact", head: true })
        .eq("case_service_id", serviceToDelete.id);

      if (count && count > 0) {
        toast.error(`Cannot delete: This service is used by ${count} case${count !== 1 ? 's' : ''}. Please deactivate it instead.`);
        setDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from("case_services")
        .delete()
        .eq("id", serviceToDelete.id);

      if (error) throw error;

      toast.success("Service deleted successfully");
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  const handleToggleActive = async (service: CaseService) => {
    try {
      const { error } = await supabase
        .from("case_services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (error) throw error;

      setServices(services.map(s => 
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
      toast.success(`Service ${!service.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error("Error toggling service:", error);
      toast.error("Failed to update service");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);

    const newServices = arrayMove(services, oldIndex, newIndex);
    setServices(newServices);

    try {
      for (let i = 0; i < newServices.length; i++) {
        await supabase
          .from("case_services")
          .update({ display_order: i })
          .eq("id", newServices[i].id);
      }
      toast.success("Order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      loadServices();
    }
  };

  const getScheduleModeLabel = (mode: string) => {
    const option = SCHEDULE_MODE_OPTIONS.find(o => o.value === mode);
    return option?.label || mode;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Services define types of work</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Case Services represent types of work performed on cases (e.g., Surveillance, Background Check). 
                Client billing rates are configured per Account. Staff pay rates are configured per User.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Case Services
              </CardTitle>
              <CardDescription>
                Define the types of work that can be performed on cases
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="hidden md:table-cell">Schedule Mode</TableHead>
                    <TableHead className="hidden lg:table-cell">Case Types</TableHead>
                    <TableHead className="w-[100px]">Active</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No services configured. Click "Add Service" to create your first service.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {services.map((service) => (
                        <SortableRow key={service.id} id={service.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: service.color || "#6366f1" }}
                              />
                              <div>
                                <div className="font-medium">{service.name}</div>
                                {service.code && (
                                  <div className="text-xs text-muted-foreground">{service.code}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {getScheduleModeLabel(service.schedule_mode)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {service.case_types && service.case_types.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {service.case_types.slice(0, 2).map((type) => (
                                  <Badge key={type} variant="secondary" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                                {service.case_types.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{service.case_types.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">All types</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={service.is_active}
                              onCheckedChange={() => handleToggleActive(service)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditDialog(service)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setServiceToDelete(service);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </SortableRow>
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService 
                ? "Update the service definition" 
                : "Create a new type of work that can be performed on cases"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Surveillance, Background Check"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Service Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., SURV, BGC"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this service involves..."
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule_mode">Schedule Mode</Label>
              <Select
                value={formData.schedule_mode}
                onValueChange={(value: "none" | "primary_investigator" | "activity_based") => 
                  setFormData({ ...formData, schedule_mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {caseTypes.length > 0 && (
              <div className="grid gap-2">
                <Label>Limit to Case Types</Label>
                <p className="text-xs text-muted-foreground">
                  Leave empty to allow for all case types
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {caseTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={formData.case_types.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (formData.case_types.includes(type)) {
                          setFormData({
                            ...formData,
                            case_types: formData.case_types.filter(t => t !== type),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            case_types: [...formData.case_types, type],
                          });
                        }
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="duration">Default Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.default_duration_minutes}
                onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) || 60 })}
                min={0}
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="track_duration">Track Duration</Label>
                  <p className="text-xs text-muted-foreground">Record time spent on this service</p>
                </div>
                <Switch
                  id="track_duration"
                  checked={formData.track_duration}
                  onCheckedChange={(checked) => setFormData({ ...formData, track_duration: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="track_outcomes">Track Outcomes</Label>
                  <p className="text-xs text-muted-foreground">Record results/outcomes for this service</p>
                </div>
                <Switch
                  id="track_outcomes"
                  checked={formData.track_outcomes}
                  onCheckedChange={(checked) => setFormData({ ...formData, track_outcomes: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requires_scheduling">Requires Scheduling</Label>
                  <p className="text-xs text-muted-foreground">Must be scheduled before work can begin</p>
                </div>
                <Switch
                  id="requires_scheduling"
                  checked={formData.requires_scheduling}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_scheduling: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-xs text-muted-foreground">Available for use on cases</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{serviceToDelete?.name}"? This action cannot be undone.
              If the service is in use, it will be deactivated instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
