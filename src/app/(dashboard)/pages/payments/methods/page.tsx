"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Payment Methods"
      description="Accepted payment methods"
      endpoint="/catalog/payment-methods"
      fields={[
  {
    "key": "name",
    "label": "Method name",
    "required": true
  },
  {
    "key": "type",
    "label": "Type",
    "type": "select",
    "options": [
      {
        "value": "CASH",
        "label": "Cash"
      },
      {
        "value": "MOBILE_MONEY",
        "label": "Mobile Money"
      },
      {
        "value": "BANK",
        "label": "Bank"
      },
      {
        "value": "CARD",
        "label": "Card"
      },
      {
        "value": "OTHER",
        "label": "Other"
      }
    ]
  },
  {
    "key": "description",
    "label": "Description"
  }
]}
      columns={[
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "description", label: "Description" }
      ]}
      createLabel="Add Method"
    />
  );
}
