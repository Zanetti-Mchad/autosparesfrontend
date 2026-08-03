"use client";
import { formatDisplayDate } from "@/lib/formatDate";
import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function CashInPage() {
  return (
    <SimpleCrudPage
      title="Cash In"
      description="Record cash received"
      endpoint="/cash/transactions"
      listQuery="?type=IN"
      listPath="data.transactions"
      createLabel="Record Cash In"
      extraBody={{ type: "IN" }}
      transformBody={(form) => ({
        amount: parseFloat(form.amount),
        reference: form.reference || null,
        notes: [form.method, form.notes].filter(Boolean).join(" — ") || null,
      })}
      fields={[
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "method", label: "Method", placeholder: "Cash / Mobile Money / Bank" },
        { key: "reference", label: "Reference" },
        { key: "notes", label: "Notes" },
      ]}
      columns={[
        { key: "type", label: "Type" },
        {
          key: "amount",
          label: "Amount",
          render: (row: any) => `UGX ${Number(row.amount ?? 0).toLocaleString()}`,
        },
        {
          key: "paymentMethod",
          label: "Method",
          render: (row: any) => row.paymentMethod?.name || row.notes || "—",
        },
        { key: "reference", label: "Reference" },
        {
          key: "txnDate",
          label: "Date",
          render: (row: any) => (row.txnDate ? formatDisplayDate(row.txnDate) : "—"),
        },
      ]}
    />
  );
}
