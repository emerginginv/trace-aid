import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";
import { ReportDefinition, ReportColumn } from "@/lib/analytics/reports/types";
import { formatTotalValue } from "@/lib/analytics/reports/totals";
import { fetchAllReportData } from "@/lib/analytics/reports/queryBuilder";
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
  organizationId?: string;
  timeRange?: { start?: Date; end?: Date };
  sort: { field: string; direction: "asc" | "desc" };
}

export function ReportExportMenu({ 
  report, 
  data, 
  totals, 
  filters, 
  organizationId,
  timeRange,
  sort 
}: ReportExportMenuProps) {
  const [exporting, setExporting] = useState(false);

  /**
   * Fetch all data for export (bypasses pagination)
   */
  const fetchAllData = async (): Promise<Record<string, unknown>[]> => {
    if (!organizationId) {
      // Fallback to current page data if no org ID
      return data;
    }

    try {
      return await fetchAllReportData(report, {
        organizationId,
        filters,
        sort,
        timeRange,
      });
    } catch (error) {
      console.error("Failed to fetch all data:", error);
      // Fallback to current page data
      return data;
    }
  };

  /**
   * Format cell value for export
   */
  const formatExportValue = (column: ReportColumn, row: Record<string, unknown>): string => {
    const value = typeof column.accessor === "function" 
      ? column.accessor(row)
      : row[column.accessor];
    
    if (value === null || value === undefined) return "";
    
    if (column.format === "date" && value) {
      return format(new Date(value as string), "yyyy-MM-dd");
    }
    if (column.format === "datetime" && value) {
      return format(new Date(value as string), "yyyy-MM-dd HH:mm:ss");
    }
    if (column.format === "currency" && typeof value === "number") {
      return value.toFixed(2);
    }
    if (column.format === "hours" && typeof value === "number") {
      return value.toFixed(1);
    }
    if (column.format === "percentage" && typeof value === "number") {
      return value.toFixed(1);
    }
    
    return String(value);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch ALL data for export
      const allData = await fetchAllData();

      // Build CSV header
      const headers = report.columns.map((col) => col.header);
      
      // Build CSV rows
      const rows = allData.map((row) =>
        report.columns.map((col) => {
          const strValue = formatExportValue(col, row);
          // Escape quotes and wrap in quotes if contains comma
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
      
      // Format filter info
      const filterInfo = Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("; ") || "None";
      
      // Combine all
      const csvContent = [
        [report.name],
        [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`],
        [`Records: ${allData.length}`],
        [`Filters: ${filterInfo}`],
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
      
      toast.success(`Exported ${allData.length} records to CSV`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };
  
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Fetch ALL data for export
      const allData = await fetchAllData();

      // Build HTML content for PDF
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">${report.name}</h1>
          <p style="color: #666; margin-bottom: 4px;">${report.description}</p>
          <p style="color: #666; font-size: 12px; margin-bottom: 20px;">
            Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} | 
            Records: ${allData.length}
          </p>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                ${report.columns.map(col => 
                  `<th style="border: 1px solid #e5e7eb; padding: 8px; text-align: ${col.align || 'left'};">
                    ${col.header}
                  </th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${allData.map((row, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                  ${report.columns.map(col => 
                    `<td style="border: 1px solid #e5e7eb; padding: 6px; text-align: ${col.align || 'left'};">
                      ${formatExportValue(col, row) || '—'}
                    </td>`
                  ).join('')}
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #e5e7eb; font-weight: bold;">
                ${report.columns.map((col, i) => {
                  const totalConfig = report.totals.find((t) => t.key === col.key);
                  const value = totalConfig && totals[totalConfig.key] !== undefined
                    ? formatTotalValue(totals[totalConfig.key], totalConfig.format)
                    : (i === 0 ? 'TOTALS' : '');
                  return `<td style="border: 1px solid #d1d5db; padding: 8px; text-align: ${col.align || 'left'};">${value}</td>`;
                }).join('')}
              </tr>
            </tfoot>
          </table>
        </div>
      `;

      // Create temporary container
      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Generate PDF
      await html2pdf()
        .set({
          margin: 10,
          filename: `${report.id}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(container)
        .save();

      // Cleanup
      document.body.removeChild(container);
      
      toast.success(`Exported ${allData.length} records to PDF`);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={exporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={exporting}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
