"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  productsSupplied?: string;
  amountOwed?: number;
  _count?: { purchases: number };
};

const empty = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  productsSupplied: "",
  notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/suppliers");
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/suppliers", { method: "POST", body: JSON.stringify(form) });
      toast.success("Supplier added");
      setForm(empty);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Suppliers</h1>
        <p className="text-sm text-gray-500">Feed, packaging, medicines & equipment vendors</p>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border rounded-xl p-3 sm:p-4 bg-white">
        {Object.entries({
          name: "Supplier name *",
          contactPerson: "Contact person",
          phone: "Phone",
          email: "Email",
          address: "Address",
          productsSupplied: "Products supplied",
        }).map(([key, label]) => (
          <input
            key={key}
            required={key === "name"}
            className="w-full border rounded-lg px-3 py-2 min-h-10"
            placeholder={label}
            value={(form as any)[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ))}
        <button type="submit" className="sm:col-span-2 md:col-span-3 bg-blue-600 text-white rounded-lg py-2.5 min-h-10">
          Add Supplier
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl bg-white hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Supplies</th>
              <th className="p-3">Owed</th>
              <th className="p-3">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No suppliers yet
                </td>
              </tr>
            ) : (
              suppliers.map((s, index) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{index + 1}</td>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.contactPerson || "—"}</td>
                  <td className="p-3">{s.phone || "—"}</td>
                  <td className="p-3">{s.productsSupplied || "—"}</td>
                  <td className="p-3 text-red-600">
                    UGX {(s.amountOwed || 0).toLocaleString()}
                  </td>
                  <td className="p-3">{s._count?.purchases ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">No suppliers yet</div>
        ) : (
          suppliers.map((s, index) => (
            <div key={s.id} className="border rounded-xl bg-white p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 font-semibold">{index + 1}.</div>
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-sm text-gray-600 truncate">
                    {s.contactPerson || "—"} · {s.phone || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0 text-sm text-red-600 font-medium">
                  UGX {(s.amountOwed || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Supplies: {s.productsSupplied || "—"} · Purchases: {s._count?.purchases ?? 0}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
