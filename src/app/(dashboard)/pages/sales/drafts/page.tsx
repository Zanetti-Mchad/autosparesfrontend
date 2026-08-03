"use client";
import { formatDisplayDate } from '@/lib/formatDate';

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Sales Drafts"
      description="Draft sales documents"
      endpoint="/sales/drafts"
      fields={[
  {
    "key": "customerName",
    "label": "Customer"
  },
  {
    "key": "amount",
    "label": "Amount",
    "type": "number"
  },
  {
    "key": "notes",
    "label": "Notes"
  }
]}
      columns={[
    { key: "id", label: "ID" },
    { key: "customerName", label: "Customer" },
    { key: "amount", label: "Amount", render: (row: any) => `UGX ${Number(row.amount ?? row.total ?? row.price ?? 0).toLocaleString()}` },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Date", render: (row: any) => formatDisplayDate(row.createdAt || row.date || row.expenseDate) }
      ]}
      createLabel="Save Draft"
    />
  );
}
