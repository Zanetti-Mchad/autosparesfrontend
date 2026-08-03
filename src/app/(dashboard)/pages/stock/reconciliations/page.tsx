"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate, isDateInRange } from "@/lib/formatDate";
import SearchableSelect from "@/components/SearchableSelect";
import DateRangeFilter, { defaultStockDateRange } from "@/components/DateRangeFilter";
import { downloadTablePdf, printTableReport } from "@/lib/reportExport";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  quantity?: number;
  sku?: string | null;
};

type Store = {
  id: string;
  name: string;
};

type Reconciliation = {
  id: string;
  status?: string;
  notes?: string | null;
  createdAt?: string;
  reconciledAt?: string | null;
  store?: { id: string; name?: string } | null;
  items?: Array<{
    id?: string;
    systemQty: number;
    countedQty: number;
    variance: number;
    inventory?: { id: string; name?: string | null } | null;
  }>;
  user?: { firstName?: string | null; lastName?: string | null } | null;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function userLabel(u?: Reconciliation["user"]) {
  if (!u) return "—";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

function itemsSummary(r: Reconciliation) {
  if (!r.items?.length) return "—";
  return r.items
    .map((i) => {
      const name = i.inventory?.name || "Product";
      const diff = i.variance > 0 ? `+${i.variance}` : String(i.variance);
      return `${name}: counted ${i.countedQty} (was ${i.systemQty}, ${diff})`;
    })
    .join("; ");
}

export default function StockReconciliationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [rows, setRows] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [inventoryId, setInventoryId] = useState("");
  const [systemQty, setSystemQty] = useState("");
  const [countedQty, setCountedQty] = useState("");
  const [storeId, setStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, storeRes, recRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=500"),
        fetchApi("/catalog/stores"),
        fetchApi("/stock/reconciliations"),
      ]);

      setProducts(
        extractList(prodRes).map((p: any) => ({
          id: String(p.id),
          name: String(p.name || "Unnamed"),
          quantity: Number(p.quantity || 0),
          sku: p.sku || null,
        }))
      );

      setStores(
        extractList(storeRes)
          .filter((s: any) => s.isActive !== false)
          .map((s: any) => ({ id: String(s.id), name: String(s.name || "Store") }))
      );

      setRows(extractList(recRes));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reconciliations");
      setProducts([]);
      setStores([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((r) => isDateInRange(r.reconciledAt || r.createdAt, fromDate, toDate)),
    [rows, fromDate, toDate]
  );

  const periodLabel = `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;

  const exportColumns = [
    {
      key: "items",
      label: "Items",
      getValue: (r: Reconciliation) => itemsSummary(r),
    },
    {
      key: "store",
      label: "Store",
      getValue: (r: Reconciliation) => r.store?.name || "—",
    },
    {
      key: "by",
      label: "By",
      getValue: (r: Reconciliation) => userLabel(r.user),
    },
    {
      key: "date",
      label: "Date",
      getValue: (r: Reconciliation) => formatDisplayDate(r.reconciledAt || r.createdAt),
    },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Stock Reconciliations",
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
        title: "Stock Reconciliations",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
        fileName: `reconciliations_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const selected = products.find((p) => p.id === inventoryId);
  const systemNum = systemQty === "" ? null : parseInt(systemQty, 10);
  const countedNum = countedQty === "" ? null : parseInt(countedQty, 10);
  const variance =
    systemNum != null && countedNum != null && !Number.isNaN(systemNum) && !Number.isNaN(countedNum)
      ? countedNum - systemNum
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inventoryId) {
      toast.error("Select a product");
      return;
    }
    if (systemNum == null || Number.isNaN(systemNum) || systemNum < 0) {
      toast.error("System quantity is required");
      return;
    }
    if (countedNum == null || Number.isNaN(countedNum) || countedNum < 0) {
      toast.error("Enter counted quantity (0 or more)");
      return;
    }

    try {
      setSaving(true);
      await fetchApi("/stock/reconciliations", {
        method: "POST",
        body: JSON.stringify({
          storeId: storeId || null,
          notes: notes.trim() || null,
          apply: true,
          items: [
            {
              inventoryId,
              systemQty: systemNum,
              countedQty: countedNum,
            },
          ],
        }),
      });
      toast.success(
        `Reconciled ${selected?.name || "product"} to ${countedNum}` +
          (variance != null && variance !== 0 ? ` (${variance > 0 ? "+" : ""}${variance})` : "")
      );
      setCountedQty("");
      setNotes("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reconcile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Stock Reconciliations</h1>
        <p className="text-sm text-gray-500">Adjust stock to counted levels</p>
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
                description: `${p.sku ? `${p.sku} · ` : ""}System qty ${p.quantity ?? 0}`,
              }))}
              onChange={(id) => {
                setInventoryId(id);
                const p = products.find((x) => x.id === id);
                if (!p) {
                  setSystemQty("");
                  return;
                }
                const qty = p.quantity ?? 0;
                setSystemQty(String(qty));
                setCountedQty(String(qty));
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System qty</label>
            <input
              required
              type="number"
              min="0"
              step="1"
              readOnly
              className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 text-gray-700 min-h-10"
              value={systemQty}
              title="Filled from current inventory when you select a product"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Counted qty</label>
            <input
              required
              type="number"
              min="0"
              step="1"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
            />
            {variance != null && (
              <p
                className={`text-xs mt-1 ${
                  variance === 0 ? "text-gray-500" : variance > 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                Difference: {variance > 0 ? "+" : ""}
                {variance}
                {variance !== 0 ? " — stock will be set to counted qty" : " — no change"}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Store (optional)</label>
            <SearchableSelect
              value={storeId}
              placeholder="Search store (optional)…"
              emptyMessage="No stores match"
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
              onChange={setStoreId}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — reason for variance"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full sm:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 min-h-11 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Reconcile"}
        </button>
      </form>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent reconciliations</h2>
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
              No reconciliations in this date range
            </div>
          ) : (
            filteredRows.map((r, i) => (
              <div key={r.id} className="border rounded-xl bg-white p-3 space-y-2">
                <div className="font-medium text-sm min-w-0 break-words">
                  {i + 1}. Reconciliation
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div className="break-words">Items: {itemsSummary(r)}</div>
                  <div>Store: {r.store?.name || "—"}</div>
                  <div>By: {userLabel(r.user)}</div>
                  <div>{formatDisplayDate(r.reconciledAt || r.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3 w-12 text-gray-500">#</th>
                <th className="p-3">Items</th>
                <th className="p-3">Store</th>
                <th className="p-3">By</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={5}>
                    No reconciliations in this date range
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="p-3">{itemsSummary(r)}</td>
                    <td className="p-3">{r.store?.name || "—"}</td>
                    <td className="p-3">{userLabel(r.user)}</td>
                    <td className="p-3">{formatDisplayDate(r.reconciledAt || r.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
