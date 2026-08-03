"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";
import { formatDisplayDate, looksLikeDateValue } from "@/lib/formatDate";
import { downloadTablePdf, printTableReport } from "@/lib/reportExport";
import { Download, Printer } from "lucide-react";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "date" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  colSpan?: number;
};

export type ColumnDef = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  /** Plain text for print/PDF when render returns non-string nodes */
  exportValue?: (row: any) => string;
};

type Props = {
  title: string;
  description?: string;
  endpoint: string;
  /** Optional query string for GET only, e.g. "?type=IN" */
  listQuery?: string;
  /** Path under response for list array, e.g. "data" or "data.items". Default: tries data then root array */
  listPath?: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  createLabel?: string;
  /** Extra static body fields merged into POST */
  extraBody?: Record<string, unknown>;
  /** Transform form values before POST */
  transformBody?: (form: Record<string, string>) => Record<string, unknown>;
  emptyForm?: Record<string, string>;
  /** When true, skip create form (list-only) */
  listOnly?: boolean;
  /** Show Print / Download PDF (default true) */
  enableExport?: boolean;
  /** Optional client-side filter after fetch */
  rowFilter?: (row: any) => boolean;
  /** Extra classes for the outer container (e.g. max-w-xl mx-auto) */
  containerClassName?: string;
};

function getByPath(obj: any, path?: string): any {
  if (!path) {
    if (Array.isArray(obj)) return obj;
    if (Array.isArray(obj?.data)) return obj.data;
    if (Array.isArray(obj?.data?.items)) return obj.data.items;
    if (Array.isArray(obj?.data?.transactions)) return obj.data.transactions;
    if (Array.isArray(obj?.data?.expenses)) return obj.data.expenses;
    if (Array.isArray(obj?.data?.orders)) return obj.data.orders;
    if (Array.isArray(obj?.data?.products)) return obj.data.products;
    if (Array.isArray(obj?.data?.staff)) return obj.data.staff;
    if (Array.isArray(obj?.items)) return obj.items;
    return [];
  }
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj) ?? [];
}

function plainCell(row: any, col: ColumnDef): string {
  if (col.exportValue) return col.exportValue(row);
  if (col.render) {
    const rendered = col.render(row);
    if (typeof rendered === "string" || typeof rendered === "number") return String(rendered);
  }
  const val = row[col.key];
  if (val == null || val === "") return "—";
  if (typeof val === "object") return val.name ? String(val.name) : "—";
  if (looksLikeDateValue(val)) return formatDisplayDate(val as string);
  return String(val);
}

export default function SimpleCrudPage({
  title,
  description,
  endpoint,
  listQuery = "",
  listPath,
  fields,
  columns,
  createLabel = "Add",
  extraBody,
  transformBody,
  emptyForm,
  listOnly = false,
  enableExport = true,
  rowFilter,
  containerClassName = "",
}: Props) {
  const initial = emptyForm || Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`${endpoint}${listQuery}`);
      let list = getByPath(res, listPath);
      list = Array.isArray(list) ? list : [];
      if (rowFilter) list = list.filter(rowFilter);
      setRows(list);
    } catch (e: any) {
      toast.error(e.message || `Failed to load ${title}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, listQuery]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = transformBody
        ? { ...extraBody, ...transformBody(form) }
        : {
            ...Object.fromEntries(
              fields.map((f) => {
                const v = form[f.key];
                if (f.type === "number" && v !== "") return [f.key, Number(v)];
                return [f.key, v];
              })
            ),
            ...extraBody,
          };
      await fetchApi(endpoint, { method: "POST", body: JSON.stringify(body) });
      toast.success(`${title} saved`);
      setForm(initial);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const renderCell = (row: any, col: ColumnDef) => {
    if (col.render) return col.render(row);
    const val = row[col.key];
    if (val == null || val === "") return "—";
    if (typeof val === "object") return JSON.stringify(val);
    if (looksLikeDateValue(val)) return formatDisplayDate(val as string);
    return String(val);
  };

  const exportColumns = columns.map((c) => ({
    key: c.key,
    label: c.label,
    getValue: (row: any) => plainCell(row, c),
  }));

  const handlePrint = () => {
    try {
      printTableReport({ title, columns: exportColumns, rows });
    } catch (e: any) {
      toast.error(e.message || "Print failed");
    }
  };

  const handlePdf = () => {
    try {
      downloadTablePdf({
        title,
        columns: exportColumns,
        rows,
        fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "PDF failed");
    }
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 ${containerClassName}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        {enableExport && (
          <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>

      {!listOnly && (
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 border rounded-xl p-4 bg-white">
          {fields.map((f) => {
            const common = {
              key: f.key,
              required: f.required,
              className: `border rounded-lg px-3 py-2 ${f.colSpan ? `md:col-span-${f.colSpan}` : ""}`,
              value: form[f.key] ?? "",
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
              ) => setForm({ ...form, [f.key]: e.target.value }),
              placeholder: f.placeholder || f.label,
            };
            if (f.type === "select") {
              return (
                <select {...common}>
                  <option value="">{f.placeholder || f.label}</option>
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              );
            }
            if (f.type === "textarea") {
              return <textarea {...common} rows={2} className={`${common.className} md:col-span-3`} />;
            }
            return <input {...common} type={f.type || "text"} />;
          })}
          <button type="submit" className="md:col-span-3 bg-blue-600 text-white rounded-lg py-2">
            {createLabel}
          </button>
        </form>
      )}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              {columns.map((c) => (
                <th key={c.key} className="p-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={columns.length + 1}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={columns.length + 1}>
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || i} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="p-3">
                      {renderCell(row, c)}
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
