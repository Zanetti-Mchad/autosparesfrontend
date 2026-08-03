"use client";
import { formatDisplayDate } from '@/lib/formatDate';

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Sales Returns"
      description="Record returned sales"
      endpoint="/sales/returns"
      fields={[
  {
    "key": "invoiceNumber",
    "label": "Invoice #",
    "required": true
  },
  {
    "key": "amount",
    "label": "Amount",
    "type": "number",
    "required": true
  },
  {
    "key": "reason",
    "label": "Reason"
  }
]}
      columns={[
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "amount", label: "Amount", render: (row: any) => `UGX ${Number(row.amount ?? row.total ?? row.price ?? 0).toLocaleString()}` },
    { key: "reason", label: "Reason" },
    { key: "createdAt", label: "Date", render: (row: any) => formatDisplayDate(row.createdAt || row.date || row.expenseDate) }
      ]}
      createLabel="Record Return"
    />
  );
}
