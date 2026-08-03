"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Services"
      description="Billable services"
      endpoint="/catalog/services"
      fields={[
  {
    "key": "name",
    "label": "Service name",
    "required": true
  },
  {
    "key": "price",
    "label": "Price",
    "type": "number",
    "required": true
  },
  {
    "key": "categoryId",
    "label": "Category ID"
  },
  {
    "key": "description",
    "label": "Description"
  }
]}
      columns={[
    { key: "name", label: "Name" },
    { key: "price", label: "Price", render: (row: any) => `UGX ${Number(row.amount ?? row.total ?? row.price ?? 0).toLocaleString()}` },
    { key: "categoryId", label: "Category" },
    { key: "description", label: "Description" }
      ]}
      createLabel="Add Service"
    />
  );
}
