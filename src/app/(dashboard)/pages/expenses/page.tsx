"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate } from "@/lib/formatDate";
import { getRole } from "@/lib/data";
import {
  downloadTableExcel,
  downloadTablePdf,
  formatMoney,
  printTableReport,
} from "@/lib/reportExport";
import toast from "react-hot-toast";
import { Download, FileSpreadsheet, Filter, Pencil, Printer, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Expense = {
  id: string;
  category: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  userId?: string | null;
  user?: { id: string; firstName?: string | null; lastName?: string | null } | null;
};

const DEFAULT_CATEGORIES = [
  "Fuel",
  "Electricity",
  "Water",
  "Salaries",
  "Packaging",
  "Transport",
  "Marketing",
  "Rent",
  "Repairs",
  "Internet",
  "Miscellaneous",
];

const emptyForm = {
  category: "Fuel",
  description: "",
  amount: "",
  paymentMethod: "Cash",
  expenseDate: "",
  reference: "",
  notes: "",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function toDateInput(value?: string | null) {
  if (!value) return todayISO();
  return String(value).slice(0, 10);
}

function currentUserId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("userId") || "";
}

function isAdminRole() {
  return String(getRole() || "").toLowerCase() === "admin";
}

function canManageExpense(expense: Expense) {
  if (isAdminRole()) return true;
  const uid = currentUserId();
  return Boolean(uid && expense.userId && expense.userId === uid);
}

function creatorLabel(e: Expense) {
  if (!e.user) return "—";
  return [e.user.firstName, e.user.lastName].filter(Boolean).join(" ") || "—";
}

const EXPORT_COLUMNS = [
  { key: "expenseDate", label: "Date", getValue: (r: Expense) => formatDisplayDate(r.expenseDate) },
  { key: "category", label: "Category" },
  { key: "description", label: "Description", getValue: (r: Expense) => r.description || "—" },
  { key: "paymentMethod", label: "Method", getValue: (r: Expense) => r.paymentMethod || "—" },
  { key: "amount", label: "Amount", getValue: (r: Expense) => formatMoney(r.amount) },
  { key: "user", label: "Created by", getValue: (r: Expense) => creatorLabel(r) },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm, expenseDate: todayISO() });
  const [fromDate, setFromDate] = useState(monthStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const periodLabel = useMemo(() => {
    return `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;
  }, [fromDate, toDate]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetchApi(`/expenses?${params.toString()}`);
      setExpenses(res.data?.expenses || []);
      setTotal(res.data?.total || 0);
      if (res.data?.categories?.length) setCategories(res.data.categories);
    } catch (e: any) {
      toast.error(e.message || "Failed to load expenses");
      setExpenses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await fetchApi("/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          expenseDate: form.expenseDate || undefined,
        }),
      });
      toast.success("Expense recorded");
      setForm({ ...emptyForm, category: form.category, paymentMethod: form.paymentMethod, expenseDate: todayISO() });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (expense: Expense) => {
    if (!canManageExpense(expense)) {
      toast.error("Only an admin or the creator can edit this expense");
      return;
    }
    setEditing(expense);
    setEditForm({
      category: expense.category,
      description: expense.description || "",
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod || "Cash",
      expenseDate: toDateInput(expense.expenseDate),
      reference: expense.reference || "",
      notes: expense.notes || "",
    });
  };

  const requestDelete = (expense: Expense) => {
    if (!canManageExpense(expense)) {
      toast.error("Only an admin or the creator can delete this expense");
      return;
    }
    setDeleting(expense);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteLoading(true);
      await fetchApi(`/expenses/${deleting.id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      if (editing?.id === deleting.id) setEditing(null);
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      await fetchApi(`/expenses/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...editForm,
          amount: parseFloat(editForm.amount),
          expenseDate: editForm.expenseDate || undefined,
        }),
      });
      toast.success("Expense updated");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const summaryLines = [`Total: ${formatMoney(total)}`, `Period: ${periodLabel}`, `Rows: ${expenses.length}`];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Expenses",
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
        title: "Expenses",
        subtitle: periodLabel,
        columns: EXPORT_COLUMNS,
        rows: expenses,
        summaryLines,
        fileName: `expenses_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  const handleExcel = () => {
    try {
      downloadTableExcel({
        title: "Expenses",
        columns: EXPORT_COLUMNS,
        rows: expenses,
        summaryLines,
        fileName: `expenses_${fromDate}_${toDate}.xlsx`,
      });
      toast.success("Excel downloaded");
    } catch (e: any) {
      toast.error(e.message || "Excel failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-gray-500">Track operating costs for P&amp;L</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right mr-2">
            <div className="text-xs text-gray-500">Filtered total</div>
            <div className="text-xl font-bold text-red-600">{formatMoney(total)}</div>
          </div>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button type="button" onClick={handlePdf} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button type="button" onClick={handleExcel} className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50">
            <FileSpreadsheet className="w-4 h-4" /> Excel
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded-lg px-3 py-2 bg-white text-sm min-w-[160px]">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">
          <Filter className="w-4 h-4" /> Apply filter
        </button>
      </div>

      <form onSubmit={submit} className="grid md:grid-cols-4 gap-3 border rounded-xl p-4 bg-white">
        <select className="border rounded-lg px-3 py-2 bg-white" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input className="border rounded-lg px-3 py-2 md:col-span-2 bg-white" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input required type="number" min="0" step="0.01" className="border rounded-lg px-3 py-2 bg-white" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input type="date" className="border rounded-lg px-3 py-2 bg-white" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
        <select className="border rounded-lg px-3 py-2 bg-white" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
          <option>Cash</option>
          <option>Mobile Money</option>
          <option>Bank</option>
          <option>Card</option>
        </select>
        <input className="border rounded-lg px-3 py-2 bg-white" placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <button type="submit" disabled={saving} className="md:col-span-4 bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50">
          {saving && !editing ? "Saving…" : "Add Expense"}
        </button>
      </form>

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
              <th className="p-3">Created by</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={8}>Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td className="p-3 text-gray-500" colSpan={8}>No expenses for this filter</td></tr>
            ) : (
              expenses.map((e, index) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{index + 1}</td>
                  <td className="p-3">{formatDisplayDate(e.expenseDate)}</td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">{e.description || "—"}</td>
                  <td className="p-3">{e.paymentMethod || "—"}</td>
                  <td className="p-3 font-medium">{formatMoney(e.amount)}</td>
                  <td className="p-3">{creatorLabel(e)}</td>
                  <td className="p-3">
                    {canManageExpense(e) ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(e)}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">Edit expense</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-4 grid gap-3">
              <select className="border rounded-lg px-3 py-2 bg-white" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="border rounded-lg px-3 py-2 bg-white" placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <input required type="number" min="0" step="0.01" className="border rounded-lg px-3 py-2 bg-white" placeholder="Amount" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
              <input type="date" className="border rounded-lg px-3 py-2 bg-white" value={editForm.expenseDate} onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })} />
              <select className="border rounded-lg px-3 py-2 bg-white" value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
                <option>Cash</option>
                <option>Mobile Money</option>
                <option>Bank</option>
                <option>Card</option>
              </select>
              <input className="border rounded-lg px-3 py-2 bg-white" placeholder="Reference" value={editForm.reference} onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })} />
              <textarea className="border rounded-lg px-3 py-2 bg-white" rows={2} placeholder="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={!!deleting} onOpenChange={(open) => !open && !deleteLoading && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{deleting.category}</div>
              <div className="text-muted-foreground">
                {[deleting.description, formatMoney(deleting.amount)].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setDeleting(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
