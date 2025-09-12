"use client";
import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/apiConfig';

interface Category {
  id: string;
  name: string;
}

const ViewEditCategoryPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Please login first to view categories');
          return;
        }

        const data = await fetchApi('/inventory/categories', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
          } as any
        });
        const categoriesData = data.data || [];
        
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
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
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please login first to update categories');
        return;
      }

      await fetchApi(`/inventory/categories/${updatedCategory.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
        } as any,
        body: JSON.stringify({
          name: updatedCategory.name,
          description: `Category for ${updatedCategory.name}`
        })
      });
      
      setCategories(prev => 
        prev.map(cat => 
          cat.id === updatedCategory.id 
            ? updatedCategory
            : cat
        )
      );
      
      setEditingCategory(null);
      setSuccess('Category updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto mt-10 p-8">
        <div className="glass rounded-2xl border border-border/50 shadow-medium p-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Loading categories...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-8">
      <div className="glass rounded-2xl border border-border/50 shadow-medium p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">View & Edit Categories</h1>
            <p className="text-muted-foreground">Manage your product categories</p>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 sm:w-64 glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
            {success}
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? 'No categories found matching your search.' : 'No categories available.'}
            </div>
            {!searchTerm && (
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Create First Category
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCategories.map((category, index) => (
              <div key={category.id} className="glass rounded-xl border border-border/50 p-6 hover:shadow-medium transition-all">
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
                    index={index + 1}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CategoryCard = ({ category, onEdit, index }: { category: Category; onEdit: (category: Category) => void; index: number }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="flex items-start gap-4 flex-1">
      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
        <span className="text-primary font-semibold text-sm">{index}</span>
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-primary">{category.name}</h3>
      </div>
    </div>
    <button
      onClick={() => onEdit(category)}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
    >
      Edit
    </button>
  </div>
);

const EditCategoryForm = ({ 
  category, 
  onSave, 
  onCancel 
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">
          Category Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm"
          required
        />
      </div>
      
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 glass border border-border/50 text-foreground rounded-lg hover:bg-background/50 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ViewEditCategoryPage;
