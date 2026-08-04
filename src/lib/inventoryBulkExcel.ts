/**
 * Excel template + parser for bulk inventory product creation.
 *
 * Required: Name, Category, Selling Price
 * Optional: Cost Price, Stock, Min Stock, SKU, Barcode, Brand, Unit, Kind, Description, Size
 */

export type InventoryBulkRow = {
  name: string;
  category: string;
  price: number;
  costPrice?: number | null;
  stock: number;
  minStock?: number | null;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  unit?: string | null;
  kind?: string | null;
  description?: string | null;
  size?: string | null;
  /** 1-based Excel data row (header is row 1) */
  excelRow: number;
};

export type InventoryBulkParseResult = {
  rows: InventoryBulkRow[];
  errors: string[];
};

const HEADERS = [
  "Name",
  "Category",
  "Selling Price",
  "Cost Price",
  "Stock",
  "Min Stock",
  "SKU",
  "Barcode",
  "Brand",
  "Unit",
  "Kind",
  "Size",
  "Description",
] as const;

const EXAMPLE_ROWS = [
  [
    "2.5mm Copper Cable",
    "Cables",
    15000,
    12000,
    100,
    20,
    "CAB-2.5MM",
    "",
    "Generic",
    "m",
    "product",
    "2.5mm",
    "Single core copper cable",
  ],
  [
    "16A Switch",
    "Switches",
    8500,
    6000,
    50,
    10,
    "SW-16A",
    "",
    "",
    "pcs",
    "product",
    "",
    "1-gang light switch",
  ],
  [
    "LED Bulb 9W",
    "Lighting",
    5000,
    3500,
    200,
    30,
    "LED-9W",
    "",
    "",
    "pcs",
    "product",
    "9W",
    "Warm white LED bulb",
  ],
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

/** Download blank template with Instructions sheet and example rows. */
export function downloadInventoryBulkTemplate() {
  const XLSX = require("xlsx") as typeof import("xlsx");

  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.aoa_to_sheet([[...HEADERS], ...EXAMPLE_ROWS]);
  dataSheet["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, dataSheet, "Products");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Bulk Create Products — Template Instructions"],
    [],
    ["1. Fill one row per new product."],
    ["2. Name, Category, and Selling Price are required."],
    ["3. Category is matched by name; a new category is created if it does not exist."],
    ["4. Brand must match an existing brand name (or leave blank)."],
    ["5. Unit can be the unit name or abbreviation (e.g. pcs, m)."],
    ["6. Kind: product | packaging | material | other (default: product)."],
    ["7. SKU must be unique if provided."],
    ["8. Delete example rows before uploading (or keep only if they are real products)."],
    ["9. Save as .xlsx and upload on the Add Product page."],
    [],
    ["Column", "Required", "Notes"],
    ["Name", "Yes", "Product display name"],
    ["Category", "Yes", "Existing or new category name"],
    ["Selling Price", "Yes", "UGX"],
    ["Cost Price", "No", "UGX"],
    ["Stock", "No", "Initial quantity (default 0)"],
    ["Min Stock", "No", "Low-stock alert level"],
    ["SKU", "No", "Must be unique"],
    ["Barcode", "No", ""],
    ["Brand", "No", "Exact brand name"],
    ["Unit", "No", "Name or abbreviation"],
    ["Kind", "No", "product / packaging / material / other"],
    ["Size", "No", "e.g. 2.5mm"],
    ["Description", "No", "Free text"],
  ]);
  instructions["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");

  XLSX.writeFile(wb, "inventory_create_bulk_template.xlsx");
}

