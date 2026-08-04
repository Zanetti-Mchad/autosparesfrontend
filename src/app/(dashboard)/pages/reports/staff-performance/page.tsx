"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Staff Performance Report"
      description="Activity by staff"
      endpoint="/reports/staff-performance"
      listPath="data.staff"
      enableDateRange
      summaryKeys={[
        {
          key: "expenseAmount",
          label: "Expense Amount",
          format: "currency",
          sumFrom: "expenseAmount",
        },
        {
          key: "packsCompleted",
          label: "Packs Completed",
          format: "number",
          sumFrom: "packsCompleted",
        },
        {
          key: "deliveries",
          label: "Deliveries",
          format: "number",
          sumFrom: "deliveries",
        },
      ]}
      columns={[
        { key: "name", label: "Staff" },
        { key: "role", label: "Role" },
        { key: "expensesLogged", label: "Expenses Logged" },
        {
          key: "expenseAmount",
          label: "Expense Amount",
          render: (row: any) => `UGX ${Number(row.expenseAmount ?? 0).toLocaleString()}`,
        },
        { key: "productionBatches", label: "Batches" },
        { key: "packsCompleted", label: "Packs" },
        { key: "deliveries", label: "Deliveries" },
        { key: "restocks", label: "Restocks" },
      ]}
    />
  );
}
