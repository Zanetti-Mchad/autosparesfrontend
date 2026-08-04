"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate } from "@/lib/formatDate";
import { formatMoney } from "@/lib/reportExport";
import SearchableSelect from "@/components/SearchableSelect";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerCompany?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  total?: number;
  customer?: { id?: string; name?: string | null; companyName?: string | null } | null;
  items?: Array<{
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    inventoryId?: string | null;
  }>;
};

type ReturnRow = {
  id: string;
  returnNumber?: string;
  reason?: string | null;
  total?: number;
  returnedAt?: string;
  createdAt?: string;
  orderId?: string | null;
  invoiceId?: string | null;
  order?: { id?: string; orderNumber?: string | null } | null;
  invoice?: {
    id?: string;
    invoiceNumber?: string | null;
    customerName?: string | null;
    customerCompany?: string | null;
  } | null;
  customer?: { name?: string | null; companyName?: string | null } | null;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const invoiceById = useMemo(
    () => Object.fromEntries(invoices.map((inv) => [inv.id, inv])),
    [invoices]
  );

  const invoiceByOrderId = useMemo(() => {
    const map: Record<string, InvoiceOption> = {};
    for (const inv of invoices) {
      if (inv.orderId) map[inv.orderId] = inv;
    }
    return map;
  }, [invoices]);

  const returnedInvoiceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of returns) {
      if (row.invoiceId) ids.add(row.invoiceId);
      if (row.invoice?.id) ids.add(row.invoice.id);
      // Older returns may only have orderId — treat matching invoice as already returned
      if (row.orderId) {
        const inv = invoiceByOrderId[row.orderId];
        if (inv?.id) ids.add(inv.id);
      }
    }
    return ids;
  }, [returns, invoiceByOrderId]);

  const invoiceOptions = useMemo(
    () =>
      invoices
        .filter((inv) => !returnedInvoiceIds.has(inv.id))
        .map((inv) => {
          const customerLabel =
            inv.customerCompany ||
            inv.customerName ||
            inv.customer?.companyName ||
            inv.customer?.name ||
            "";
          return {
            value: inv.id,
            label: `${inv.invoiceNumber}${customerLabel ? ` — ${customerLabel}` : ""}`,
            description: `UGX ${Number(inv.total || 0).toLocaleString()}`,
            searchText: `${inv.invoiceNumber} ${customerLabel} ${inv.orderId || ""}`,
          };
        }),
    [invoices, returnedInvoiceIds]
  );

  const selectedInvoice = invoiceId ? invoiceById[invoiceId] : undefined;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [returnsRes, invoicesRes] = await Promise.all([
        fetchApi("/sales/returns"),
        fetchApi("/sales/invoices"),
      ]);
      setReturns(extractList(returnsRes));
      setInvoices(extractList(invoicesRes));
    } catch (e: any) {
      toast.error(e.message || "Failed to load sales returns");
      setReturns([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedInvoice) {
      setAmount("");
      return;
    }
    setAmount(String(selectedInvoice.total ?? ""));
  }, [selectedInvoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      toast.error("Select an invoice");
      return;
    }

    const items = (selectedInvoice.items || [])
      .filter((item) => Number(item.quantity || 0) > 0)
      .map((item) => ({
        inventoryId: item.inventoryId || null,
        productName: item.productName || "Item",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }));

    if (items.length === 0) {
      toast.error("Selected invoice has no line items to return");
      return;
    }

    try {
      setSaving(true);
      await fetchApi("/sales/returns", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          orderId: selectedInvoice.orderId || null,
          customerId: selectedInvoice.customerId || selectedInvoice.customer?.id || null,
          reason: reason.trim() || null,
          restock: true,
          items,
        }),
      });
      toast.success(`Return recorded for ${selectedInvoice.invoiceNumber}`);
      setInvoiceId("");
      setAmount("");
      setReason("");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to record return");
    } finally {
      setSaving(false);
    }
  };

  const displayInvoiceNumber = (row: ReturnRow) => {
    if (row.invoice?.invoiceNumber) return row.invoice.invoiceNumber;
    if (row.invoiceId && invoiceById[row.invoiceId]?.invoiceNumber) {
      return invoiceById[row.invoiceId].invoiceNumber;
    }
    if (row.orderId && invoiceByOrderId[row.orderId]?.invoiceNumber) {
      return invoiceByOrderId[row.orderId].invoiceNumber;
    }
    if (row.order?.orderNumber) return row.order.orderNumber;
    return "—";
  };

  const displayCustomer = (row: ReturnRow) => {
    return (
      row.customer?.companyName ||
      row.customer?.name ||
      row.invoice?.customerCompany ||
      row.invoice?.customerName ||
      (row.invoiceId &&
        (invoiceById[row.invoiceId]?.customerCompany ||
          invoiceById[row.invoiceId]?.customerName)) ||
      (row.orderId &&
        (invoiceByOrderId[row.orderId]?.customerCompany ||
          invoiceByOrderId[row.orderId]?.customerName)) ||
      "—"
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Sales Returns</h1>
          <p className="text-sm text-gray-500">Record returned sales</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 min-h-10 w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border border-gray-300 rounded-xl p-3 sm:p-4 bg-white"
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice #</label>
          <SearchableSelect
            value={invoiceId}
            onChange={setInvoiceId}
            options={invoiceOptions}
            placeholder="Select invoice"
            emptyMessage="No invoices found"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-sm min-h-10"
            placeholder="Amount"
          />
        </div>
        <div className="sm:col-span-2 md:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm min-h-10"
            placeholder="Reason for return"
          />
        </div>
        {selectedInvoice && (
          <div className="sm:col-span-2 md:col-span-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-words">
            Returning <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
            {selectedInvoice.customerCompany || selectedInvoice.customerName
              ? ` for ${selectedInvoice.customerCompany || selectedInvoice.customerName}`
              : ""}
            {" · "}
            {(selectedInvoice.items || []).length} item(s)
            {" · "}
            {formatMoney(Number(selectedInvoice.total || 0))}
          </div>
        )}
        <button
          type="submit"
          disabled={saving || !invoiceId}
          className="sm:col-span-2 md:col-span-3 bg-blue-600 text-white rounded-lg py-2.5 min-h-10 disabled:opacity-60"
        >
          {saving ? "Recording..." : "Record Return"}
        </button>
      </form>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
        ) : returns.length === 0 ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">No returns recorded yet</div>
        ) : (
          returns.map((row, i) => (
            <div key={row.id || i} className="border rounded-xl bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 font-semibold">{i + 1}.</div>
                  <div className="font-medium">{row.returnNumber || "—"}</div>
                  <div className="text-sm text-gray-600">{displayInvoiceNumber(row)}</div>
                </div>
                <div className="text-right shrink-0 font-semibold">
                  {formatMoney(Number(row.total || 0))}
                </div>
              </div>
              <div className="text-sm text-gray-600 break-words">{displayCustomer(row)}</div>
              <div className="text-xs text-gray-500">
                {row.reason || "No reason"} · {formatDisplayDate(row.returnedAt || row.createdAt || "")}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto border border-gray-300 rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Return #</th>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Reason</th>
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
            ) : returns.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No returns recorded yet
                </td>
              </tr>
            ) : (
              returns.map((row, i) => (
                <tr key={row.id || i} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3 font-medium">{row.returnNumber || "—"}</td>
                  <td className="p-3">{displayInvoiceNumber(row)}</td>
                  <td className="p-3">{displayCustomer(row)}</td>
                  <td className="p-3">{formatMoney(Number(row.total || 0))}</td>
                  <td className="p-3">{row.reason || "—"}</td>
                  <td className="p-3">
                    {formatDisplayDate(row.returnedAt || row.createdAt || "")}
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
