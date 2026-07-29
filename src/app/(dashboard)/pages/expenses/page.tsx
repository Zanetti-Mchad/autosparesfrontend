"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Expense = {
  id: string;
  category: string;
  description?: string;
  amount: number;
  expenseDate: string;
  paymentMethod?: string;
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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [form, setForm] = useState({
    category: "Fuel",
    description: "",
    amount: "",
    paymentMethod: "Cash",
  });

  const load = async () => {
    try {
      const res = await fetchApi("/expenses");
      setExpenses(res.data?.expenses || []);
      setTotal(res.data?.total || 0);
      if (res.data?.categories?.length) setCategories(res.data.categories);
    } catch (e: any) {
      toast.error(e.message || "Failed to load expenses");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      toast.success("Expense recorded");
      setForm({ ...form, description: "", amount: "" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-gray-500">Track operating costs for P&amp;L</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Listed total</div>
          <div className="text-xl font-bold text-red-600">UGX {total.toLocaleString()}</div>
        </div>
      </div>

      <form onSubmit={submit} className="grid md:grid-cols-4 gap-3 border rounded-xl p-4 bg-white">
        <select
          className="border rounded-lg px-3 py-2"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2 md:col-span-2"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          required
          type="number"
          className="border rounded-lg px-3 py-2"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={form.paymentMethod}
          onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
        >
          <option>Cash</option>
          <option>Mobile Money</option>
          <option>Bank</option>
          <option>Card</option>
        </select>
        <button type="submit" className="md:col-span-3 bg-blue-600 text-white rounded-lg py-2">
          Add Expense
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Method</th>
              <th className="p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{new Date(e.expenseDate).toLocaleDateString()}</td>
                <td className="p-3">{e.category}</td>
                <td className="p-3">{e.description || "—"}</td>
                <td className="p-3">{e.paymentMethod || "—"}</td>
                <td className="p-3 font-medium">UGX {e.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
