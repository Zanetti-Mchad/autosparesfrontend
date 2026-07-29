"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Product = { id: string; name: string; cutType?: string; quantity: number };
type OutputRow = { inventoryId: string; productName: string; cutType: string; quantity: string; weightKg: string };
type Log = {
  id: string;
  batchNumber: string;
  productionDate: string;
  birdsReceived: number;
  birdsSlaughtered: number;
  liveWeightKg: number;
  dressedWeightKg: number;
  wasteKg: number;
  yieldPercent: number;
  packsCompleted: number;
  supervisorName?: string;
  notes?: string;
  outputs?: any[];
};

export default function ProductionPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    birdsReceived: "",
    birdsSlaughtered: "",
    liveWeightKg: "",
    dressedWeightKg: "",
    packsCompleted: "",
    supervisorName: "",
    notes: "",
  });
  const [outputs, setOutputs] = useState<OutputRow[]>([
    { inventoryId: "", productName: "", cutType: "", quantity: "", weightKg: "" },
  ]);

  const load = async () => {
    try {
      const [prodRes, statsRes, invRes] = await Promise.all([
        fetchApi("/production"),
        fetchApi("/production/stats"),
        fetchApi("/inventory/inventory?limit=100"),
      ]);
      setLogs(prodRes.data?.logs || []);
      setSummary(prodRes.data?.summary || null);
      setStats(statsRes.data || null);
      const items = invRes.data?.items || invRes.data || [];
      setProducts((Array.isArray(items) ? items : []).filter((p: any) => (p.kind || "product") === "product"));
    } catch (e: any) {
      toast.error(e.message || "Failed to load production");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/production", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          birdsReceived: parseInt(form.birdsReceived) || 0,
          birdsSlaughtered: parseInt(form.birdsSlaughtered) || 0,
          liveWeightKg: parseFloat(form.liveWeightKg) || 0,
          dressedWeightKg: parseFloat(form.dressedWeightKg) || 0,
          packsCompleted: parseInt(form.packsCompleted) || 0,
          updateStock: true,
          outputs: outputs
            .filter((o) => o.inventoryId && parseInt(o.quantity) > 0)
            .map((o) => ({
              inventoryId: o.inventoryId,
              productName: o.productName,
              cutType: o.cutType,
              quantity: parseInt(o.quantity),
              weightKg: parseFloat(o.weightKg) || 0,
            })),
        }),
      });
      toast.success("Production batch saved");
      setForm({
        birdsReceived: "",
        birdsSlaughtered: "",
        liveWeightKg: "",
        dressedWeightKg: "",
        packsCompleted: "",
        supervisorName: "",
        notes: "",
      });
      setOutputs([{ inventoryId: "", productName: "", cutType: "", quantity: "", weightKg: "" }]);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Production</h1>
        <p className="text-sm text-gray-500">Daily birds received, slaughtered, yield, waste & packs</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-xl p-4 bg-white">
            <p className="text-xs text-gray-500">Today dressed kg</p>
            <p className="text-xl font-bold">{stats.today?.dressedWeightKg ?? 0} kg</p>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <p className="text-xs text-gray-500">Today slaughtered</p>
            <p className="text-xl font-bold">{stats.today?.birdsSlaughtered ?? 0}</p>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <p className="text-xs text-gray-500">Today yield</p>
            <p className="text-xl font-bold">{stats.today?.avgYield ?? 0}%</p>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <p className="text-xs text-gray-500">Month packs</p>
            <p className="text-xl font-bold">{stats.month?.packsCompleted ?? 0}</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="border rounded-xl p-4 bg-white space-y-4">
        <h2 className="font-semibold">Log today&apos;s processing</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            ["birdsReceived", "Birds received"],
            ["birdsSlaughtered", "Birds slaughtered"],
            ["liveWeightKg", "Live weight (kg)"],
            ["dressedWeightKg", "Dressed / yield (kg)"],
            ["packsCompleted", "Packs completed"],
            ["supervisorName", "Supervisor"],
          ].map(([key, label]) => (
            <input
              key={key}
              className="border rounded-lg px-3 py-2"
              placeholder={label}
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
          <input
            className="border rounded-lg px-3 py-2 md:col-span-3"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Packed outputs (adds to stock + batch/expiry)</h3>
            <button
              type="button"
              className="text-xs text-blue-600"
              onClick={() =>
                setOutputs((prev) => [
                  ...prev,
                  { inventoryId: "", productName: "", cutType: "", quantity: "", weightKg: "" },
                ])
              }
            >
              + Add cut
            </button>
          </div>
          {outputs.map((row, idx) => (
            <div key={idx} className="grid md:grid-cols-4 gap-2">
              <select
                className="border rounded-lg px-2 py-2"
                value={row.inventoryId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  setOutputs((prev) =>
                    prev.map((r, i) =>
                      i === idx
                        ? {
                            ...r,
                            inventoryId: e.target.value,
                            productName: p?.name || "",
                            cutType: p?.cutType || "",
                          }
                        : r
                    )
                  );
                }}
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="border rounded-lg px-2 py-2"
                placeholder="Qty packs"
                value={row.quantity}
                onChange={(e) =>
                  setOutputs((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r))
                  )
                }
              />
              <input
                className="border rounded-lg px-2 py-2"
                placeholder="Weight kg"
                value={row.weightKg}
                onChange={(e) =>
                  setOutputs((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, weightKg: e.target.value } : r))
                  )
                }
              />
              <input className="border rounded-lg px-2 py-2 bg-gray-50" value={row.cutType} readOnly placeholder="Cut" />
            </div>
          ))}
        </div>

        <button type="submit" className="bg-blue-600 text-white rounded-lg px-4 py-2">
          Save production batch
        </button>
      </form>

      {summary && (
        <p className="text-sm text-gray-600">
          Listed totals: {summary.birdsSlaughtered} birds · {summary.dressedWeightKg} kg dressed ·{" "}
          {summary.wasteKg} kg waste · {summary.packsCompleted} packs
        </p>
      )}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Batch</th>
              <th className="p-3">Date</th>
              <th className="p-3">Received</th>
              <th className="p-3">Slaughtered</th>
              <th className="p-3">Dressed kg</th>
              <th className="p-3">Waste</th>
              <th className="p-3">Yield %</th>
              <th className="p-3">Packs</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-mono text-xs">{l.batchNumber}</td>
                <td className="p-3">{new Date(l.productionDate).toLocaleDateString()}</td>
                <td className="p-3">{l.birdsReceived}</td>
                <td className="p-3">{l.birdsSlaughtered}</td>
                <td className="p-3">{l.dressedWeightKg}</td>
                <td className="p-3">{l.wasteKg}</td>
                <td className="p-3 font-semibold text-emerald-700">{l.yieldPercent}%</td>
                <td className="p-3">{l.packsCompleted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
