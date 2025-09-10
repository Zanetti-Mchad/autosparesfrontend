'use client';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { env } from '@/env';

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
}

const InventoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({
    name: '',
    description: '',
    isActive: true
  });

  // Fetch categories from API
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log("Starting API fetch...");
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error("No access token found. Please log in.");
        }
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log("API response status:", response.status);
        if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
        
        const data = await response.json();
        console.log("API data received:", data);
        console.log("Categories to set:", data?.data?.categories);
        
        setCategories(data?.data?.categories || []);
        console.log("Categories state updated");
      } catch (e) {
        console.error("Error fetching categories:", e);
        setError(e instanceof Error ? e.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setEditForm(categories[index]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setEditForm({ name: '', description: '', isActive: true });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setEditForm(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async () => {
    if (!editForm.name) {
      alert("Please enter a category name.");
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error("No access token found");
      
      if (editingIndex !== null && categories[editingIndex]) {
        const categoryId = categories[editingIndex].id;
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/categories/${categoryId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editForm)
        });
        
        if (!response.ok) throw new Error(`Failed to update category: ${response.status}`);
        
        // Refresh categories after successful update
        const fetchCategories = async () => {
          try {
            console.log("Starting API fetch...");
            const token = localStorage.getItem('accessToken');
            if (!token) {
              throw new Error("No access token found. Please log in.");
            }
            const response = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/categories`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log("API response status:", response.status);
            if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
            
            const data = await response.json();
            console.log("API data received:", data);
            console.log("Categories to set:", data?.data?.categories);
            
            setCategories(data?.data?.categories || []);
            console.log("Categories state updated");
          } catch (e) {
            console.error("Error fetching categories:", e);
            setError(e instanceof Error ? e.message : 'Failed to fetch categories');
          } finally {
            setLoading(false);
          }
        };

        fetchCategories();
      }
    } catch (e) {
      console.error("Error updating category:", e);
      setError(e instanceof Error ? e.message : 'Failed to update category');
    } finally {
      setLoading(false);
      closeModal();
    }
  };

  const handleDelete = (index: number) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      const newCategories = categories.filter((_, i) => i !== index);
      setCategories(newCategories);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-full md:w-2/3 mt-20">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Edit Inventory Categories
        </h2>

        {/* Category Table - Desktop Only */}
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
        <div className="overflow-x-auto hidden lg:block">
          <table className="min-w-full bg-white border border-gray-300 mb-6">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">#</th>
                <th className="py-2 px-4 border-b">Name</th>
                <th className="py-2 px-4 border-b">Description</th>
                <th className="py-2 px-4 border-b">Active</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr key={cat.id}>
                  <td className="py-2 px-4 border-b">{index + 1}</td>
                  <td className="py-2 px-4 border-b">{cat.name}</td>
                  <td className="py-2 px-4 border-b">{cat.description || '-'}</td>
                  <td className="py-2 px-4 border-b">{cat.isActive ? 'Yes' : 'No'}</td>
                  <td className="py-2 px-4 border-b text-center">
                    <button
                      className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600"
                      onClick={() => openEditModal(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 ml-2"
                      onClick={() => handleDelete(index)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
        {!loading && !error && (
        <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
          {categories.map((cat, index) => (
            <div key={cat.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1"><span className="font-medium text-gray-700">Description: </span><span className="text-gray-600 text-sm">{cat.description || '-'}</span></div>
                <div className="mb-2"><span className="font-medium text-gray-700">Active: </span><span className="text-gray-600 text-sm">{cat.isActive ? 'Yes' : 'No'}</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 w-full"
                  onClick={() => openEditModal(index)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full"
                  onClick={() => handleDelete(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Responsive Cards - Mobile (md:hidden) */}
        {!loading && !error && (
        <div className="md:hidden mb-6 flex flex-col gap-4">
          {categories.map((cat, index) => (
            <div key={cat.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1"><span className="font-medium text-gray-700">Description: </span><span className="text-gray-600 text-sm">{cat.description || '-'}</span></div>
                <div className="mb-2"><span className="font-medium text-gray-700">Active: </span><span className="text-gray-600 text-sm">{cat.isActive ? 'Yes' : 'No'}</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 w-full"
                  onClick={() => openEditModal(index)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full"
                  onClick={() => handleDelete(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        )}


        {/* Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-2xl font-semibold mb-4">Edit Category</h2>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700">
                  Name:
                </label>
                <input
                  type="text"
                  name="name"
                  className="border border-gray-300 p-2 w-full rounded-md"
                  placeholder="Enter category name"
                  value={editForm.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700">
                  Description:
                </label>
                <input
                  type="text"
                  name="description"
                  className="border border-gray-300 p-2 w-full rounded-md"
                  placeholder="Enter description"
                  value={editForm.description || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">
                  Active:
                </label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={!!editForm.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span>{editForm.isActive ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={closeModal}
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

export default InventoryManagement;