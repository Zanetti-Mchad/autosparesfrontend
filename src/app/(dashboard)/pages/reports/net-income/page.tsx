"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Net Income Report"
      description="Net income summary"
      endpoint="/reports/net-income"
      listPath="data.bestSellers"
      enableDateRange
      summaryKeys={[
        { key: "netProfit", label: "Net Income", format: "currency" },
        { key: "revenue", label: "Revenue", format: "currency" },
        { key: "expenses", label: "Expenses", format: "currency" },
        { key: "grossProfit", label: "Gross Profit", format: "currency" },
      ]}
      columns={[
        { key: "name", label: "Product" },
        { key: "qty", label: "Units Sold" },
        {
          key: "revenue",
          label: "Revenue",
          render: (row: any) => `UGX ${Number(row.revenue ?? 0).toLocaleString()}`,
        },
      ]}
    />
  );
}
