"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDateTime } from "@/lib/formatDate";
import { businessDisplayName } from "@/lib/businessSettings";
import toast from "react-hot-toast";
import { Search, Trash2, Plus, Minus, Printer, MessageCircle, Store } from "lucide-react";

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

type StoreOption = {
  id: string;
  name: string;
  totalQty: number;
  productCount: number;
};

type PosProduct = Product & {
  /** Best store to draw from among selected (highest qty) */
  preferredStoreId: string;
  preferredStoreName: string;
  /** Qty available in preferred store */
  preferredQty: number;
  /** Sum across all selected stores */
  totalInSelected: number;
};

type CartLine = {
  inventoryId: string;
  storeId: string;
  storeName: string;
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

type LevelRow = {
  inventoryId?: string;
  storeId?: string | null;
  quantity?: number;
  isTotal?: boolean;
  name?: string;
};

const money = (n: number) =>
  `UGX ${Number(n || 0).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function cartKey(inventoryId: string, storeId: string) {
  return `${inventoryId}::${storeId}`;
}

export default function PosPage() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [storeQtyByStore, setStoreQtyByStore] = useState<
    Record<string, Record<string, number>>
  >({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  /** Explicit checked store IDs. Default = all stores (set after load). */
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const storeMenuRef = useRef<HTMLDivElement>(null);
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
  const [lastReceiptStores, setLastReceiptStores] = useState<string[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const allStoresMode =
    stores.length > 0 &&
    selectedStoreIds.length === stores.length &&
    stores.every((s) => selectedStoreIds.includes(s.id));

  const activeStoreIds = selectedStoreIds;

  const selectedStores = useMemo(
    () => stores.filter((s) => selectedStoreIds.includes(s.id)),
    [stores, selectedStoreIds]
  );

  const storeDropdownLabel = useMemo(() => {
    if (!stores.length) return "No stores with stock";
    if (!selectedStoreIds.length) return "Select store";
    if (allStoresMode) return "All stores";
    if (selectedStoreIds.length === 1) {
      return stores.find((s) => s.id === selectedStoreIds[0])?.name || "1 store";
    }
    return `${selectedStoreIds.length} stores selected`;
  }, [stores, allStoresMode, selectedStoreIds]);

  /** Products available in active store(s). */
  const products = useMemo((): PosProduct[] => {
    if (!activeStoreIds.length) return [];

    const out: PosProduct[] = [];
    for (const p of catalog) {
      let totalInSelected = 0;
      let preferredStoreId = "";
      let preferredQty = 0;

      for (const sid of activeStoreIds) {
        const qty = storeQtyByStore[sid]?.[p.id] || 0;
        if (qty <= 0) continue;
        totalInSelected += qty;
        if (qty > preferredQty) {
          preferredQty = qty;
          preferredStoreId = sid;
        }
      }

      if (totalInSelected <= 0 || !preferredStoreId) continue;

      const storeName =
        stores.find((s) => s.id === preferredStoreId)?.name || "Store";

      out.push({
        ...p,
        quantity: totalInSelected,
        preferredStoreId,
        preferredStoreName: storeName,
        preferredQty,
        totalInSelected,
      });
    }

    return out;
  }, [catalog, activeStoreIds, storeQtyByStore, stores]);

  const load = useCallback(async () => {
    try {
      const [invRes, custRes, storeRes, levelsRes, bizRes] = await Promise.all([
        fetchApi("/inventory/inventory?limit=500"),
        fetchApi("/customers?limit=200"),
        fetchApi("/catalog/stores").catch(() => null),
        fetchApi("/stock/levels?view=store").catch(() => null),
        fetchApi("/settings/business").catch(() =>
          fetchApi("/settings/view").catch(() => null)
        ),
      ]);

      const invList = extractList(invRes);
      const productCatalog: Product[] = invList
        .filter((p: any) => (p.kind || "product") === "product")
        .map((p: any) => ({
          id: String(p.id),
          name: p.name,
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 0,
          barcode: p.barcode || undefined,
          sku: p.sku || undefined,
          weightBand: p.weightBand || undefined,
          cutType: p.cutType || undefined,
          kind: p.kind || "product",
        }));
      setCatalog(productCatalog);

      const custList = extractList(custRes);
      setCustomers(Array.isArray(custList) ? custList : []);

      const storeList = extractList(storeRes);
      const storeNameById = new Map<string, string>();
      for (const s of storeList) {
        storeNameById.set(String(s.id), s.name || "Unnamed store");
      }

      const levels = extractList(levelsRes) as LevelRow[];
      const qtyByStore: Record<string, Record<string, number>> = {};
      const totals: Record<string, { totalQty: number; products: Set<string> }> = {};

      for (const row of levels) {
        if (row.isTotal || !row.storeId || !row.inventoryId) continue;
        const sid = String(row.storeId);
        const iid = String(row.inventoryId);
        const qty = Number(row.quantity) || 0;
        if (qty <= 0) continue;

        if (!qtyByStore[sid]) qtyByStore[sid] = {};
        qtyByStore[sid][iid] = qty;

        if (!totals[sid]) totals[sid] = { totalQty: 0, products: new Set() };
        totals[sid].totalQty += qty;
        totals[sid].products.add(iid);

        const storeLabel = typeof (row as any).store === "string" ? (row as any).store : null;
        if (storeLabel && storeLabel !== "—" && !storeNameById.has(sid)) {
          storeNameById.set(sid, storeLabel);
        }
      }

      setStoreQtyByStore(qtyByStore);

      const availableStores: StoreOption[] = Object.keys(totals)
        .map((id) => ({
          id,
          name: storeNameById.get(id) || "Store",
          totalQty: totals[id].totalQty,
          productCount: totals[id].products.size,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setStores(availableStores);

      // Default: all stores checked. Keep prior checks that still exist; if none left, select all.
      setSelectedStoreIds((prev) => {
        const stillValid = prev.filter((id) =>
          availableStores.some((s) => s.id === id)
        );
        if (stillValid.length > 0) return stillValid;
        return availableStores.map((s) => s.id);
      });

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

  // Close store dropdown on outside click
  useEffect(() => {
    if (!storeMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!storeMenuRef.current?.contains(e.target as Node)) {
        setStoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [storeMenuOpen]);

  // Drop cart lines whose store is no longer active
  useEffect(() => {
    if (!activeStoreIds.length) {
      if (cart.length) setCart([]);
      return;
    }
    const allowed = new Set(activeStoreIds);
    setCart((prev) => {
      const next = prev.filter((l) => allowed.has(l.storeId));
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreIds.join("|")]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 80);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(q) ||
          p.cutType?.toLowerCase().includes(q) ||
          p.preferredStoreName.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [products, query]);

  const chooseAllStores = () => {
    if (allStoresMode) {
      // Uncheck All → uncheck every store
      if (cart.length) {
        const ok = window.confirm("Unchecking all stores will clear the cart. Continue?");
        if (!ok) return;
        setCart([]);
      }
      setSelectedStoreIds([]);
      return;
    }
    // Check All → check every store
    setSelectedStoreIds(stores.map((s) => s.id));
  };

  const toggleStore = (id: string) => {
    setSelectedStoreIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        if (cart.some((l) => l.storeId === id)) {
          const ok = window.confirm(
            "Unchecking this store will remove its items from the cart. Continue?"
          );
          if (!ok) return prev;
        }
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const storeQtyFor = (inventoryId: string, storeId: string) =>
    storeQtyByStore[storeId]?.[inventoryId] || 0;

  const addToCart = (p: PosProduct) => {
    if (!activeStoreIds.length) {
      toast.error("No stores with stock available");
      return;
    }

    // Prefer store with most stock among active; if cart already has a line for this
    // product+store, keep filling that store until empty, then move to next.
    let targetStoreId = p.preferredStoreId;
    let available = p.preferredQty;

    const existingForProduct = cart.filter((l) => l.inventoryId === p.id);
    for (const line of existingForProduct) {
      if (line.quantity < line.stock) {
        targetStoreId = line.storeId;
        available = storeQtyFor(p.id, line.storeId);
        break;
      }
    }

    const usedInCart = (sid: string) =>
      existingForProduct.find((l) => l.storeId === sid)?.quantity || 0;

    if (usedInCart(targetStoreId) >= available) {
      let found = false;
      const ranked = activeStoreIds
        .map((sid) => ({ sid, qty: storeQtyFor(p.id, sid) }))
        .filter((x) => x.qty > 0)
        .sort((a, b) => b.qty - a.qty);
      for (const { sid, qty } of ranked) {
        if (usedInCart(sid) < qty) {
          targetStoreId = sid;
          available = qty;
          found = true;
          break;
        }
      }
      if (!found) {
        toast.error("Not enough stock in the selected stores");
        return;
      }
    }

    const storeName =
      stores.find((s) => s.id === targetStoreId)?.name || p.preferredStoreName;

    setCart((prev) => {
      const existing = prev.find(
        (l) => l.inventoryId === p.id && l.storeId === targetStoreId
      );
      if (existing) {
        if (existing.quantity >= available) {
          toast.error(`Not enough stock in ${storeName}`);
          return prev;
        }
        return prev.map((l) =>
          l.inventoryId === p.id && l.storeId === targetStoreId
            ? { ...l, quantity: l.quantity + 1, stock: available }
            : l
        );
      }
      return [
        ...prev,
        {
          inventoryId: p.id,
          storeId: targetStoreId,
          storeName,
          name: p.name,
          unitPrice: p.price,
          quantity: 1,
          stock: available,
        },
      ];
    });
  };

  const scanBarcode = async () => {
    if (!activeStoreIds.length) {
      toast.error("No stores with stock available");
      return;
    }
    const code = barcode.trim();
    if (!code) return;
    try {
      const res = await fetchApi(`/inventory/inventory/barcode/${encodeURIComponent(code)}`);
      if (res?.data) {
        const raw = res.data as Product;
        const match = products.find((p) => p.id === String(raw.id));
        if (!match) {
          toast.error("This item is not in stock in the selected stores");
          return;
        }
        addToCart(match);
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
    if (!activeStoreIds.length) {
      return toast.error("No stores with stock available");
    }
    if (!cart.length) return toast.error("Cart is empty");
    if (paid + 0.01 < total) return toast.error("Payment is less than total");

    for (const line of cart) {
      const available = storeQtyFor(line.inventoryId, line.storeId);
      if (line.quantity > available) {
        return toast.error(
          `Not enough stock in ${line.storeName} for ${line.name}. Available: ${available}`
        );
      }
    }

    setSubmitting(true);
    try {
      const selected = customers.find((c) => c.id === customerId);
      const customerPayload = selected
        ? {
            name: selected.companyName || selected.name,
            phone: selected.phone,
          }
        : { name: "Walk-in Customer" };

      const paymentRows = payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({ method: p.method, amount: parseFloat(p.amount) }));

      // One order per store (backend accepts a single storeId per order)
      const byStore = new Map<string, CartLine[]>();
      for (const line of cart) {
        const list = byStore.get(line.storeId) || [];
        list.push(line);
        byStore.set(line.storeId, list);
      }

      const storeGroups = Array.from(byStore.entries());
      const createdOrders: any[] = [];
      let paymentsRemaining = paymentRows.map((p) => ({ ...p }));

      for (let gi = 0; gi < storeGroups.length; gi++) {
        const [storeId, lines] = storeGroups[gi];
        const groupSub = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
        const groupDisc =
          subtotal > 0 ? Math.round((discount * groupSub) / subtotal) : 0;
        const groupTotal = Math.max(0, groupSub - groupDisc);

        // Assign payments to this group (last group gets remainder)
        let groupPayments: { method: string; amount: number }[] = [];
        if (gi === storeGroups.length - 1) {
          groupPayments = paymentsRemaining.filter((p) => p.amount > 0);
        } else if (groupTotal > 0 && paymentsRemaining.length) {
          let need = groupTotal;
          const assigned: { method: string; amount: number }[] = [];
          for (const p of paymentsRemaining) {
            if (need <= 0) break;
            const take = Math.min(p.amount, need);
            if (take > 0) {
              assigned.push({ method: p.method, amount: take });
              p.amount -= take;
              need -= take;
            }
          }
          groupPayments = assigned;
        }

        const res = await fetchApi("/orders", {
          method: "POST",
          body: JSON.stringify({
            source: "pos",
            status: "Completed",
            storeId,
            customerId: customerId || undefined,
            customer: customerPayload,
            items: lines.map((l) => ({
              inventoryId: l.inventoryId,
              quantity: l.quantity,
              sellingPrice: l.unitPrice,
            })),
            discountAmount: groupDisc,
            payments: groupPayments,
          }),
        });
        createdOrders.push(res.data);
      }

      const primary = createdOrders[0];
      const mergedItems = createdOrders.flatMap((o) => o?.items || []);
      const mergedTotal = createdOrders.reduce((s, o) => s + (o?.total || 0), 0);
      setLastReceipt({
        ...primary,
        orderNumber:
          createdOrders.length > 1
            ? createdOrders.map((o) => o?.orderNumber).filter(Boolean).join(" + ")
            : primary?.orderNumber,
        items: mergedItems,
        total: mergedTotal,
      });
      setLastReceiptStores(
        storeGroups.map(
          ([sid]) => stores.find((s) => s.id === sid)?.name || sid
        )
      );
      toast.success(
        createdOrders.length > 1
          ? `Sale completed (${createdOrders.length} stores)`
          : `Sale ${primary?.orderNumber || ""} completed`
      );
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
    w.document.write(
      `<html><head><title>Receipt</title></head><body>${receiptRef.current.innerHTML}</body></html>`
    );
    w.document.close();
    w.print();
  };

  const whatsappReceipt = () => {
    if (!lastReceipt) return toast.error("Complete a sale first");
    const companyName = businessDisplayName(business);
    const lines = [
      `*${companyName}*`,
      business?.businessTagLine ? business.businessTagLine : null,
      business?.location ? business.location : null,
      business?.telephone ? `Tel: ${business.telephone}` : null,
      business?.email ? `Email: ${business.email}` : null,
      business?.tin ? `TIN: ${business.tin}` : null,
      lastReceiptStores.length
        ? `Store: ${lastReceiptStores.join(", ")}`
        : null,
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

  const hasStoresSelected = activeStoreIds.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Point of Sale</h1>
          <p className="text-sm text-gray-500">
            {businessDisplayName(business)} · sell from store stock
          </p>
        </div>
      </div>

      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
          hasStoresSelected
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-300"
        }`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <Store
            className={`w-5 h-5 ${
              hasStoresSelected ? "text-emerald-600" : "text-amber-600"
            }`}
          />
          <div>
            <div className="text-sm font-semibold text-gray-800">Selling from store</div>
            <div className="text-xs text-gray-500">
              {allStoresMode
                ? "All stores checked"
                : selectedStoreIds.length
                  ? `Selected: ${selectedStores.map((s) => s.name).join(", ")}`
                  : "Check All stores or pick stores in the dropdown"}
            </div>
          </div>
        </div>

        <div className="relative w-full sm:max-w-md" ref={storeMenuRef}>
          <button
            type="button"
            onClick={() => setStoreMenuOpen((o) => !o)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white font-medium text-left flex items-center justify-between gap-2"
          >
            <span className="truncate">{storeDropdownLabel}</span>
            <span className="text-gray-400 text-xs shrink-0">
              {storeMenuOpen ? "▲" : "▼"}
            </span>
          </button>

          {storeMenuOpen && (
            <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
              <label className="flex items-center gap-2 px-3 py-2.5 border-b cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={allStoresMode}
                  onChange={chooseAllStores}
                />
                <span className="font-medium text-sm">All stores</span>
              </label>
              {stores.map((s) => {
                const checked = selectedStoreIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={checked}
                      onChange={() => toggleStore(s.id)}
                    />
                    <span className="text-sm min-w-0">
                      <span className="block truncate">{s.name}</span>
                      <span className="text-[11px] text-gray-500">
                        {s.productCount} item{s.productCount === 1 ? "" : "s"} · {s.totalQty}{" "}
                        qty
                      </span>
                    </span>
                  </label>
                );
              })}
              {!stores.length && (
                <p className="px-3 py-2 text-xs text-amber-700">
                  No stores with stock. Add stock under Stock → Add Stock.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div
          className={`xl:col-span-2 space-y-3 ${
            !hasStoresSelected ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
                placeholder="Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={!hasStoresSelected}
              />
            </div>
            <input
              ref={barcodeRef}
              className="w-48 border rounded-lg px-3 py-2"
              placeholder="Scan barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scanBarcode()}
              disabled={!hasStoresSelected}
            />
            <button
              onClick={scanBarcode}
              disabled={!hasStoresSelected}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
            {hasStoresSelected && filtered.length === 0 && (
              <div className="col-span-full text-sm text-gray-500 border rounded-xl p-6 text-center bg-white">
                No products with stock in the selected stores.
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={!hasStoresSelected}
                className="text-left border rounded-xl p-3 hover:border-blue-500 hover:bg-blue-50 transition disabled:cursor-not-allowed bg-white"
              >
                <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {p.cutType || p.weightBand || p.sku}
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="font-semibold text-blue-700">{money(p.price)}</span>
                  <span className={p.totalInSelected <= 10 ? "text-red-600" : "text-gray-500"}>
                    {p.totalInSelected} avail
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3 min-w-0 overflow-hidden">
          <h2 className="font-semibold text-lg">Cart</h2>
          {hasStoresSelected && (
            <div className="text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2">
              Selling from:{" "}
              <span className="font-semibold">
                {allStoresMode
                  ? "All stores"
                  : selectedStores.length
                    ? selectedStores.map((s) => s.name).join(", ")
                    : "None"}
              </span>
            </div>
          )}
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
              <div
                key={cartKey(l.inventoryId, l.storeId)}
                className="flex items-center gap-2 text-sm border-b pb-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.name}</div>
                  <div className="text-[11px] text-emerald-700">{l.storeName}</div>
                  <div className="text-gray-500">{money(l.unitPrice)}</div>
                </div>
                <button
                  className="p-1 border rounded"
                  onClick={() =>
                    setCart((prev) =>
                      prev.map((x) =>
                        x.inventoryId === l.inventoryId && x.storeId === l.storeId
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
                        x.inventoryId === l.inventoryId &&
                        x.storeId === l.storeId &&
                        x.quantity < x.stock
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
                  onClick={() =>
                    setCart((prev) =>
                      prev.filter(
                        (x) =>
                          !(x.inventoryId === l.inventoryId && x.storeId === l.storeId)
                      )
                    )
                  }
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
              <div key={i} className="flex gap-2 min-w-0 w-full">
                <select
                  className="shrink-0 w-[7.5rem] max-w-[40%] border rounded px-2 py-1"
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
                  className="min-w-0 flex-1 border rounded px-2 py-1 w-full"
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
              onClick={() =>
                setPayments((prev) => [...prev, { method: "Mobile Money", amount: "" }])
              }
            >
              + Split payment
            </button>
            <div className="text-xs text-gray-500">
              Paid {money(paid)} · Balance {money(balance)}
            </div>
            <button
              className="text-xs text-gray-600 underline"
              onClick={() => setPayments([{ method: "Cash", amount: String(total) }])}
            >
              Fill exact cash
            </button>
          </div>

          <button
            disabled={submitting || !cart.length || !hasStoresSelected}
            onClick={checkout}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
          >
            {submitting ? "Processing..." : `Charge ${money(total)}`}
          </button>

          {lastReceipt && (
            <div className="flex gap-2">
              <button
                onClick={printReceipt}
                className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-1 text-sm"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={whatsappReceipt}
                className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-1 text-sm text-green-700"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden" ref={receiptRef}>
        {lastReceipt && (
          <div style={{ fontFamily: "monospace", padding: "16px 16px 40px", maxWidth: 320 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                {businessDisplayName(business)}
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
            {lastReceiptStores.length > 0 && (
              <p style={{ fontSize: 12 }}>Store: {lastReceiptStores.join(", ")}</p>
            )}
            <p style={{ fontSize: 12 }}>
              {formatDisplayDateTime(lastReceipt.createdAt || Date.now())}
            </p>
            <hr />
            {(lastReceipt.items || []).map((i: any) => (
              <p key={i.id || `${i.productName}-${i.quantity}`}>
                {i.productName} x{i.quantity} — {money(i.totalPrice)}
              </p>
            ))}
            <hr />
            <p>
              <strong>Total: {money(lastReceipt.total)}</strong>
            </p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              <strong>Terms &amp; Conditions</strong>
              <br />
              Payment: Cash payment
            </p>
            <p style={{ textAlign: "center", marginTop: 16, marginBottom: 24 }}>
              Thank you for your business!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
