"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
  /** Extra text used only for filtering (sku, phone, etc.) */
  searchText?: string;
  description?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search and select…",
  emptyMessage = "No matches",
  disabled = false,
  required = false,
  className = "",
  id,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label || "");
    }
  }, [selected, open, value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selected.label)) return options.slice(0, 80);
    return options
      .filter((o) => {
        const hay = `${o.label} ${o.searchText || ""} ${o.description || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 80);
  }, [options, query, selected]);

  const pick = (opt: SearchableOption) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          disabled={disabled}
          required={required && !value}
          autoComplete="off"
          className="w-full border rounded-lg pl-9 pr-9 py-2 bg-white disabled:bg-gray-50"
          placeholder={placeholder}
          value={open ? query : selected?.label || query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            setOpen(true);
            if (selected) setQuery(selected.label);
          }}
        />
        {(value || query) && !disabled && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700"
            onClick={clear}
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 sm:max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                  opt.value === value ? "bg-blue-50" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-gray-500">{opt.description}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
