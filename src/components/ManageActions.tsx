"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { MANAGE_DENIED_REMARK } from "@/lib/canManage";

type Props = {
  allowed: boolean;
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
  className?: string;
};

/** Touch-friendly Edit / Delete actions for tables and mobile cards */
export default function ManageActions({
  allowed,
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  className = "",
}: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        title={allowed ? editLabel : MANAGE_DENIED_REMARK}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
        className={
          allowed
            ? "inline-flex items-center justify-center gap-1 min-h-10 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium active:bg-blue-100"
            : "inline-flex items-center justify-center gap-1 min-h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
        }
      >
        <Pencil className="w-3.5 h-3.5 shrink-0" /> {editLabel}
      </button>
      <button
        type="button"
        title={allowed ? deleteLabel : MANAGE_DENIED_REMARK}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className={
          allowed
            ? "inline-flex items-center justify-center gap-1 min-h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium active:bg-red-100"
            : "inline-flex items-center justify-center gap-1 min-h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
        }
      >
        <Trash2 className="w-3.5 h-3.5 shrink-0" /> {deleteLabel}
      </button>
    </div>
  );
}
