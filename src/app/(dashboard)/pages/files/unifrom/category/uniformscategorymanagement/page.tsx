'use client';

import Image from 'next/image';
import { env } from '@/env';

import React, { useState, ChangeEvent } from 'react';

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

interface FormData {
  categoryName: string;
  size: string;
  code: string;
}

const UniformCategoryForm = () => {
  const [formData, setFormData] = useState<FormData>({
    categoryName: '',
    size: '',
    code: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [id]: value
    }));
  };

  const saveUniform = async () => {
    if (!formData.categoryName || !formData.size || !formData.code) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${API_BASE_URL}/uniforms/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categoryName: formData.categoryName,
          sizes: [{ size: formData.size }],
          codes: [{ code: formData.code }]
        })
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        throw new Error(data.status?.returnMessage || 'Failed to create uniform category');
      }

      setFormData({
        categoryName: '',
        size: '',
        code: ''
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error:', err);
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-96 mt-20">
        
        <h2 className="text-2xl font-semibold text-center mb-4">Create Uniform Category</h2>
        
        <div className="mb-4">
          <label htmlFor="categoryName" className="block text-gray-700">
            Category Name:
          </label>
          <input
            type="text"
            id="categoryName"
            className="border border-gray-300 p-2 w-full rounded-md"
            placeholder="Enter category name"
            value={formData.categoryName}
            onChange={handleInputChange}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="size" className="block text-gray-700">
            Size:
          </label>
          <input
            type="text"
            id="size"
            className="border border-gray-300 p-2 w-full rounded-md"
            placeholder="Enter size"
            value={formData.size}
            onChange={handleInputChange}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="code" className="block text-gray-700">
            Code:
          </label>
          <input
            type="text"
            id="code"
            className="border border-gray-300 p-2 w-full rounded-md"
            placeholder="Enter code"
            value={formData.code}
            onChange={handleInputChange}
          />
        </div>

        <button
          type="button"
          className="bg-green-500 text-white px-4 py-2 rounded-md w-full hover:bg-green-600"
          onClick={saveUniform}
        >
          Save
        </button>

        {showSuccess && (
          <div className="text-center text-green-600 mt-4">
            Uniform Category has been saved successfully! 
          </div>
        )}
      </div>
    </div>
  );
};

export default UniformCategoryForm;