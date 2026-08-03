"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Products Sales Report"
      description="Sales by product"
      endpoint="/reports/product-sales"
      
      
      summaryKeys={[{"key":"revenue","label":"Revenue","format":"currency"}]}
    />
  );
}
