"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { downloadTablePdf, printTableReport } from "@/lib/reportExport";
import toast from "react-hot-toast";
import { Download, Printer, RefreshCw, Search } from "lucide-react";

type StoreOption = { id: string; name: string };

type LevelRow = {
  id: string;
  inventoryId?: string;
  name?: string;
  sku?: string | null;
  quantity?: number;
  minStock?: number | null;
  store?: string | null;
  storeId?: string | null;
  isTotal?: boolean;
  status?: string;
};

type ViewMode = "both" | "store" | "total";

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "out") return "bg-red-100 text-red-700 border-red-200";
  if (s === "low") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "ok") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export default function StockLevelsPage() {
  const [rows, setRows] = useState<LevelRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("both");
  const [storeId, setStoreId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadStores = useCallback(async () => {
    try {
      const res = await fetchApi("/catalog/stores");
      const list = extractList(res);
      setStores(
        list.map((s: any) => ({
          id: String(s.id),
          name: s.name || "Unnamed store",
        }))
      );
    } catch {
      setStores([]);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("view", view);
      if (storeId) params.set("storeId", storeId);
      const res = await fetchApi(`/stock/levels?${params.toString()}`);
      setRows(extractList(res));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load stock levels");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [view, storeId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && (r.status || "").toLowerCase() !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.store || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const selectedStoreName = stores.find((s) => s.id === storeId)?.name;
  const filterLabel = [
    view === "store" ? "Per store" : view === "total" ? "All stores totals" : "Per store + totals",
    selectedStoreName ? `Store: ${selectedStoreName}` : null,
    statusFilter ? `Status: ${statusFilter}` : null,
    search.trim() ? `Search: ${search.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const exportColumns = [
    { key: "name", label: "Product", getValue: (r: LevelRow) => r.name || "—" },
    { key: "sku", label: "SKU", getValue: (r: LevelRow) => r.sku || "—" },
    {
      key: "quantity",
      label: "Qty",
      getValue: (r: LevelRow) => Number(r.quantity || 0).toLocaleString(),
    },
    { key: "store", label: "Store", getValue: (r: LevelRow) => r.store || "—" },
    {
      key: "minStock",
      label: "Min",
      getValue: (r: LevelRow) =>
        r.minStock == null ? "—" : Number(r.minStock).toLocaleString(),
    },
    { key: "status", label: "Status", getValue: (r: LevelRow) => r.status || "—" },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Stock Levels",
        subtitle: filterLabel,
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
        title: "Stock Levels",
        subtitle: filterLabel,
        columns: exportColumns,
        rows: filteredRows,
        fileName: "stock-levels.pdf",
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Stock Levels</h1>
          <p className="text-sm text-gray-500">
            Per-store quantities and All-stores totals
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">View</label>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
          >
            <option value="both">Per store + All stores</option>
            <option value="store">Per store only</option>
            <option value="total">All stores totals only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
            disabled={view === "total"}
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="ok">OK</option>
            <option value="low">Low</option>
            <option value="out">Out</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product, SKU, store…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm"
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Showing {filteredRows.length} row{filteredRows.length === 1 ? "" : "s"}
        {filterLabel ? ` · ${filterLabel}` : ""}
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Store</th>
              <th className="p-3">Min</th>
              <th className="p-3">Status</th>
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
                  No stock rows match these filters. Add stock to a store first, or clear filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => (
                <tr
                  key={r.id || i}
                  className={`border-t ${r.isTotal ? "bg-slate-50/80" : ""}`}
                >
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3 font-medium">{r.name || "—"}</td>
                  <td className="p-3">{r.sku || "—"}</td>
                  <td className="p-3 tabular-nums font-semibold">
                    {Number(r.quantity || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {r.isTotal ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        All stores
                      </span>
                    ) : (
                      r.store || "—"
                    )}
                  </td>
                  <td className="p-3 tabular-nums">
                    {r.minStock == null ? "—" : Number(r.minStock).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${statusBadge(
                        r.status
                      )}`}
                    >
                      {r.status || "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
