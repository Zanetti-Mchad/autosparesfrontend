"use client";

import { formatDisplayDate } from "@/lib/formatDate";
import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Daily Cash Report"
      description="Day cash in/out summary"
      endpoint="/cash/daily-report"
      dateParam="date"
      listPath="data.cash"
      summaryKeys={[
        { key: "cashIn", label: "Cash In", format: "currency" },
        { key: "cashOut", label: "Cash Out", format: "currency" },
        { key: "paymentsTotal", label: "Payments", format: "currency" },
        { key: "expenseTotal", label: "Expenses", format: "currency" },
        { key: "salesTotal", label: "Sales", format: "currency" },
        { key: "netCash", label: "Net Cash", format: "currency" },
      ]}
      columns={[
        { key: "type", label: "Type" },
        {
          key: "amount",
          label: "Amount",
          render: (row: any) => `UGX ${Number(row.amount ?? 0).toLocaleString()}`,
        },
        {
          key: "reference",
          label: "Reference",
          render: (row: any) => row.reference || "—",
        },
        {
          key: "notes",
          label: "Notes",
          render: (row: any) => row.notes || "—",
        },
        {
          key: "txnDate",
          label: "Date",
          render: (row: any) =>
            row.txnDate ? formatDisplayDate(row.txnDate) : "—",
        },
      ]}
    />
  );
}
