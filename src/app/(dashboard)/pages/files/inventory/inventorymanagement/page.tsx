'use client';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { env } from '@/env';

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

interface FormData {
  name: string;
  description: string;
}

const InventoryItemForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: ''
  });
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      setError("Please fill in all fields before saving.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.status?.returnMessage || 'Failed to create category');
      }

      // Clear form and show success
      setFormData({
        name: '',
        description: ''
      });
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-96 mt-20">

        <h2 className="text-2xl font-semibold text-center mb-6">
          Create Inventory Category
        </h2>

        {error && (
          <div className="text-center text-red-600 mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700">
            Category Name:
          </label>
          <input
            type="text"
            id="name"
            className="border border-gray-300 p-2 w-full rounded-md"
            placeholder="Enter category name (e.g., Stationery)"
            value={formData.name}
            onChange={handleInputChange}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700">
            Description:
          </label>
          <input
            type="text"
            id="description"
            className="border border-gray-300 p-2 w-full rounded-md"
            placeholder="Enter description (e.g., All stationery items)"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        <button
          type="button"
          className="bg-blue-500 text-white px-4 py-2 rounded-md w-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>

        {showSuccess && (
          <div className="text-center text-green-600 mt-4">
            Category created successfully! 
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryItemForm;