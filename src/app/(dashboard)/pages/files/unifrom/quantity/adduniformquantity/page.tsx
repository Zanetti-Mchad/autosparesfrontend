"use client";
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/env';

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

console.log('🔧 Environment check:');
console.log('🔧 env.BACKEND_API_URL:', env.BACKEND_API_URL);
console.log('🔧 API_BASE_URL:', API_BASE_URL);

interface Category {
  id: string;
  name: string;
  uniformSizes: Array<{
    id: string;
    size: string;
  }>;
  uniformCodes: Array<{
    id: string;
    code: string;
    categoryId: string;
  }>;
}

interface ApiResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    categories: Category[];
  };
}

interface Size {
  id: string;
  size: string;
}

interface Code {
  id: string;
  code: string;
  categoryId: string;
}

interface InventoryItem {
  id: string;
  uniformItemId: string;
  sizeId: string;
  codeId: string;
  totalQuantity: number;
  availableQuantity: number;
}

const UniformQuantityEntry: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('❌ No access token found for categories fetch');
          return;
        }

        console.log('🚀 Fetching categories...');
        console.log('📡 API URL:', `${API_BASE_URL}/uniforms/categories`);

        const response = await fetch(`${API_BASE_URL}/uniforms/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📥 Categories response status:', response.status);

        if (!response.ok) {
          const data = await response.json();
          console.error('❌ Categories API Error:', data);
          throw new Error(data.status?.returnMessage || 'Failed to fetch categories');
        }

        const data = await response.json();
        console.log('✅ Categories API Response:', data);
        
        // Handle the API response format
        if (data.data && data.data.categories) {
          setCategories(data.data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            uniformSizes: cat.uniformSizes,
            uniformCodes: cat.uniformCodes
          })));
        } else if (data.categories) {
          setCategories(data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            uniformSizes: cat.uniformSizes,
            uniformCodes: cat.uniformCodes
          })));
        }
      } catch (error) {
        console.error('❌ Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch sizes when category changes
  useEffect(() => {
    const fetchSizes = async () => {
      if (!selectedCategory) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/uniforms/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.status?.returnMessage || 'Failed to fetch categories');
        }

        const data = await response.json();
        // Find the selected category and get its sizes
        const category = data.data?.categories?.find((c: any) => c.id === selectedCategory);
        if (category?.uniformSizes) {
          setSizes(category.uniformSizes.map((size: any) => ({
            id: size.id,
            size: size.size
          })));
        } else {
          setSizes([]);
        }
      } catch (error) {
        console.error('Error fetching sizes:', error);
        setSizes([]);
      }
    };
    fetchSizes();
  }, [selectedCategory]);

  // Fetch codes when category changes
  useEffect(() => {
    const fetchCodes = async () => {
      if (!selectedCategory) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/uniforms/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.status?.returnMessage || 'Failed to fetch categories');
        }

        const data = await response.json();
        // Find the selected category and get its codes
        const category = data.data?.categories?.find((c: any) => c.id === selectedCategory);
        if (category?.uniformCodes) {
          setCodes(category.uniformCodes.map((code: any) => ({
            id: code.id,
            code: code.code
          })));
        } else {
          setCodes([]);
        }
      } catch (error) {
        console.error('Error fetching codes:', error);
        setCodes([]);
      }
    };
    fetchCodes();
  }, [selectedCategory]);

  // Fetch inventory when size and code are selected
  useEffect(() => {
    const fetchInventory = async () => {
      if (!selectedCategory || !selectedSize || !selectedCode) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/uniforms/inventory?categoryId=${selectedCategory}&sizeId=${selectedSize}&codeId=${selectedCode}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.status?.returnMessage || 'Failed to fetch inventory');
        }

        const data = await response.json();
        // Handle the API response format
        if (data.data && data.data.inventory) {
          setInventoryItems(data.data.inventory);
        } else if (data.inventory) {
          setInventoryItems(data.inventory);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
    };
    fetchInventory();
  }, [selectedCategory, selectedSize, selectedCode]);

  const handleSave = async () => {
    if (!selectedCategory || !selectedSize || !selectedCode || addQuantity <= 0) {
      alert("Please fill in all fields and enter a valid quantity");
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const requestBody = {
        categoryId: selectedCategory,
        sizeId: selectedSize,
        codeId: selectedCode,
        addQuantity: addQuantity
      };

      console.log('🚀 Making API call to add quantity...');
      console.log('📡 API URL:', `${API_BASE_URL}/uniforms/inventory/add-quantity`);
      console.log('🔑 Token exists:', !!token);
      console.log('📦 Request body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/uniforms/inventory/add-quantity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.status?.returnMessage || `HTTP ${response.status}: Failed to save quantity`);
      }

      // Get the response data
      const data = await response.json();
      console.log('✅ API Success Response:', data);
      
      // Show success message
      setShowSuccess(true);
      setAddQuantity(0);
      
      // Refresh inventory
      const fetchInventory = async () => {
        try {
          console.log('🔄 Refreshing inventory...');
          const response = await fetch(`${API_BASE_URL}/uniforms/inventory?categoryId=${selectedCategory}&sizeId=${selectedSize}&codeId=${selectedCode}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) throw new Error('Failed to fetch inventory');
          const inventoryData = await response.json();
          console.log('📊 Refreshed inventory data:', inventoryData);
          
          // Handle the API response format
          if (inventoryData.data && inventoryData.data.inventory) {
            setInventoryItems(inventoryData.data.inventory);
          } else if (inventoryData.inventory) {
            setInventoryItems(inventoryData.inventory);
          }
        } catch (error) {
          console.error('Error refreshing inventory:', error);
        }
      };
      await fetchInventory();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Error saving quantity:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center py-5">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-96">
                <h2 className="text-2xl font-semibold text-center mb-4">
          Add Quantity for Uniform
        </h2>

        {/* Category Selection */}
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium mb-2">
            Select Category
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border p-2 rounded-md w-full"
          >
            <option value="">Choose a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Size Selection */}
        {selectedCategory && (
          <div className="mb-4">
            <label htmlFor="size" className="block text-sm font-medium mb-2">
              Select Size
            </label>
            <select
              id="size"
              value={selectedSize}
              onChange={async (e) => {
                setSelectedSize(e.target.value);
                if (e.target.value) {
                  try {
                    const token = localStorage.getItem('accessToken');
                    if (!token) return;

                    const response = await fetch(`${API_BASE_URL}/uniforms/inventory?categoryId=${selectedCategory}&sizeId=${e.target.value}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });

                    if (!response.ok) {
                      console.error('Failed to fetch inventory for code matching');
                      return;
                    }

                    const data = await response.json();
                    // Handle the API response format
                    const inventory = data.data?.inventory || data.inventory;
                    if (inventory && inventory.length > 0) {
                      // Set the code from the inventory item
                      setSelectedCode(inventory[0].codeId);
                    }
                  } catch (error) {
                    console.error('Error fetching inventory for code matching:', error);
                  }
                }
              }}
              className="border p-2 rounded-md w-full"
            >
              <option value="">Select size</option>
              {sizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Code Selection */}
        {selectedCategory && (
          <div className="mb-4">
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              Select Code
            </label>
            <select
              id="code"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="border p-2 rounded-md w-full"
            >
              <option value="">Select code</option>
              {codes.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Previous Quantity */}
        {inventoryItems.length > 0 && (
          <div className="mb-4">
            <label htmlFor="previousQuantity" className="block text-sm font-medium mb-2">
              Previous Quantity
            </label>
            <input
              type="number"
              id="previousQuantity"
              value={inventoryItems[0].availableQuantity}
              className="border p-2 rounded-md w-full bg-gray-100"
              disabled
            />
          </div>
        )}

        {/* Add Quantity */}
        <div className="mb-4">
          <label htmlFor="addQuantity" className="block text-sm font-medium mb-2">
            Add Quantity
          </label>
          <input
            type="number"
            id="addQuantity"
            value={addQuantity}
            onChange={(e) => setAddQuantity(Number(e.target.value))}
            placeholder="Enter Quantity to Add"
            className="border p-2 rounded-md w-full"
          />
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="bg-green-500 text-white px-4 py-2 rounded-md w-full hover:bg-green-600 transition duration-200"
        >
          Save
        </button>

        {/* Success Message */}
        {showSuccess && (
          <div className="text-green-500 mt-4 text-center">
            Quantity saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default UniformQuantityEntry;