"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate, isDateInRange } from "@/lib/formatDate";
import DateRangeFilter, { defaultStockDateRange } from "@/components/DateRangeFilter";
import { downloadTablePdf, printTableReport } from "@/lib/reportExport";
import toast from "react-hot-toast";

type Movement = {
  id: string;
  type?: string;
  quantity?: number;
  notes?: string | null;
  movedAt?: string;
  createdAt?: string;
  inventory?: { id: string; name?: string | null } | null;
  store?: { id: string; name?: string } | null;
  user?: { firstName?: string | null; lastName?: string | null } | null;
};

function extractList(res: any): any[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

function userLabel(u?: Movement["user"]) {
  if (!u) return "—";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

export default function StockMovementsPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const initialRange = defaultStockDateRange();
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/stock/movements");
      setRows(extractList(res));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load movements");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((r) => isDateInRange(r.movedAt || r.createdAt, fromDate, toDate)),
    [rows, fromDate, toDate]
  );

  const periodLabel = `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;

  const exportColumns = [
    {
      key: "product",
      label: "Product",
      getValue: (r: Movement) => r.inventory?.name || "—",
    },
    {
      key: "type",
      label: "Type",
      getValue: (r: Movement) => r.type || "—",
    },
    {
      key: "quantity",
      label: "Qty",
      getValue: (r: Movement) => {
        const qty = Number(r.quantity || 0);
        return qty > 0 ? `+${qty}` : String(qty);
      },
    },
    {
      key: "store",
      label: "Store",
      getValue: (r: Movement) => r.store?.name || "—",
    },
    {
      key: "by",
      label: "By",
      getValue: (r: Movement) => userLabel(r.user),
    },
    {
      key: "date",
      label: "Date",
      getValue: (r: Movement) => formatDisplayDate(r.movedAt || r.createdAt),
    },
  ];

  const handlePrint = () => {
    try {
      printTableReport({
        title: "Stock Movements",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
      });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = () => {
    try {
      downloadTablePdf({
        title: "Stock Movements",
        subtitle: periodLabel,
        columns: exportColumns,
        rows: filteredRows,
        fileName: `movements_${fromDate}_${toDate}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full min-w-0">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Stock Movements</h1>
          <p className="text-sm text-gray-500">Inbound and outbound stock history</p>
        </div>
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
          onReset={() => {
            const r = defaultStockDateRange();
            setFromDate(r.fromDate);
            setToDate(r.toDate);
          }}
          onPrint={handlePrint}
          onPdf={handlePdf}
        />
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
        ) : filteredRows.length === 0 ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">
            No movements in this date range
          </div>
        ) : (
          filteredRows.map((r, i) => {
            const qty = Number(r.quantity || 0);
            return (
              <div key={r.id} className="border rounded-xl bg-white p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="font-medium text-sm min-w-0 break-words">
                    {i + 1}. {r.inventory?.name || "—"}
                  </div>
                  <div
                    className={`text-sm font-semibold shrink-0 ${
                      qty < 0 ? "text-red-700" : qty > 0 ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {qty > 0 ? `+${qty}` : qty}
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>Type: {r.type || "—"}</div>
                  <div>Store: {r.store?.name || "—"}</div>
                  <div>By: {userLabel(r.user)}</div>
                  <div>{formatDisplayDate(r.movedAt || r.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Product</th>
              <th className="p-3">Type</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Store</th>
              <th className="p-3">By</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No movements in this date range
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => {
                const qty = Number(r.quantity || 0);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-medium">{r.inventory?.name || "—"}</td>
                    <td className="p-3">{r.type || "—"}</td>
                    <td
                      className={`p-3 font-medium ${
                        qty < 0 ? "text-red-700" : qty > 0 ? "text-green-700" : "text-gray-700"
                      }`}
                    >
                      {qty > 0 ? `+${qty}` : qty}
                    </td>
                    <td className="p-3">{r.store?.name || "—"}</td>
                    <td className="p-3">{userLabel(r.user)}</td>
                    <td className="p-3">{formatDisplayDate(r.movedAt || r.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
