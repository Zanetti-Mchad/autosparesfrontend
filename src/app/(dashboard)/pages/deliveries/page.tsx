"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { isDateInRange } from "@/lib/formatDate";
import DateRangeFilter, { defaultStockDateRange } from "@/components/DateRangeFilter";
import {
  downloadDeliveryNotePdfWithBusiness,
  printDeliveryNoteWithBusiness,
  type DeliveryNoteDoc,
} from "@/lib/deliveryNoteDocument";
import toast from "react-hot-toast";
import { Search } from "lucide-react";

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
  deliveredAt?: string;
  createdAt?: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    notes?: string;
    items?: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      size?: string;
    }>;
  };
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

function toNoteDoc(d: Delivery): DeliveryNoteDoc {
  return {
    deliveryNumber: d.deliveryNumber,
    status: d.status,
    route: d.route,
    driverName: d.driverName,
    driverPhone: d.driverPhone,
    customerName: d.customerName,
    customerPhone: d.customerPhone,
    deliveryAddress: d.deliveryAddress,
    transportCost: d.transportCost,
    customerSignature: d.customerSignature,
    notes: d.notes,
    deliveredAt: d.deliveredAt,
    createdAt: d.createdAt,
    order: d.order
      ? {
          orderNumber: d.order.orderNumber,
          total: d.order.total,
          notes: d.order.notes,
          items: d.order.items,
        }
      : null,
  };
}

export default function DeliveriesPage() {
  const initialRange = defaultStockDateRange();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (!isDateInRange(d.deliveredAt || d.createdAt, fromDate, toDate)) return false;
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = [
          d.deliveryNumber,
          d.customerName,
          d.customerPhone,
          d.driverName,
          d.route,
          d.order?.orderNumber,
          d.deliveryAddress,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deliveries, fromDate, toDate, statusFilter, searchTerm]);

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

  const handlePrint = async (d: Delivery) => {
    try {
      await printDeliveryNoteWithBusiness(toNoteDoc(d));
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = async (d: Delivery) => {
    try {
      await downloadDeliveryNotePdfWithBusiness(toNoteDoc(d));
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Deliveries</h1>
        <p className="text-sm text-gray-500">
          Routes, drivers, delivery notes &amp; customer signatures. Orders marked Packed / Out for
          delivery / Delivered in the pipeline also appear here.
        </p>
      </div>

      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border rounded-xl p-3 sm:p-4 bg-white">
        <select
          className="w-full border rounded-lg px-3 py-2 min-h-10"
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
          className="w-full border rounded-lg px-3 py-2 min-h-10"
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
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          placeholder="Driver name"
          value={form.driverName}
          onChange={(e) => setForm({ ...form, driverName: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          placeholder="Driver phone"
          value={form.driverPhone}
          onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          placeholder="Transport cost"
          value={form.transportCost}
          onChange={(e) => setForm({ ...form, transportCost: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button type="submit" className="sm:col-span-2 md:col-span-3 bg-blue-600 text-white rounded-lg py-2.5 min-h-10">
          Create delivery note
        </button>
      </form>

      <div className="border border-gray-300 rounded-xl p-4 bg-white space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            onReset={() => {
              const r = defaultStockDateRange();
              setFromDate(r.fromDate);
              setToDate(r.toDate);
              setStatusFilter("All");
              setSearchTerm("");
            }}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-44 border rounded-lg px-3 py-2 bg-white text-sm min-h-10"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Delivery #, customer, driver..."
              className="w-full border rounded-lg pl-9 pr-3 py-2 bg-white text-sm min-h-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredDeliveries.length === 0 ? (
          <div className="border rounded-xl p-8 bg-white text-center text-gray-500">
            No deliveries for this filter
          </div>
        ) : (
          filteredDeliveries.map((d, index) => {
          const isDone = d.status === "Delivered";
          const isCancelled = d.status === "Cancelled";
          const locked = isDone || isCancelled;
          return (
            <div
              key={d.id}
              className="border rounded-xl p-4 bg-white flex flex-col md:flex-row md:items-center gap-3 justify-between"
            >
              <div className="flex gap-3">
                <span className="text-sm font-semibold text-gray-400 w-6 shrink-0 pt-0.5">
                  {index + 1}.
                </span>
                <div>
                  <div className="font-semibold">
                    {d.deliveryNumber}{" "}
                    <span
                      className={`text-xs font-normal px-2 py-0.5 rounded ${
                        isDone
                          ? "bg-emerald-100 text-emerald-800"
                          : isCancelled
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {d.customerName || "—"} · {d.route || "No route"} · Driver{" "}
                    {d.driverName || "unassigned"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {d.deliveryAddress || "—"} · Cost UGX{" "}
                    {(d.transportCost || 0).toLocaleString()}
                    {d.order ? ` · Order ${d.order.orderNumber}` : ""}
                  </div>
                  {d.customerSignature && (
                    <div className="text-xs text-emerald-700 mt-1">
                      Signed: {d.customerSignature}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint(d)}
                  className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                >
                  Print note
                </button>
                <button
                  type="button"
                  onClick={() => handlePdf(d)}
                  className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                >
                  PDF
                </button>
                {!locked &&
                  STATUSES.filter((s) => s !== d.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(d.id, s)}
                      className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                {!locked && (
                  <button
                    onClick={() => {
                      setSignId(d.id);
                      setSignature("");
                    }}
                    className="text-xs bg-emerald-600 text-white rounded px-2 py-1"
                  >
                    Sign / Deliver
                  </button>
                )}
                {isDone && (
                  <span className="text-xs text-emerald-700 self-center">Completed</span>
                )}
              </div>
            </div>
          );
          })
        )}
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
              <button
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg"
                onClick={saveSignature}
              >
                Confirm delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
