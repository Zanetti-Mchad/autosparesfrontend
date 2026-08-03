"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";
import { formatDisplayDate, looksLikeDateValue } from "@/lib/formatDate";
import { downloadTablePdf, formatMoney, printTableReport } from "@/lib/reportExport";
import { Download, Printer, RefreshCw } from "lucide-react";

type ColumnDef = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  exportValue?: (row: any) => string;
};

type SummaryKey = { key: string; label: string; format?: "currency" | "number" | "text" };

type Props = {
  title: string;
  description?: string;
  endpoint: string;
  listPath?: string;
  columns?: ColumnDef[];
  /** Keys to show as summary cards from response.data or response */
  summaryKeys?: SummaryKey[];
  /** Show Print / Download PDF (default true) */
  enableExport?: boolean;
  /** Optional date query param name (e.g. "date") — shows a date picker */
  dateParam?: string;
  /** Initial date value YYYY-MM-DD when dateParam is set */
  initialDate?: string;
};

function getByPath(obj: any, path?: string): any {
  if (!path) {
    if (Array.isArray(obj)) return obj;
    if (Array.isArray(obj?.data)) return obj.data;
    if (Array.isArray(obj?.data?.items)) return obj.data.items;
    if (Array.isArray(obj?.data?.rows)) return obj.data.rows;
    if (Array.isArray(obj?.data?.orders)) return obj.data.orders;
    if (Array.isArray(obj?.data?.products)) return obj.data.products;
    if (Array.isArray(obj?.data?.staff)) return obj.data.staff;
    if (Array.isArray(obj?.data?.expenses)) return obj.data.expenses;
    if (Array.isArray(obj?.data?.cash)) return obj.data.cash;
    if (Array.isArray(obj?.data?.bestSellers)) return obj.data.bestSellers;
    if (Array.isArray(obj?.items)) return obj.items;
    if (Array.isArray(obj?.data?.results)) return obj.data.results;
    return [];
  }
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj) ?? [];
}

function formatVal(val: any, format?: "currency" | "number" | "text") {
  if (val == null || val === "") return "—";
  if (format === "currency") return formatMoney(Number(val));
  if (format === "number") return Number(val).toLocaleString();
  if (looksLikeDateValue(val)) return formatDisplayDate(val);
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function plainCell(row: any, col: ColumnDef): string {
  if (col.exportValue) return col.exportValue(row);
  if (col.render) {
    const rendered = col.render(row);
    if (typeof rendered === "string" || typeof rendered === "number") return String(rendered);
  }
  return formatVal(row[col.key], typeof row[col.key] === "number" ? "number" : "text");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SimpleReportPage({
  title,
  description,
  endpoint,
  listPath,
  columns,
  summaryKeys,
  enableExport = true,
  dateParam,
  initialDate,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateValue, setDateValue] = useState(initialDate || todayISO());

  const buildUrl = () => {
    if (!dateParam) return endpoint;
    const sep = endpoint.includes("?") ? "&" : "?";
    return `${endpoint}${sep}${dateParam}=${encodeURIComponent(dateValue)}`;
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(buildUrl());
      setPayload(res?.data ?? res);
      const list = getByPath(res, listPath);
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast.error(e.message || `Failed to load ${title}`);
      setRows([]);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, dateParam, dateValue]);

  const autoColumns: ColumnDef[] =
    columns ||
    (rows[0]
      ? Object.keys(rows[0])
          .filter((k) => k !== "id")
          .slice(0, 8)
          .map((k) => ({
            key: k,
            label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
          }))
      : [{ key: "_", label: "Data" }]);

  const summaryLines =
    summaryKeys && payload
      ? summaryKeys.map(
          (s) =>
            `${s.label}: ${formatVal(payload[s.key] ?? payload?.summary?.[s.key], s.format)}`
        )
      : undefined;

  const exportColumns = autoColumns.map((c) => ({
    key: c.key,
    label: c.label,
    getValue: (row: any) => plainCell(row, c),
  }));

  const subtitle = dateParam
    ? `Date: ${formatDisplayDate(dateValue)} · Generated ${formatDisplayDate(new Date().toISOString())}`
    : undefined;

  const handlePrint = () => {
    try {
      printTableReport({
        title,
        subtitle,
        columns: exportColumns,
        rows,
        summaryLines,
      });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = () => {
    try {
      downloadTablePdf({
        title,
        subtitle,
        columns: exportColumns,
        rows,
        summaryLines,
        fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${dateParam ? `_${dateValue}` : ""}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {enableExport && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handlePdf}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {dateParam && (
        <div className="border rounded-xl p-4 bg-white flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-white text-sm"
            />
          </div>
        </div>
      )}

      {summaryKeys && summaryKeys.length > 0 && payload && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryKeys.map((s) => (
            <div key={s.key} className="border rounded-xl p-4 bg-white">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-lg font-semibold mt-1">
                {formatVal(payload[s.key] ?? payload?.summary?.[s.key], s.format)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              {autoColumns.map((c) => (
                <th key={c.key} className="p-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={autoColumns.length + 1}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={autoColumns.length + 1}>
                  No data for this report
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || i} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  {autoColumns.map((c) => (
                    <td key={c.key} className="p-3">
                      {c.render
                        ? c.render(row)
                        : formatVal(row[c.key], typeof row[c.key] === "number" ? "number" : "text")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
