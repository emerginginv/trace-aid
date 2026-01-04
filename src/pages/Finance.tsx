import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";

interface RetainerBalance {
  case_id: string;
  case_title: string;
  case_number: string;
  balance: number;
  last_topup: string | null;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "case_title", label: "Case" },
  { key: "case_number", label: "Case Number" },
  { key: "balance", label: "Current Balance" },
  { key: "last_topup", label: "Last Top-Up" },
  { key: "actions", label: "Actions", hideable: false },
];

const Finance = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [retainerBalances, setRetainerBalances] = useState<RetainerBalance[]>([]);
  
  // Filter states
  const [retainerSearch, setRetainerSearch] = useState("");
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("finance", "case_title", "asc");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("finance-columns", COLUMNS);

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchRetainerData();
    }
  }, [organization?.id]);

  const fetchRetainerData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const orgId = organization.id;

      // Fetch all cases first (needed for joins)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", orgId);

      if (casesError) throw casesError;

      const casesMap = new Map(casesData?.map(c => [c.id, c]) || []);

      // Fetch retainer balances by case - filter by selected organization
      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("case_id, amount, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (retainerError) throw retainerError;

      // Aggregate retainer balances by case
      const balanceMap = new Map<string, RetainerBalance>();
      retainerData?.forEach((fund: any) => {
        const caseId = fund.case_id;
        const caseInfo = casesMap.get(caseId);
        
        if (!balanceMap.has(caseId)) {
          balanceMap.set(caseId, {
            case_id: caseId,
            case_title: caseInfo?.title || "Unknown",
            case_number: caseInfo?.case_number || "N/A",
            balance: 0,
            last_topup: null,
          });
        }
        const current = balanceMap.get(caseId)!;
        current.balance += parseFloat(fund.amount);
        if (!current.last_topup || fund.created_at > current.last_topup) {
          current.last_topup = fund.created_at;
        }
      });

      const balances = Array.from(balanceMap.values());
      setRetainerBalances(balances);
    } catch (error: any) {
      console.error("Error fetching retainer data:", error);
      toast.error("Failed to load retainer data");
    } finally {
      setLoading(false);
    }
  };


  // Filter functions
  const filteredRetainerBalances = retainerBalances.filter((balance) => {
    const searchLower = retainerSearch.toLowerCase();
    return (
      balance.case_title.toLowerCase().includes(searchLower) ||
      balance.case_number.toLowerCase().includes(searchLower)
    );
  });

  // Sort data
  const sortedRetainerBalances = [...filteredRetainerBalances].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any;
    let bVal: any;
    
    switch (sortColumn) {
      case "case_title":
        aVal = a.case_title;
        bVal = b.case_title;
        break;
      case "case_number":
        aVal = a.case_number;
        bVal = b.case_number;
        break;
      case "balance":
        aVal = a.balance;
        bVal = b.balance;
        break;
      case "last_topup":
        aVal = a.last_topup ? new Date(a.last_topup).getTime() : 0;
        bVal = b.last_topup ? new Date(b.last_topup).getTime() : 0;
        break;
      default:
        return 0;
    }
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return sortDirection === "asc" 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  // Export columns definition
  const EXPORT_COLUMNS: ExportColumn[] = [
    { key: "case_title", label: "Case" },
    { key: "case_number", label: "Case Number" },
    { key: "balance", label: "Balance", format: (v) => `$${(v || 0).toFixed(2)}`, align: "right" },
    { key: "last_topup", label: "Last Top-Up", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  ];

  const handleExportCSV = () => exportToCSV(sortedRetainerBalances, EXPORT_COLUMNS, "retainers");
  const handleExportPDF = () => exportToPDF(
    sortedRetainerBalances, 
    EXPORT_COLUMNS, 
    "Retainer Funds Report", 
    "retainers",
    [{ label: "Total", value: `$${sortedRetainerBalances.reduce((sum, r) => sum + r.balance, 0).toFixed(2)}` }]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Retainers</h1>
        <p className="text-muted-foreground">
          Manage retainer funds across all cases
        </p>
      </div>

      {/* Retainer Funds List */}
      <Card>
        <CardHeader>
          <CardTitle>Retainer Funds by Case</CardTitle>
          <CardDescription>
            Showing {sortedRetainerBalances.length} case{sortedRetainerBalances.length !== 1 ? 's' : ''} with retainer funds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case name or number..."
                value={retainerSearch}
                onChange={(e) => setRetainerSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ColumnVisibility
              columns={COLUMNS}
              visibility={visibility}
              onToggle={toggleColumn}
              onReset={resetToDefaults}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
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
          </div>
          {sortedRetainerBalances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching retainer funds found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible("case_title") && (
                    <SortableTableHead
                      column="case_title"
                      label="Case"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("case_number") && (
                    <SortableTableHead
                      column="case_number"
                      label="Case Number"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("balance") && (
                    <SortableTableHead
                      column="balance"
                      label="Current Balance"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                    />
                  )}
                  {isVisible("last_topup") && (
                    <SortableTableHead
                      column="last_topup"
                      label="Last Top-Up"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("actions") && (
                    <th className="text-right p-2">Actions</th>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRetainerBalances.map((balance) => (
                  <TableRow
                    key={balance.case_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/cases/${balance.case_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/cases/${balance.case_id}`);
                      }
                    }}
                  >
                    {isVisible("case_title") && (
                      <TableCell className="font-medium">{balance.case_title}</TableCell>
                    )}
                    {isVisible("case_number") && (
                      <TableCell>{balance.case_number}</TableCell>
                    )}
                    {isVisible("balance") && (
                      <TableCell className="text-right font-medium">
                        ${balance.balance.toFixed(2)}
                      </TableCell>
                    )}
                    {isVisible("last_topup") && (
                      <TableCell>
                        {balance.last_topup
                          ? format(new Date(balance.last_topup), "MMM d, yyyy")
                          : "N/A"}
                      </TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell className="text-right">
                        {/* Actions column - row is already clickable */}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ScrollProgress />
    </div>
  );
};

export default Finance;