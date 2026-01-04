import { format } from "date-fns";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any, row: any) => string;
  align?: "left" | "right" | "center";
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value, row) : (value ?? "");
      return `"${String(formatted).replace(/"/g, '""')}"`;
    })
  );

  const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} exported to CSV`);
}

export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  title: string,
  filename: string,
  totals?: { label: string; value: string }[]
) {
  const printContent = document.createElement("div");
  
  const headerRow = columns
    .map(
      (col) =>
        `<th style="border: 1px solid #ddd; padding: 8px; text-align: ${col.align || "left"};">${col.label}</th>`
    )
    .join("");

  const bodyRows = data
    .map((row) => {
      const cells = columns
        .map((col) => {
          const value = row[col.key];
          const formatted = col.format ? col.format(value, row) : (value ?? "-");
          return `<td style="border: 1px solid #ddd; padding: 8px; text-align: ${col.align || "left"};">${formatted}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const totalsRow = totals
    ? `<tfoot>
        <tr style="background: #f3f4f6; font-weight: bold;">
          <td colspan="${columns.length - totals.length}" style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totals[0]?.label || "Total"}:</td>
          ${totals.map((t) => `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t.value}</td>`).join("")}
        </tr>
      </tfoot>`
    : "";

  printContent.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="margin-bottom: 8px; font-size: 24px;">${title}</h1>
      <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Generated: ${format(new Date(), "MMMM d, yyyy")}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f3f4f6;">
            ${headerRow}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
        ${totalsRow}
      </table>
    </div>
  `;

  html2pdf()
    .set({
      margin: 10,
      filename: `${filename}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(printContent)
    .save();

  toast.success(`${title} exported to PDF`);
}
