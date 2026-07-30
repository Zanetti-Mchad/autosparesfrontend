"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";
import { Search, Trash2, Plus, Minus, Printer, MessageCircle } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  sku?: string;
  weightBand?: string;
  cutType?: string;
  kind?: string;
};

type CartLine = {
  inventoryId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stock: number;
};

type Customer = {
  id: string;
  name?: string;
  companyName?: string;
  phone?: string;
  segment?: string;
};

type PaymentSplit = { method: string; amount: string };

type BusinessInfo = {
  businessName: string;
  businessTagLine: string;
  location: string;
  tin: string;
  email: string;
  telephone: string;
};

const money = (n: number) =>
  `UGX ${Number(n || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [payments, setPayments] = useState<PaymentSplit[]>([
    { method: "Cash", amount: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [invRes, custRes, bizRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=200"),
        fetchApi("/customers?limit=200"),
        fetchApi("/settings/business").catch(() =>
          fetchApi("/settings/view").catch(() => null)
        ),
      ]);
      const invList = invRes?.data?.items ?? invRes?.data ?? [];
      setProducts(
        (Array.isArray(invList) ? invList : []).filter(
          (p: Product) => (p.kind || "product") === "product"
        )
      );
      const custList = custRes?.data?.items ?? custRes?.data ?? [];
      setCustomers(Array.isArray(custList) ? custList : []);
      const biz = bizRes?.data;
      if (biz) {
        setBusiness({
          businessName: biz.businessName || "",
          businessTagLine: biz.businessTagLine || "",
          location: biz.location || "",
          tin: biz.tin || "",
          email: biz.email || "",
          telephone: biz.telephone || "",
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load POS data");
    }
  }, []);

  useEffect(() => {
    load();
    barcodeRef.current?.focus();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(q) ||
          p.cutType?.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [products, query]);

  const addToCart = (p: Product) => {
    if (p.quantity <= 0) {
      toast.error("Out of stock");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.inventoryId === p.id);
      if (existing) {
        if (existing.quantity >= p.quantity) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((l) =>
          l.inventoryId === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          inventoryId: p.id,
          name: p.name,
          unitPrice: p.price,
          quantity: 1,
          stock: p.quantity,
        },
      ];
    });
  };

  const scanBarcode = async () => {
    const code = barcode.trim();
    if (!code) return;
    try {
      const res = await fetchApi(`/inventory/inventory/barcode/${encodeURIComponent(code)}`);
      if (res?.data) {
        addToCart(res.data);
        setBarcode("");
        barcodeRef.current?.focus();
      }
    } catch {
      toast.error("Barcode not found");
    }
  };

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = Math.min(parseFloat(discountAmount) || 0, subtotal);
  const total = Math.max(0, subtotal - discount);
  const paid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const balance = total - paid;

  const checkout = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (paid + 0.01 < total) return toast.error("Payment is less than total");

    setSubmitting(true);
    try {
      const selected = customers.find((c) => c.id === customerId);
      const res = await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify({
          source: "pos",
          status: "Completed",
          customerId: customerId || undefined,
          customer: selected
            ? {
                name: selected.companyName || selected.name,
                phone: selected.phone,
              }
            : { name: "Walk-in Customer" },
          items: cart.map((l) => ({
            inventoryId: l.inventoryId,
            quantity: l.quantity,
            sellingPrice: l.unitPrice,
          })),
          discountAmount: discount,
          payments: payments
            .filter((p) => parseFloat(p.amount) > 0)
            .map((p) => ({ method: p.method, amount: parseFloat(p.amount) })),
        }),
      });
      setLastReceipt(res.data);
      toast.success(`Sale ${res.data?.orderNumber || ""} completed`);
      setCart([]);
      setPayments([{ method: "Cash", amount: "" }]);
      setDiscountAmount("0");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title></head><body>${receiptRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const whatsappReceipt = () => {
    if (!lastReceipt) return toast.error("Complete a sale first");
    const companyName = business?.businessName || "Autospares";
    const lines = [
      `*${companyName}*`,
      business?.businessTagLine ? business.businessTagLine : null,
      business?.location ? business.location : null,
      business?.telephone ? `Tel: ${business.telephone}` : null,
      business?.email ? `Email: ${business.email}` : null,
      business?.tin ? `TIN: ${business.tin}` : null,
      `Receipt: ${lastReceipt.orderNumber}`,
      `Total: ${money(lastReceipt.total)}`,
      ...(lastReceipt.items || []).map(
        (i: any) => `• ${i.productName} x${i.quantity} = ${money(i.totalPrice)}`
      ),
      `Thank you for your business!`,
    ].filter(Boolean) as string[];
    const phone = (lastReceipt.customerPhone || "").replace(/\D/g, "");
    const url = `https://wa.me/${phone ? (phone.startsWith("256") ? phone : `256${phone.slice(-9)}`) : ""}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Point of Sale</h1>
          <p className="text-sm text-gray-500">
            {business?.businessName || "Autospares"} · scan barcode or search products
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
                placeholder="Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <input
              ref={barcodeRef}
              className="w-48 border rounded-lg px-3 py-2"
              placeholder="Scan barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scanBarcode()}
            />
            <button onClick={scanBarcode} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Add
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="text-left border rounded-xl p-3 hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                <div className="text-xs text-gray-500 mt-1">{p.cutType || p.weightBand || p.sku}</div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="font-semibold text-blue-700">{money(p.price)}</span>
                  <span className={p.quantity <= 10 ? "text-red-600" : "text-gray-500"}>
                    {p.quantity} left
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
          <h2 className="font-semibold text-lg">Cart</h2>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name} {c.segment ? `(${c.segment})` : ""}
              </option>
            ))}
          </select>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {cart.map((l) => (
              <div key={l.inventoryId} className="flex items-center gap-2 text-sm border-b pb-2">
                <div className="flex-1">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-gray-500">{money(l.unitPrice)}</div>
                </div>
                <button
                  className="p-1 border rounded"
                  onClick={() =>
                    setCart((prev) =>
                      prev
                        .map((x) =>
                          x.inventoryId === l.inventoryId
                            ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                            : x
                        )
                    )
                  }
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center">{l.quantity}</span>
                <button
                  className="p-1 border rounded"
                  onClick={() =>
                    setCart((prev) =>
                      prev.map((x) =>
                        x.inventoryId === l.inventoryId && x.quantity < x.stock
                          ? { ...x, quantity: x.quantity + 1 }
                          : x
                      )
                    )
                  }
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  className="p-1 text-red-500"
                  onClick={() => setCart((prev) => prev.filter((x) => x.inventoryId !== l.inventoryId))}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {!cart.length && <p className="text-sm text-gray-400">No items yet</p>}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Discount</span>
              <input
                className="w-28 border rounded px-2 py-1 text-right"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Payments</div>
            {payments.map((p, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className="border rounded px-2 py-1"
                  value={p.method}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, method: e.target.value } : x))
                    )
                  }
                >
                  <option>Cash</option>
                  <option>Mobile Money</option>
                  <option>Card</option>
                </select>
                <input
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="Amount"
                  value={p.amount}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x))
                    )
                  }
                />
              </div>
            ))}
            <button
              className="text-xs text-blue-600"
              onClick={() => setPayments((prev) => [...prev, { method: "Mobile Money", amount: "" }])}
            >
              + Split payment
            </button>
            <div className="text-xs text-gray-500">
              Paid {money(paid)} · Balance {money(balance)}
            </div>
            <button
              className="text-xs text-gray-600 underline"
              onClick={() =>
                setPayments([{ method: "Cash", amount: String(total) }])
              }
            >
              Fill exact cash
            </button>
          </div>

          <button
            disabled={submitting || !cart.length}
            onClick={checkout}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
          >
            {submitting ? "Processing..." : `Charge ${money(total)}`}
          </button>

          {lastReceipt && (
            <div className="flex gap-2">
              <button onClick={printReceipt} className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-1 text-sm">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={whatsappReceipt} className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-1 text-sm text-green-700">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden" ref={receiptRef}>
        {lastReceipt && (
          <div style={{ fontFamily: "monospace", padding: 16, maxWidth: 320 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                {business?.businessName || "Autospares"}
              </h2>
              {business?.businessTagLine && (
                <p style={{ margin: "0 0 4px", fontSize: 12 }}>{business.businessTagLine}</p>
              )}
              {business?.location && (
                <p style={{ margin: "0 0 2px", fontSize: 12 }}>{business.location}</p>
              )}
              {business?.telephone && (
                <p style={{ margin: "0 0 2px", fontSize: 12 }}>Tel: {business.telephone}</p>
              )}
              {business?.email && (
                <p style={{ margin: "0 0 2px", fontSize: 12 }}>Email: {business.email}</p>
              )}
              {business?.tin && (
                <p style={{ margin: "0 0 2px", fontSize: 12 }}>TIN: {business.tin}</p>
              )}
            </div>
            <hr />
            <p>Receipt: {lastReceipt.orderNumber}</p>
            <p style={{ fontSize: 12 }}>
              {new Date(lastReceipt.createdAt || Date.now()).toLocaleString()}
            </p>
            <hr />
            {(lastReceipt.items || []).map((i: any) => (
              <p key={i.id}>
                {i.productName} x{i.quantity} — {money(i.totalPrice)}
              </p>
            ))}
            <hr />
            <p>
              <strong>Total: {money(lastReceipt.total)}</strong>
            </p>
            <p style={{ textAlign: "center", marginTop: 12 }}>Thank you for your business!</p>
          </div>
        )}
      </div>
    </div>
  );
}
