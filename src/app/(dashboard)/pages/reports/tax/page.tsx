"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Tax Report"
      description="Tax collected and owed"
      endpoint="/reports/tax"
      
      
      summaryKeys={[{"key":"taxCollected","label":"Tax Collected","format":"currency"},{"key":"taxOwed","label":"Tax Owed","format":"currency"}]}
    />
  );
}
