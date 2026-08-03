import { jsPDF } from "jspdf";
import { formatDisplayDate, looksLikeDateValue } from "@/lib/formatDate";

export type ExportColumn = {
  key: string;
  label: string;
  /** Plain-text value for print/PDF. Falls back to row[key]. */
  getValue?: (row: any) => string;
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMoney(n: number) {
  return `UGX ${Number(n || 0).toLocaleString()}`;
}

export function cellExportValue(row: any, col: ExportColumn): string {
  if (col.getValue) return col.getValue(row);
  const val = row?.[col.key];
  if (val == null || val === "") return "—";
  if (typeof val === "object") {
    if (val.name) return String(val.name);
    return "—";
  }
  if (typeof val === "number") {
    if (col.key.toLowerCase().includes("amount") || col.key === "total" || col.key === "price") {
      return formatMoney(val);
    }
    return Number(val).toLocaleString();
  }
  if (looksLikeDateValue(val)) return formatDisplayDate(String(val));
  return String(val);
}

export function printTableReport(opts: {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: any[];
  summaryLines?: string[];
}) {
  const { title, subtitle, columns, rows, summaryLines } = opts;
  const w = window.open("", "_blank");
  if (!w) throw new Error("Pop-up blocked. Allow pop-ups to print.");

  const head = columns
    .map((c) => `<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;background:#f8f8f8">${escapeHtml(c.label)}</th>`)
    .join("");

  const body =
    rows.length === 0
      ? `<tr><td colspan="${columns.length + 1}" style="padding:12px;color:#666">No records</td></tr>`
      : rows
          .map((row, i) => {
            const cells = columns
              .map(
                (c) =>
                  `<td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(cellExportValue(row, c))}</td>`
              )
              .join("");
            return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i + 1}</td>${cells}</tr>`;
          })
          .join("");

  const summaryHtml = (summaryLines || [])
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");

  w.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .meta { color: #666; margin-bottom: 12px; font-size: 13px; }
          .summary { margin: 0 0 16px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          @media print { button { display: none !important; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">${escapeHtml(subtitle || `Generated ${formatDisplayDate(new Date().toISOString())}`)}</div>
        ${summaryHtml ? `<div class="summary">${summaryHtml}</div>` : ""}
        <table>
          <thead><tr><th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;background:#f8f8f8">#</th>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

export function downloadTablePdf(opts: {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: any[];
  summaryLines?: string[];
  fileName?: string;
}) {
  const { title, subtitle, columns, rows, summaryLines, fileName } = opts;
  const doc = new jsPDF({
    orientation: columns.length > 5 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usable = pageWidth - margin * 2;
  const numCols = columns.length + 1;
  const indexW = Math.min(12, usable * 0.06);
  const colW = (usable - indexW) / columns.length;
  let y = margin;

  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(subtitle || `Generated ${formatDisplayDate(new Date().toISOString())}`, margin, y);
  y += 5;
  (summaryLines || []).forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  doc.setTextColor(0);
  y += 3;

  const drawHeader = () => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = margin;
    doc.text("#", x, y);
    x += indexW;
    columns.forEach((c) => {
      doc.text(c.label, x, y);
      x += colW;
    });
    y += 2;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text("No records", margin, y);
  } else {
    rows.forEach((row, i) => {
      if (y > pageHeight - 14) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      const values = [String(i + 1), ...columns.map((c) => cellExportValue(row, c))];
      let x = margin;
      doc.setFontSize(8);
      values.forEach((val, idx) => {
        const width = idx === 0 ? indexW : colW;
        const text = doc.splitTextToSize(val, width - 2);
        doc.text(text[0] || "", x, y);
        x += width;
      });
      y += 6;
    });
  }

  const safeName =
    fileName ||
    `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`;
  doc.save(safeName);
}

export function downloadTableExcel(opts: {
  title: string;
  columns: ExportColumn[];
  rows: any[];
  sheetName?: string;
  fileName?: string;
  summaryLines?: string[];
}) {
  // Lazy require keeps this module usable even if xlsx tree-shakes oddly in some builds
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");
  const { title, columns, rows, sheetName, fileName, summaryLines } = opts;

  const data = rows.map((row, i) => {
    const obj: Record<string, string> = { "#": String(i + 1) };
    columns.forEach((c) => {
      obj[c.label] = cellExportValue(row, c);
    });
    return obj;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    data.length
      ? data
      : [
          Object.fromEntries(
            [["#", ""], ...columns.map((c) => [c.label, ""])]
          ),
        ]
  );
  XLSX.utils.book_append_sheet(wb, ws, (sheetName || title).slice(0, 31));

  if (summaryLines?.length) {
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Summary"],
      ...summaryLines.map((line) => [line]),
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  }

  const safeName =
    fileName ||
    `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.xlsx`;
  XLSX.writeFile(wb, safeName.endsWith(".xlsx") ? safeName : `${safeName}.xlsx`);
}