/** Parse an uploaded .xlsx / .xls / .csv into inventory create rows. */
export async function parseInventoryBulkExcel(file: File): Promise<InventoryBulkParseResult> {
  const XLSX = require("xlsx") as typeof import("xlsx");

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === "products") || wb.SheetNames[0];
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

  const iName = col(["name", "product name", "product"]);
  const iCategory = col(["category"]);
  const iPrice = col(["selling price", "price", "sale price"]);
  const iCost = col(["cost price", "cost", "unit cost"]);
  const iStock = col(["stock", "quantity", "qty"]);
  const iMinStock = col(["min stock", "minstock", "reorder level"]);
  const iSku = col(["sku"]);
  const iBarcode = col(["barcode"]);
  const iBrand = col(["brand"]);
  const iUnit = col(["unit"]);
  const iKind = col(["kind", "type", "item kind"]);
  const iSize = col(["size"]);
  const iDesc = col(["description", "notes"]);

  const errors: string[] = [];
  if (iName < 0) errors.push('Missing required column: "Name"');
  if (iCategory < 0) errors.push('Missing required column: "Category"');
  if (iPrice < 0) errors.push('Missing required column: "Selling Price"');
  if (errors.length) return { rows: [], errors };

  const rows: InventoryBulkRow[] = [];
  const seenSkus = new Set<string>();

  for (let r = 1; r < aoa.length; r++) {
    const line = aoa[r] || [];
    const allEmpty = line.every((c) => c == null || String(c).trim() === "");
    if (allEmpty) continue;

    const excelRow = r + 1;
    const name = cellStr(line[iName]);
    const category = cellStr(line[iCategory]);
    const price = cellNum(line[iPrice]);

    if (!name) {
      errors.push(`Row ${excelRow}: Name is required`);
      continue;
    }
    if (!category) {
      errors.push(`Row ${excelRow}: Category is required`);
      continue;
    }
    if (price == null || price < 0) {
      errors.push(`Row ${excelRow}: Selling Price must be a non-negative number`);
      continue;
    }

    const costPrice = iCost >= 0 ? cellNum(line[iCost]) : null;
    if (iCost >= 0 && line[iCost] !== "" && line[iCost] != null && costPrice == null) {
      errors.push(`Row ${excelRow}: Cost Price is not a valid number`);
      continue;
    }

    let stock = 0;
    if (iStock >= 0 && line[iStock] !== "" && line[iStock] != null) {
      const s = cellNum(line[iStock]);
      if (s == null || !Number.isInteger(s) || s < 0) {
        errors.push(`Row ${excelRow}: Stock must be a non-negative whole number`);
        continue;
      }
      stock = s;
    }

    let minStock: number | null = null;
    if (iMinStock >= 0 && line[iMinStock] !== "" && line[iMinStock] != null) {
      const m = cellNum(line[iMinStock]);
      if (m == null || !Number.isInteger(m) || m < 0) {
        errors.push(`Row ${excelRow}: Min Stock must be a non-negative whole number`);
        continue;
      }
      minStock = m;
    }

    const sku = iSku >= 0 ? cellStr(line[iSku]) : null;
    if (sku) {
      const key = sku.toLowerCase();
      if (seenSkus.has(key)) {
        errors.push(`Row ${excelRow}: Duplicate SKU in file: ${sku}`);
        continue;
      }
      seenSkus.add(key);
    }

    const kindRaw = iKind >= 0 ? cellStr(line[iKind]) : null;
    let kind = kindRaw ? kindRaw.toLowerCase() : "product";
    if (!["product", "packaging", "material", "other"].includes(kind)) {
      errors.push(`Row ${excelRow}: Kind must be product, packaging, material, or other`);
      continue;
    }

    rows.push({
      name,
      category,
      price,
      costPrice,
      stock,
      minStock,
      sku,
      barcode: iBarcode >= 0 ? cellStr(line[iBarcode]) : null,
      brand: iBrand >= 0 ? cellStr(line[iBrand]) : null,
      unit: iUnit >= 0 ? cellStr(line[iUnit]) : null,
      kind,
      size: iSize >= 0 ? cellStr(line[iSize]) : null,
      description: iDesc >= 0 ? cellStr(line[iDesc]) : null,
      excelRow,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No data rows found. Add products below the header row.");
  }

  return { rows, errors };
}
