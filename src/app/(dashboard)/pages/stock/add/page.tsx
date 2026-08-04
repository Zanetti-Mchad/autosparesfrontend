"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate, isDateInRange } from "@/lib/formatDate";
import { canManageRecord, MANAGE_DENIED_REMARK } from "@/lib/canManage";
import SearchableSelect from "@/components/SearchableSelect";
import DateRangeFilter, { defaultStockDateRange } from "@/components/DateRangeFilter";
import ManageActions from "@/components/ManageActions";
import { downloadTablePdf, printTableReport } from "@/lib/reportExport";
import {
  downloadStockBulkTemplate,
  parseStockBulkExcel,
  type StockBulkRow,
} from "@/lib/stockBulkExcel";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileSpreadsheet, Upload } from "lucide-react";

type Product = {
  id: string;
  name: string;
  quantity?: number;
  costPrice?: number | null;
  sku?: string | null;
};

type Store = {
  id: string;
  name: string;
};

type Restock = {
  id: string;
  inventoryId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string | null;
  notes?: string | null;
  restockDate?: string;
  userId: string;
  inventory?: { id: string; name?: string | null; sku?: string | null } | null;
  user?: { id: string; firstName?: string | null; lastName?: string | null } | null;
};

type BulkResultRow = {
  row: number;
  ok: boolean;
  error?: string;
  inventoryId?: string;
  productName?: string | null;
  sku?: string | null;
  quantity?: number;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function creatorLabel(r: Restock) {
  if (!r.user) return "—";
  return [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—";
}

export default function AddStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [rows, setRows] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [inventoryId, setInventoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const [editing, setEditing] = useState<Restock | null>(null);
  const [editForm, setEditForm] = useState({ quantity: "", unitCost: "", supplier: "", notes: "" });
  const [deleting, setDeleting] = useState<Restock | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  /** False when production backend lacks /stock/restocks (edit/delete need that API). */
  const [restockApiOk, setRestockApiOk] = useState(false);
  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkPreview, setBulkPreview] = useState<StockBulkRow[]>([]);
  const [bulkParseErrors, setBulkParseErrors] = useState<string[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResultRow[] | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const restockRes = await fetchApi("/stock/restocks");
      setRows(extractList(restockRes));
      setRestockApiOk(true);
      return;
    } catch {
      setRestockApiOk(false);
    }

    try {
      const movRes = await fetchApi("/stock/movements?type=RESTOCK");
      const movements = extractList(movRes);
      setRows(
        movements.map((m: any) => ({
          id: String(m.id),
          inventoryId: String(m.inventoryId || m.inventory?.id || ""),
          quantity: Number(m.quantity || 0),
          unitCost: 0,
          totalCost: 0,
          notes: m.notes || null,
          restockDate: m.movedAt || m.createdAt,
          userId: String(m.userId || m.user?.id || ""),
          inventory: m.inventory || null,
          user: m.user || null,
        }))
      );
    } catch {
      setRows([]);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const prodRes = await fetchApi("/inventory/inventory?limit=500");
      setProducts(
        extractList(prodRes).map((p: any) => ({
          id: String(p.id),
          name: String(p.name || "Unnamed"),
          quantity: Number(p.quantity || 0),
          costPrice: p.costPrice ?? null,
          sku: p.sku || null,
        }))
      );
    } catch {
      /* keep existing */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, storeRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=500"),
        fetchApi("/catalog/stores"),
      ]);

      setProducts(
        extractList(prodRes).map((p: any) => ({
          id: String(p.id),
          name: String(p.name || "Unnamed"),
          quantity: Number(p.quantity || 0),
          costPrice: p.costPrice ?? null,
          sku: p.sku || null,
        }))
      );

      setStores(
        extractList(storeRes)
          .filter((s: any) => s.isActive !== false)
          .map((s: any) => ({ id: String(s.id), name: String(s.name) }))
      );

      await loadHistory();
    } catch (e: any) {
      const msg =
        e?.message === "Failed to fetch"
          ? "Cannot reach the API. Check your connection or backend URL."
          : e?.message || "Failed to load add stock";
      toast.error(msg.length > 120 ? "Failed to load add stock" : msg);
      setProducts([]);
      setStores([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((r) => isDateInRange(r.restockDate, fromDate, toDate)),
    [rows, fromDate, toDate]
  );

  const periodLabel = `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;

  const exportColumns = [
    {
      key: "product",
      label: "Product",
      getValue: (r: Restock) => r.inventory?.name || "—",
    },
    {
      key: "quantity",
      label: "Qty",
      getValue: (r: Restock) => `+${r.quantity}`,
    },
    {
      key: "unitCost",
      label: "Unit cost",
      getValue: (r: Restock) =>
        restockApiOk ? `UGX ${Number(r.unitCost || 0).toLocaleString()}` : "—",
    },
    {
      key: "by",
      label: "By",
      getValue: (r: Restock) => creatorLabel(r),
    },
    {
      key: "date",
      label: "Date",
      getValue: (r: Restock) => formatDisplayDate(r.restockDate),
    },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Add Stock — Restocks",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
      });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = () => {
    try {
      downloadTablePdf({
        title: "Add Stock — Restocks",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
        fileName: `restocks_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const selected = products.find((p) => p.id === inventoryId);

  const denyManage = () => {
    toast.error(MANAGE_DENIED_REMARK);
  };

  const clearBulk = () => {
    setBulkPreview([]);
    setBulkParseErrors([]);
    setBulkFileName("");
    setBulkResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkResults(null);
    setBulkFileName(file.name);
    try {
      const parsed = await parseStockBulkExcel(file);
      setBulkParseErrors(parsed.errors);
      setBulkPreview(parsed.rows);
      if (parsed.rows.length === 0 && parsed.errors.length) {
        toast.error(parsed.errors[0]);
      } else if (parsed.errors.length) {
        toast.error(`${parsed.errors.length} row(s) have issues — fix or remove them`);
      } else {
        toast.success(`${parsed.rows.length} row(s) ready to upload`);
      }
    } catch (err: any) {
      setBulkPreview([]);
      setBulkParseErrors([err.message || "Failed to read Excel file"]);
      toast.error(err.message || "Failed to read Excel file");
    }
  };

  const submitBulk = async () => {
    if (bulkPreview.length === 0) {
      toast.error("Upload an Excel file first");
      return;
    }

    try {
      setBulkUploading(true);
      const res = await fetchApi("/stock/add-bulk", {
        method: "POST",
        body: JSON.stringify({
          items: bulkPreview.map((r) => ({
            sku: r.sku,
            productName: r.productName,
            quantity: r.quantity,
            unitCost: r.unitCost ?? undefined,
            storeName: r.storeName,
            supplier: r.supplier,
            notes: r.notes,
          })),
        }),
      });

      const data = res?.data || {};
      const results: BulkResultRow[] = Array.isArray(data.results) ? data.results : [];
      setBulkResults(results);
      const ok = Number(data.successCount || 0);
      const fail = Number(data.failCount || 0);
      if (fail === 0) {
        toast.success(`Added stock for ${ok} product(s)`);
        clearBulk();
      } else {
        toast.error(`${ok} succeeded, ${fail} failed — see results below`);
      }
      await refreshProducts();
      await loadHistory();
    } catch (err: any) {
      if (err instanceof ApiError && err.body?.data?.results) {
        setBulkResults(err.body.data.results);
        const ok = Number(err.body.data.successCount || 0);
        const fail = Number(err.body.data.failCount || 0);
        toast.error(`${ok} succeeded, ${fail} failed — see results below`);
        if (ok > 0) {
          await refreshProducts();
          await loadHistory();
        }
      } else {
        toast.error(err.message || "Bulk upload failed");
      }
    } finally {
      setBulkUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!inventoryId) {
      toast.error("Select a product");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }

    try {
      setSaving(true);
      await fetchApi("/stock/add", {
        method: "POST",
        body: JSON.stringify({
          inventoryId,
          quantity: qty,
          unitCost: unitCost !== "" ? parseFloat(unitCost) : undefined,
          storeId: storeId || null,
          supplier: supplier.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      toast.success("Stock added");
      setQuantity("");
      setUnitCost("");
      setSupplier("");
      setNotes("");
      await refreshProducts();
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to add stock");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: Restock) => {
    if (!canManageRecord(row.userId || row.user?.id)) {
      denyManage();
      return;
    }
    setEditing(row);
    setEditForm({
      quantity: String(row.quantity),
      unitCost: String(row.unitCost),
      supplier: row.supplier || "",
      notes: row.notes || "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      await fetchApi(`/stock/restocks/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          quantity: parseInt(editForm.quantity, 10),
          unitCost: parseFloat(editForm.unitCost),
          supplier: editForm.supplier.trim() || null,
          notes: editForm.notes.trim() || null,
        }),
      });
      toast.success("Restock updated");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (row: Restock) => {
    if (!canManageRecord(row.userId || row.user?.id)) {
      denyManage();
      return;
    }
    setDeleting(row);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteLoading(true);
      await fetchApi(`/stock/restocks/${deleting.id}`, { method: "DELETE" });
      toast.success("Restock deleted");
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Add Stock</h1>
        <p className="text-sm text-gray-500">
          Receive stock into inventory. Edit/delete only for admin or the creator.
        </p>
      </div>

      <form onSubmit={submit} className="border rounded-xl p-3 sm:p-4 bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <SearchableSelect
              required
              value={inventoryId}
              placeholder="Search product by name or SKU…"
              emptyMessage="No products match"
              options={products.map((p) => ({
                value: p.id,
                label: p.name,
                searchText: p.sku || "",
                description: `${p.sku ? `${p.sku} · ` : ""}Qty ${p.quantity ?? 0}`,
              }))}
              onChange={(id) => {
                setInventoryId(id);
                const p = products.find((x) => x.id === id);
                if (p?.costPrice != null && unitCost === "") {
                  setUnitCost(String(p.costPrice));
                }
              }}
            />
            {selected && (
              <p className="text-xs text-gray-500 mt-1">Current quantity: {selected.quantity ?? 0}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              required
              type="number"
              min="1"
              step="1"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit cost (UGX)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store (optional)</label>
            <select
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">No store / main stock</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full sm:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 min-h-11 disabled:opacity-50"
        >
          {saving && !editing ? "Saving…" : "Add Stock"}
        </button>
      </form>

      <div className="border rounded-xl p-3 sm:p-4 bg-white space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Bulk upload (Excel)</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Download the template, fill one row per product (SKU preferred), then upload.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                downloadStockBulkTemplate();
                toast.success("Template downloaded");
              } catch (err: any) {
                toast.error(err.message || "Could not download template");
              }
            }}
            className="inline-flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 min-h-11 text-sm font-medium hover:bg-gray-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download template
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 min-h-11 text-sm font-medium hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Choose Excel file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={onBulkFile}
          />

          {bulkPreview.length > 0 && (
            <>
              <button
                type="button"
                disabled={bulkUploading}
                onClick={submitBulk}
                className="inline-flex items-center justify-center bg-blue-600 text-white rounded-lg px-4 py-2.5 min-h-11 text-sm font-medium disabled:opacity-50"
              >
                {bulkUploading ? "Uploading…" : `Upload ${bulkPreview.length} row(s)`}
              </button>
              <button
                type="button"
                disabled={bulkUploading}
                onClick={clearBulk}
                className="inline-flex items-center justify-center border rounded-lg px-4 py-2.5 min-h-11 text-sm text-gray-600"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {bulkFileName && (
          <p className="text-xs text-gray-500">
            File: <span className="font-medium text-gray-700">{bulkFileName}</span>
          </p>
        )}

        <div className="rounded-lg bg-gray-50 border px-3 py-3 text-xs text-gray-600 space-y-2">
          <p className="font-medium text-gray-800 text-sm">Excel columns — what they mean</p>
          <p className="text-gray-500">
            Restocks <span className="font-medium text-gray-700">existing</span> products only.
            To create new products, use Add Product instead.
          </p>
          <ul className="space-y-1.5 list-none">
            <li>
              <span className="font-mono text-gray-800">SKU</span>
              <span className="ml-1 rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Recommended
              </span>
              — Product code in the system. Preferred way to match the product.
            </li>
            <li>
              <span className="font-mono text-gray-800">Product Name</span>
              <span className="ml-1 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                If no SKU
              </span>
              — Exact product name. Use SKU if several products share a name.
            </li>
            <li>
              <span className="font-mono text-gray-800">Quantity</span>
              <span className="ml-1 rounded bg-red-100 text-red-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Required
              </span>
              — How many units to add (positive whole number).
            </li>
            <li>
              <span className="font-mono text-gray-800">Unit Cost</span>
              <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Optional
              </span>
              — Cost per unit in UGX. If blank, the product&apos;s current cost price is used.
            </li>
            <li>
              <span className="font-mono text-gray-800">Store</span>
              <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Optional
              </span>
              — Exact store name, or leave blank for main stock.
            </li>
            <li>
              <span className="font-mono text-gray-800">Supplier</span>
              <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Optional
              </span>
              — Who supplied this stock (free text).
            </li>
            <li>
              <span className="font-mono text-gray-800">Notes</span>
              <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Optional
              </span>
              — Any extra remark for this restock.
            </li>
          </ul>
          <p className="pt-1 border-t border-gray-200 text-gray-500">
            <span className="font-medium text-gray-700">Required:</span> Quantity, plus SKU or Product Name.
            Delete example rows before uploading unless they match real products.
          </p>
        </div>

        {bulkParseErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 space-y-1">
            {bulkParseErrors.slice(0, 8).map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            {bulkParseErrors.length > 8 && (
              <div>…and {bulkParseErrors.length - 8} more</div>
            )}
          </div>
        )}

        {bulkPreview.length > 0 && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-2 w-10 text-gray-500">#</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit cost</th>
                  <th className="p-2">Store</th>
                  <th className="p-2">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreview.slice(0, 50).map((r) => (
                  <tr key={r.excelRow} className="border-t">
                    <td className="p-2 text-gray-500">{r.excelRow}</td>
                    <td className="p-2 font-mono text-xs">{r.sku || "—"}</td>
                    <td className="p-2">{r.productName || "—"}</td>
                    <td className="p-2">{r.quantity}</td>
                    <td className="p-2">
                      {r.unitCost != null ? `UGX ${Number(r.unitCost).toLocaleString()}` : "—"}
                    </td>
                    <td className="p-2">{r.storeName || "—"}</td>
                    <td className="p-2">{r.supplier || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkPreview.length > 50 && (
              <p className="p-2 text-xs text-gray-500 border-t">
                Showing first 50 of {bulkPreview.length} rows
              </p>
            )}
          </div>
        )}

        {bulkResults && bulkResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Upload results</h3>
            <div className="overflow-x-auto border rounded-lg max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left sticky top-0">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((r) => (
                    <tr key={r.row} className="border-t">
                      <td className="p-2">{r.row}</td>
                      <td className="p-2">
                        <span className={r.ok ? "text-green-700" : "text-red-600"}>
                          {r.ok ? "OK" : "Failed"}
                        </span>
                      </td>
                      <td className="p-2">{r.productName || r.sku || "—"}</td>
                      <td className="p-2 text-gray-600">
                        {r.ok ? `+${r.quantity}` : r.error || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent restocks</h2>
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            onReset={() => {
              const r = defaultStockDateRange();
              setFromDate(r.fromDate);
              setToDate(r.toDate);
            }}
            onPrint={handlePrint}
            onPdf={handlePdf}
          />
        </div>

        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
          ) : filteredRows.length === 0 ? (
            <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">
              No restocks in this date range
            </div>
          ) : (
            filteredRows.map((r, i) => {
              const allowed = canManageRecord(r.userId || r.user?.id);
              return (
                <div key={r.id} className="border rounded-xl bg-white p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium text-sm min-w-0 break-words">
                      {i + 1}. {r.inventory?.name || "—"}
                    </div>
                    <div className="text-sm font-semibold shrink-0">+{r.quantity}</div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>
                      Cost:{" "}
                      {restockApiOk
                        ? `UGX ${Number(r.unitCost || 0).toLocaleString()}`
                        : "—"}
                    </div>
                    <div>By: {creatorLabel(r)}</div>
                    <div>{formatDisplayDate(r.restockDate)}</div>
                  </div>
                  {restockApiOk && (
                    <ManageActions
                      allowed={allowed}
                      onEdit={() => (allowed ? openEdit(r) : denyManage())}
                      onDelete={() => (allowed ? requestDelete(r) : denyManage())}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3 w-12 text-gray-500">#</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Unit cost</th>
                <th className="p-3">By</th>
                <th className="p-3">Date</th>
                {restockApiOk && <th className="p-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3" colSpan={restockApiOk ? 7 : 6}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={restockApiOk ? 7 : 6}>
                    No restocks in this date range
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => {
                  const allowed = canManageRecord(r.userId || r.user?.id);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                      <td className="p-3 font-medium">{r.inventory?.name || "—"}</td>
                      <td className="p-3">+{r.quantity}</td>
                      <td className="p-3">
                        {restockApiOk
                          ? `UGX ${Number(r.unitCost || 0).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="p-3">{creatorLabel(r)}</td>
                      <td className="p-3">{formatDisplayDate(r.restockDate)}</td>
                      {restockApiOk && (
                        <td className="p-3">
                          <ManageActions
                            allowed={allowed}
                            onEdit={() => (allowed ? openEdit(r) : denyManage())}
                            onDelete={() => (allowed ? requestDelete(r) : denyManage())}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit restock</DialogTitle>
            <DialogDescription>{editing?.inventory?.name || "Update quantity and cost"}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-3">
              <input
                required
                type="number"
                min="1"
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                placeholder="Quantity"
              />
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                value={editForm.unitCost}
                onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })}
                placeholder="Unit cost"
              />
              <input
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                value={editForm.supplier}
                onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                placeholder="Supplier"
              />
              <textarea
                className="border rounded-lg px-3 py-2 bg-white"
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notes"
              />
              <DialogFooter>
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2.5 border rounded-lg min-h-10">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 min-h-10"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && !deleteLoading && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete restock</DialogTitle>
            <DialogDescription>
              This will reverse the stock quantity added. Only admin or the creator can do this.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
              <div className="font-medium break-words">{deleting.inventory?.name}</div>
              <div className="text-muted-foreground">Qty +{deleting.quantity}</div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setDeleting(null)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md min-h-10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={confirmDelete}
              className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md disabled:opacity-50 min-h-10"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
