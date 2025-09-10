"use client";
import React, { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
}

const DeleteCategoryPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

        const response = await fetch('http://localhost:4210/api/v1/inventory/categories', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
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

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    const filteredIds = filteredCategories.map(cat => cat.id);
    setSelectedCategories(
      selectedCategories.length === filteredIds.length ? [] : filteredIds
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return;

    setIsDeleting(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please login first to delete categories');
        return;
      }

      // Delete categories
      const deletePromises = selectedCategories.map(id => 
        fetch(`http://localhost:4210/api/v1/inventory/categories/${id}`, { 
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        })
      );
      
      const responses = await Promise.all(deletePromises);
      
      // Check if any deletions failed
      const failedDeletions = responses.filter(response => !response.ok);
      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} categories`);
      }
      
      setCategories(prev => prev.filter(cat => !selectedCategories.includes(cat.id)));
      setSelectedCategories([]);
      setShowConfirmDialog(false);
      setSuccess(`Successfully deleted ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete categories. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCategoriesData = categories.filter(cat => selectedCategories.includes(cat.id));

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
            <h1 className="text-3xl font-bold text-red-500 mb-2">Delete Categories</h1>
            <p className="text-muted-foreground">Remove categories from your inventory system</p>
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
              {searchTerm ? 'No categories found matching your search.' : 'No categories available to delete.'}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.length === filteredCategories.length && filteredCategories.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                <span className="text-sm text-muted-foreground">
                  {selectedCategories.length} of {filteredCategories.length} selected
                </span>
              </div>
              
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedCategories.length})
                </button>
              )}
            </div>

            <div className="grid gap-4">
              {filteredCategories.map((category, index) => (
                <div key={category.id} className="glass rounded-xl border border-border/50 p-6 hover:shadow-medium transition-all">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleSelectCategory(category.id)}
                      className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500 mt-1"
                    />
                    
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
                        <span className="text-red-500 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground">{category.name}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Confirm Deletion</h3>
                <p className="text-muted-foreground">
                  Are you sure you want to delete {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}?
                </p>
              </div>


              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Categories to be deleted:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedCategoriesData.map(category => (
                    <div key={category.id} className="text-sm bg-gray-100 rounded px-2 py-1">
                      {category.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Categories'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteCategoryPage;
