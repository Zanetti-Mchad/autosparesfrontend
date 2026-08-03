"use client";
import { formatDisplayDate } from "@/lib/formatDate";
import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function CashOutPage() {
  return (
    <SimpleCrudPage
      title="Cash Out"
      description="Record cash paid out"
      endpoint="/cash/transactions"
      listQuery="?type=OUT"
      listPath="data.transactions"
      createLabel="Record Cash Out"
      extraBody={{ type: "OUT" }}
      transformBody={(form) => ({
        amount: parseFloat(form.amount),
        reference: form.reference || null,
        notes: [form.method, form.notes].filter(Boolean).join(" — ") || null,
        counterparty: form.counterparty || null,
      })}
      fields={[
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "method", label: "Method", placeholder: "Cash / Mobile Money / Bank" },
        { key: "counterparty", label: "Paid to" },
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
          key: "counterparty",
          label: "Paid to",
          render: (row: any) => row.counterparty || "—",
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
