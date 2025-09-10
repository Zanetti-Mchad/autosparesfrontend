'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { env } from '@/env';
import Image from 'next/image';

interface CategorySizes {
  [key: string]: string[];
}

interface PreviousQuantities {
  [key: string]: number;
}

const InventoryQuantityForm = () => {
  // API data state
  const [categories, setCategories] = useState<Array<any>>([]);
  const [items, setItems] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    previousQuantity: 0,
    addQuantity: '',
    totalQuantity: 0
  });

  const [showSuccess, setShowSuccess] = useState(false);


  // Fetch categories and items
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found. Please log in.');
      const [catRes, itemRes] = await Promise.all([
        fetch(`${env.BACKEND_API_URL}/api/v1/inventory/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${env.BACKEND_API_URL}/api/v1/inventory/items`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (!catRes.ok) throw new Error('Failed to fetch categories');
      if (!itemRes.ok) throw new Error('Failed to fetch items');
      const catData = await catRes.json();
      const itemData = await itemRes.json();
      // Fix: Use the correct path to access inventory items
      setCategories(catData?.data?.categories || []);
      setItems(itemData?.data?.inventoryItems || []); // Changed from itemData?.data?.items
      console.log('Categories:', catData?.data?.categories);
      console.log('Items:', itemData?.data?.inventoryItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };


  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Update previous quantity and description when category changes
  // Show all previous balances for the selected category/description
  type PreviousBalance = {
    code: string;
    totalQuantity: number;
    updatedAt: string | Date | null;
  };
  const [previousBalances, setPreviousBalances] = useState<PreviousBalance[]>([]);

  useEffect(() => {
    if (formData.category) {
      // Fix: Adjust the filter to match the actual data structure
      let filteredItems = items.filter(item => 
        String(item.inventoryItem?.categoryId) === String(formData.category)
      );
      // Debug
      console.log('Category ID:', formData.category);
      console.log('Filtered items:', filteredItems);
      if (formData.description) {
        filteredItems = filteredItems.filter(item => 
          item.inventoryItem?.description === formData.description
        );
      }
      // Sort descending by updatedAt/createdAt
      const sorted = filteredItems.slice().sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setPreviousBalances(sorted.map(item => ({
        code: item.code,
        totalQuantity: item.inventoryQuantities?.[0]?.totalQuantity ?? 0,
        updatedAt: item.updatedAt || item.createdAt
      })));
      // Use the most recent for the form
      const prevQty = sorted.length > 0 ? sorted[0].inventoryQuantities?.[0]?.totalQuantity || 0 : 0;
      // Use the selected category's description for the form description field
      const selectedCat = categories.find(cat => String(cat.id) === String(formData.category));
      const catDescription = selectedCat?.description || '';
      console.log('Previous quantity found:', prevQty);
      console.log('Category description:', catDescription);
      setFormData(prev => ({
        ...prev,
        previousQuantity: prevQty,
        totalQuantity: prevQty + (parseInt(prev.addQuantity) || 0),
        description: catDescription
      }));
    } else {
      setPreviousBalances([]);
      setFormData(prev => ({
        ...prev,
        previousQuantity: 0,
        totalQuantity: 0 + (parseInt(prev.addQuantity) || 0),
        description: ''
      }));
    }
  }, [formData.category, formData.description, items, categories]);


  // ...inside your JSX, render this below the form:
  // {previousBalances.length > 0 && (
  //   <div className="mt-4">
  //     <h4 className="font-semibold mb-2">Previous Balances:</h4>
  //     <table className="min-w-full border text-xs">
  //       <thead>
  //         <tr className="bg-gray-100">
  //           <th className="border px-2 py-1">Code</th>
  //           <th className="border px-2 py-1">Quantity</th>
  //           <th className="border px-2 py-1">Last Updated</th>
  //         </tr>
  //       </thead>
  //       <tbody>
  //         {previousBalances.map((b, i) => (
  //           <tr key={b.code + i}>
  //             <td className="border px-2 py-1">{b.code}</td>
  //             <td className="border px-2 py-1">{b.totalQuantity}</td>
  //             <td className="border px-2 py-1">{b.updatedAt ? new Date(b.updatedAt).toLocaleString() : '-'}</td>
  //           </tr>
  //         ))}
  //       </tbody>
  //     </table>
  //   </div>
  // )}


  // Calculate total quantity when add quantity changes
  useEffect(() => {
    const addQuantityNum = parseInt(formData.addQuantity) || 0;
    setFormData(prev => ({
      ...prev,
      totalQuantity: prev.previousQuantity + addQuantityNum
    }));
  }, [formData.addQuantity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    console.log('Input change:', id, value);
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    setTimeout(() => {
      console.log('formData after input:', {...formData, [id]: value});
    }, 0);
  };


  // Get subcategories (sizes) for selected category from items
  const subcategories = items.filter(item => item.categoryId === formData.category);


  const handleSave = async () => {
    console.log('formData before save:', formData);
    if (!formData.category) {
      alert("Please select a category.");
      return;
    }
    if (!formData.addQuantity || isNaN(Number(formData.addQuantity)) || Number(formData.addQuantity) <= 0) {
      alert("Please enter a valid quantity greater than zero.");
      return;
    }
    if (!formData.description || formData.description.trim() === "") {
      alert("Please enter a description.");
      return;
    }

    // Find the selected category by id
    const selectedCategory = categories.find(cat => String(cat.id) === String(formData.category));

    const payload = {
      category: formData.category,
      description: formData.description,
      previousQuantity: formData.previousQuantity,
      addQuantity: Number(formData.addQuantity),
      totalQuantity: formData.totalQuantity
    };
    console.log('Payload to send:', payload);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      console.log('API response:', data);

      if (response.ok && data.status?.returnCode === "00") {
        setShowSuccess(true);
        setFormData({
          category: '',
          description: '',
          previousQuantity: 0,
          addQuantity: '',
          totalQuantity: 0
        });
        // Refresh inventory data after successful add
        fetchData();
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(data.status?.returnMessage || "Failed to add inventory item.");
      }
    } catch (e) {
      alert("Network error. Please try again.");
      console.error(e);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-96 mt-5">
            <h2 className="text-2xl font-semibold text-center mb-4">
          Add Quantity for Inventory
        </h2>

        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium mb-2">
            Select Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            className="border p-2 rounded-md w-full"
            value={formData.category}
            onChange={handleInputChange}
            required
          >
            <option value="">Choose a category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Description field below category */}
        {formData.category && (
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              className="border p-2 rounded-md w-full bg-gray-100"
              placeholder="Category description"
              required
              readOnly
            />
          </div>
        )}





        <div className="mb-4">
          <label htmlFor="previousQuantity" className="block text-sm font-medium mb-2">
            Previous Quantity
          </label>
          <input
            type="number"
            id="previousQuantity"
            value={formData.previousQuantity}
            className="border p-2 rounded-md w-full bg-gray-100"
            disabled
          />
        </div>



        <div className="mb-4">
          <label htmlFor="addQuantity" className="block text-sm font-medium mb-2">
            Add Quantity
          </label>
          <input
            type="number"
            id="addQuantity"
            value={formData.addQuantity}
            onChange={handleInputChange}
            placeholder="Enter Quantity to Add"
            className="border p-2 rounded-md w-full"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="totalQuantity" className="block text-sm font-medium mb-2">
            Total Quantity
          </label>
          <input
            type="number"
            id="totalQuantity"
            value={formData.totalQuantity}
            className="border p-2 rounded-md w-full bg-gray-100"
            disabled
          />
        </div>

        <button
          type="button"
          className="bg-green-500 text-white px-4 py-2 rounded-md w-full hover:bg-green-600"
          onClick={handleSave}
        >
          Save
        </button>

        {showSuccess && (
          <div className="text-green-500 mt-4 text-center">
            Quantity saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryQuantityForm;