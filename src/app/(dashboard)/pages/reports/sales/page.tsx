"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Sales Report"
      description="Sales overview for the selected period"
      endpoint="/reports/sales"
      listPath="data.orders"
      summaryKeys={[
        { key: "revenue", label: "Revenue", format: "currency" },
        { key: "paid", label: "Paid", format: "currency" },
        { key: "outstanding", label: "Outstanding", format: "currency" },
        { key: "count", label: "Orders", format: "number" },
      ]}
      columns={[
        { key: "orderNumber", label: "Order #" },
        { key: "customerName", label: "Customer" },
        {
          key: "total",
          label: "Total",
          render: (row: any) => `UGX ${Number(row.total ?? 0).toLocaleString()}`,
        },
        { key: "paymentStatus", label: "Payment" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
