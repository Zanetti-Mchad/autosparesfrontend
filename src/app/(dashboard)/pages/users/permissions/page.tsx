"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";

export default function Page() {
  return (
    <SimpleCrudPage
      title="Permissions"
      description="System permissions catalog"
      endpoint="/permissions"
      transformBody={(form) => ({
        permissions: [
          {
            name: form.name,
            description: form.description || null,
          },
        ],
      })}
      fields={[
        { key: "name", label: "Permission name", required: true, placeholder: "e.g. manage_users" },
        { key: "description", label: "Description" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
      ]}
      createLabel="Add Permission"
    />
  );
}
