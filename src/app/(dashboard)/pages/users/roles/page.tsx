"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import toast from "react-hot-toast";

type Permission = {
  id: string;
  name: string;
  description?: string | null;
};

type Role = {
  id: string;
  name: string;
  description?: string | null;
  permissions?: string[] | null;
  permissionList?: string[];
};

function rolePermissions(role: Role): string[] {
  if (Array.isArray(role.permissionList)) return role.permissionList;
  if (Array.isArray(role.permissions)) return role.permissions;
  return [];
}

const DESCRIPTION_PRESETS = [
  "Full access",
  "Store manager",
  "POS cashier",
  "View and manage users",
  "View reports only",
  "Manage stock and inventory",
  "Manage cash and payments",
  "Manage sales and orders",
  "Read-only access",
  "Supervisor",
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pick, setPick] = useState("");

  const availableToAdd = useMemo(
    () => permissions.filter((p) => !selected.includes(p.name)),
    [permissions, selected]
  );

  const descriptionOptions = useMemo(() => {
    const fromRoles = roles
      .map((r) => r.description?.trim())
      .filter((d): d is string => Boolean(d));
    return [...new Set([...DESCRIPTION_PRESETS, ...fromRoles])];
  }, [roles]);

  const load = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        fetchApi("/roles"),
        fetchApi("/permissions"),
      ]);

      const roleList = Array.isArray(rolesRes?.data)
        ? rolesRes.data
        : Array.isArray(rolesRes)
          ? rolesRes
          : [];
      const permList = Array.isArray(permsRes?.data)
        ? permsRes.data
        : Array.isArray(permsRes)
          ? permsRes
          : [];

      setRoles(roleList);
      setPermissions(permList);
    } catch (e: any) {
      toast.error(e.message || "Failed to load roles/permissions");
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addPermission = (value?: string) => {
    const permName = (value ?? pick).trim();
    if (!permName) return;
    if (selected.includes(permName)) {
      toast.error("Already added");
      return;
    }
    setSelected((prev) => [...prev, permName]);
    setPick("");
  };

  const removePermission = (permName: string) => {
    setSelected((prev) => prev.filter((p) => p !== permName));
  };

  const togglePermission = (permName: string) => {
    setSelected((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName]
    );
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelected([]);
    setPick("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    try {
      setSaving(true);
      await fetchApi("/roles", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          permissions: selected,
        }),
      });
      toast.success("Role created");
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <p className="text-sm text-gray-500">
          Create roles and assign permissions from the available list
        </p>
      </div>

      <form onSubmit={submit} className="border rounded-xl p-4 bg-white space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role name</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. cashier"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            >
              <option value="">Select a description…</option>
              {descriptionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add permission
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="flex-1 border rounded-lg px-3 py-2 bg-white"
              value={pick}
              onChange={(e) => {
                const value = e.target.value;
                setPick(value);
                if (value) addPermission(value);
              }}
            >
              <option value="">
                {permissions.length
                  ? "Select a permission to add…"
                  : "No permissions available — create some first"}
              </option>
              {availableToAdd.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                  {p.description ? ` — ${p.description}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!pick}
              onClick={() => addPermission()}
              className="px-4 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Pick from existing permissions (e.g. view_roles, manage_users). Manage the catalog under
            Permissions.
          </p>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100 px-3 py-1 text-sm"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removePermission(p)}
                  className="ml-1 text-blue-600 hover:text-blue-900"
                  aria-label={`Remove ${p}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available permissions
          </label>
          {permissions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No permissions yet. Add them under User Management → Permissions.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {permissions.map((p) => {
                const checked = selected.includes(p.name);
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                      checked ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => togglePermission(p.name)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800">{p.name}</span>
                      {p.description && (
                        <span className="block text-xs text-gray-500">{p.description}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add Role"}
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Permissions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={4}>
                  No roles found
                </td>
              </tr>
            ) : (
              roles.map((role, index) => {
                const perms = rolePermissions(role);
                return (
                  <tr key={role.id} className="border-t align-top">
                    <td className="p-3 text-gray-500 tabular-nums">{index + 1}</td>
                    <td className="p-3 font-medium">{role.name}</td>
                    <td className="p-3">{role.description || "—"}</td>
                    <td className="p-3">
                      {perms.length === 0 ? (
                        <span className="text-gray-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {perms.map((p) => (
                            <span
                              key={p}
                              className="inline-block rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
