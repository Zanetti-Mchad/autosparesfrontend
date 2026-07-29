"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

type Alert = {
  type: string;
  severity: string;
  message: string;
  refId?: string;
};

export default function AlertsReportsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [valuation, setValuation] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);

  const load = async () => {
    try {
      const [aRes, vRes, pRes] = await Promise.all([
        fetchApi("/reports/alerts"),
        fetchApi("/reports/inventory-valuation"),
        fetchApi("/reports/pnl"),
      ]);
      setAlerts(aRes.data?.alerts || []);
      setSummary(aRes.data?.summary || null);
      setValuation(vRes.data || null);
      setPnl(pRes.data || null);
    } catch (e: any) {
      toast.error(e.message || "Failed to load reports");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportValuation = () => {
    if (!valuation?.rows?.length) return toast.error("No valuation data");
    const sheet = XLSX.utils.json_to_sheet(valuation.rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Valuation");
    XLSX.writeFile(book, `mwima-inventory-valuation-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportAlerts = () => {
    if (!alerts.length) return toast.error("No alerts");
    const sheet = XLSX.utils.json_to_sheet(
      alerts.map((a) => ({ type: a.type, severity: a.severity, message: a.message }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Alerts");
    XLSX.writeFile(book, `mwima-alerts-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printPnl = () => {
    const w = window.open("", "_blank");
    if (!w || !pnl) return;
    w.document.write(`
      <html><head><title>Mwima P&L</title></head><body style="font-family:sans-serif;padding:24px">
      <h1>Mwima Eliken Poultry Farm — Profit & Loss</h1>
      <p>Revenue: UGX ${Number(pnl.revenue||0).toLocaleString()}</p>
      <p>COGS: UGX ${Number(pnl.cogs||0).toLocaleString()}</p>
      <p>Gross Profit: UGX ${Number(pnl.grossProfit||0).toLocaleString()}</p>
      <p>Expenses: UGX ${Number(pnl.expenses||0).toLocaleString()}</p>
      <p><strong>Net Profit: UGX ${Number(pnl.netProfit||0).toLocaleString()} (${pnl.profitMargin}%)</strong></p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const severityColor = (s: string) =>
    s === "high" ? "bg-red-50 border-red-200 text-red-800" :
    s === "medium" ? "bg-amber-50 border-amber-200 text-amber-800" :
    "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Alerts & Reports</h1>
          <p className="text-sm text-gray-500">Low stock, expiry, balances, valuation, P&L exports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportAlerts} className="border rounded-lg px-3 py-2 text-sm">Export alerts Excel</button>
          <button onClick={exportValuation} className="border rounded-lg px-3 py-2 text-sm">Export valuation Excel</button>
          <button onClick={printPnl} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm">Print P&L PDF</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="border rounded-xl p-3 bg-white">
              <div className="text-[10px] uppercase text-gray-500">{k}</div>
              <div className="text-lg font-bold">{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {valuation?.totals && (
        <div className="border rounded-xl p-4 bg-white grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500">Stock units</div>
            <div className="text-xl font-bold">{valuation.totals.units}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Value at cost</div>
            <div className="text-xl font-bold">UGX {Number(valuation.totals.atCost).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Value at sell</div>
            <div className="text-xl font-bold">UGX {Number(valuation.totals.atSell).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">Active alerts ({alerts.length})</h2>
        {alerts.slice(0, 40).map((a, i) => (
          <div key={`${a.refId}-${i}`} className={`border rounded-lg px-3 py-2 text-sm flex gap-2 ${severityColor(a.severity)}`}>
            <span className="font-semibold text-gray-400 shrink-0 w-6">{i + 1}.</span>
            <div>
              <span className="font-medium uppercase text-[10px] mr-2">{a.type}</span>
              {a.message}
            </div>
          </div>
        ))}
        {!alerts.length && <p className="text-sm text-gray-400">No alerts right now</p>}
      </div>
    </div>
  );
}
