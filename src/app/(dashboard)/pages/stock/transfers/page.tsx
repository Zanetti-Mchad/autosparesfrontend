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

type Transfer = {
  id: string;
  transferNumber?: string;
  status?: string;
  notes?: string | null;
  createdAt?: string;
  transferredAt?: string | null;
  fromStore?: { id: string; name?: string } | null;
  toStore?: { id: string; name?: string } | null;
  items?: Array<{
    id?: string;
    quantity: number;
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

function userLabel(u?: Transfer["user"]) {
  if (!u) return "—";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

function itemsLabel(t: Transfer) {
  if (!t.items?.length) return "—";
  return t.items
    .map((i) => `${i.inventory?.name || "Product"} × ${i.quantity}`)
    .join(", ");
}

export default function StockTransfersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [rows, setRows] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, storeRes, transferRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=500"),
        fetchApi("/catalog/stores"),
        fetchApi("/stock/transfers"),
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

      setRows(extractList(transferRes));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load transfers");
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
    () => rows.filter((t) => isDateInRange(t.transferredAt || t.createdAt, fromDate, toDate)),
    [rows, fromDate, toDate]
  );

  const periodLabel = `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;

  const exportColumns = [
    {
      key: "transfer",
      label: "Transfer",
      getValue: (t: Transfer) => t.transferNumber || "—",
    },
    {
      key: "items",
      label: "Items",
      getValue: (t: Transfer) => itemsLabel(t),
    },
    {
      key: "from",
      label: "From",
      getValue: (t: Transfer) => t.fromStore?.name || "—",
    },
    {
      key: "to",
      label: "To",
      getValue: (t: Transfer) => t.toStore?.name || "—",
    },
    {
      key: "by",
      label: "By",
      getValue: (t: Transfer) => userLabel(t.user),
    },
    {
      key: "date",
      label: "Date",
      getValue: (t: Transfer) => formatDisplayDate(t.transferredAt || t.createdAt),
    },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Stock Transfers",
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
        title: "Stock Transfers",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
        fileName: `transfers_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const selected = products.find((p) => p.id === inventoryId);
  const fromStore = stores.find((s) => s.id === fromStoreId);
  const toStore = stores.find((s) => s.id === toStoreId);

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
    if (!fromStoreId || !toStoreId) {
      toast.error("Select from and to stores");
      return;
    }
    if (fromStoreId === toStoreId) {
      toast.error("From and to stores must be different");
      return;
    }

    try {
      setSaving(true);
      await fetchApi("/stock/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromStoreId,
          toStoreId,
          notes: notes.trim() || null,
          complete: true,
          items: [{ inventoryId, quantity: qty }],
        }),
      });
      toast.success(
        `Transferred ${qty} × ${selected?.name || "product"} from ${fromStore?.name} to ${toStore?.name}`
      );
      setQuantity("");
      setNotes("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transfer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Stock Transfers</h1>
        <p className="text-sm text-gray-500">Move stock between stores</p>
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
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From store</label>
            <SearchableSelect
              required
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={fromStoreId}
              placeholder="Search from store…"
              emptyMessage="No stores match"
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(id) => {
                setFromStoreId(id);
                if (toStoreId === id) setToStoreId("");
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To store</label>
            <SearchableSelect
              required
              value={toStoreId}
              placeholder="Search to store…"
              emptyMessage="No stores match"
              options={stores
                .filter((s) => s.id !== fromStoreId)
                .map((s) => ({ value: s.id, label: s.name }))}
              onChange={setToStoreId}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading || stores.length < 2}
          className="w-full sm:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 min-h-11 disabled:opacity-50"
        >
          {saving ? "Transferring…" : "Transfer Stock"}
        </button>
        {stores.length < 2 && !loading && (
          <p className="text-sm text-amber-700">Add at least two stores under Catalog → Stores first.</p>
        )}
      </form>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent transfers</h2>
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
              No transfers in this date range
            </div>
          ) : (
            filteredRows.map((t, i) => (
              <div key={t.id} className="border rounded-xl bg-white p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="font-medium text-sm min-w-0 break-words">
                    {i + 1}. {t.transferNumber || "—"}
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div className="break-words">Items: {itemsLabel(t)}</div>
                  <div>From: {t.fromStore?.name || "—"} → To: {t.toStore?.name || "—"}</div>
                  <div>By: {userLabel(t.user)}</div>
                  <div>{formatDisplayDate(t.transferredAt || t.createdAt)}</div>
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
                <th className="p-3">Transfer</th>
                <th className="p-3">Items</th>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
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
                    No transfers in this date range
                  </td>
                </tr>
              ) : (
                filteredRows.map((t, i) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-medium">{t.transferNumber || "—"}</td>
                    <td className="p-3">{itemsLabel(t)}</td>
                    <td className="p-3">{t.fromStore?.name || "—"}</td>
                    <td className="p-3">{t.toStore?.name || "—"}</td>
                    <td className="p-3">{userLabel(t.user)}</td>
                    <td className="p-3">{formatDisplayDate(t.transferredAt || t.createdAt)}</td>
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
