"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate } from "@/lib/formatDate";
import {
  downloadTableExcel,
  downloadTablePdf,
  formatMoney,
  printTableReport,
} from "@/lib/reportExport";
import toast from "react-hot-toast";
import { Download, FileSpreadsheet, Filter, Printer, RefreshCw } from "lucide-react";

type ExpenseRow = {
  id: string;
  category: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  paymentMethod?: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const EXPORT_COLUMNS = [
  { key: "expenseDate", label: "Date", getValue: (r: ExpenseRow) => formatDisplayDate(r.expenseDate) },
  { key: "category", label: "Category" },
  { key: "description", label: "Description", getValue: (r: ExpenseRow) => r.description || "—" },
  { key: "paymentMethod", label: "Method", getValue: (r: ExpenseRow) => r.paymentMethod || "—" },
  { key: "amount", label: "Amount", getValue: (r: ExpenseRow) => formatMoney(r.amount) },
];

export default function MonthlyExpensesReportPage() {
  const [fromDate, setFromDate] = useState(monthStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const periodLabel = useMemo(
    () => `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`,
    [fromDate, toDate]
  );

  const categoryRows = useMemo(
    () =>
      Object.entries(byCategory)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    [byCategory]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetchApi(`/reports/monthly-expenses?${params.toString()}`);
      const data = res?.data ?? res;
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
      setByCategory(data?.byCategory && typeof data.byCategory === "object" ? data.byCategory : {});
      setTotal(Number(data?.total || 0));
    } catch (e: any) {
      toast.error(e.message || "Failed to load monthly expenses");
      setExpenses([]);
      setByCategory({});
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const summaryLines = [
    `Total: ${formatMoney(total)}`,
    `Period: ${periodLabel}`,
    `Entries: ${expenses.length}`,
    ...categoryRows.slice(0, 8).map((r) => `${r.category}: ${formatMoney(r.amount)}`),
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Monthly Expenses Report",
        subtitle: periodLabel,
        columns: EXPORT_COLUMNS,
        rows: expenses,
        summaryLines,
      });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = () => {
    try {
      downloadTablePdf({
        title: "Monthly Expenses Report",
        subtitle: periodLabel,
        columns: EXPORT_COLUMNS,
        rows: expenses,
        summaryLines,
        fileName: `monthly-expenses_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const handleExcel = () => {
    try {
      downloadTableExcel({
        title: "Monthly Expenses",
        columns: EXPORT_COLUMNS,
        rows: expenses,
        summaryLines,
        sheetName: "Expenses",
        fileName: `monthly-expenses_${fromDate}_${toDate}.xlsx`,
      });
      toast.success("Excel downloaded");
    } catch (e: any) {
      toast.error(e.message || "Excel failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Monthly Expenses Report</h1>
          <p className="text-sm text-gray-500">Expenses by period and category</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button type="button" onClick={handlePdf} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button type="button" onClick={handleExcel} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-white flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border rounded-lg px-3 py-2 bg-white text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border rounded-lg px-3 py-2 bg-white text-sm" />
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">
          <Filter className="w-4 h-4" /> Apply filter
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold mt-1 text-red-600">{formatMoney(total)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500">Entries</div>
          <div className="text-lg font-semibold mt-1">{expenses.length}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white sm:col-span-2">
          <div className="text-xs text-gray-500">Period</div>
          <div className="text-lg font-semibold mt-1">{periodLabel}</div>
        </div>
      </div>

      {categoryRows.length > 0 && (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3 w-12 text-gray-500">#</th>
                <th className="p-3">Category</th>
                <th className="p-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((row, i) => (
                <tr key={row.category} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3">{row.category}</td>
                  <td className="p-3 font-medium">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Date</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Method</th>
              <th className="p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td className="p-3 text-gray-500" colSpan={6}>No expenses for this period</td></tr>
            ) : (
              expenses.map((e, i) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3">{formatDisplayDate(e.expenseDate)}</td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">{e.description || "—"}</td>
                  <td className="p-3">{e.paymentMethod || "—"}</td>
                  <td className="p-3 font-medium">{formatMoney(e.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
