"use client";

import React, { useCallback, useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { getRole } from "@/lib/data";
import toast from "react-hot-toast";
import { Pencil, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  userId?: string | null;
  user?: { id: string; firstName?: string | null; lastName?: string | null } | null;
};

function currentUserId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("userId") || "";
}

function isAdminRole() {
  return String(getRole() || "").toLowerCase() === "admin";
}

function canManage(cat: Category) {
  if (isAdminRole()) return true;
  const uid = currentUserId();
  return Boolean(uid && cat.userId && cat.userId === uid);
}

function creatorLabel(cat: Category) {
  if (!cat.user) return "—";
  return [cat.user.firstName, cat.user.lastName].filter(Boolean).join(" ") || "—";
}

export default function ExpenseCategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/catalog/expense-categories");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRows(list);
    } catch (e: any) {
      toast.error(e.message || "Failed to load categories");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      setSaving(true);
      await fetchApi("/catalog/expense-categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      });
      toast.success("Category added");
      setForm({ name: "", description: "" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat: Category) => {
    if (!canManage(cat)) {
      toast.error("Only an admin or the creator can edit this category");
      return;
    }
    setEditing(cat);
    setEditForm({
      name: cat.name,
      description: cat.description || "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      setSaving(true);
      await fetchApi(`/catalog/expense-categories/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
        }),
      });
      toast.success("Category updated");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (cat: Category) => {
    if (!canManage(cat)) {
      toast.error("Only an admin or the creator can delete this category");
      return;
    }
    setDeleting(cat);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteLoading(true);
      await fetchApi(`/catalog/expense-categories/${deleting.id}`, { method: "DELETE" });
      toast.success("Category deleted");
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Expense Categories</h1>
        <p className="text-sm text-gray-500">
          Classify expenses — edit/delete only for admin or the creator
        </p>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-xl p-3 sm:p-4 bg-white">
        <input
          required
          className="w-full border rounded-lg px-3 py-2 bg-white min-h-10"
          placeholder="Category name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 bg-white md:col-span-2 min-h-10"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button
          type="submit"
          disabled={saving}
          className="md:col-span-3 bg-blue-600 text-white rounded-lg py-2.5 min-h-10 disabled:opacity-50"
        >
          {saving && !editing ? "Saving…" : "Add Category"}
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl bg-white hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Created by</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  No categories yet
                </td>
              </tr>
            ) : (
              rows.map((cat, i) => (
                <tr key={cat.id} className="border-t">
                  <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                  <td className="p-3 font-medium">{cat.name}</td>
                  <td className="p-3">{cat.description || "—"}</td>
                  <td className="p-3">{creatorLabel(cat)}</td>
                  <td className="p-3">
                    {canManage(cat) ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(cat)}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">No categories yet</div>
        ) : (
          rows.map((cat, i) => (
            <div key={cat.id} className="border rounded-xl bg-white p-4 space-y-2">
              <div className="text-xs text-gray-400 font-semibold">{i + 1}.</div>
              <div className="font-medium">{cat.name}</div>
              <div className="text-sm text-gray-600">{cat.description || "—"}</div>
              <div className="text-xs text-gray-500">By {creatorLabel(cat)}</div>
              {canManage(cat) && (
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="inline-flex items-center gap-1 text-blue-600 text-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(cat)}
                    className="inline-flex items-center gap-1 text-red-600 text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">Edit category</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-4 grid gap-3">
              <input
                required
                className="border rounded-lg px-3 py-2 bg-white"
                placeholder="Category name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 bg-white"
                rows={3}
                placeholder="Description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={!!deleting} onOpenChange={(open) => !open && !deleteLoading && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{deleting.name}</div>
              {deleting.description ? (
                <div className="text-muted-foreground">{deleting.description}</div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setDeleting(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
