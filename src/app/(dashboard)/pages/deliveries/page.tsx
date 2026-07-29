"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Delivery = {
  id: string;
  deliveryNumber: string;
  status: string;
  route?: string;
  driverName?: string;
  driverPhone?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  transportCost: number;
  customerSignature?: string;
  notes?: string;
  order?: { id: string; orderNumber: string; status: string; total: number };
};

type Order = {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  status: string;
  total: number;
};

const STATUSES = ["Pending", "Assigned", "OutForDelivery", "Delivered", "Failed", "Cancelled"];

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<string[]>([]);
  const [form, setForm] = useState({
    orderId: "",
    route: "Jinja Town Centre",
    driverName: "",
    driverPhone: "",
    transportCost: "20000",
    notes: "",
  });
  const [signId, setSignId] = useState<string | null>(null);
  const [signature, setSignature] = useState("");

  const load = async () => {
    try {
      const [dRes, oRes, rRes] = await Promise.all([
        fetchApi("/deliveries"),
        fetchApi("/orders?limit=50"),
        fetchApi("/deliveries/routes"),
      ]);
      setDeliveries(Array.isArray(dRes.data) ? dRes.data : []);
      const orderItems = oRes.data?.items || oRes.data?.orders || oRes.data || [];
      setOrders(
        (Array.isArray(orderItems) ? orderItems : []).filter(
          (o: Order) => !["Completed", "Cancelled", "Delivered"].includes(o.status)
        )
      );
      setRoutes(Array.isArray(rRes.data) ? rRes.data : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load deliveries");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/deliveries", {
        method: "POST",
        body: JSON.stringify({
          orderId: form.orderId || undefined,
          route: form.route,
          driverName: form.driverName,
          driverPhone: form.driverPhone,
          transportCost: parseFloat(form.transportCost) || 0,
          notes: form.notes,
          status: form.driverName ? "Assigned" : "Pending",
        }),
      });
      toast.success("Delivery note created");
      setForm({ ...form, orderId: "", driverName: "", driverPhone: "", notes: "" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await fetchApi(`/deliveries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Marked ${status}`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const saveSignature = async () => {
    if (!signId || !signature.trim()) return;
    try {
      await fetchApi(`/deliveries/${signId}`, {
        method: "PATCH",
        body: JSON.stringify({
          customerSignature: signature.trim(),
          status: "Delivered",
        }),
      });
      toast.success("Signed & delivered");
      setSignId(null);
      setSignature("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="text-sm text-gray-500">Routes, drivers, delivery notes & customer signatures</p>
      </div>

      <form onSubmit={create} className="grid md:grid-cols-3 gap-3 border rounded-xl p-4 bg-white">
        <select
          className="border rounded-lg px-3 py-2"
          value={form.orderId}
          onChange={(e) => setForm({ ...form, orderId: e.target.value })}
        >
          <option value="">Link order (optional)</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} — {o.customerName} ({o.status})
            </option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-2"
          value={form.route}
          onChange={(e) => setForm({ ...form, route: e.target.value })}
        >
          {routes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Driver name"
          value={form.driverName}
          onChange={(e) => setForm({ ...form, driverName: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Driver phone"
          value={form.driverPhone}
          onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Transport cost"
          value={form.transportCost}
          onChange={(e) => setForm({ ...form, transportCost: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button type="submit" className="md:col-span-3 bg-blue-600 text-white rounded-lg py-2">
          Create delivery note
        </button>
      </form>

      <div className="space-y-3">
        {deliveries.map((d) => (
          <div key={d.id} className="border rounded-xl p-4 bg-white flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div>
              <div className="font-semibold">
                {d.deliveryNumber}{" "}
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-gray-100">{d.status}</span>
              </div>
              <div className="text-sm text-gray-600">
                {d.customerName || "—"} · {d.route || "No route"} · Driver {d.driverName || "unassigned"}
              </div>
              <div className="text-xs text-gray-500">
                {d.deliveryAddress || "—"} · Cost UGX {(d.transportCost || 0).toLocaleString()}
                {d.order ? ` · Order ${d.order.orderNumber}` : ""}
              </div>
              {d.customerSignature && (
                <div className="text-xs text-emerald-700 mt-1">Signed: {d.customerSignature}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== d.status).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(d.id, s)}
                  className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => {
                  setSignId(d.id);
                  setSignature("");
                }}
                className="text-xs bg-emerald-600 text-white rounded px-2 py-1"
              >
                Sign / Deliver
              </button>
            </div>
          </div>
        ))}
      </div>

      {signId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
            <h3 className="font-semibold">Customer signature</h3>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Type customer full name as signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-2 border rounded-lg" onClick={() => setSignId(null)}>
                Cancel
              </button>
              <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg" onClick={saveSignature}>
                Confirm delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
