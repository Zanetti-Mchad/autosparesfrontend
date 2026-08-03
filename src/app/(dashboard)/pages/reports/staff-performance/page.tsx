"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Staff Performance Report"
      description="Sales by staff"
      endpoint="/reports/staff-performance"
      
      
      summaryKeys={[{"key":"sales","label":"Sales","format":"currency"},{"key":"orders","label":"Orders","format":"number"}]}
    />
  );
}
