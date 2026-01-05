import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { ReportDefinition, ReportColumn } from "@/lib/analytics/reports/types";
import { formatTotalValue } from "@/lib/analytics/reports/totals";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ReportExportMenuProps {
  report: ReportDefinition;
  data: Record<string, unknown>[];
  totals: Record<string, number>;
  filters: Record<string, unknown>;
}

export function ReportExportMenu({ report, data, totals, filters }: ReportExportMenuProps) {
  const handleExportCSV = () => {
    try {
      // Build CSV header
      const headers = report.columns.map((col) => col.header);
      
      // Build CSV rows
      const rows = data.map((row) =>
        report.columns.map((col) => {
          const value = typeof col.accessor === "function" 
            ? col.accessor(row)
            : row[col.accessor];
          
          if (value === null || value === undefined) return "";
          
          // Format value for CSV
          if (col.format === "date" && value) {
            return format(new Date(value as string), "yyyy-MM-dd");
          }
          if (col.format === "datetime" && value) {
            return format(new Date(value as string), "yyyy-MM-dd HH:mm:ss");
          }
          if (col.format === "currency" && typeof value === "number") {
            return value.toFixed(2);
          }
          if (col.format === "hours" && typeof value === "number") {
            return value.toFixed(1);
          }
          
          // Escape quotes and wrap in quotes if contains comma
          const strValue = String(value);
          if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        })
      );
      
      // Build totals row
      const totalsRow = report.columns.map((col) => {
        const totalConfig = report.totals.find((t) => t.key === col.key);
        if (totalConfig && totals[totalConfig.key] !== undefined) {
          return formatTotalValue(totals[totalConfig.key], totalConfig.format);
        }
        return "";
      });
      
      // Combine all
      const csvContent = [
        // Title
        [report.name],
        [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`],
        [`Filters: ${JSON.stringify(filters)}`],
        [],
        headers,
        ...rows,
        [],
        ["TOTALS", ...totalsRow.slice(1)],
      ]
        .map((row) => row.join(","))
        .join("\n");
      
      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${report.id}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success("Report exported to CSV");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };
  
  const handleExportPDF = () => {
    // PDF export would require additional library (html2pdf)
    // For now, show coming soon message
    toast.info("PDF export coming soon");
  };
  
  return (
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
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
