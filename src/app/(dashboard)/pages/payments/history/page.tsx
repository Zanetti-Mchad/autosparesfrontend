"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate } from "@/lib/formatDate";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";
import { Download, Filter, Printer, RefreshCw } from "lucide-react";

type TxnRow = {
  id: string;
  kind?: string;
  type?: string;
  amount?: number;
  method?: string | null;
  date?: string;
  notes?: string | null;
  reference?: string | null;
  createdAt?: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatMoney(n: number) {
  return `UGX ${Number(n || 0).toLocaleString()}`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function TransactionHistoryPage() {
  const [fromDate, setFromDate] = useState(monthStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [rows, setRows] = useState<TxnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const qs = params.toString();
      const res = await fetchApi(`/cash/history${qs ? `?${qs}` : ""}`);
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      setRows(list);
    } catch (e: any) {
      toast.error(e.message || "Failed to load transaction history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const cashIn = rows
      .filter((r) => String(r.type).toUpperCase() === "IN")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const cashOut = rows
      .filter((r) => String(r.type).toUpperCase() === "OUT")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    return { cashIn, cashOut, net: cashIn - cashOut, count: rows.length };
  }, [rows]);

  const periodLabel = useMemo(() => {
    const from = fromDate ? formatDisplayDate(fromDate) : "All";
    const to = toDate ? formatDisplayDate(toDate) : "All";
    return `${from} – ${to}`;
  }, [fromDate, toDate]);

  const buildTableRowsHtml = () =>
    rows
      .map(
        (r, i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(r.kind || "—")}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(r.type || "—")}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(Number(r.amount || 0)))}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(r.method || "—")}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(r.notes || r.reference || "—")}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(formatDisplayDate(r.date || r.createdAt))}</td>
      </tr>`
      )
      .join("");

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
      return;
    }
    w.document.write(`
      <html>
        <head>
          <title>Transaction History</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .meta { color: #666; margin-bottom: 16px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; background: #f8f8f8; }
            .summary { margin: 12px 0 20px; display: flex; gap: 24px; font-size: 13px; }
            @media print { button { display: none !important; } }
          </style>
        </head>
        <body>
          <h1>Transaction History</h1>
          <div class="meta">Period: ${escapeHtml(periodLabel)} · Generated ${escapeHtml(formatDisplayDate(new Date().toISOString()))}</div>
          <div class="summary">
            <div>In: <strong>${escapeHtml(formatMoney(totals.cashIn))}</strong></div>
            <div>Out: <strong>${escapeHtml(formatMoney(totals.cashOut))}</strong></div>
            <div>Net: <strong>${escapeHtml(formatMoney(totals.net))}</strong></div>
            <div>Rows: <strong>${totals.count}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Kind</th><th>Type</th><th>Amount</th><th>Method</th><th>Reference / Notes</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? buildTableRowsHtml()
                  : `<tr><td colspan="7" style="padding:12px;color:#666">No transactions in this period</td></tr>`
              }
            </tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 12;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = margin;

      doc.setFontSize(16);
      doc.text("Transaction History", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Period: ${periodLabel}`, margin, y);
      y += 5;
      doc.text(
        `In ${formatMoney(totals.cashIn)}  |  Out ${formatMoney(totals.cashOut)}  |  Net ${formatMoney(totals.net)}  |  ${totals.count} rows`,
        margin,
        y
      );
      doc.setTextColor(0);
      y += 8;

      const cols = [
        { key: "#", w: 10 },
        { key: "Kind", w: 28 },
        { key: "Type", w: 22 },
        { key: "Amount", w: 35 },
        { key: "Method", w: 32 },
        { key: "Notes", w: 70 },
        { key: "Date", w: 40 },
      ];

      const drawHeader = () => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        let x = margin;
        cols.forEach((c) => {
          doc.text(c.key, x, y);
          x += c.w;
        });
        y += 2;
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
      };

      drawHeader();

      if (rows.length === 0) {
        doc.setFontSize(10);
        doc.text("No transactions in this period", margin, y);
      } else {
        rows.forEach((r, i) => {
          if (y > pageHeight - 14) {
            doc.addPage();
            y = margin;
            drawHeader();
          }
          const values = [
            String(i + 1),
            String(r.kind || "—"),
            String(r.type || "—"),
            formatMoney(Number(r.amount || 0)),
            String(r.method || "—"),
            String(r.notes || r.reference || "—").slice(0, 48),
            formatDisplayDate(r.date || r.createdAt),
          ];
          let x = margin;
          doc.setFontSize(8);
          values.forEach((val, idx) => {
            const text = doc.splitTextToSize(val, cols[idx].w - 2);
            doc.text(text[0] || "", x, y);
            x += cols[idx].w;
          });
          y += 6;
        });
      }

      const name = `transaction-history_${fromDate || "all"}_${toDate || "all"}.pdf`;
      doc.save(name);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate PDF");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-sm text-gray-500">Cash, sale payments, and transfers</p>
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
            onClick={handleDownloadPdf}
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

      <div className="border rounded-xl p-4 bg-white flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm"
        >
          <Filter className="w-4 h-4" />
          Apply filter
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500">Cash In</div>
          <div className="text-lg font-semibold mt-1">{formatMoney(totals.cashIn)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500">Cash Out</div>
          <div className="text-lg font-semibold mt-1">{formatMoney(totals.cashOut)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500">Net</div>
          <div className="text-lg font-semibold mt-1">{formatMoney(totals.net)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500">Transactions</div>
          <div className="text-lg font-semibold mt-1">{totals.count}</div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Type</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Reference / Notes</th>
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
                  No transactions for this date range
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id || i} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3">{r.kind || "—"}</td>
                  <td className="p-3">{r.type || "—"}</td>
                  <td className="p-3 font-medium">{formatMoney(Number(r.amount || 0))}</td>
                  <td className="p-3">{r.method || "—"}</td>
                  <td className="p-3">{r.notes || r.reference || "—"}</td>
                  <td className="p-3">{formatDisplayDate(r.date || r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
