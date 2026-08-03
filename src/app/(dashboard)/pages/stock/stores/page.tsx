"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Stores"
      description="Warehouse and shop locations"
      endpoint="/catalog/stores"
      fields={[
  {
    "key": "name",
    "label": "Store name",
    "required": true
  },
  {
    "key": "location",
    "label": "Location"
  },
  {
    "key": "phone",
    "label": "Phone"
  },
  {
    "key": "manager",
    "label": "Manager"
  }
]}
      columns={[
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    { key: "phone", label: "Phone" },
    { key: "manager", label: "Manager" }
      ]}
      createLabel="Add Store"
    />
  );
}
