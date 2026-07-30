"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Supplier = { id: string; name: string };
type Purchase = {
  id: string;
  purchaseNumber: string;
  invoiceNumber?: string;
  status: string;
  paymentStatus: string;
  total: number;
  amountPaid: number;
  dueBalance: number;
  purchaseDate: string;
  supplier?: Supplier;
  items?: Array<{ itemName: string; quantity: number; totalCost: number }>;
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    supplierId: "",
    invoiceNumber: "",
    itemName: "",
    quantity: "",
    unitCost: "",
    amountPaid: "0",
  });

  const load = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetchApi("/purchases"),
        fetchApi("/suppliers"),
      ]);
      setPurchases(Array.isArray(pRes.data) ? pRes.data : []);
      setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load purchases");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId: form.supplierId,
          invoiceNumber: form.invoiceNumber,
          amountPaid: parseFloat(form.amountPaid) || 0,
          status: "Received",
          updateStock: false,
          items: [
            {
              itemName: form.itemName,
              quantity: parseFloat(form.quantity),
              unitCost: parseFloat(form.unitCost),
            },
          ],
        }),
      });
      toast.success("Purchase recorded");
      setForm({
        supplierId: form.supplierId,
        invoiceNumber: "",
        itemName: "",
        quantity: "",
        unitCost: "",
        amountPaid: "0",
      });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchases</h1>
        <p className="text-sm text-gray-500">Buy feed, packaging, equipment & utilities from suppliers</p>
      </div>

      <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 border rounded-xl p-4 bg-white">
        <select
          required
          className="border rounded-lg px-3 py-2"
          value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
        >
          <option value="">Select supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Invoice #"
          value={form.invoiceNumber}
          onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
        />
        <input
          required
          className="border rounded-lg px-3 py-2"
          placeholder="Item name"
          value={form.itemName}
          onChange={(e) => setForm({ ...form, itemName: e.target.value })}
        />
        <input
          required
          type="number"
          className="border rounded-lg px-3 py-2"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <input
          required
          type="number"
          className="border rounded-lg px-3 py-2"
          placeholder="Unit cost"
          value={form.unitCost}
          onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
        />
        <input
          type="number"
          className="border rounded-lg px-3 py-2"
          placeholder="Amount paid"
          value={form.amountPaid}
          onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
        />
        <button type="submit" className="md:col-span-3 bg-blue-600 text-white rounded-lg py-2">
          Record Purchase
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">No.</th>
              <th className="p-3">Purchase #</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Invoice</th>
              <th className="p-3">Total</th>
              <th className="p-3">Paid</th>
              <th className="p-3">Due</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p, index) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium text-gray-700">{index + 1}.</td>
                <td className="p-3 font-mono text-xs">{p.purchaseNumber}</td>
                <td className="p-3">{p.supplier?.name}</td>
                <td className="p-3">{p.invoiceNumber || "—"}</td>
                <td className="p-3">UGX {p.total.toLocaleString()}</td>
                <td className="p-3">UGX {p.amountPaid.toLocaleString()}</td>
                <td className="p-3 text-red-600">UGX {p.dueBalance.toLocaleString()}</td>
                <td className="p-3">
                  {p.status} / {p.paymentStatus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
