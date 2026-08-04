"use client";

import SimpleReportPage from "@/components/SimpleReportPage";
import { formatDisplayDate } from "@/lib/formatDate";

export default function Page() {
  return (
    <SimpleReportPage
      title="Credit Sales Report"
      description="Outstanding credit sales"
      endpoint="/reports/credit-sales"
      listPath="data.orders"
      enableDateRange
      summaryKeys={[
        { key: "totalBalance", label: "Outstanding", format: "currency" },
        { key: "count", label: "Orders", format: "number" },
      ]}
      columns={[
        { key: "orderNumber", label: "Order #" },
        { key: "customerName", label: "Customer" },
        {
          key: "createdAt",
          label: "Date",
          render: (row: any) => formatDisplayDate(row.createdAt),
        },
        {
          key: "total",
          label: "Total",
          render: (row: any) => `UGX ${Number(row.total ?? 0).toLocaleString()}`,
        },
        {
          key: "paid",
          label: "Paid",
          render: (row: any) => `UGX ${Number(row.paid ?? 0).toLocaleString()}`,
        },
        {
          key: "balance",
          label: "Balance",
          render: (row: any) => `UGX ${Number(row.balance ?? 0).toLocaleString()}`,
        },
        { key: "paymentStatus", label: "Payment" },
      ]}
    />
  );
}
