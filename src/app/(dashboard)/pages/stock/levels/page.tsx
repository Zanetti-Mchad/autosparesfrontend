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
  if (Array.isArray(res?.data?.rows)) return res.data.rows;
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

function storeLabel(row: LevelRow) {
  if (row.isTotal) {
    if (typeof row.store === "string" && row.store.trim()) return row.store;
    return "All stores";
  }
  if (typeof row.store === "string" && row.store.trim()) return row.store;
  if (row.store && typeof row.store === "object" && (row.store as any).name) {
    return String((row.store as any).name);
  }
  return "—";
}

export default function StockLevelsPage() {
  const [rows, setRows] = useState<LevelRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Default to per-store so store names are obvious
  const [view, setView] = useState<ViewMode>("store");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
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
      setLoadError("");
      const params = new URLSearchParams();
      params.set("view", view);
      // Load full levels; multi-store filter applied client-side (reliable with current API)
      const res = await fetchApi(`/stock/levels?${params.toString()}`);
      let list = extractList(res) as LevelRow[];

      if (selectedStoreIds.length) {
        const wanted = new Set(selectedStoreIds);
        if (view === "total") {
          // Totals for selected stores: sum per product from per-store rows
          // Re-fetch isn't needed; rebuild from a store-view style pass
          const storeRes = await fetchApi(`/stock/levels?view=store`);
          const storeRows = (extractList(storeRes) as LevelRow[]).filter(
            (r) => r.storeId && wanted.has(String(r.storeId))
          );
          const byProduct = new Map<
            string,
            { name?: string; sku?: string | null; minStock?: number | null; qty: number }
          >();
          for (const r of storeRows) {
            const key = String(r.inventoryId || r.id);
            const cur = byProduct.get(key) || {
              name: r.name,
              sku: r.sku,
              minStock: r.minStock,
              qty: 0,
            };
            cur.qty += Number(r.quantity) || 0;
            byProduct.set(key, cur);
          }
          list = Array.from(byProduct.entries()).map(([inventoryId, v]) => ({
            id: `selected-total-${inventoryId}`,
            inventoryId,
            name: v.name,
            sku: v.sku,
            quantity: v.qty,
            minStock: v.minStock,
            store: "Selected stores",
            storeId: null,
            isTotal: true,
            status:
              v.qty <= 0
                ? "out"
                : v.minStock != null && v.qty <= v.minStock
                  ? "low"
                  : "ok",
          }));
        } else {
          list = list.filter(
            (r) => r.isTotal || (r.storeId && wanted.has(String(r.storeId)))
          );
          // When filtering stores in "both", drop global "All stores" totals (misleading)
          if (view === "both") {
            list = list.filter((r) => !r.isTotal);
          }
        }
      }

      setRows(list);

      const fromLevels = new Map<string, string>();
      for (const row of list) {
        if (row.isTotal || !row.storeId) continue;
        const name = storeLabel(row);
        if (name && name !== "—") fromLevels.set(String(row.storeId), name);
      }
      if (fromLevels.size > 0) {
        setStores((prev) => {
          const map = new Map(prev.map((s) => [s.id, s.name]));
          fromLevels.forEach((name, id) => map.set(id, name));
          return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load stock levels";
      setLoadError(msg);
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [view, selectedStoreIds]);

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
      const label = storeLabel(r).toLowerCase();
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        label.includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const storeCount = useMemo(() => {
    const ids = new Set(
      rows.filter((r) => !r.isTotal && r.storeId).map((r) => String(r.storeId))
    );
    return ids.size;
  }, [rows]);

  const perStoreCount = useMemo(
    () => rows.filter((r) => !r.isTotal).length,
    [rows]
  );

  const selectedStoreNames = stores
    .filter((s) => selectedStoreIds.includes(s.id))
    .map((s) => s.name);
  const filterLabel = [
    view === "store" ? "Per store" : view === "total" ? "All stores totals" : "Per store + totals",
    selectedStoreNames.length
      ? `Stores: ${selectedStoreNames.join(", ")}`
      : null,
    statusFilter ? `Status: ${statusFilter}` : null,
    search.trim() ? `Search: ${search.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const toggleStore = (id: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllStores = () => setSelectedStoreIds(stores.map((s) => s.id));
  const clearStores = () => setSelectedStoreIds([]);

  const exportColumns = [
    { key: "name", label: "Product", getValue: (r: LevelRow) => r.name || "—" },
    { key: "sku", label: "SKU", getValue: (r: LevelRow) => r.sku || "—" },
    {
      key: "quantity",
      label: "Qty",
      getValue: (r: LevelRow) => Number(r.quantity || 0).toLocaleString(),
    },
    { key: "store", label: "Store", getValue: (r: LevelRow) => storeLabel(r) },
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
            Quantities by store — pick a store filter or view per-store rows
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

      <div className="border rounded-xl p-4 bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">View</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ViewMode)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm"
            >
              <option value="store">Per store only</option>
              <option value="both">Per store + totals</option>
              <option value="total">Totals only</option>
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

        <div className={view === "total" ? "opacity-60 pointer-events-none" : ""}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-xs font-medium text-gray-600">
              Stores{" "}
              <span className="font-normal text-gray-400">
                (select multiple — none selected = all)
              </span>
            </label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllStores}
                className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearStores}
                className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          {!stores.length ? (
            <p className="text-xs text-amber-700">No stores loaded yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-slate-50/50">
              {stores.map((s) => {
                const checked = selectedStoreIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer bg-white ${
                      checked
                        ? "border-emerald-400 ring-1 ring-emerald-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={checked}
                      onChange={() => toggleStore(s.id)}
                    />
                    <span className="truncate">{s.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          {selectedStoreIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedStoreNames.map((name) => (
                <span
                  key={name}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
          Showing <strong>{filteredRows.length}</strong> row
          {filteredRows.length === 1 ? "" : "s"}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
          <strong>{storeCount}</strong> store{storeCount === 1 ? "" : "s"} in data
        </span>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
          <strong>{perStoreCount}</strong> per-store line
          {perStoreCount === 1 ? "" : "s"}
        </span>
        {filterLabel ? <span className="text-gray-500 self-center">{filterLabel}</span> : null}
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      {!loading && !loadError && perStoreCount === 0 && view !== "total" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3">
          No per-store stock found. Add stock with a store selected (Stock → Add Stock), or run the
          assign-stock script. Switch View to <strong>Per store only</strong> after stock is assigned.
        </div>
      )}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Qty</th>
              <th className="p-3 min-w-[140px]">Store</th>
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
                  No stock rows match these filters. Try View → Per store only, clear Store filter,
                  then Refresh.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => {
                const label = storeLabel(r);
                return (
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
                          {label}
                        </span>
                      ) : (
                        <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {label}
                        </span>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
