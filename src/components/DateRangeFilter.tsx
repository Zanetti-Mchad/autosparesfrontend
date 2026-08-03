"use client";

import React from "react";
import { Download, Printer } from "lucide-react";
import { monthStartISO, todayISO } from "@/lib/formatDate";

type Props = {
  fromDate: string;
  toDate: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onReset?: () => void;
  onPrint?: () => void;
  onPdf?: () => void;
  className?: string;
};

export function defaultStockDateRange() {
  return { fromDate: monthStartISO(), toDate: todayISO() };
}

/** From / To date inputs for filtering history tables */
export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  onReset,
  onPrint,
  onPdf,
  className = "",
}: Props) {
  return (
    <div className={`flex flex-col gap-2 w-full sm:w-auto ${className}`}>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full border rounded-lg px-2 py-2 bg-white text-sm min-h-10"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full border rounded-lg px-2 py-2 bg-white text-sm min-h-10"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 min-h-10"
          >
            This month
          </button>
        )}
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 min-h-10"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        )}
        {onPdf && (
          <button
            type="button"
            onClick={onPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 min-h-10"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        )}
      </div>
    </div>
  );
}
