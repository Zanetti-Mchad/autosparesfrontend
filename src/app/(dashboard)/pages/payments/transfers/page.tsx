"use client";
import { formatDisplayDate } from "@/lib/formatDate";
import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Money Transfers"
      description="Transfer money between accounts"
      endpoint="/cash/transfers"
      fields={[
        { key: "fromAccount", label: "From account", required: true },
        { key: "toAccount", label: "To account", required: true },
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "notes", label: "Notes" },
      ]}
      columns={[
        { key: "fromAccount", label: "From" },
        { key: "toAccount", label: "To" },
        {
          key: "amount",
          label: "Amount",
          render: (row: any) =>
            `UGX ${Number(row.amount ?? row.total ?? row.price ?? 0).toLocaleString()}`,
        },
        {
          key: "notes",
          label: "Notes",
          render: (row: any) => row.notes || "—",
        },
        {
          key: "transferDate",
          label: "Date",
          render: (row: any) =>
            formatDisplayDate(row.transferDate || row.createdAt || row.date),
        },
      ]}
      createLabel="Transfer"
    />
  );
}
