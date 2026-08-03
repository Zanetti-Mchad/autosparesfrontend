"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Top Selling Products"
      description="Best performing products"
      endpoint="/reports/top-selling"
      
      
      summaryKeys={[{"key":"totalSold","label":"Units Sold","format":"number"},{"key":"revenue","label":"Revenue","format":"currency"}]}
    />
  );
}
