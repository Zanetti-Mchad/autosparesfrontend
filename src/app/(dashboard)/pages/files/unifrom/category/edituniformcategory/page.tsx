"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import DialogBox from '@/components/Dailogbox';

interface Status {
  returnCode: string;
  returnMessage: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

interface UniformSize {
  id: string;
  size: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UniformCode {
  id: string;
  code: string;
  description: string | null;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UniformItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  uniformSizes: UniformSize[];
  uniformCodes: UniformCode[];
  uniformItems: UniformItem[];
}

interface ApiResponse {
  status: Status;
  data: {
    pagination: Pagination;
    categories: Category[];
  };
}

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

const UniformManagement = () => {
  // Dialog state for errors and confirmations
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => setDialog((d) => ({ ...d, isOpen: false })),
    confirmText: '',
    cancelText: '',
    type: 'info' as 'delete' | 'warning' | 'info',
  });
  // Helper to show dialog
  const showDialog = useCallback((options: Partial<typeof dialog>) => {
    setDialog({
      ...dialog,
      isOpen: true,
      ...options,
      onCancel: options.onCancel || (() => setDialog((d) => ({ ...d, isOpen: false }))),
    });
  }, [dialog]);
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({
    name: '',
    description: ''
  });

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/uniforms/categories`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch categories: ${errorText}`);
        }

        const data = await response.json();
        if (data.status.returnCode === '00') {
          setCategories(data.data.categories);
        } else {
          throw new Error(data.status.returnMessage);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        showDialog({
          title: 'Fetch Failed',
          message: error instanceof Error ? error.message : 'An error occurred',
          type: 'warning',
          confirmText: 'OK',
          cancelText: '',
          onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [showDialog]);

  // Handle opening edit modal
  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditForm({
      name: category.name,
      description: category.description
    });
    setShowModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle saving edited category
  const handleSave = async () => {
    if (!selectedCategory?.id) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/uniforms/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description
        })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          if (errorData.status && errorData.status.returnMessage) {
            throw new Error(errorData.status.returnMessage);
          }
        } catch {
          throw new Error('Failed to update category. Please try again later.');
        }
      }

      const data = await response.json();
      if (data.status.returnCode === '00') {
        // Update local state with the updated category
        setCategories(prev => 
          prev.map(cat => 
            cat.id === selectedCategory.id ? { ...cat, ...editForm } : cat
          )
        );
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        throw new Error(data.status.returnMessage || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      showDialog({
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'An error occurred',
        type: 'warning',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
      });
    }
  };

  // Handle deleting category
  const handleDelete = async (category: Category) => {
    showDialog({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this uniform category?',
      type: 'delete',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`${API_BASE_URL}/uniforms/categories/${category.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          // Check if response is ok
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Remove the deleted category from the list
          setCategories(categories.filter(cat => cat.id !== selectedCategory?.id));
          showDialog({
            title: 'Success',
            message: 'Category deleted successfully',
          type: 'info',
          confirmText: 'OK',
          onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
        });
      } catch (error) {
        console.error('Delete request failed:', error);
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            showDialog({
              title: 'Delete Failed',
              message: 'Failed to connect to server. Please check if the server is running and try again.',
              type: 'warning',
              confirmText: 'OK',
              cancelText: '',
              onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
            });
          } else {
            showDialog({
              title: 'Delete Failed',
              message: error.message,
              type: 'warning',
              confirmText: 'OK',
              cancelText: '',
              onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
            });
          }
        } else {
          showDialog({
            title: 'Delete Failed',
            message: 'An unexpected error occurred. Please try again later.',
            type: 'warning',
            confirmText: 'OK',
            cancelText: '',
            onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
          });
        }
      }
    },
    onCancel: () => setDialog((d) => ({ ...d, isOpen: false })),
  });
};

return (
  <div className="bg-gray-100 min-h-screen flex flex-col items-center py-5">
    <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-full md:w-2/3">
    
        <h2 className="text-2xl font-semibold text-center mb-4">
          Uniform Categories
        </h2>

        {/* Table - Desktop Only */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="min-w-full bg-white border border-gray-300 mb-6">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">#</th>
                <th className="py-2 px-4 border-b">Category</th>
                <th className="py-2 px-4 border-b">Code</th>
                <th className="py-2 px-4 border-b">Size</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id}>
                  <td className="py-2 px-4 border-b">{index + 1}</td>
                  <td className="py-2 px-4 border-b">{category.name}</td>
                  <td className="py-2 px-4 border-b">{category.uniformCodes.map(code => code.code).join(', ')}</td>
                  <td className="py-2 px-4 border-b">{category.uniformSizes.map(size => size.size).join(', ')}</td>
                  <td className="py-2 px-4 border-b text-center">
                    <button 
                      className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </button>
                    <button 
                      className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 ml-2"
                      onClick={() => handleDelete(category)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
          {categories.map((category, index) => (
            <div key={category.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-800">{category.name}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Codes: </span>
                  <span className="text-gray-600 text-sm">{category.uniformCodes.map(code => code.code).join(', ') || '—'}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Sizes: </span>
                  <span className="text-gray-600 text-sm">{category.uniformSizes.map(size => size.size).join(', ') || '—'}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Description: </span>
                  <span className="text-gray-600 text-sm">{category.description || '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 w-full"
                  onClick={() => handleEdit(category)}
                >
                  Edit
                </button>
                <button 
                  className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full"
                  onClick={() => handleDelete(category)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Responsive Cards - Mobile (md:hidden) */}
        <div className="md:hidden mb-6 flex flex-col gap-4">
          {categories.map((category, index) => (
            <div key={category.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-800">{category.name}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Codes: </span>
                  <span className="text-gray-600 text-sm">{category.uniformCodes.map(code => code.code).join(', ') || '—'}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Sizes: </span>
                  <span className="text-gray-600 text-sm">{category.uniformSizes.map(size => size.size).join(', ') || '—'}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Description: </span>
                  <span className="text-gray-600 text-sm">{category.description || '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 w-full"
                  onClick={() => handleEdit(category)}
                >
                  Edit
                </button>
                <button 
                  className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full"
                  onClick={() => handleDelete(category)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error DialogBox */}
        <DialogBox
          isOpen={dialog.isOpen}
          title={dialog.title || (dialog.type === 'warning' ? 'Error' : '')}
          message={dialog.message}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          type={dialog.type}
        />

        {/* Success Message */}
        {showSuccess && (
          <div className="text-center text-green-600 mt-4">
            <p>Category has been updated successfully! ✅</p>
          </div>
        )}

        {/* Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-2xl font-semibold mb-4">Edit Uniform Category</h2>

              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700">
                  Category Name:
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-2 w-full rounded-md"
                  placeholder="Enter category name"
                />
              </div>

              {/* Uniform Codes Display */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Uniform Codes:
                </label>
                <div className="border border-gray-300 p-2 rounded-md bg-gray-50">
                  {selectedCategory?.uniformCodes.length ? (
                    <ul className="list-disc list-inside">
                      {selectedCategory.uniformCodes.map(code => (
                        <li key={code.id} className="text-sm text-gray-600">
                          {code.code} - {code.description || 'No description'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No codes available</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700">
                  Description:
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={editForm.description || ''}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-2 w-full rounded-md h-20"
                  placeholder="Enter description"
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniformManagement;