"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Taxes"
      description="Tax rates"
      endpoint="/catalog/tax-rates"
      fields={[
  {
    "key": "name",
    "label": "Tax name",
    "required": true
  },
  {
    "key": "rate",
    "label": "Rate %",
    "type": "number",
    "required": true
  },
  {
    "key": "description",
    "label": "Description"
  }
]}
      columns={[
    { key: "name", label: "Name" },
    { key: "rate", label: "Rate %" },
    { key: "description", label: "Description" }
      ]}
      createLabel="Add Tax Rate"
    />
  );
}
