"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Net Income Report"
      description="Net income summary"
      endpoint="/reports/net-income"
      
      
      summaryKeys={[{"key":"netIncome","label":"Net Income","format":"currency"},{"key":"revenue","label":"Revenue","format":"currency"},{"key":"expenses","label":"Expenses","format":"currency"}]}
    />
  );
}
