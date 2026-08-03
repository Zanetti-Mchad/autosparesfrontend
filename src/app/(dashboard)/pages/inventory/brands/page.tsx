"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Brands"
      description="Product brands used when creating and editing inventory"
      endpoint="/catalog/brands"
      containerClassName="max-w-xl mx-auto"
      fields={[{ key: "name", label: "Brand name", required: true }]}
      columns={[{ key: "name", label: "Name" }]}
      createLabel="Add Brand"
    />
  );
}
