"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate } from "@/lib/formatDate";
import SearchableSelect from "@/components/SearchableSelect";
import DateRangeFilter, { defaultStockDateRange } from "@/components/DateRangeFilter";
import { isDateInRange } from "@/lib/formatDate";
import { downloadInvoicePdf, printInvoiceDocument } from "@/lib/invoiceDocument";
import { fetchBusinessSettings, type BusinessSettings } from "@/lib/businessSettings";
import { formatMoney } from "@/lib/reportExport";
import toast from "react-hot-toast";
import { Download, Eye, FilePlus2, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QuoteOption = {
  id: string;
  quoteNumber: string;
  customerName?: string | null;
  total?: number;
  status?: string;
  invoiceId?: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCompany?: string | null;
  customerAddress?: string | null;
  status?: string;
  includeVat?: boolean;
  vatRate?: number;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  notes?: string | null;
  issuedAt?: string;
  dueDate?: string | null;
  quoteId?: string | null;
  quote?: { id: string; quoteNumber?: string; status?: string } | null;
  order?: { id: string; orderNumber?: string } | null;
  items?: Array<{
    id?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    description?: string | null;
  }>;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.quotes)) return res.data.quotes;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.quotes)) return res.quotes;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quoteId, setQuoteId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [viewing, setViewing] = useState<InvoiceRow | null>(null);
  const [business, setBusiness] = useState<BusinessSettings>({});

  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, quoteRes, biz] = await Promise.all([
        fetchApi("/sales/invoices"),
        fetchApi("/quotes?limit=200"),
        fetchBusinessSettings(),
      ]);
      setBusiness(biz);

      const invList = extractList(invRes) as InvoiceRow[];
      setInvoices(invList);

      const quoteIdsWithInvoice = new Set(
        invList.filter((i) => i.quoteId).map((i) => String(i.quoteId))
      );

      const qList = extractList(quoteRes).map((q: any) => ({
        id: String(q.id),
        quoteNumber: String(q.quoteNumber || ""),
        customerName: q.customerName || q.customer?.name || null,
        total: Number(q.total || 0),
        status: q.status,
        invoiceId: quoteIdsWithInvoice.has(String(q.id)) ? "yes" : null,
      })) as QuoteOption[];

      setQuotes(qList);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load invoices");
      setInvoices([]);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => invoices.filter((i) => isDateInRange(i.issuedAt || i.dueDate, fromDate, toDate)),
    [invoices, fromDate, toDate]
  );

  const availableQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          !q.invoiceId &&
          ["Draft", "Sent", "Accepted"].includes(String(q.status || "Draft"))
      ),
    [quotes]
  );

  const selectedQuote = availableQuotes.find((q) => q.id === quoteId);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteId) {
      toast.error("Select a quotation");
      return;
    }
    try {
      setSaving(true);
      const res = await fetchApi("/sales/invoices/from-quote", {
        method: "POST",
        body: JSON.stringify({
          quoteId,
          dueDate: dueDate || null,
          notes: notes.trim() || null,
        }),
      });
      const created = res?.data || res;
      toast.success(
        created?.invoiceNumber
          ? `Invoice ${created.invoiceNumber} created`
          : "Invoice created from quote"
      );
      setQuoteId("");
      setDueDate("");
      setNotes("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (inv: InvoiceRow) => {
    try {
      printInvoiceDocument(inv, business);
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = (inv: InvoiceRow) => {
    try {
      downloadInvoicePdf(inv, business);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const handlePrintList = () => {
    try {
      if (filtered.length === 0) {
        toast.error("No invoices in this date range");
        return;
      }
      filtered.forEach((inv, i) => {
        setTimeout(() => printInvoiceDocument(inv, business), i * 400);
      });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-gray-500">
          Generate sales invoices from quotations, then print or download PDF
        </p>
      </div>

      <form onSubmit={generate} className="border rounded-xl p-3 sm:p-4 bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quotation</label>
            <SearchableSelect
              required
              value={quoteId}
              placeholder="Search quote number or customer…"
              emptyMessage="No open quotations"
              options={availableQuotes.map((q) => ({
                value: q.id,
                label: q.quoteNumber,
                searchText: `${q.customerName || ""} ${q.quoteNumber}`,
                description: `${q.customerName || "Customer"} · ${formatMoney(Number(q.total || 0))} · ${q.status}`,
              }))}
              onChange={setQuoteId}
            />
            {selectedQuote && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedQuote.customerName || "—"} · {formatMoney(Number(selectedQuote.total || 0))}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date (optional)</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2.5 bg-white min-h-10"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
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
          disabled={saving || loading || availableQuotes.length === 0}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 min-h-11 disabled:opacity-50"
        >
          <FilePlus2 className="w-4 h-4" />
          {saving ? "Creating…" : "Generate Invoice from Quote"}
        </button>
        {availableQuotes.length === 0 && !loading && (
          <p className="text-sm text-amber-700">
            No quotations available. Create a quote first, or all quotes already have invoices.
          </p>
        )}
      </form>

      <div className="space-y-3 min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Sales invoices</h2>
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
            onPrint={handlePrintList}
            onPdf={() => {
              if (!filtered.length) {
                toast.error("No invoices in this date range");
                return;
              }
              filtered.forEach((inv) => downloadInvoicePdf(inv, business));
              toast.success("PDF(s) downloaded");
            }}
          />
        </div>

        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">
              No invoices in this date range
            </div>
          ) : (
            filtered.map((inv, i) => (
              <div key={inv.id} className="border rounded-xl bg-white p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">#{i + 1}</div>
                    <div className="font-semibold break-words">{inv.invoiceNumber}</div>
                    <div className="text-sm break-words">{inv.customerName || "—"}</div>
                    {inv.quote?.quoteNumber && (
                      <div className="text-xs text-indigo-600">Quote {inv.quote.quoteNumber}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">{formatMoney(Number(inv.total || 0))}</div>
                    <div className="text-xs text-gray-500">{inv.status}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{formatDisplayDate(inv.issuedAt)}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(inv)}
                    className="inline-flex items-center gap-1 min-h-10 px-3 rounded-lg border text-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(inv)}
                    className="inline-flex items-center gap-1 min-h-10 px-3 rounded-lg border text-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePdf(inv)}
                    className="inline-flex items-center gap-1 min-h-10 px-3 rounded-lg border text-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
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
                <th className="p-3">Invoice #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Quote</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-3" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={8}>
                    No invoices in this date range
                  </td>
                </tr>
              ) : (
                filtered.map((inv, i) => (
                  <tr key={inv.id} className="border-t">
                    <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName || "—"}</td>
                    <td className="p-3">{inv.quote?.quoteNumber || "—"}</td>
                    <td className="p-3">{formatMoney(Number(inv.total || 0))}</td>
                    <td className="p-3">{inv.status}</td>
                    <td className="p-3">{formatDisplayDate(inv.issuedAt)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(inv)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(inv)}
                          className="inline-flex items-center gap-1 text-gray-700 hover:underline"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePdf(inv)}
                          className="inline-flex items-center gap-1 text-gray-700 hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {viewing?.quote?.quoteNumber
                ? `From quote ${viewing.quote.quoteNumber}`
                : viewing?.order?.orderNumber
                  ? `From order ${viewing.order.orderNumber}`
                  : "Sales invoice"}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">{viewing.customerName || "—"}</div>
                <div className="text-muted-foreground">{viewing.customerEmail}</div>
                <div className="text-muted-foreground">{viewing.customerPhone}</div>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.items || []).map((item, idx) => (
                      <tr key={item.id || idx} className="border-t">
                        <td className="p-2">{item.productName}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">{formatMoney(Number(item.unitPrice || 0))}</td>
                        <td className="p-2">{formatMoney(Number(item.totalPrice || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right space-y-1">
                <div>Subtotal: {formatMoney(Number(viewing.subtotal || 0))}</div>
                {viewing.includeVat && (
                  <div>VAT: {formatMoney(Number(viewing.vatAmount || 0))}</div>
                )}
                <div className="font-semibold text-base">
                  Total: {formatMoney(Number(viewing.total || 0))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => viewing && handlePrint(viewing)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg min-h-10"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              type="button"
              onClick={() => viewing && handlePdf(viewing)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg min-h-10"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
