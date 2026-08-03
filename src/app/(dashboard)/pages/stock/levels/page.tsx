"use client";

import SimpleReportPage from "@/components/SimpleReportPage";

export default function Page() {
  return (
    <SimpleReportPage
      title="Stock Levels"
      description="Current stock quantities"
      endpoint="/stock/levels"
      
      columns={[
    { key: "name", label: "Product" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Qty" },
    { key: "store", label: "Store" },
    { key: "minStock", label: "Min" }
  ]}
      
    />
  );
}
