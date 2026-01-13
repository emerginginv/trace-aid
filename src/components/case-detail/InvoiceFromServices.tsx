import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, DollarSign, Clock, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useBillableServiceInstances, useGenerateInvoiceFromServices } from "@/hooks/useInvoiceGeneration";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InvoiceFromServicesProps {
  caseId: string;
  onSuccess?: () => void;
}

export function InvoiceFromServices({ caseId, onSuccess }: InvoiceFromServicesProps) {
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [retainerToApply, setRetainerToApply] = useState(0);
  
  const { data: billableServices, isLoading, error } = useBillableServiceInstances(caseId);
  const generateInvoice = useGenerateInvoiceFromServices();
  
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
  
  const toggleService = (serviceId: string) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };
  
  const selectAll = () => {
    if (billableServices) {
      setSelectedServices(new Set(billableServices.map(s => s.id)));
    }
  };
  
  const clearSelection = () => {
    setSelectedServices(new Set());
  };
  
  const selectedTotal = useMemo(() => {
    if (!billableServices) return 0;
    return billableServices
      .filter(s => selectedServices.has(s.id))
      .reduce((sum, s) => sum + s.estimated_amount, 0);
  }, [billableServices, selectedServices]);
  
  const balanceDue = selectedTotal - retainerToApply;
  
  const handleGenerateInvoice = async () => {
    if (selectedServices.size === 0) return;
    
    await generateInvoice.mutateAsync({
      caseId,
      serviceInstanceIds: Array.from(selectedServices),
      applyRetainer: retainerToApply,
    });
    
    setSelectedServices(new Set());
    setRetainerToApply(0);
    onSuccess?.();
  };
  
  const getPricingModelBadge = (model: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      hourly: "default",
      flat: "secondary",
      per_unit: "outline",
      retainer: "secondary",
    };
    return <Badge variant={variants[model] || "default"}>{model}</Badge>;
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
        <AlertDescription>Failed to load billable services</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Generate Invoice from Services</h2>
          <p className="text-muted-foreground">
            Select completed service instances to include in the invoice
          </p>
        </div>
      </div>
      
      {!billableServices || billableServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No billable services available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Services must be marked as completed and billable to appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Completed Services</CardTitle>
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
                {billableServices.length} service{billableServices.length !== 1 ? 's' : ''} ready for billing
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedServices.size === billableServices.length && billableServices.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) selectAll();
                          else clearSelection();
                        }}
                      />
                    </TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-center">Activities</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billableServices.map((service) => (
                    <TableRow 
                      key={service.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => toggleService(service.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedServices.has(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.service_name}</div>
                          {service.service_code && (
                            <div className="text-xs text-muted-foreground">{service.service_code}</div>
                          )}
                          {service.notes && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {service.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPricingModelBadge(service.pricing_model)}
                      </TableCell>
                      <TableCell className="text-center">
                        {service.quantity_actual || service.quantity_estimated || 1}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(service.rate).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {service.activity_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(service.estimated_amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {selectedServices.size > 0 && (
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
                    <span>Subtotal ({selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''}):</span>
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
                    disabled={generateInvoice.isPending || selectedServices.size === 0}
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
                <li>Invoices summarize completed work — they do not calculate quantities</li>
                <li>Pricing is frozen at the time of invoice generation</li>
                <li>Each service instance can only be billed once</li>
                <li>Work records are never modified by invoice generation</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
