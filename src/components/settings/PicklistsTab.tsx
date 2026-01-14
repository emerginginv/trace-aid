import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Plus, GripVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

interface PicklistItem {
  id: string;
  value: string;
  isActive: boolean;
  color: string;
  statusType?: string;
}

interface PicklistsTabProps {
  caseStatuses: PicklistItem[];
  setCaseStatuses: React.Dispatch<React.SetStateAction<PicklistItem[]>>;
  updateTypes: PicklistItem[];
  setUpdateTypes: React.Dispatch<React.SetStateAction<PicklistItem[]>>;
  expenseCategories: PicklistItem[];
  setExpenseCategories: React.Dispatch<React.SetStateAction<PicklistItem[]>>;
  subjectTypes: PicklistItem[];
  setSubjectTypes: React.Dispatch<React.SetStateAction<PicklistItem[]>>;
  loadSettings: () => Promise<void>;
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

export const PicklistsTab = ({
  caseStatuses,
  setCaseStatuses,
  updateTypes,
  setUpdateTypes,
  expenseCategories,
  setExpenseCategories,
  subjectTypes,
  setSubjectTypes,
  loadSettings,
}: PicklistsTabProps) => {
  const [picklistDialogOpen, setPicklistDialogOpen] = useState(false);
  const [picklistType, setPicklistType] = useState<"status" | "updateType" | "expenseCategory" | "subjectType">("status");
  const [editingPicklistItem, setEditingPicklistItem] = useState<{ id: string; value: string; color: string; statusType?: string } | null>(null);
  const [picklistValue, setPicklistValue] = useState("");
  const [picklistColor, setPicklistColor] = useState("#6366f1");
  const [picklistStatusType, setPicklistStatusType] = useState<"open" | "closed">("open");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddPicklistItem = async () => {
    if (!picklistValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const picklistTypeMap = {
        status: "case_status",
        updateType: "update_type",
        expenseCategory: "expense_category",
        subjectType: "subject_type",
      };

      const currentLength = picklistType === "status" 
        ? caseStatuses.length 
        : picklistType === "updateType" 
        ? updateTypes.length 
        : picklistType === "subjectType"
        ? subjectTypes.length
        : expenseCategories.length;

      const insertData: any = {
        user_id: user.id,
        type: picklistTypeMap[picklistType],
        value: picklistValue.trim(),
        is_active: true,
        display_order: currentLength,
        color: picklistColor,
      };

      if (picklistType === "status") {
        insertData.status_type = picklistStatusType;
      }

      const { data, error } = await supabase
        .from("picklists")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newItem = { 
        id: data.id, 
        value: data.value, 
        isActive: data.is_active, 
        color: data.color || '#6366f1',
        ...(picklistType === "status" && { statusType: data.status_type || 'open' })
      };
      
      if (picklistType === "status") {
        setCaseStatuses([...caseStatuses, newItem]);
      } else if (picklistType === "updateType") {
        setUpdateTypes([...updateTypes, newItem]);
      } else if (picklistType === "subjectType") {
        setSubjectTypes([...subjectTypes, newItem]);
      } else {
        setExpenseCategories([...expenseCategories, newItem]);
      }

      setPicklistValue("");
      setPicklistColor("#6366f1");
      setPicklistDialogOpen(false);
      setEditingPicklistItem(null);
      toast.success(`${picklistValue} added successfully`);
    } catch (error) {
      console.error("Error adding picklist item:", error);
      toast.error("Failed to add picklist item");
    }
  };

  const handleEditPicklistItem = async () => {
    if (!picklistValue.trim() || !editingPicklistItem) {
      toast.error("Please enter a value");
      return;
    }

    try {
      const updateData: any = { 
        value: picklistValue.trim(),
        color: picklistColor 
      };

      if (picklistType === "status") {
        updateData.status_type = picklistStatusType;
      }

      const { error } = await supabase
        .from("picklists")
        .update(updateData)
        .eq("id", editingPicklistItem.id);

      if (error) throw error;

      if (picklistType === "status") {
        setCaseStatuses(
          caseStatuses.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor, statusType: picklistStatusType } : item
          )
        );
      } else if (picklistType === "updateType") {
        setUpdateTypes(
          updateTypes.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor } : item
          )
        );
      } else if (picklistType === "subjectType") {
        setSubjectTypes(
          subjectTypes.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor } : item
          )
        );
      } else {
        setExpenseCategories(
          expenseCategories.map((item) =>
            item.id === editingPicklistItem.id ? { ...item, value: picklistValue.trim(), color: picklistColor } : item
          )
        );
      }

      setPicklistValue("");
      setPicklistColor("#6366f1");
      setPicklistDialogOpen(false);
      setEditingPicklistItem(null);
      toast.success("Value updated successfully");
    } catch (error) {
      console.error("Error updating picklist item:", error);
      toast.error("Failed to update picklist item");
    }
  };

  const handleTogglePicklistActive = async (id: string, isActive: boolean, type: "status" | "updateType" | "expenseCategory" | "subjectType") => {
    try {
      const { error } = await supabase
        .from("picklists")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;

      if (type === "status") {
        setCaseStatuses(
          caseStatuses.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      } else if (type === "updateType") {
        setUpdateTypes(
          updateTypes.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      } else if (type === "subjectType") {
        setSubjectTypes(
          subjectTypes.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      } else {
        setExpenseCategories(
          expenseCategories.map((item) =>
            item.id === id ? { ...item, isActive: !isActive } : item
          )
        );
      }
      toast.success(`Value ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error toggling picklist item:", error);
      toast.error("Failed to update picklist item");
    }
  };

  const handleDeletePicklistItem = async (id: string, type: "status" | "updateType" | "expenseCategory" | "subjectType") => {
    try {
      const { data: picklistData } = await supabase
        .from("picklists")
        .select("value")
        .eq("id", id)
        .single();

      if (!picklistData) {
        toast.error("Picklist item not found");
        return;
      }

      let isInUse = false;
      let usageCount = 0;

      if (type === "status") {
        const { count } = await supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .eq("status", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      } else if (type === "updateType") {
        const { count } = await supabase
          .from("case_updates")
          .select("*", { count: "exact", head: true })
          .eq("update_type", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      } else if (type === "expenseCategory") {
        const { count } = await supabase
          .from("case_finances")
          .select("*", { count: "exact", head: true })
          .eq("category", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      } else if (type === "subjectType") {
        const { count } = await supabase
          .from("case_subjects")
          .select("*", { count: "exact", head: true })
          .eq("subject_type", picklistData.value);
        
        usageCount = count || 0;
        isInUse = usageCount > 0;
      }

      if (isInUse) {
        toast.error(`Cannot delete: This value is being used by ${usageCount} record${usageCount !== 1 ? 's' : ''}. Please deactivate it instead.`);
        return;
      }

      const { error } = await supabase
        .from("picklists")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (type === "status") {
        setCaseStatuses(caseStatuses.filter((item) => item.id !== id));
      } else if (type === "updateType") {
        setUpdateTypes(updateTypes.filter((item) => item.id !== id));
      } else if (type === "subjectType") {
        setSubjectTypes(subjectTypes.filter((item) => item.id !== id));
      } else {
        setExpenseCategories(expenseCategories.filter((item) => item.id !== id));
      }
      toast.success("Value deleted successfully");
    } catch (error) {
      console.error("Error deleting picklist item:", error);
      toast.error("Failed to delete picklist item");
    }
  };

  const openAddPicklistDialog = (type: "status" | "updateType" | "expenseCategory" | "subjectType") => {
    setPicklistType(type);
    setEditingPicklistItem(null);
    setPicklistValue("");
    setPicklistColor("#6366f1");
    setPicklistStatusType("open");
    setPicklistDialogOpen(true);
  };

  const openEditPicklistDialog = (item: { id: string; value: string; color: string; statusType?: string }, type: "status" | "updateType" | "expenseCategory" | "subjectType") => {
    setPicklistType(type);
    setEditingPicklistItem(item);
    setPicklistValue(item.value);
    setPicklistColor(item.color);
    setPicklistStatusType((item.statusType as "open" | "closed") || "open");
    setPicklistDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent, type: "status" | "updateType" | "expenseCategory" | "subjectType") => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const items = type === "status" 
      ? caseStatuses 
      : type === "updateType" 
      ? updateTypes 
      : type === "subjectType"
      ? subjectTypes
      : expenseCategories;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex);

    if (type === "status") {
      setCaseStatuses(newItems);
    } else if (type === "updateType") {
      setUpdateTypes(newItems);
    } else if (type === "subjectType") {
      setSubjectTypes(newItems);
    } else {
      setExpenseCategories(newItems);
    }

    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("picklists")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Order updated successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      loadSettings();
    }
  };

  const renderPicklistTable = (
    items: PicklistItem[],
    type: "status" | "updateType" | "expenseCategory" | "subjectType",
    title: string,
    description: string,
    addButtonLabel: string,
    showStatusType: boolean = false
  ) => (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={() => openAddPicklistDialog(type)}>
            <Plus className="w-4 h-4 mr-2" />
            {addButtonLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, type)}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[80px]">Color</TableHead>
                  {showStatusType && <TableHead className="w-[120px]">Status Type</TableHead>}
                  <TableHead className="w-[100px]">Active</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showStatusType ? 6 : 5} className="text-center text-muted-foreground py-8">
                      No values configured
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item) => (
                      <SortableRow key={item.id} id={item.id}>
                        <TableCell className="font-medium">{item.value}</TableCell>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: item.color }}
                          />
                        </TableCell>
                        {showStatusType && (
                          <TableCell>
                            <Badge variant={item.statusType === "open" ? "default" : "secondary"}>
                              {item.statusType === "open" ? "🟢 Open" : "⚪ Closed"}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePicklistActive(item.id, item.isActive, type)}
                              className="hidden sm:inline-flex"
                            >
                              {item.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPicklistDialog(item, type)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePicklistItem(item.id, type)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
  );

  return (
    <div className="space-y-6">
      {renderPicklistTable(
        caseStatuses,
        "status",
        "Case Status Picklist",
        "Manage available status options for cases",
        "Add Status",
        true
      )}

      {renderPicklistTable(
        updateTypes,
        "updateType",
        "Update Type Picklist",
        "Manage available types for case updates",
        "Add Type"
      )}

      {renderPicklistTable(
        expenseCategories,
        "expenseCategory",
        "Expense Category Picklist",
        "Manage available categories for expenses",
        "Add Category"
      )}

      {renderPicklistTable(
        subjectTypes,
        "subjectType",
        "Subject Type Picklist",
        "Manage available types for case subjects",
        "Add Type"
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={picklistDialogOpen} onOpenChange={setPicklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPicklistItem ? "Edit" : "Add"}{" "}
              {picklistType === "status" ? "Status" : picklistType === "updateType" ? "Update Type" : picklistType === "subjectType" ? "Subject Type" : "Expense Category"}
            </DialogTitle>
            <DialogDescription>
              {editingPicklistItem
                ? "Update the value and settings"
                : `Add a new ${picklistType === "status" ? "status" : picklistType === "updateType" ? "update type" : picklistType === "subjectType" ? "subject type" : "expense category"}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="picklistValue">Value</Label>
              <Input
                id="picklistValue"
                value={picklistValue}
                onChange={(e) => setPicklistValue(e.target.value)}
                placeholder={`Enter ${picklistType === "status" ? "status" : picklistType === "updateType" ? "update type" : "category"} value`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    editingPicklistItem ? handleEditPicklistItem() : handleAddPicklistItem();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="picklistColor">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="picklistColor"
                  type="color"
                  value={picklistColor}
                  onChange={(e) => setPicklistColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={picklistColor}
                  onChange={(e) => setPicklistColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            {picklistType === "status" && (
              <div>
                <Label htmlFor="picklistStatusType">Status Type</Label>
                <Select value={picklistStatusType} onValueChange={(value: "open" | "closed") => setPicklistStatusType(value)}>
                  <SelectTrigger id="picklistStatusType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">🟢 Open</SelectItem>
                    <SelectItem value="closed">⚪ Closed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Determines if this status represents an open or closed case
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPicklistDialogOpen(false);
                setPicklistValue("");
                setPicklistColor("#6366f1");
                setEditingPicklistItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingPicklistItem ? handleEditPicklistItem : handleAddPicklistItem}
            >
              {editingPicklistItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PicklistsTab;
