"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { env } from '@/env';

// Define the base URL from environment variables
const baseUrl = env.BACKEND_API_URL;

const ExpenseCategoryCreator = () => {
  const [category, setCategory] = useState('');
  const [expenseCode, setExpenseCode] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>(['']);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category.trim() || !expenseCode.trim()) {
      alert("Please enter both an expense category and an expense code before saving.");
      return;
    }

    setLoading(true);
    try {
      // Use the correct endpoint for creating an expense category
      const response = await fetch(`${baseUrl}/api/v1/finance/create-expense-category`, {
        method: 'POST', // Change to POST for creating a new category
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, // Include authorization if needed
        },
        body: JSON.stringify({ name: category, code: expenseCode, subcategories }),
      });

      if (!response.ok) {
        throw new Error('Failed to save expense category');
      }

      // Show success message
      setShowSuccess(true);

      // Clear input fields
      setCategory('');
      setExpenseCode('');
      setSubcategories(['']);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving expense category:", error);
      alert("An error occurred while saving the expense category.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryChange = (index: number, value: string) => {
    const newSubcategories = [...subcategories];
    newSubcategories[index] = value;
    setSubcategories(newSubcategories);
  };

  const addSubcategory = () => {
    setSubcategories([...subcategories, '']);
  };

  // Function to create an expense category
  const createExpenseCategory = async (categoryData: { name: string; code: string; }) => {
    try {
      const response = await fetch(`${baseUrl}/api/v1/finance/create-expense-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        throw new Error(`Error creating expense category: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Handle success (e.g., update state, show message)
        console.log('Expense category created successfully:', data);
      } else {
        // Handle error response
        console.error(data.message || 'Failed to create expense category');
      }
    } catch (error) {
      console.error('Network error while creating expense category:', error);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center pt-20">
      <Card className="w-96">
        <CardContent className="p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Create Expense Category
            </CardTitle>
          </CardHeader>

          {/* Expense Category Input */}
          <div className="mb-4">
            <label 
              htmlFor="expenseCategory" 
              className="block text-gray-700 mb-2"
            >
              Expense Category:
            </label>
            <input
              type="text"
              id="expenseCategory"
              className="border border-gray-300 p-2 w-full rounded-md"
              placeholder="Enter expense category (e.g., Salary)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {/* Expense Code Input */}
          <div className="mb-4">
            <label 
              htmlFor="expenseCode" 
              className="block text-gray-700 mb-2"
            >
              Expense Code:
            </label>
            <input
              type="text"
              id="expenseCode"
              className="border border-gray-300 p-2 w-full rounded-md"
              placeholder="Enter expense code (e.g., EXP001)"
              value={expenseCode}
              onChange={(e) => setExpenseCode(e.target.value)}
            />
          </div>

          {/* Subcategories Input */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Subcategories:</label>
            {subcategories.map((subcategory, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  className="border border-gray-300 p-2 w-full rounded-md"
                  placeholder={`Enter subcategory (e.g., Subcategory ${index + 1})`}
                  value={subcategory}
                  onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              className="text-blue-500 hover:underline"
              onClick={addSubcategory}
            >
              Add Subcategory
            </button>
          </div>

          <button
            type="button"
            className={`bg-blue-500 text-white px-4 py-2 rounded-md w-full hover:bg-blue-600 flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>

          {showSuccess && (
            <div className="text-center text-green-600 mt-4 flex items-center justify-center">
              <Check className="w-4 h-4 mr-2" />
              Expense category has been saved successfully!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseCategoryCreator;