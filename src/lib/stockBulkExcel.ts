/**
 * Excel template + parser for bulk stock add (restock existing products).
 *
 * Columns:
 *   SKU* | Product Name | Quantity* | Unit Cost | Store | Supplier | Notes
 *
 * *SKU or Product Name required (SKU preferred). Quantity required.
 */

export type StockBulkRow = {
  sku?: string | null;
  productName?: string | null;
  quantity: number;
  unitCost?: number | null;
  storeName?: string | null;
  supplier?: string | null;
  notes?: string | null;
  /** 1-based Excel data row (header is row 1) */
  excelRow: number;
};

export type StockBulkParseResult = {
  rows: StockBulkRow[];
  errors: string[];
};

const HEADERS = [
  "SKU",
  "Product Name",
  "Quantity",
  "Unit Cost",
  "Store",
  "Supplier",
  "Notes",
] as const;

const EXAMPLE_ROWS = [
  ["CAB-2.5MM", "2.5mm Copper Cable", 50, 12000, "Main Store", "ABC Supplies", "Weekly restock"],
  ["SW-16A", "16A Switch", 100, 3500, "", "ABC Supplies", ""],
  ["", "LED Bulb 9W", 200, 2500, "Main Store", "", "Use exact product name if no SKU"],
];

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

function cellNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Download a blank template with an Instructions sheet and example rows. */
export function downloadStockBulkTemplate() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");

  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS]);
  dataSheet["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, dataSheet, "Stock Add");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Bulk Add Stock — Template Instructions"],
    [],
    ["1. Fill one row per product you want to restock."],
    ["2. SKU or Product Name is required (SKU is preferred — more reliable)."],
    ["3. Quantity is required and must be a positive whole number."],
    ["4. Unit Cost is optional (UGX). If blank, the product's current cost price is used."],
    ["5. Store is optional. Use the exact store name from the system, or leave blank for main stock."],
    ["6. Supplier and Notes are optional."],
    ["7. Delete the example rows before uploading (or keep them only if they match real products)."],
    ["8. Save as .xlsx and upload on the Add Stock page."],
    [],
    ["Column", "Required", "Notes"],
    ["SKU", "Recommended", "Must match an existing product SKU"],
    ["Product Name", "If no SKU", "Exact name match; use SKU if names are duplicated"],
    ["Quantity", "Yes", "Positive integer"],
    ["Unit Cost", "No", "UGX"],
    ["Store", "No", "Exact store name, or blank"],
    ["Supplier", "No", "Free text"],
    ["Notes", "No", "Free text"],
  ]);
  instructions["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");

  XLSX.writeFile(wb, "stock_add_bulk_template.xlsx");
}

/** Parse an uploaded .xlsx / .xls / .csv into stock bulk rows. */
export async function parseStockBulkExcel(file: File): Promise<StockBulkParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === "stock add") || wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ["Workbook has no sheets"] };
  }

  const sheet = wb.Sheets[sheetName];
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!aoa.length) {
    return { rows: [], errors: ["Sheet is empty"] };
  }

  const headerRow = aoa[0].map(normalizeHeader);
  const col = (aliases: string[]) => {
    for (const a of aliases) {
      const i = headerRow.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iSku = col(["sku"]);
  const iName = col(["product name", "product", "name"]);
  const iQty = col(["quantity", "qty"]);
  const iCost = col(["unit cost", "unitcost", "cost"]);
  const iStore = col(["store", "store name"]);
  const iSupplier = col(["supplier"]);
  const iNotes = col(["notes", "note"]);

  const errors: string[] = [];
  if (iQty < 0) errors.push('Missing required column: "Quantity"');
  if (iSku < 0 && iName < 0) {
    errors.push('Need at least one of: "SKU" or "Product Name"');
  }
  if (errors.length) return { rows: [], errors };

  const rows: StockBulkRow[] = [];

  for (let r = 1; r < aoa.length; r++) {
    const line = aoa[r] || [];
    const allEmpty = line.every((c) => c == null || String(c).trim() === "");
    if (allEmpty) continue;

    const sku = iSku >= 0 ? cellStr(line[iSku]) : null;
    const productName = iName >= 0 ? cellStr(line[iName]) : null;
    const qtyRaw = cellNum(line[iQty]);
    const excelRow = r + 1;

    if (!sku && !productName) {
      errors.push(`Row ${excelRow}: provide SKU or Product Name`);
      continue;
    }
    if (qtyRaw == null || !Number.isInteger(qtyRaw) || qtyRaw <= 0) {
      errors.push(`Row ${excelRow}: Quantity must be a positive whole number`);
      continue;
    }

    const unitCost = iCost >= 0 ? cellNum(line[iCost]) : null;
    if (iCost >= 0 && line[iCost] !== "" && line[iCost] != null && unitCost == null) {
      errors.push(`Row ${excelRow}: Unit Cost is not a valid number`);
      continue;
    }
    if (unitCost != null && unitCost < 0) {
      errors.push(`Row ${excelRow}: Unit Cost cannot be negative`);
      continue;
    }

    rows.push({
      sku,
      productName,
      quantity: qtyRaw,
      unitCost,
      storeName: iStore >= 0 ? cellStr(line[iStore]) : null,
      supplier: iSupplier >= 0 ? cellStr(line[iSupplier]) : null,
      notes: iNotes >= 0 ? cellStr(line[iNotes]) : null,
      excelRow,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No data rows found. Add products below the header row.");
  }

  return { rows, errors };
}
