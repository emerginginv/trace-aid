import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, Search, LayoutGrid, List, Edit, Trash2, Download, FileSpreadsheet, FileText } from "lucide-react";
import { AccountCard } from "@/components/shared/AccountCard";
import { EntityStatusPill, deriveAccountStatus } from "@/components/shared/EntityStatusPill";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { ResponsiveButton } from "@/components/ui/responsive-button";
import { toast } from "sonner";
import { AccountForm } from "@/components/AccountForm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { usePermissions } from "@/hooks/usePermissions";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { AccountsPageSkeleton } from "@/components/ui/list-page-skeleton";
import { InlineEditCell } from "@/components/ui/inline-edit-cell";

interface Account {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status?: string | null;
  primary_contact_name?: string | null;
  case_count?: number;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "name", label: "Name" },
  { key: "industry", label: "Industry" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "actions", label: "Actions", hideable: false },
];

const Accounts = () => {
  useSetBreadcrumbs([{ label: "Accounts" }]);
  
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { organization } = useOrganization();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const { sortColumn, sortDirection, handleSort } = useSortPreference("accounts", "name", "asc");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("accounts-columns", COLUMNS);

  useEffect(() => {
    fetchAccounts();
  }, [organization?.id]);

  const fetchAccounts = async () => {
    try {
      if (!organization?.id) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      // Fetch accounts with primary contact and case count
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, name, industry, email, phone, city, state, status")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch primary contacts for each account
      const accountIds = accountsData?.map(a => a.id) || [];
      
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("account_id, first_name, last_name")
        .in("account_id", accountIds)
        .order("created_at", { ascending: true });

      // Fetch case counts per account
      const { data: caseCounts } = await supabase
        .from("cases")
        .select("account_id")
        .in("account_id", accountIds);

      // Build primary contact map (first contact per account)
      const primaryContactMap: Record<string, string> = {};
      contactsData?.forEach(c => {
        if (c.account_id && !primaryContactMap[c.account_id]) {
          primaryContactMap[c.account_id] = `${c.first_name} ${c.last_name}`;
        }
      });

      // Build case count map
      const caseCountMap: Record<string, number> = {};
      caseCounts?.forEach(c => {
        if (c.account_id) {
          caseCountMap[c.account_id] = (caseCountMap[c.account_id] || 0) + 1;
        }
      });

      // Merge data
      const enrichedAccounts = accountsData?.map(account => ({
        ...account,
        primary_contact_name: primaryContactMap[account.id] || null,
        case_count: caseCountMap[account.id] || 0,
      })) || [];

      setAccounts(enrichedAccounts);
    } catch (error) {
      toast.error("Error fetching accounts");
    } finally {
      setLoading(false);
    }
  };

  const uniqueIndustries = Array.from(new Set(accounts.map(a => a.industry).filter(Boolean)));

  // Inline industry update handler with optimistic UI
  const handleInlineIndustryChange = useCallback(async (accountId: string, newIndustry: string): Promise<boolean> => {
    const accountItem = accounts.find(a => a.id === accountId);
    if (!accountItem) return false;
    
    const oldIndustry = accountItem.industry;
    if (oldIndustry === newIndustry) return true;
    
    // Optimistic update
    setAccounts(prev => prev.map(a => 
      a.id === accountId ? { ...a, industry: newIndustry } : a
    ));
    
    toast.success("Industry updated");
    
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ industry: newIndustry })
        .eq("id", accountId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      // Rollback on error
      setAccounts(prev => prev.map(a => 
        a.id === accountId ? { ...a, industry: oldIndustry } : a
      ));
      toast.error("Failed to update industry. Change reverted.");
      return false;
    }
  }, [accounts]);

  // Get industry options for inline editing
  const industryOptions = uniqueIndustries.map(i => ({
    value: i,
    label: i
  }));

  // Pending deletion tracking for undo functionality
  const pendingDeletions = useRef<Map<string, { item: Account; timeoutId: NodeJS.Timeout }>>(new Map());
  const UNDO_DELAY = 5000;

  const handleDelete = async () => {
    if (!accountToDelete) return;
    
    const accountItem = accounts.find(a => a.id === accountToDelete);
    if (!accountItem) return;
    
    // Close dialog and clear state immediately
    setDeleteDialogOpen(false);
    const deletedId = accountToDelete;
    setAccountToDelete(null);
    
    // Optimistically remove from UI
    setAccounts(prev => prev.filter(a => a.id !== deletedId));
    
    // Show toast with undo action
    toast("Account deleted", {
      description: "Click undo to restore",
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletions.current.get(deletedId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            setAccounts(prev => [...prev, pending.item]);
            pendingDeletions.current.delete(deletedId);
            toast.success("Account restored");
          }
        },
      },
      duration: UNDO_DELAY,
    });
    
    // Schedule actual deletion
    const timeoutId = setTimeout(async () => {
      const { error } = await supabase.from("accounts").delete().eq("id", deletedId);
      if (error) {
        const pending = pendingDeletions.current.get(deletedId);
        if (pending) {
          setAccounts(prev => [...prev, pending.item]);
          toast.error("Failed to delete account. Item restored.");
        }
      }
      pendingDeletions.current.delete(deletedId);
    }, UNDO_DELAY);
    
    pendingDeletions.current.set(deletedId, {
      item: accountItem,
      timeoutId,
    });
  };


  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = searchQuery === '' || 
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = industryFilter === 'all' || account.industry === industryFilter;
    
    return matchesSearch && matchesIndustry;
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: string = "";
    let bVal: string = "";
    
    if (sortColumn === "location") {
      aVal = [a.city, a.state].filter(Boolean).join(", ");
      bVal = [b.city, b.state].filter(Boolean).join(", ");
    } else {
      aVal = (a[sortColumn as keyof Account] as string) || "";
      bVal = (b[sortColumn as keyof Account] as string) || "";
    }
    
    return sortDirection === "asc" 
      ? aVal.localeCompare(bVal) 
      : bVal.localeCompare(aVal);
  });

  // Export columns definition
  const EXPORT_COLUMNS: ExportColumn[] = [
    { key: "name", label: "Name" },
    { key: "industry", label: "Industry" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
  ];

  const handleExportCSV = () => exportToCSV(sortedAccounts, EXPORT_COLUMNS, "accounts");
  const handleExportPDF = () => exportToPDF(sortedAccounts, EXPORT_COLUMNS, "Accounts Report", "accounts");

  if (loading) {
    return <AccountsPageSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Manage business accounts and organizations
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New Account
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {uniqueIndustries.map(industry => (
              <SelectItem key={industry} value={industry}>{industry}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ResponsiveButton
              icon={<Download className="h-4 w-4" />}
              label="Export"
              variant="outline"
              size="sm"
              className="h-10"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ImportTemplateButton templateFileName="02_Clients.csv" entityDisplayName="Accounts" />
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 w-7 p-0"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedAccounts.length} account{sortedAccounts.length !== 1 ? 's' : ''}
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No accounts yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by adding your first business account
            </p>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Create First Account
            </Button>
          </CardContent>
        </Card>
      ) : filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No accounts match your search criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {sortedAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={{
                id: account.id,
                name: account.name,
                status: account.status,
                industry: account.industry,
                phone: account.phone,
                email: account.email,
                primary_contact_name: account.primary_contact_name,
                case_count: account.case_count,
              }}
              onClick={() => navigate(`/accounts/${account.id}`)}
              showCaseCount={true}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                {isVisible("name") && (
                  <SortableTableHead
                    column="name"
                    label="Name"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("industry") && (
                  <SortableTableHead
                    column="industry"
                    label="Industry"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("email") && (
                  <SortableTableHead
                    column="email"
                    label="Email"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("phone") && (
                  <SortableTableHead
                    column="phone"
                    label="Phone"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("location") && (
                  <SortableTableHead
                    column="location"
                    label="Location"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("actions") && (
                  <TableHead className="w-[120px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccounts.map((account) => (
                <TableRow 
                  key={account.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/accounts/${account.id}`);
                    }
                  }}
                >
                  {isVisible("name") && (
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {account.name}
                      </div>
                    </TableCell>
                  )}
                  {isVisible("industry") && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {hasPermission('edit_accounts') ? (
                        <InlineEditCell
                          value={account.industry || '-'}
                          options={industryOptions}
                          type="select"
                          onSave={(newValue) => handleInlineIndustryChange(account.id, newValue)}
                        />
                      ) : (
                        account.industry || '-'
                      )}
                    </TableCell>
                  )}
                  {isVisible("email") && (
                    <TableCell>{account.email || '-'}</TableCell>
                  )}
                  {isVisible("phone") && (
                    <TableCell>{account.phone || '-'}</TableCell>
                  )}
                  {isVisible("location") && (
                    <TableCell>
                      {[account.city, account.state].filter(Boolean).join(", ") || '-'}
                    </TableCell>
                  )}
                  {isVisible("actions") && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasPermission('edit_accounts') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/accounts/${account.id}/edit`);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {hasPermission('delete_accounts') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountToDelete(account.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}

      <AccountForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        onSuccess={fetchAccounts}
        organizationId={organization?.id || ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;
