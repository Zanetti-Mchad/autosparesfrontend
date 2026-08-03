"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate, isDateInRange } from "@/lib/formatDate";
import { canManageRecord, MANAGE_DENIED_REMARK } from "@/lib/canManage";
import SearchableSelect from "@/components/SearchableSelect";
import ManageActions from "@/components/ManageActions";
import DateRangeFilter, { defaultStockDateRange } from "@/components/DateRangeFilter";
import { downloadTablePdf, formatMoney, printTableReport } from "@/lib/reportExport";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Supplier = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  quantity?: number;
  costPrice?: number | null;
  sku?: string | null;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  invoiceNumber?: string | null;
  status: string;
  paymentStatus: string;
  total: number;
  amountPaid: number;
  dueBalance: number;
  purchaseDate: string;
  notes?: string | null;
  userId?: string | null;
  supplier?: Supplier;
  items?: Array<{
    itemName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    inventoryId?: string | null;
  }>;
  user?: { id: string; firstName?: string | null; lastName?: string | null } | null;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function creatorLabel(p: Purchase) {
  if (!p.user) return "—";
  return [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || "—";
}

function itemsLabel(p: Purchase) {
  if (!p.items?.length) return "—";
  return p.items.map((i) => `${i.itemName} × ${i.quantity}`).join(", ");
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const [form, setForm] = useState({
    supplierId: "",
    inventoryId: "",
    invoiceNumber: "",
    quantity: "",
    unitCost: "",
    amountPaid: "0",
  });

  const [editing, setEditing] = useState<Purchase | null>(null);
  const [editForm, setEditForm] = useState({
    supplierId: "",
    inventoryId: "",
    invoiceNumber: "",
    quantity: "",
    unitCost: "",
    amountPaid: "0",
    notes: "",
  });
  const [deleting, setDeleting] = useState<Purchase | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, sRes, prodRes] = await Promise.all([
        fetchApi("/purchases"),
        fetchApi("/suppliers"),
        fetchApi("/inventory/inventory?limit=500"),
      ]);
      setPurchases(extractList(pRes));
      setSuppliers(
        extractList(sRes).map((s: any) => ({
          id: String(s.id),
          name: String(s.name || "Supplier"),
        }))
      );
      setProducts(
        extractList(prodRes).map((p: any) => ({
          id: String(p.id),
          name: String(p.name || "Unnamed"),
          quantity: Number(p.quantity || 0),
          costPrice: p.costPrice ?? null,
          sku: p.sku || null,
        }))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to load purchases");
      setPurchases([]);
      setSuppliers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPurchases = useMemo(
    () => purchases.filter((p) => isDateInRange(p.purchaseDate, fromDate, toDate)),
    [purchases, fromDate, toDate]
  );

  const periodLabel = `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;

  const exportColumns = [
    {
      key: "purchaseNumber",
      label: "Purchase #",
      getValue: (p: Purchase) => p.purchaseNumber || "—",
    },
    {
      key: "supplier",
      label: "Supplier",
      getValue: (p: Purchase) => p.supplier?.name || "—",
    },
    {
      key: "items",
      label: "Items",
      getValue: (p: Purchase) => itemsLabel(p),
    },
    {
      key: "total",
      label: "Total",
      getValue: (p: Purchase) => formatMoney(p.total),
    },
    {
      key: "amountPaid",
      label: "Paid",
      getValue: (p: Purchase) => formatMoney(p.amountPaid),
    },
    {
      key: "dueBalance",
      label: "Due",
      getValue: (p: Purchase) => formatMoney(p.dueBalance),
    },
    {
      key: "by",
      label: "By",
      getValue: (p: Purchase) => creatorLabel(p),
    },
    {
      key: "date",
      label: "Date",
      getValue: (p: Purchase) => formatDisplayDate(p.purchaseDate),
    },
    {
      key: "status",
      label: "Status",
      getValue: (p: Purchase) => `${p.status} / ${p.paymentStatus}`,
    },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Purchases",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredPurchases,
      });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = () => {
    try {
      downloadTablePdf({
        title: "Purchases",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredPurchases,
        fileName: `purchases_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const selectedProduct = products.find((p) => p.id === form.inventoryId);
  const editProduct = products.find((p) => p.id === editForm.inventoryId);

  const denyManage = () => toast.error(MANAGE_DENIED_REMARK);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    const unitCost = parseFloat(form.unitCost);
    if (!form.supplierId) {
      toast.error("Select a supplier");
      return;
    }
    if (!form.inventoryId || !selectedProduct) {
      toast.error("Select a product");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    if (Number.isNaN(unitCost) || unitCost < 0) {
      toast.error("Enter a valid unit cost");
      return;
    }

    try {
      setSaving(true);
      await fetchApi("/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId: form.supplierId,
          invoiceNumber: form.invoiceNumber || null,
          amountPaid: parseFloat(form.amountPaid) || 0,
          status: "Received",
          updateStock: true,
          items: [
            {
              inventoryId: form.inventoryId,
              itemName: selectedProduct.name,
              quantity: qty,
              unitCost,
            },
          ],
        }),
      });
      toast.success("Purchase recorded");
      setForm({
        supplierId: form.supplierId,
        inventoryId: "",
        invoiceNumber: "",
        quantity: "",
        unitCost: "",
        amountPaid: "0",
      });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: Purchase) => {
    if (!canManageRecord(p.userId || p.user?.id)) {
      denyManage();
      return;
    }
    const item = p.items?.[0];
    setEditing(p);
    setEditForm({
      supplierId: p.supplier?.id || "",
      inventoryId: item?.inventoryId || "",
      invoiceNumber: p.invoiceNumber || "",
      quantity: String(item?.quantity ?? ""),
      unitCost: String(item?.unitCost ?? ""),
      amountPaid: String(p.amountPaid ?? 0),
      notes: p.notes || "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const qty = parseFloat(editForm.quantity);
    const unitCost = parseFloat(editForm.unitCost);
    const productName =
      editProduct?.name || editing.items?.[0]?.itemName || "Item";

    try {
      setSaving(true);
      await fetchApi(`/purchases/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          supplierId: editForm.supplierId,
          invoiceNumber: editForm.invoiceNumber,
          inventoryId: editForm.inventoryId || null,
          itemName: productName,
          quantity: qty,
          unitCost,
          amountPaid: parseFloat(editForm.amountPaid) || 0,
          notes: editForm.notes,
        }),
      });
      toast.success("Purchase updated");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (p: Purchase) => {
    if (!canManageRecord(p.userId || p.user?.id)) {
      denyManage();
      return;
    }
    setDeleting(p);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteLoading(true);
      await fetchApi(`/purchases/${deleting.id}`, { method: "DELETE" });
      toast.success("Purchase deleted");
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }));
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    searchText: p.sku || "",
    description: `${p.sku ? `${p.sku} · ` : ""}Qty ${p.quantity ?? 0}${
      p.costPrice != null ? ` · Cost UGX ${Number(p.costPrice).toLocaleString()}` : ""
    }`,
  }));

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-5xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Purchases</h1>
        <p className="text-sm text-gray-500">
          Buy from suppliers. Edit/delete only for admin or the creator.
        </p>
      </div>

      <form onSubmit={submit} className="border rounded-xl p-3 sm:p-4 bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <SearchableSelect
              required
              value={form.supplierId}
              placeholder="Search supplier…"
              emptyMessage="No suppliers match"
              options={supplierOptions}
              onChange={(id) => setForm({ ...form, supplierId: id })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
            <input
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              placeholder="Optional"
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <SearchableSelect
              required
              value={form.inventoryId}
              placeholder="Search product by name or SKU…"
              emptyMessage="No products match"
              options={productOptions}
              onChange={(id) => {
                const p = products.find((x) => x.id === id);
                setForm({
                  ...form,
                  inventoryId: id,
                  unitCost: p?.costPrice != null ? String(p.costPrice) : form.unitCost,
                });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              required
              type="number"
              min="0.01"
              step="any"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit cost (UGX)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount paid (UGX)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || loading}
          className="w-full sm:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 min-h-11 disabled:opacity-50"
        >
          {saving && !editing ? "Saving…" : "Record Purchase"}
        </button>
      </form>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent purchases</h2>
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
          ) : filteredPurchases.length === 0 ? (
            <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">
              No purchases in this date range
            </div>
          ) : (
            filteredPurchases.map((p, index) => {
              const allowed = canManageRecord(p.userId || p.user?.id);
              return (
                <div key={p.id} className="border rounded-xl bg-white p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium text-sm min-w-0 break-words">
                      {index + 1}. {p.purchaseNumber}
                    </div>
                    <div className="text-sm font-semibold shrink-0">
                      UGX {Number(p.total || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>{p.supplier?.name || "—"}</div>
                    <div className="break-words">{itemsLabel(p)}</div>
                    <div>
                      Paid: UGX {Number(p.amountPaid || 0).toLocaleString()} · Due:{" "}
                      <span className="text-red-600">
                        UGX {Number(p.dueBalance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>By: {creatorLabel(p)}</div>
                    <div>
                      {formatDisplayDate(p.purchaseDate)} · {p.status} / {p.paymentStatus}
                    </div>
                  </div>
                  <ManageActions
                    allowed={allowed}
                    onEdit={() => openEdit(p)}
                    onDelete={() => requestDelete(p)}
                  />
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
                <th className="p-3">Purchase #</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Paid</th>
                <th className="p-3">Due</th>
                <th className="p-3">By</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3" colSpan={11}>
                    Loading...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={11}>
                    No purchases in this date range
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, index) => {
                  const allowed = canManageRecord(p.userId || p.user?.id);
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 text-gray-500 tabular-nums">{index + 1}</td>
                      <td className="p-3 font-mono text-xs">{p.purchaseNumber}</td>
                      <td className="p-3">{p.supplier?.name || "—"}</td>
                      <td className="p-3">{itemsLabel(p)}</td>
                      <td className="p-3">UGX {Number(p.total || 0).toLocaleString()}</td>
                      <td className="p-3">UGX {Number(p.amountPaid || 0).toLocaleString()}</td>
                      <td className="p-3 text-red-600">
                        UGX {Number(p.dueBalance || 0).toLocaleString()}
                      </td>
                      <td className="p-3">{creatorLabel(p)}</td>
                      <td className="p-3">{formatDisplayDate(p.purchaseDate)}</td>
                      <td className="p-3">
                        {p.status} / {p.paymentStatus}
                      </td>
                      <td className="p-3">
                        <ManageActions
                          allowed={allowed}
                          onEdit={() => openEdit(p)}
                          onDelete={() => requestDelete(p)}
                        />
                      </td>
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
            <DialogTitle>Edit purchase</DialogTitle>
            <DialogDescription>{editing?.purchaseNumber || "Update purchase details"}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <SearchableSelect
                  required
                  value={editForm.supplierId}
                  placeholder="Search supplier…"
                  options={supplierOptions}
                  onChange={(id) => setEditForm({ ...editForm, supplierId: id })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <SearchableSelect
                  value={editForm.inventoryId}
                  placeholder="Search product…"
                  options={productOptions}
                  onChange={(id) => {
                    const p = products.find((x) => x.id === id);
                    setEditForm({
                      ...editForm,
                      inventoryId: id,
                      unitCost:
                        editForm.unitCost === "" && p?.costPrice != null
                          ? String(p.costPrice)
                          : editForm.unitCost,
                    });
                  }}
                />
              </div>
              <input
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                placeholder="Invoice #"
                value={editForm.invoiceNumber}
                onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
              />
              <input
                required
                type="number"
                min="0.01"
                step="any"
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                placeholder="Quantity"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              />
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                placeholder="Unit cost"
                value={editForm.unitCost}
                onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className="border rounded-lg px-3 py-2.5 bg-white min-h-10"
                placeholder="Amount paid"
                value={editForm.amountPaid}
                onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 bg-white"
                rows={2}
                placeholder="Notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2.5 border rounded-lg min-h-10"
                >
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
            <DialogTitle>Delete purchase</DialogTitle>
            <DialogDescription>
              This cannot be undone. Supplier balance and linked stock (if any) will be reversed.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
              <div className="font-medium">{deleting.purchaseNumber}</div>
              <div className="text-muted-foreground">
                {deleting.supplier?.name} · {itemsLabel(deleting)} · UGX{" "}
                {Number(deleting.total || 0).toLocaleString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setDeleting(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
