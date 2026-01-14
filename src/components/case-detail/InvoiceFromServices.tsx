/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * InvoiceFromServices Component
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UPDATED: Services are now DESCRIPTIVE only, not the source of truth for billing.
 * 
 * Invoice generation now comes from APPROVED BILLING ITEMS:
 * 1. Time entries and expenses are created via Updates
 * 2. Billing items are approved
 * 3. Invoices are generated from approved billing items
 * 
 * This component shows:
 * - Approved billing items ready for invoicing (source of truth)
 * - Service context for reference (descriptive only)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, DollarSign, Clock, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useApprovedBillingItems, useGenerateInvoiceFromBillingItems } from "@/hooks/useInvoiceGeneration";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrganization } from "@/contexts/OrganizationContext";

interface InvoiceFromServicesProps {
  caseId: string;
  onSuccess?: () => void;
}

export function InvoiceFromServices({ caseId, onSuccess }: InvoiceFromServicesProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [retainerToApply, setRetainerToApply] = useState(0);
  
  const { organization } = useOrganization();
  const { data: approvedItems, isLoading, error, refetch } = useApprovedBillingItems(caseId);
  const generateInvoice = useGenerateInvoiceFromBillingItems();
  
  // Fetch retainer balance
  const { data: retainerBalance = 0 } = useQuery({
    queryKey: ['retainer-balance', caseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (!orgMember) return 0;
      
      const { data } = await supabase
        .from("retainer_funds")
        .select("amount")
        .eq("case_id", caseId)
        .eq("organization_id", orgMember.organization_id);
      
      return data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    },
    enabled: !!caseId,
  });
  
  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };
  
  const selectAll = () => {
    if (approvedItems) {
      setSelectedItems(new Set(approvedItems.map(s => s.id)));
    }
  };
  
  const clearSelection = () => {
    setSelectedItems(new Set());
  };
  
  const selectedTotal = useMemo(() => {
    if (!approvedItems) return 0;
    return approvedItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + Number(item.amount), 0);
  }, [approvedItems, selectedItems]);
  
  const balanceDue = selectedTotal - retainerToApply;
  
  const handleGenerateInvoice = async () => {
    if (selectedItems.size === 0) return;
    
    await generateInvoice.mutateAsync({
      caseId,
      billingItemIds: Array.from(selectedItems),
      applyRetainer: retainerToApply,
    });
    
    setSelectedItems(new Set());
    setRetainerToApply(0);
    refetch();
    onSuccess?.();
  };
  
  const getFinanceTypeBadge = (type: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      time: { label: "Time", variant: "default" },
      expense: { label: "Expense", variant: "secondary" },
      billing_item: { label: "Billing", variant: "outline" },
    };
    const { label, variant } = config[type] || { label: type, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load approved billing items</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Generate Invoice</h2>
          <p className="text-muted-foreground">
            Select approved billing items to include in the invoice
          </p>
        </div>
      </div>
      
      {!approvedItems || approvedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No approved billing items</p>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Billing items must be approved before they can be invoiced.
              Create billing items from Updates linked to events, then approve them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Approved Billing Items</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
              <CardDescription>
                {approvedItems.length} approved item{approvedItems.length !== 1 ? 's' : ''} ready for invoicing
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === approvedItems.length && approvedItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) selectAll();
                          else clearSelection();
                        }}
                      />
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedItems.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => toggleItem(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {item.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {item.service_name || '—'}
                          </div>
                          {item.service_code && (
                            <div className="text-xs text-muted-foreground">
                              {item.service_code}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getFinanceTypeBadge(item.finance_type)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity || 1}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(item.unit_price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(item.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {selectedItems.size > 0 && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Invoice Summary
                  </span>
                  <span className="text-2xl">${selectedTotal.toFixed(2)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {retainerBalance > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium mb-2">
                      This case has <strong>${retainerBalance.toFixed(2)}</strong> in available retainer funds.
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Would you like to apply some or all of it to this invoice?
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">$</span>
                      <input
                        type="number"
                        placeholder="Amount to apply"
                        value={retainerToApply || ""}
                        max={Math.min(selectedTotal, retainerBalance)}
                        min={0}
                        step={0.01}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const maxApply = Math.min(selectedTotal, retainerBalance);
                          setRetainerToApply(Math.min(Math.max(0, value), maxApply));
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}):</span>
                    <span className="font-medium">${selectedTotal.toFixed(2)}</span>
                  </div>
                  {retainerToApply > 0 && (
                    <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span>Retainer Applied:</span>
                      <span className="font-medium">-${retainerToApply.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Balance Due:</span>
                    <span>${balanceDue.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-end pt-2">
                  <Button 
                    onClick={handleGenerateInvoice} 
                    size="lg"
                    disabled={generateInvoice.isPending || selectedItems.size === 0}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {generateInvoice.isPending ? "Generating..." : "Generate Invoice"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Invoice Generation Rules:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Invoices are generated from <strong>approved billing items only</strong></li>
                <li>Services provide context but are not the source of billing data</li>
                <li>Pricing is frozen at billing item approval time</li>
                <li>Each billing item can only be invoiced once</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
