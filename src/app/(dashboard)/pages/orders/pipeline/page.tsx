"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Order = {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  source?: string;
  total: number;
  notes?: string;
  createdAt: string;
  items?: Array<{ productName: string; quantity: number }>;
};

const PIPELINE = ["Pending", "Preparing", "Packed", "Out for delivery", "Delivered", "Cancelled"];
const SOURCES = ["whatsapp", "phone", "walk-in", "website", "order"];

const money = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function OrderPipelinePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [intake, setIntake] = useState({
    customerName: "",
    customerPhone: "",
    source: "whatsapp",
    notes: "",
    inventoryId: "",
    quantity: "1",
  });
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);

  const load = async () => {
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (filter) qs.set("status", filter);
      if (sourceFilter) qs.set("source", sourceFilter);
      const [oRes, invRes] = await Promise.all([
        fetchApi(`/orders?${qs.toString()}`),
        fetchApi("/inventory/inventory?limit=100"),
      ]);
      setOrders(oRes.data?.items || oRes.data?.orders || []);
      setPipeline(oRes.data?.pipeline || {});
      const items = invRes.data?.items || [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load orders");
    }
  };

  useEffect(() => {
    load();
  }, [filter, sourceFilter]);

  const counts = useMemo(() => {
    return PIPELINE.map((s) => ({ status: s, count: pipeline[s] || 0 }));
  }, [pipeline]);

  const advance = async (id: string, status: string) => {
    try {
      await fetchApi(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Moved to ${status}`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const createIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intake.inventoryId) return toast.error("Select a product");
    try {
      await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify({
          source: intake.source,
          status: "Pending",
          customer: {
            name: intake.customerName || "Customer",
            phone: intake.customerPhone,
          },
          notes: intake.notes,
          items: [
            {
              inventoryId: intake.inventoryId,
              quantity: parseInt(intake.quantity) || 1,
            },
          ],
          payments: [],
        }),
      });
      toast.success("Order received into pipeline");
      setIntake({
        customerName: "",
        customerPhone: "",
        source: intake.source,
        notes: "",
        inventoryId: "",
        quantity: "1",
      });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order Pipeline</h1>
        <p className="text-sm text-gray-500">
          WhatsApp / Phone / Walk-in / Website → Pending → Preparing → Packed → Out → Delivered
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {counts.map((c) => (
          <button
            key={c.status}
            onClick={() => setFilter(filter === c.status ? "" : c.status)}
            className={`border rounded-xl p-3 text-left ${
              filter === c.status ? "border-blue-500 bg-blue-50" : "bg-white"
            }`}
          >
            <div className="text-xs text-gray-500">{c.status}</div>
            <div className="text-xl font-bold">{c.count}</div>
          </button>
        ))}
      </div>

      <form onSubmit={createIntake} className="grid md:grid-cols-3 gap-3 border rounded-xl p-4 bg-white">
        <h2 className="md:col-span-3 font-semibold text-sm">Receive new order</h2>
        <select
          className="border rounded-lg px-3 py-2"
          value={intake.source}
          onChange={(e) => setIntake({ ...intake, source: e.target.value })}
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Customer name"
          value={intake.customerName}
          onChange={(e) => setIntake({ ...intake, customerName: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Phone"
          value={intake.customerPhone}
          onChange={(e) => setIntake({ ...intake, customerPhone: e.target.value })}
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={intake.inventoryId}
          onChange={(e) => setIntake({ ...intake, inventoryId: e.target.value })}
          required
        >
          <option value="">Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {money(p.price)}
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2"
          type="number"
          min={1}
          value={intake.quantity}
          onChange={(e) => setIntake({ ...intake, quantity: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Notes"
          value={intake.notes}
          onChange={(e) => setIntake({ ...intake, notes: e.target.value })}
        />
        <button type="submit" className="md:col-span-3 bg-blue-600 text-white rounded-lg py-2">
          Add to pipeline
        </button>
      </form>

      <div className="flex gap-2">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {filter && (
          <button className="text-sm text-blue-600" onClick={() => setFilter("")}>
            Clear status filter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="border rounded-xl p-4 bg-white">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">
                  {o.orderNumber}{" "}
                  <span className="text-xs font-normal bg-gray-100 px-2 py-0.5 rounded">{o.status}</span>{" "}
                  <span className="text-xs font-normal bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {o.source || "order"}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {o.customerName || "—"} · {o.customerPhone || "—"} · {money(o.total)}
                </div>
                <div className="text-xs text-gray-500">
                  {(o.items || []).map((i) => `${i.productName}×${i.quantity}`).join(", ")}
                  {o.notes ? ` · ${o.notes}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {PIPELINE.filter((s) => s !== o.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => advance(o.id, s)}
                    className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                  >
                    → {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
