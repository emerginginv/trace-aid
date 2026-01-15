import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MoreHorizontal, Pencil, Copy, Archive, Trash2, ArchiveRestore, Loader2 } from "lucide-react";
import { useFinanceItems, useUpdateFinanceItem, useDeleteFinanceItem, FinanceItem } from "@/hooks/useFinanceItems";
import { FinanceItemDialog } from "./FinanceItemDialog";
import { formatCurrency } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FilterType = "all" | "expense" | "invoice" | "both";

export function FinanceItemsTab() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FinanceItem | null>(null);

  const { data: items = [], isLoading } = useFinanceItems();
  const updateMutation = useUpdateFinanceItem();
  const deleteMutation = useDeleteFinanceItem();

  const filteredItems = items.filter((item) => {
    // Apply filter
    if (filter === "expense" && !item.is_expense_item) return false;
    if (filter === "invoice" && !item.is_invoice_item) return false;
    if (filter === "both" && !(item.is_expense_item && item.is_invoice_item)) return false;

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleEdit = (item: FinanceItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDuplicate = (item: FinanceItem) => {
    setEditingItem({
      ...item,
      id: "", // Clear ID to create new
      name: `${item.name} (Copy)`,
    });
    setDialogOpen(true);
  };

  const handleToggleActive = (item: FinanceItem) => {
    updateMutation.mutate({
      id: item.id,
      name: item.name,
      is_expense_item: item.is_expense_item,
      is_invoice_item: item.is_invoice_item,
      is_active: !item.is_active,
    });
  };

  const handleDeleteClick = (item: FinanceItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const getItemTypeBadges = (item: FinanceItem) => {
    const badges = [];
    if (item.is_expense_item) {
      badges.push(
        <Badge key="expense" variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
          Expense
        </Badge>
      );
    }
    if (item.is_invoice_item) {
      badges.push(
        <Badge key="invoice" variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
          Invoice
        </Badge>
      );
    }
    return badges;
  };

  const getRateTypeBadge = (rateType: string) => {
    const variants: Record<string, string> = {
      hourly: "bg-green-500/10 text-green-600 border-green-200",
      fixed: "bg-purple-500/10 text-purple-600 border-purple-200",
      variable: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    };
    return (
      <Badge variant="outline" className={variants[rateType] || ""}>
        {rateType.charAt(0).toUpperCase() + rateType.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Invoice & Expense Items</CardTitle>
            <CardDescription>
              Configure reimbursable expense items and billable invoice items
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expense">Expense Only</TabsTrigger>
              <TabsTrigger value="invoice">Invoice Only</TabsTrigger>
              <TabsTrigger value="both">Both</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search || filter !== "all" ? "No items match your filters" : "No finance items configured yet"}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead className="text-right">Expense Rate</TableHead>
                  <TableHead className="text-right">Invoice Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getItemTypeBadges(item)}
                      </div>
                    </TableCell>
                    <TableCell>{getRateTypeBadge(item.rate_type)}</TableCell>
                    <TableCell className="text-right">
                      {item.is_expense_item && item.default_expense_rate != null
                        ? formatCurrency(item.default_expense_rate)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.is_invoice_item && item.default_invoice_rate != null
                        ? formatCurrency(item.default_invoice_rate)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                            {item.is_active ? (
                              <>
                                <Archive className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(item)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <FinanceItemDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingItem={editingItem}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Finance Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
