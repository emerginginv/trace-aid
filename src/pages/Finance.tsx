import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";

interface RetainerBalance {
  case_id: string;
  case_title: string;
  case_number: string;
  balance: number;
  last_topup: string | null;
}

const Finance = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [retainerBalances, setRetainerBalances] = useState<RetainerBalance[]>([]);
  
  // Filter states
  const [retainerSearch, setRetainerSearch] = useState("");
  
  // Pagination states
  const [retainerPage, setRetainerPage] = useState(1);
  const [retainerPageSize, setRetainerPageSize] = useState(15);

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

  // Paginated data
  const paginatedRetainerBalances = filteredRetainerBalances.slice(
    (retainerPage - 1) * retainerPageSize,
    retainerPage * retainerPageSize
  );
  const retainerTotalPages = Math.ceil(filteredRetainerBalances.length / retainerPageSize);

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
            Current retainer balance for each case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case name or number..."
                value={retainerSearch}
                onChange={(e) => {
                  setRetainerSearch(e.target.value);
                  setRetainerPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={retainerPageSize.toString()} onValueChange={(v) => {
              setRetainerPageSize(parseInt(v));
              setRetainerPage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredRetainerBalances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching retainer funds found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Last Top-Up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRetainerBalances.map((balance) => (
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
                    <TableCell className="font-medium">{balance.case_title}</TableCell>
                    <TableCell>{balance.case_number}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${balance.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {balance.last_topup
                        ? format(new Date(balance.last_topup), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Actions column - row is already clickable */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredRetainerBalances.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((retainerPage - 1) * retainerPageSize) + 1} to {Math.min(retainerPage * retainerPageSize, filteredRetainerBalances.length)} of {filteredRetainerBalances.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetainerPage(p => Math.max(1, p - 1))}
                  disabled={retainerPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {retainerPage} of {retainerTotalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetainerPage(p => Math.min(retainerTotalPages, p + 1))}
                  disabled={retainerPage === retainerTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
