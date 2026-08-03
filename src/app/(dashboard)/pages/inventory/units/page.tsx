"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Product Units"
      description="Units of measure used when creating and editing inventory"
      endpoint="/catalog/units"
      fields={[
        { key: "name", label: "Unit name", required: true },
        { key: "abbreviation", label: "Abbreviation", required: true, placeholder: "e.g. pcs, kg, pack" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "abbreviation", label: "Abbr" },
      ]}
      createLabel="Add Unit"
      containerClassName="max-w-xl mx-auto"
    />
  );
}
