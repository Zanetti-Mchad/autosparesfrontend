"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { env } from '@/env';

const IncomeCategoryCreator = () => {
  const [category, setCategory] = useState('');
  const [code, setCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!category.trim() || !code.trim()) {
      alert("Please enter both an income category and a code before saving.");
      return;
    }

    // Prepare the data to send
    const data = {
      name: category,
      code: code,
    };

    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/create-income-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, // Assuming you store the token in local storage
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(result.message); // Log success message
        setShowSuccess(true);
      } else {
        console.error(result.message); // Log error message
        alert(result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while creating the income category.');
    }

    // Clear input fields
    setCategory('');
    setCode('');

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center pt-20">
      <Card className="w-96">
        <CardContent className="p-6">
 
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Create Income Category
            </CardTitle>
          </CardHeader>

          {/* Income Category Input */}
          <div className="mb-4">
            <label 
              htmlFor="incomeCategory" 
              className="block text-gray-700 mb-2"
            >
              Income Category:
            </label>
            <input
              type="text"
              id="incomeCategory"
              className="border border-gray-300 p-2 w-full rounded-md"
              placeholder="Enter income category (e.g., Salary)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {/* Code Input */}
          <div className="mb-4">
            <label 
              htmlFor="incomeCode" 
              className="block text-gray-700 mb-2"
            >
              Code:
            </label>
            <input
              type="text"
              id="incomeCode"
              className="border border-gray-300 p-2 w-full rounded-md"
              placeholder="Enter code (e.g., IC001)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded-md w-full hover:bg-blue-600 flex items-center justify-center"
            onClick={handleSubmit}
          >
            Save
          </button>

          {showSuccess && (
            <div className="text-center text-green-600 mt-4 flex items-center justify-center">
              <Check className="w-4 h-4 mr-2" />
              Income category has been saved successfully!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeCategoryCreator;