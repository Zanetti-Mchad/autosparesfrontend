"use client";
import React, { useState } from 'react';
import { fetchApi } from '@/lib/apiConfig';

const CreateCategoryPage = () => {
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      setError('Category name is required');
      setSuccess('');
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Please login first to create categories');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await fetchApi('/inventory/categories', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
        } as any,
        body: JSON.stringify({
          name: categoryName.trim(),
          description: `Category for ${categoryName.trim()}`
        })
      });
      
      setSuccess('Category created successfully!');
      setCategoryName('');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8">
      <div className="glass rounded-2xl border border-border/50 shadow-medium p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Create New Category</h1>
          <p className="text-muted-foreground">Add a new product category to organize your inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Category Name *
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              className="w-full glass rounded-xl border border-border/50 px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
              placeholder="e.g., Engine Parts, Brake Systems, Electrical"
              required
              disabled={isLoading}
            />
          </div>


          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
              {success}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-glow hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Create Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCategoryPage;
