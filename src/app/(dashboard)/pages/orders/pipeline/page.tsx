"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import SearchableSelect from "@/components/SearchableSelect";
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

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

const PIPELINE = ["Pending", "Preparing", "Packed", "Out for delivery", "Delivered", "Cancelled"];
const SOURCES = ["whatsapp", "phone", "walk-in", "website", "order"];

const money = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

const customerDisplayName = (c: any) => {
  if (c.customerType === "company") {
    return c.companyName || c.name || "Company";
  }
  return (
    c.name ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    "Customer"
  );
};

export default function OrderPipelinePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [intake, setIntake] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    source: "whatsapp",
    notes: "",
    inventoryId: "",
    quantity: "1",
  });
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (filter) qs.set("status", filter);
      if (sourceFilter) qs.set("source", sourceFilter);
      const [oRes, invRes, custRes] = await Promise.all([
        fetchApi(`/orders?${qs.toString()}`),
        fetchApi("/inventory/inventory?limit=100"),
        fetchApi("/customers?limit=200"),
      ]);
      setOrders(oRes.data?.items || oRes.data?.orders || []);
      setPipeline(oRes.data?.pipeline || {});
      const items = invRes.data?.items || [];
      setProducts(Array.isArray(items) ? items : []);
      const custItems = custRes.data?.items || custRes.data || [];
      setCustomers(
        (Array.isArray(custItems) ? custItems : []).map((c: any) => ({
          id: String(c.id),
          name: customerDisplayName(c),
          phone: c.phone || "",
          email: c.email || c.workEmail || "",
        }))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to load orders");
    }
  }, [filter, sourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    return PIPELINE.map((s) => ({ status: s, count: pipeline[s] || 0 }));
  }, [pipeline]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name,
        searchText: `${c.phone || ""} ${c.email || ""}`,
        description: c.phone || c.email || undefined,
      })),
    [customers]
  );

  const advance = async (id: string, status: string) => {
    try {
      const res = await fetchApi(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const deliveryNo = res.data?.delivery?.deliveryNumber;
      if (deliveryNo && ["Packed", "Out for delivery", "Delivered"].includes(status)) {
        toast.success(`Moved to ${status} · Delivery note ${deliveryNo}`);
      } else {
        toast.success(`Moved to ${status}`);
      }
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const createIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intake.inventoryId) return toast.error("Select a product");
    if (!intake.customerId) return toast.error("Select a customer");
    const selected = customers.find((c) => c.id === intake.customerId);
    try {
      await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify({
          source: intake.source,
          status: "Pending",
          customerId: intake.customerId,
          customer: {
            name: selected?.name || intake.customerName || "Customer",
            phone: intake.customerPhone || selected?.phone,
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
        customerId: "",
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
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Order Pipeline</h1>
        <p className="text-sm text-gray-500">
          WhatsApp / Phone / Walk-in / Website → Pending → Preparing → Packed → Out → Delivered
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {counts.map((c) => (
          <button
            key={c.status}
            onClick={() => setFilter(filter === c.status ? "" : c.status)}
            className={`border rounded-xl p-2.5 sm:p-3 text-left min-w-0 ${
              filter === c.status ? "border-blue-500 bg-blue-50" : "bg-white"
            }`}
          >
            <div className="text-[10px] sm:text-xs text-gray-500 truncate">{c.status}</div>
            <div className="text-lg sm:text-xl font-bold">{c.count}</div>
          </button>
        ))}
      </div>

      <form onSubmit={createIntake} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border rounded-xl p-3 sm:p-4 bg-white">
        <h2 className="sm:col-span-2 md:col-span-3 font-semibold text-sm">Receive new order</h2>
        <select
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          value={intake.source}
          onChange={(e) => setIntake({ ...intake, source: e.target.value })}
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <SearchableSelect
          required
          value={intake.customerId}
          placeholder="Search customer by name or phone…"
          emptyMessage="No customers match"
          options={customerOptions}
          onChange={(id) => {
            const c = customers.find((x) => x.id === id);
            setIntake({
              ...intake,
              customerId: id,
              customerName: c?.name || "",
              customerPhone: c?.phone || "",
            });
          }}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          placeholder="Phone"
          value={intake.customerPhone}
          onChange={(e) => setIntake({ ...intake, customerPhone: e.target.value })}
        />
        <select
          className="w-full border rounded-lg px-3 py-2 min-h-10"
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
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          type="number"
          min={1}
          value={intake.quantity}
          onChange={(e) => setIntake({ ...intake, quantity: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 min-h-10"
          placeholder="Notes"
          value={intake.notes}
          onChange={(e) => setIntake({ ...intake, notes: e.target.value })}
        />
        <button type="submit" className="sm:col-span-2 md:col-span-3 bg-blue-600 text-white rounded-lg py-2.5 min-h-10">
          Add to pipeline
        </button>
      </form>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <select
          className="w-full sm:w-auto border rounded-lg px-3 py-2 text-sm min-h-10"
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
          <button className="text-sm text-blue-600 text-left" onClick={() => setFilter("")}>
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
