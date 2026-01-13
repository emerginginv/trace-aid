import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useInvoiceLineItems, type InvoiceLineItem } from "@/hooks/useInvoiceGeneration";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceLineItemsTableProps {
  invoiceId: string;
  items?: InvoiceLineItem[];
}

export function InvoiceLineItemsTable({ invoiceId, items }: InvoiceLineItemsTableProps) {
  const { data: fetchedItems, isLoading } = useInvoiceLineItems(items ? undefined : invoiceId);
  
  const lineItems = items || fetchedItems || [];
  
  if (isLoading && !items) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  if (lineItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No line items found for this invoice.
      </div>
    );
  }
  
  const formatPricingModel = (model: string) => {
    const labels: Record<string, string> = {
      hourly: 'Hourly',
      flat: 'Flat Fee',
      per_unit: 'Per Unit',
      retainer: 'Retainer',
    };
    return labels[model] || model;
  };
  
  const total = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Pricing</TableHead>
          <TableHead className="text-center">Qty</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-center">Activities</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div>
                <div className="font-medium">{item.service_name}</div>
                {item.service_code && (
                  <div className="text-xs text-muted-foreground">{item.service_code}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{formatPricingModel(item.pricing_model)}</Badge>
            </TableCell>
            <TableCell className="text-center">
              {Number(item.quantity).toFixed(2)}
              {item.unit_label && (
                <span className="text-xs text-muted-foreground ml-1">{item.unit_label}</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              ${Number(item.rate).toFixed(2)}
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {item.activity_count}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
              ${Number(item.amount).toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/50">
          <TableCell colSpan={5} className="text-right font-semibold">
            Total:
          </TableCell>
          <TableCell className="text-right font-bold">
            ${total.toFixed(2)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
