import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStatusTriggersCard } from "./CaseStatusTriggersCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Pencil, Trash2, GripVertical, ArrowUpDown, RefreshCw, Check, X, Clock, Lock, RotateCcw, FileText, Database, Settings } from "lucide-react";
import { SyncCasesModal } from "./SyncCasesModal";
import { StatusMigrationModal } from "./StatusMigrationModal";
import { useCaseStatuses, useCaseStatusMutations, CaseStatus, CategoryName, CATEGORY_COLORS } from "@/hooks/use-case-statuses";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

// Sortable row component
function SortableStatusRow({ 
  status, 
  categoryName,
  onEdit, 
  onDelete 
}: { 
  status: CaseStatus; 
  categoryName: string;
  onEdit: (status: CaseStatus) => void; 
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <Badge variant="outline" className="font-mono text-xs w-8 justify-center">
        {status.rank_order + 1}
      </Badge>

      <Badge variant="secondary" className="text-xs">
        {categoryName}
      </Badge>
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: status.color }}
        />
        <span className="font-medium truncate">{status.name}</span>
        {!status.is_active && (
          <Badge variant="secondary" className="text-xs">Inactive</Badge>
        )}
      </div>

      {status.notes && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {status.notes}
        </span>
      )}

      <div className="flex items-center gap-2 text-muted-foreground">
        {status.monitor_due_date && (
          <span title="Monitors Due Date"><Clock className="h-4 w-4" /></span>
        )}
        {status.is_active && (
          <span title="Active"><Check className="h-4 w-4 text-green-500" /></span>
        )}
        {status.is_reopenable && (
          <span title="Reopenable"><RotateCcw className="h-4 w-4" /></span>
        )}
        {status.is_read_only && (
          <span title="Read Only"><Lock className="h-4 w-4 text-amber-500" /></span>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(status)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(status.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function CaseStatusesTab() {
  const { organization } = useOrganization();
  const { 
    categories, 
    statuses, 
    getStatusesByCategoryId,
    seedCategories,
    isLoading,
    refetch 
  } = useCaseStatuses();
  const { createStatus, updateStatus, deleteStatus, updateRankOrders } = useCaseStatusMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CaseStatus | null>(null);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<CaseStatus[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    color: "#6366f1",
    notes: "",
    monitor_due_date: true,
    is_active: true,
    is_reopenable: true,
    is_read_only: false,
    is_first_status: false,
    workflows: ["standard"],
  });

  // Update local statuses when fetched
  useEffect(() => {
    if (statuses.length > 0) {
      setLocalStatuses(statuses);
    }
  }, [statuses]);

  // Seed categories if none exist
  useEffect(() => {
    if (!isLoading && categories.length === 0 && organization?.id) {
      seedCategories();
    }
  }, [isLoading, categories.length, organization?.id]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenDialog = (status?: CaseStatus) => {
    if (status) {
      setEditingStatus(status);
      setFormData({
        name: status.name,
        category_id: status.category_id,
        color: status.color,
        notes: status.notes || "",
        monitor_due_date: status.monitor_due_date,
        is_active: status.is_active,
        is_reopenable: status.is_reopenable,
        is_read_only: status.is_read_only,
        is_first_status: status.is_first_status,
        workflows: status.workflows || ["standard"],
      });
    } else {
      setEditingStatus(null);
      setFormData({
        name: "",
        category_id: categories[0]?.id || "",
        color: "#6366f1",
        notes: "",
        monitor_due_date: true,
        is_active: true,
        is_reopenable: true,
        is_read_only: false,
        is_first_status: false,
        workflows: ["standard"],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a status name");
      return;
    }

    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    if (!organization?.id) return;

    const statusData = {
      ...formData,
      organization_id: organization.id,
      rank_order: editingStatus?.rank_order ?? statuses.length,
    };

    if (editingStatus) {
      await updateStatus.mutateAsync({ id: editingStatus.id, ...statusData });
    } else {
      await createStatus.mutateAsync(statusData);
    }

    setDialogOpen(false);
    setEditingStatus(null);
  };

  const handleDelete = async () => {
    if (!deletingStatusId) return;
    await deleteStatus.mutateAsync(deletingStatusId);
    setDeleteDialogOpen(false);
    setDeletingStatusId(null);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingStatusId(id);
    setDeleteDialogOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localStatuses.findIndex((s) => s.id === active.id);
    const newIndex = localStatuses.findIndex((s) => s.id === over.id);

    const newOrder = arrayMove(localStatuses, oldIndex, newIndex);
    setLocalStatuses(newOrder);
  };

  const handleSaveOrder = async () => {
    const updates = localStatuses.map((s, index) => ({
      id: s.id,
      rank_order: index,
    }));
    
    await updateRankOrders.mutateAsync(updates);
    setReorderDialogOpen(false);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Case Statuses</h2>
          <p className="text-muted-foreground">
            Manage the statuses that cases can have throughout their lifecycle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSyncModalOpen(true)}>
            <Database className="h-4 w-4 mr-2" />
            Sync Cases
          </Button>
          <Button variant="outline" onClick={() => setReorderDialogOpen(true)}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Reorder
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Status
          </Button>
        </div>
      </div>

      {/* Sync Cases Modal */}
      <SyncCasesModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />

      {/* Categories and Statuses */}
      {categories.map((category) => {
        const categoryStatuses = getStatusesByCategoryId(category.id);
        
        return (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="secondary">{categoryStatuses.length}</Badge>
              </div>
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {categoryStatuses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No statuses in this category
                  <Button 
                    variant="link" 
                    className="ml-2" 
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category_id: category.id }));
                      handleOpenDialog();
                    }}
                  >
                    Add one
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryStatuses.map((status) => (
                    <SortableStatusRow
                      key={status.id}
                      status={status}
                      categoryName={category.name}
                      onEdit={handleOpenDialog}
                      onDelete={openDeleteDialog}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Edit Case Status" : "New Case Status"}
            </DialogTitle>
            <DialogDescription>
              Configure the status properties and behavior flags
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Under Investigation"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6366f1"
                  className="w-28"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional description for this status"
                rows={2}
              />
            </div>

            <Separator />

            {/* Behavior Flags */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Behavior Flags</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="monitor_due_date" className="text-sm font-normal">Monitor Due Date</Label>
                  <p className="text-xs text-muted-foreground">Track due dates for cases in this status</p>
                </div>
                <Switch
                  id="monitor_due_date"
                  checked={formData.monitor_due_date}
                  onCheckedChange={(checked) => setFormData({ ...formData, monitor_due_date: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active" className="text-sm font-normal">Set as "Active"</Label>
                  <p className="text-xs text-muted-foreground">Status is available for selection</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_reopenable" className="text-sm font-normal">Set as "Reopenable"</Label>
                  <p className="text-xs text-muted-foreground">Cases in this status can be reopened</p>
                </div>
                <Switch
                  id="is_reopenable"
                  checked={formData.is_reopenable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_reopenable: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_read_only" className="text-sm font-normal">Set as "Read-Only"</Label>
                  <p className="text-xs text-muted-foreground">Cases in this status cannot be edited</p>
                </div>
                <Switch
                  id="is_read_only"
                  checked={formData.is_read_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_read_only: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_first_status" className="text-sm font-normal">Set as First Status</Label>
                  <p className="text-xs text-muted-foreground">Auto-assigned when cases are created</p>
                </div>
                <Switch
                  id="is_first_status"
                  checked={formData.is_first_status}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_first_status: checked })}
                />
              </div>
            </div>

            <Separator />

            {/* Workflows */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Workflows</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="workflow-standard"
                    checked={formData.workflows.includes("standard")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({ ...formData, workflows: [...formData.workflows, "standard"] });
                      } else {
                        setFormData({ ...formData, workflows: formData.workflows.filter(w => w !== "standard") });
                      }
                    }}
                  />
                  <Label htmlFor="workflow-standard" className="text-sm font-normal">Standard</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createStatus.isPending || updateStatus.isPending}>
              {editingStatus ? "Save Changes" : "Create Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder Dialog */}
      <Dialog open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Reorder Case Statuses</DialogTitle>
            <DialogDescription>
              Drag and drop to reorder statuses. This affects the order they appear in dropdowns and the Prev/Next navigation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {categories.map((category) => {
                const categoryStatuses = localStatuses.filter(s => s.category_id === category.id);
                
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-sm">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">{categoryStatuses.length}</Badge>
                    </div>
                    
                    {categoryStatuses.length === 0 ? (
                      <div className="text-center py-3 text-muted-foreground text-sm">
                        No statuses
                      </div>
                    ) : (
                      <SortableContext
                        items={categoryStatuses.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {categoryStatuses.map((status) => (
                            <SortableStatusRow
                              key={status.id}
                              status={status}
                              categoryName={category.name}
                              onEdit={() => {}}
                              onDelete={() => {}}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                );
              })}
            </DndContext>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setLocalStatuses(statuses);
              setReorderDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveOrder} disabled={updateRankOrders.isPending}>
              Save Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automatic Status Triggers */}
      <CaseStatusTriggersCard />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. If any cases use this status, deletion will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingStatusId(null)}>Cancel</AlertDialogCancel>
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
