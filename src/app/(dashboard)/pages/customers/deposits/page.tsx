"use client";

import { useEffect, useState } from "react";
import { formatDisplayDate } from "@/lib/formatDate";
import { fetchApi } from "@/lib/apiConfig";
import SimpleCrudPage, { FieldDef } from "@/components/SimpleCrudPage";

type Customer = {
  id: string;
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

function customerDisplayName(c: Customer) {
  return c.companyName || c.name || c.email || c.phone || c.id;
}

function extractCustomers(res: any): Customer[] {
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.customers)) return res.data.customers;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res)) return res;
  return [];
}

export default function Page() {
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi("/customers?pageSize=100");
        const list = extractCustomers(res);
        setCustomerOptions(
          list.map((c) => ({
            value: c.id,
            label: customerDisplayName(c),
          }))
        );
      } catch {
        setCustomerOptions([]);
      }
    })();
  }, []);

  const fields: FieldDef[] = [
    {
      key: "customerId",
      label: "Customer",
      type: "select",
      required: true,
      placeholder: "Select customer…",
      options: customerOptions,
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      required: true,
    },
    {
      key: "method",
      label: "Payment method",
    },
    {
      key: "notes",
      label: "Notes",
    },
  ];

  return (
    <SimpleCrudPage
      title="Customer Deposits"
      description="Customer account deposits"
      endpoint="/crm/deposits"
      fields={fields}
      columns={[
        {
          key: "customerId",
          label: "Customer",
          render: (row: any) =>
            row.customer
              ? customerDisplayName(row.customer)
              : row.customerId || "—",
        },
        {
          key: "amount",
          label: "Amount",
          render: (row: any) =>
            `UGX ${Number(row.amount ?? row.total ?? row.price ?? 0).toLocaleString()}`,
        },
        { key: "method", label: "Method" },
        {
          key: "createdAt",
          label: "Date",
          render: (row: any) =>
            formatDisplayDate(row.depositDate || row.createdAt || row.date || row.expenseDate),
        },
      ]}
      createLabel="Record Deposit"
    />
  );
}
