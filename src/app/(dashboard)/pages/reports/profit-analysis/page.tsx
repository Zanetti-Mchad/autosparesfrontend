"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Profit Analysis Report"
      description="Gross and net profit"
      endpoint="/reports/profit-analysis"
      listPath="data.bestSellers"
      enableDateRange
      summaryKeys={[
        { key: "grossProfit", label: "Gross Profit", format: "currency" },
        { key: "netProfit", label: "Net Profit", format: "currency" },
        { key: "revenue", label: "Revenue", format: "currency" },
        { key: "expenses", label: "Expenses", format: "currency" },
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
