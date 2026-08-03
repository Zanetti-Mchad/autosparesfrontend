"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Service Categories"
      description="Group services"
      endpoint="/catalog/service-categories"
      fields={[
  {
    "key": "name",
    "label": "Category name",
    "required": true
  },
  {
    "key": "description",
    "label": "Description"
  }
]}
      columns={[
    { key: "name", label: "Name" },
    { key: "description", label: "Description" }
      ]}
      createLabel="Add Category"
    />
  );
}
