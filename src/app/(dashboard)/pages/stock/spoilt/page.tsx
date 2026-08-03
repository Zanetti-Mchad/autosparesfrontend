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

type SpoiltRow = {
  id: string;
  quantity: number;
  reason?: string | null;
  spoiltAt?: string;
  createdAt?: string;
  inventory?: { id: string; name?: string | null; sku?: string | null } | null;
  store?: { id: string; name?: string } | null;
  user?: { firstName?: string | null; lastName?: string | null } | null;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function userLabel(u?: SpoiltRow["user"]) {
  if (!u) return "—";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

export default function SpoiltStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [rows, setRows] = useState<SpoiltRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [storeId, setStoreId] = useState("");
  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, storeRes, spoiltRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=500"),
        fetchApi("/catalog/stores"),
        fetchApi("/stock/spoilt"),
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

      setRows(extractList(spoiltRes));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load spoilt stock");
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
    () => rows.filter((r) => isDateInRange(r.spoiltAt || r.createdAt, fromDate, toDate)),
    [rows, fromDate, toDate]
  );

  const periodLabel = `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;

  const exportColumns = [
    {
      key: "product",
      label: "Product",
      getValue: (r: SpoiltRow) => r.inventory?.name || "—",
    },
    {
      key: "quantity",
      label: "Qty",
      getValue: (r: SpoiltRow) => `-${r.quantity}`,
    },
    {
      key: "reason",
      label: "Reason",
      getValue: (r: SpoiltRow) => r.reason || "—",
    },
    {
      key: "store",
      label: "Store",
      getValue: (r: SpoiltRow) => r.store?.name || "—",
    },
    {
      key: "by",
      label: "By",
      getValue: (r: SpoiltRow) => userLabel(r.user),
    },
    {
      key: "date",
      label: "Date",
      getValue: (r: SpoiltRow) => formatDisplayDate(r.spoiltAt || r.createdAt),
    },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Spoilt Stock",
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
        title: "Spoilt Stock",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
        fileName: `spoilt_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const selected = products.find((p) => p.id === inventoryId);

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
    if (!reason.trim()) {
      toast.error("Enter a reason");
      return;
    }
    if (selected && qty > (selected.quantity ?? 0)) {
      toast.error(`Only ${selected.quantity ?? 0} in stock`);
      return;
    }

    try {
      setSaving(true);
      await fetchApi("/stock/spoilt", {
        method: "POST",
        body: JSON.stringify({
          inventoryId,
          quantity: qty,
          reason: reason.trim(),
          storeId: storeId || null,
        }),
      });
      toast.success(`Recorded ${qty} × ${selected?.name || "product"} as spoilt`);
      setQuantity("");
      setReason("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record spoilt stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Spoilt Stock</h1>
        <p className="text-sm text-gray-500">Record damaged or expired stock</p>
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
              onChange={setInventoryId}
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
              max={selected?.quantity ?? undefined}
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged, expired, etc."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full sm:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 min-h-11 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record Spoilt"}
        </button>
      </form>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent spoilt stock</h2>
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
              No spoilt stock in this date range
            </div>
          ) : (
            filteredRows.map((r, i) => (
              <div key={r.id} className="border rounded-xl bg-white p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="font-medium text-sm min-w-0 break-words">
                    {i + 1}. {r.inventory?.name || "—"}
                  </div>
                  <div className="text-sm font-semibold text-red-700 shrink-0">−{r.quantity}</div>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div className="break-words">Reason: {r.reason || "—"}</div>
                  <div>Store: {r.store?.name || "—"}</div>
                  <div>By: {userLabel(r.user)}</div>
                  <div>{formatDisplayDate(r.spoiltAt || r.createdAt)}</div>
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
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Store</th>
                <th className="p-3">By</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={7}>
                    No spoilt stock in this date range
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-medium">{r.inventory?.name || "—"}</td>
                    <td className="p-3 text-red-700">−{r.quantity}</td>
                    <td className="p-3">{r.reason || "—"}</td>
                    <td className="p-3">{r.store?.name || "—"}</td>
                    <td className="p-3">{userLabel(r.user)}</td>
                    <td className="p-3">{formatDisplayDate(r.spoiltAt || r.createdAt)}</td>
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
