import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical, Calendar, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CaseService {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  color: string;
  is_active: boolean;
  display_order: number;
  case_types: string[];
  requires_scheduling: boolean;
  default_duration_minutes: number | null;
  allow_recurring: boolean;
}

interface SortableRowProps {
  service: CaseService;
  onEdit: (service: CaseService) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const SortableRow = ({ service, onEdit, onDelete, onToggleActive }: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted" : ""}>
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab hover:text-primary">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{service.name}</TableCell>
      <TableCell>{service.code || "-"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: service.color }}
          />
        </div>
      </TableCell>
      <TableCell>
        {service.case_types.length === 0 ? (
          <Badge variant="outline">All Types</Badge>
        ) : (
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
        )}
      </TableCell>
      <TableCell>
        {service.requires_scheduling ? (
          <div className="flex items-center gap-1 text-primary">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">
              {service.default_duration_minutes ? `${service.default_duration_minutes}m` : "Yes"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={service.is_active ? "default" : "secondary"}>
          {service.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(service)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onToggleActive(service.id, !service.is_active)}>
            <Switch checked={service.is_active} className="pointer-events-none" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(service.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const CaseServicesTab = () => {
  const { organization } = useOrganization();
  const [services, setServices] = useState<CaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<CaseService | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formCaseTypes, setFormCaseTypes] = useState<string[]>([]);
  const [formRequiresScheduling, setFormRequiresScheduling] = useState(false);
  const [formDefaultDuration, setFormDefaultDuration] = useState<number | "">("");
  const [formAllowRecurring, setFormAllowRecurring] = useState(false);

  // Available case types from picklists
  const [availableCaseTypes, setAvailableCaseTypes] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (organization?.id) {
      loadServices();
      loadCaseTypes();
    }
  }, [organization?.id]);

  const loadServices = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("case_services")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order");

      if (error) throw error;

      const mappedServices: CaseService[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        code: s.code,
        color: s.color || "#6366f1",
        is_active: s.is_active,
        display_order: s.display_order,
        case_types: s.case_types || [],
        requires_scheduling: s.requires_scheduling || false,
        default_duration_minutes: s.default_duration_minutes,
        allow_recurring: s.allow_recurring || false,
      }));

      setServices(mappedServices);
      setShowSetup(mappedServices.length === 0);
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
      const { data } = await supabase
        .from("picklists")
        .select("value")
        .eq("organization_id", organization.id)
        .eq("type", "case_type")
        .eq("is_active", true);

      setAvailableCaseTypes((data || []).map((p) => p.value));
    } catch (error) {
      console.error("Error loading case types:", error);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCode("");
    setFormColor("#6366f1");
    setFormCaseTypes([]);
    setFormRequiresScheduling(false);
    setFormDefaultDuration("");
    setFormAllowRecurring(false);
    setEditingService(null);
  };

  const openEditDialog = (service: CaseService) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDescription(service.description || "");
    setFormCode(service.code || "");
    setFormColor(service.color);
    setFormCaseTypes(service.case_types);
    setFormRequiresScheduling(service.requires_scheduling);
    setFormDefaultDuration(service.default_duration_minutes || "");
    setFormAllowRecurring(service.allow_recurring);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organization?.id || !formName.trim()) {
      toast.error("Service name is required");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const serviceData = {
        organization_id: organization.id,
        name: formName.trim(),
        description: formDescription.trim() || null,
        code: formCode.trim() || null,
        color: formColor,
        case_types: formCaseTypes,
        requires_scheduling: formRequiresScheduling,
        default_duration_minutes: formDefaultDuration || null,
        allow_recurring: formAllowRecurring,
        created_by: user.id,
      };

      if (editingService) {
        const { error } = await supabase
          .from("case_services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Service updated");
      } else {
        const { error } = await supabase
          .from("case_services")
          .insert({
            ...serviceData,
            display_order: services.length,
          });

        if (error) throw error;
        toast.success("Service created");
      }

      setDialogOpen(false);
      resetForm();
      loadServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("case_services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Service deleted");
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("case_services")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s))
      );
      toast.success(isActive ? "Service activated" : "Service deactivated");
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
    const reordered = arrayMove(services, oldIndex, newIndex);

    setServices(reordered);

    // Update display order in database
    try {
      const updates = reordered.map((s, index) => ({
        id: s.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("case_services")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Error reordering services:", error);
      toast.error("Failed to reorder services");
      loadServices(); // Reload to reset order
    }
  };

  const handleContinueSetup = () => {
    setShowSetup(false);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // First-run setup UI
  if (showSetup) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Case Services</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Case Services represent discrete units of work performed on a case.
            Configure your services to control availability by case type and
            track scheduling status.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Control availability by case type</li>
            <li>• Track scheduling status</li>
            <li>• Standardize work categories</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            No services have been configured yet.
          </p>
          <Button onClick={handleContinueSetup} className="mt-4">
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Case Services</CardTitle>
          <CardDescription>
            Define services that can be performed on cases
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add Service"}
              </DialogTitle>
              <DialogDescription>
                Configure the service details and availability settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Surveillance Session"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="SRV"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Service description..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Scheduling Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requires Scheduling</Label>
                      <p className="text-xs text-muted-foreground">
                        This service requires a scheduled time slot
                      </p>
                    </div>
                    <Switch
                      checked={formRequiresScheduling}
                      onCheckedChange={setFormRequiresScheduling}
                    />
                  </div>

                  {formRequiresScheduling && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Default Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={formDefaultDuration}
                          onChange={(e) =>
                            setFormDefaultDuration(
                              e.target.value ? parseInt(e.target.value) : ""
                            )
                          }
                          placeholder="60"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Recurring</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable recurring schedule options
                          </p>
                        </div>
                        <Switch
                          checked={formAllowRecurring}
                          onCheckedChange={setFormAllowRecurring}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingService ? "Save Changes" : "Create Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No services configured yet.</p>
            <p className="text-sm">Click "Add Service" to create your first service.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Case Types</TableHead>
                  <TableHead>Scheduling</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={services.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {services.map((service) => (
                    <SortableRow
                      key={service.id}
                      service={service}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
};
