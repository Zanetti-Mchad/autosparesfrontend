"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate } from "@/lib/formatDate";
import SearchableSelect from "@/components/SearchableSelect";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  sku?: string | null;
};

type PriceChangeRow = {
  id: string;
  inventoryId: string;
  oldPrice: number;
  newPrice: number;
  reason?: string | null;
  effectiveAt?: string;
  createdAt?: string;
  inventory?: { id: string; name?: string | null; price?: number } | null;
  user?: { firstName?: string | null; lastName?: string | null } | null;
};

function formatMoney(n: number) {
  return `UGX ${Number(n || 0).toLocaleString()}`;
}

function extractProducts(res: any): Product[] {
  const list = Array.isArray(res?.data?.items)
    ? res.data.items
    : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
          ? res
          : [];
  return list.map((p: any) => ({
    id: String(p.id),
    name: String(p.name || "Unnamed"),
    price: Number(p.price || 0),
    sku: p.sku || null,
  }));
}

export default function PriceChangesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<PriceChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");

  const selected = useMemo(
    () => products.find((p) => p.id === inventoryId) || null,
    [products, inventoryId]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, histRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=500"),
        fetchApi("/catalog/price-changes"),
      ]);
      setProducts(extractProducts(prodRes));
      const hist = Array.isArray(histRes?.data)
        ? histRes.data
        : Array.isArray(histRes)
          ? histRes
          : [];
      setRows(hist);
    } catch (e: any) {
      toast.error(e.message || "Failed to load price changes");
      setProducts([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryId) {
      toast.error("Select a product");
      return;
    }
    const parsed = parseFloat(newPrice);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid new price");
      return;
    }
    try {
      setSaving(true);
      await fetchApi("/catalog/price-changes", {
        method: "POST",
        body: JSON.stringify({
          inventoryId,
          newPrice: parsed,
          reason: reason.trim() || null,
        }),
      });
      toast.success("Price updated");
      setNewPrice("");
      setReason("");
      // Keep product selected so user can see updated current price after reload
      await load();
      setProducts((prev) =>
        prev.map((p) => (p.id === inventoryId ? { ...p, price: parsed } : p))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to record price change");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Price Changes</h1>
        <p className="text-sm text-gray-500">
          Pick a product, set a new selling price — old price is saved automatically and the product price is updated
        </p>
      </div>

      <form onSubmit={submit} className="border rounded-xl p-4 bg-white space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
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
                description: `${p.sku ? `${p.sku} · ` : ""}${formatMoney(p.price)}`,
              }))}
              onChange={(id) => {
                setInventoryId(id);
                setNewPrice("");
              }}
            />
          </div>

          {selected && (
            <div className="md:col-span-2 text-sm bg-gray-50 border rounded-lg px-3 py-2">
              Current price: <span className="font-semibold">{formatMoney(selected.price)}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New price (UGX)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder={selected ? String(selected.price) : "0"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full md:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record Price Change"}
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Product</th>
              <th className="p-3">Old</th>
              <th className="p-3">New</th>
              <th className="p-3">Reason</th>
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
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No price changes yet
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3 font-medium">{r.inventory?.name || r.inventoryId}</td>
                  <td className="p-3">{formatMoney(r.oldPrice)}</td>
                  <td className="p-3 font-medium">{formatMoney(r.newPrice)}</td>
                  <td className="p-3">{r.reason || "—"}</td>
                  <td className="p-3">
                    {r.user
                      ? [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—"
                      : "—"}
                  </td>
                  <td className="p-3">
                    {formatDisplayDate(r.effectiveAt || r.createdAt)}
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
