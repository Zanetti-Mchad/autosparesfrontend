"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Credit Sales Report"
      description="Outstanding credit sales"
      endpoint="/reports/credit-sales"
      
      
      summaryKeys={[{"key":"outstanding","label":"Outstanding","format":"currency"},{"key":"total","label":"Total Credit","format":"currency"}]}
    />
  );
}
