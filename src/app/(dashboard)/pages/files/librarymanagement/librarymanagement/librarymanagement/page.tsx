"use client";
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { env } from '@/env';

interface BookFormData {
  bookName: string;
  section: string;
  author: string;
  quantity: string;
}

interface BookResponse {
  message: string;
  book: {
    id: string;
    title: string;
    author: string;
    quantity: number;
    availableQuantity: number;
    sectionId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdById: string;
    updatedById: string | null;
  };
}

interface Class {
  id: string;
  name: string;
  section: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const BookCatalogForm = () => {
  const [formData, setFormData] = useState<BookFormData>({
    bookName: '',
    section: '',
    author: '',
    quantity: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes data
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      window.location.href = '/sign-in';
      return;
    }

    const fetchClasses = async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?isActive=true`, { headers });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch classes');
        }

        const data = await response.json();
        
        if (data.success && data.classes) {
          setClasses(data.classes);
        } else {
          throw new Error('Invalid response format from classes API');
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError(error instanceof Error ? error.message : 'Failed to load classes');
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []); // Empty dependency array since we're checking token inside the effect

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/sign-in';
        return;
      }

      // Log the request body for debugging
      console.log('Request body:', {
        bookName: formData.bookName,
        section: formData.section,
        author: formData.author,
        quantity: parseInt(formData.quantity),
        isActive: true
      });

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookName: formData.bookName,
          section: formData.section,
          author: formData.author,
          quantity: parseInt(formData.quantity),
          isActive: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Response:', errorData);
        throw new Error(errorData.message || 'Failed to add book');
      }

      const data: BookResponse = await response.json();
      console.log('Book added successfully:', data);
      
      setShowSuccess(true);
      setFormData({
        bookName: '',
        section: '',
        author: '',
        quantity: ''
      });

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error adding book:', error);
      setError(error instanceof Error ? error.message : 'Failed to add book');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f8f7] flex justify-center items-center p-4 font-sans">
        <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-sm">
          <div className="text-center text-red-600 text-base">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-3 px-4 bg-[#00796b] hover:bg-[#004d40] text-white rounded transition-colors duration-200 text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f8f7] flex justify-center items-center p-4 font-sans">
      <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-sm">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-bold text-[#00796b] mt-4">Book Catalog</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label 
              htmlFor="bookName"
              className="text-sm text-gray-600 mb-1"
            >
              Name of Book
            </label>
            <input
              type="text"
              id="bookName"
              value={formData.bookName}
              onChange={handleInputChange}
              placeholder="Enter Book Name"
              required
              className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#00796b] focus:ring-1 focus:ring-[#00796b]"
            />
          </div>

          <div className="flex flex-col">
            <label 
              htmlFor="section"
              className="text-sm text-gray-600 mb-1"
            >
              Select Section
            </label>
            <select
              id="section"
              value={formData.section}
              onChange={handleInputChange}
              required
              disabled={loadingClasses}
              className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#00796b] focus:ring-1 focus:ring-[#00796b]"
            >
              <option value="">-- Select Section --</option>
              {!loadingClasses && Array.from(new Set(classes.map(cls => cls.section))).map((section, index) => (
                <option key={index} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label 
              htmlFor="author"
              className="text-sm text-gray-600 mb-1"
            >
              Author
            </label>
            <input
              type="text"
              id="author"
              value={formData.author}
              onChange={handleInputChange}
              placeholder="Enter Author Name"
              required
              className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#00796b] focus:ring-1 focus:ring-[#00796b]"
            />
          </div>

          <div className="flex flex-col">
            <label 
              htmlFor="quantity"
              className="text-sm text-gray-600 mb-1"
            >
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="Enter Quantity Received"
              min="1"
              required
              className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#00796b] focus:ring-1 focus:ring-[#00796b]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || loadingClasses}
            className="w-full py-3 px-4 bg-[#00796b] hover:bg-[#004d40] text-white rounded transition-colors duration-200 text-base mt-4"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </form>

        {/* Success Message */}
        {showSuccess && (
          <div className="mt-4 text-center text-green-600 text-base">
            Book saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCatalogForm;