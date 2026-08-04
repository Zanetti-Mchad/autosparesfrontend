"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Top Selling Products"
      description="Best performing products"
      endpoint="/reports/top-selling"
      listPath="data.products"
      enableDateRange
      summaryKeys={[
        { key: "totalSold", label: "Units Sold", format: "number", sumFrom: "qty" },
        { key: "revenue", label: "Revenue", format: "currency", sumFrom: "revenue" },
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
