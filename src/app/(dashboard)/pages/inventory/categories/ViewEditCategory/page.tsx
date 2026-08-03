"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
}

function extractCategories(data: any): Category[] {
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

const ViewEditCategoryPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setError("Please login first to view categories");
          return;
        }

        const data = await fetchApi("/inventory/categories", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          } as any,
        });
        setCategories(extractCategories(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
  };

  const handleSave = async (updatedCategory: Category) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Please login first to update categories");
        return;
      }

      await fetchApi(`/inventory/categories/${updatedCategory.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        } as any,
        body: JSON.stringify({
          name: updatedCategory.name,
          description: `Category for ${updatedCategory.name}`,
        }),
      });

      setCategories((prev) =>
        prev.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat))
      );

      setEditingCategory(null);
      setSuccess("Category updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
  };

  const requestDelete = (category: Category) => {
    setDeleting(category);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteLoading(true);
      setError("");
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Please login first to delete categories");
        return;
      }

      await fetchApi(`/inventory/categories/${deleting.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        } as any,
      });

      setCategories((prev) => prev.filter((cat) => cat.id !== deleting.id));
      if (editingCategory?.id === deleting.id) setEditingCategory(null);
      setDeleting(null);
      setSuccess("Category deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-4 md:p-6">
        <div className="glass rounded-2xl border border-border/50 shadow-medium p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading categories...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 md:p-6">
      <div className="glass rounded-2xl border border-border/50 shadow-medium p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-1">View & Edit Categories</h1>
            <p className="text-sm text-muted-foreground">Manage your product categories</p>
          </div>

          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
            {success}
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {searchTerm ? "No categories found matching your search." : "No categories available."}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCategories.map((category, index) => (
              <div
                key={category.id}
                className="glass rounded-xl border border-border/50 p-4 hover:shadow-medium transition-all"
              >
                {editingCategory?.id === category.id ? (
                  <EditCategoryForm
                    category={editingCategory}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <CategoryCard
                    category={category}
                    onEdit={handleEdit}
                    onDelete={requestDelete}
                    index={index + 1}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && !deleteLoading && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This cannot be undone.
              Categories with products cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
              <div className="font-medium">{deleting.name}</div>
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
};

const CategoryCard = ({
  category,
  onEdit,
  onDelete,
  index,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  index: number;
}) => (
  <div className="flex justify-between items-center gap-3">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="flex-shrink-0 w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
        <span className="text-primary font-semibold text-xs">{index}</span>
      </div>
      <h3 className="text-base font-semibold text-primary truncate">{category.name}</h3>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        type="button"
        onClick={() => onEdit(category)}
        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(category)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  </div>
);

const EditCategoryForm = ({
  category,
  onSave,
  onCancel,
}: {
  category: Category;
  onSave: (category: Category) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(category.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...category, name: name.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground">Category Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full glass rounded-xl border border-border/50 px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm"
          required
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 glass border border-border/50 text-foreground rounded-lg hover:bg-background/50 transition-colors text-xs font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ViewEditCategoryPage;
