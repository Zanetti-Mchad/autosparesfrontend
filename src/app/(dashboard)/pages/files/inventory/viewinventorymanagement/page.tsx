'use client';
import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';
import { env } from '@/env';

interface InventoryItem {
  id: number;
  category: string;
  subcategory: string;
  previousQuantity: number;
  addedQuantity: number;
  balanceQuantity?: number;
}

interface Totals {
  previousQuantity: number;
  addedQuantity: number;
  balanceQuantity: number;
}

const InventoryManagement = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);
  const [totals, setTotals] = useState<Totals>({
    previousQuantity: 0,
    addedQuantity: 0,
    balanceQuantity: 0
  });

  const calculateTotals = useCallback(() => {
    const newTotals = inventory.reduce(
      (acc, item) => ({
        previousQuantity: acc.previousQuantity + item.previousQuantity,
        addedQuantity: acc.addedQuantity + item.addedQuantity,
        balanceQuantity: acc.balanceQuantity + (item.previousQuantity + item.addedQuantity)
      }),
      { previousQuantity: 0, addedQuantity: 0, balanceQuantity: 0 }
    );
    setTotals(newTotals);
  }, [inventory]);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch inventory from API on mount and after changes
  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      const apiItems = data?.data?.inventoryItems || [];
      // Map API data to InventoryItem interface
      const mapped = apiItems.map((item: any, idx: number) => ({
        id: item.id ?? idx + 1, // Prefer unique id from backend
        category: item.inventoryItem?.category?.name || '',
        subcategory: item.inventoryItem?.name || '',
        previousQuantity: item.inventoryQuantities?.[0]?.totalQuantity ?? 0,
        addedQuantity: 0, // You can extend this to show actual added quantity if tracked
        balanceQuantity: item.inventoryQuantities?.[0]?.totalQuantity ?? 0
      }));
      setInventory(mapped);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const handleEdit = (id: number) => {
    setEditingId(editingId === id ? null : id);
  };

  const handleInputChange = (id: number, field: keyof InventoryItem, value: string) => {
    setInventory(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newValue = field === 'category' || field === 'subcategory' 
            ? value 
            : parseInt(value) || 0;
          return { ...item, [field]: newValue };
        }
        return item;
      })
    );
  };

  const handleSave = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) throw new Error('Item not found');
      
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');
      
      // Calculate total quantity (previous + added)
      const totalQuantity = (item.previousQuantity ?? 0) + (item.addedQuantity ?? 0);
      
      // Format payload according to backend expectations
      const payload = {
        itemType: item.subcategory,
        category: item.category,
        description: item.subcategory, // Using subcategory as description
        totalQuantity
      };
      
      console.log('Update payload:', payload);
      
      const res = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/items/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      console.log('Update response status:', res.status, 'body:', text);
      
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      
      if (!res.ok) throw new Error((data && data.status?.returnMessage) || 'Failed to update item');
      
      setEditingId(null);
      await fetchInventory(); // Refresh data after successful update
    } catch (e: any) {
      setError(e.message || 'Failed to update item');
      console.error('Update error:', e);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (deleteModalId !== null) {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No access token found');
        // Make API call to delete inventory item
        const res = await fetch(`${env.BACKEND_API_URL}/api/v1/inventory/items/${deleteModalId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const text = await res.text();
        console.log('Delete response status:', res.status, 'body:', text);
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        if (!res.ok) throw new Error((data && data.status?.returnMessage) || 'Failed to delete item');
        setDeleteModalId(null);
        await fetchInventory();
      } catch (e: any) {
        setError(e.message || 'Failed to delete item');
        console.error('Delete error:', e);
      } finally {
        setLoading(false);
      }
    }
  };


  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    console.log('Exporting data...');
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="bg-white shadow-lg rounded-lg p-6 mt-5" style={{ maxWidth: '900px', width: '100%' }}>
        <h2 className="text-2xl font-semibold text-center mb-4">Inventory Management</h2>
        <h2 className="text-xl font-semibold text-center mb-4">View All Inventory Lists</h2>
        {error && (
          <div className="text-center text-red-600 mb-2">{error}</div>
        )}
        {loading && (
          <div className="text-center text-blue-600 mb-2">Loading...</div>
        )}
        <div className="flex justify-end mb-4">
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            onClick={handlePrint}
          >
            Print
          </button>
          <button 
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 ml-2"
            onClick={handleExport}
          >
            Export
          </button>
        </div>
        {/* Table - Desktop Only */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">#</th>
                <th className="py-2 px-4 border-b">Category</th>
                <th className="py-2 px-4 border-b border-l">Subcategory</th>
                <th className="py-2 px-4 border-b border-l">Previous Quantity</th>
                <th className="py-2 px-4 border-b border-l">Added Quantity</th>
                <th className="py-2 px-4 border-b border-l">Balance Quantity</th>
                <th className="py-2 px-4 border-b border-l">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, index) => (
                <tr key={item.id}>
                  <td className="py-2 px-4 border-b">{index + 1}</td>
                  <td className="py-2 px-4 border-b">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => handleInputChange(item.id, 'category', e.target.value)}
                        className="border rounded w-full px-2 py-1"
                        disabled={loading}
                      />
                    ) : (
                      item.category
                    )}
                  </td>
                  <td className="py-2 px-4 border-b border-l">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={item.subcategory}
                        onChange={(e) => handleInputChange(item.id, 'subcategory', e.target.value)}
                        className="border rounded w-full px-2 py-1"
                        disabled={loading}
                      />
                    ) : (
                      item.subcategory
                    )}
                  </td>
                  <td className="py-2 px-4 border-b border-l">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={item.previousQuantity}
                        onChange={(e) => handleInputChange(item.id, 'previousQuantity', e.target.value)}
                        className="border rounded w-full px-2 py-1"
                        disabled={loading}
                      />
                    ) : (
                      item.previousQuantity
                    )}
                  </td>
                  <td className="py-2 px-4 border-b border-l">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={item.addedQuantity}
                        onChange={(e) => handleInputChange(item.id, 'addedQuantity', e.target.value)}
                        className="border rounded w-full px-2 py-1"
                        disabled={loading}
                      />
                    ) : (
                      item.addedQuantity
                    )}
                  </td>
                  <td className="py-2 px-4 border-b border-l">
                    {item.previousQuantity + item.addedQuantity}
                  </td>
                  <td className="py-2 px-4 border-b border-l">
                    <div className="flex space-x-2">
                      <button
                        className={`px-4 py-1 rounded-md text-white ${
                          editingId === item.id ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                        }`}
                        onClick={() => {
                          if (editingId === item.id) {
                            handleSave(item.id);
                          } else {
                            handleEdit(item.id);
                          }
                        }}
                        disabled={loading}
                      >
                        {editingId === item.id ? 'Save' : 'Edit'}
                      </button>
                      <button
                        className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600"
                        onClick={() => setDeleteModalId(item.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-2 px-4 border-t text-right font-semibold">Total:</td>
                <td className="py-2 px-4 border-t font-bold">{totals.previousQuantity}</td>
                <td className="py-2 px-4 border-t font-bold">{totals.addedQuantity}</td>
                <td className="py-2 px-4 border-t font-bold">{totals.balanceQuantity}</td>
                <td className="py-2 px-4 border-t"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
          {inventory.map((item, index) => (
            <div key={item.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-800">{item.category}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1"><span className="font-medium text-gray-700">Subcategory: </span><span className="text-gray-600 text-sm">{item.subcategory}</span></div>
                <div className="mb-1"><span className="font-medium text-gray-700">Previous: </span><span className="text-gray-600 text-sm">{item.previousQuantity}</span></div>
                <div className="mb-1"><span className="font-medium text-gray-700">Added: </span><span className="text-gray-600 text-sm">{item.addedQuantity}</span></div>
                <div className="mb-2"><span className="font-medium text-gray-700">Balance: </span><span className="text-gray-600 text-sm">{item.previousQuantity + item.addedQuantity}</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className={`px-4 py-1 rounded-md text-white ${editingId === item.id ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} w-full`}
                  onClick={() => {
                    if (editingId === item.id) {
                      handleSave(item.id);
                    } else {
                      handleEdit(item.id);
                    }
                  }}
                  disabled={loading}
                >
                  {editingId === item.id ? 'Save' : 'Edit'}
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full"
                  onClick={() => setDeleteModalId(item.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Responsive Cards - Mobile (md:hidden) */}
        <div className="md:hidden mb-6 flex flex-col gap-4">
          {inventory.map((item, index) => (
            <div key={item.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-800">{item.category}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1"><span className="font-medium text-gray-700">Subcategory: </span><span className="text-gray-600 text-sm">{item.subcategory}</span></div>
                <div className="mb-1"><span className="font-medium text-gray-700">Previous: </span><span className="text-gray-600 text-sm">{item.previousQuantity}</span></div>
                <div className="mb-1"><span className="font-medium text-gray-700">Added: </span><span className="text-gray-600 text-sm">{item.addedQuantity}</span></div>
                <div className="mb-2"><span className="font-medium text-gray-700">Balance: </span><span className="text-gray-600 text-sm">{item.previousQuantity + item.addedQuantity}</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className={`px-4 py-1 rounded-md text-white ${editingId === item.id ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} w-full`}
                  onClick={() => {
                    if (editingId === item.id) {
                      handleSave(item.id);
                    } else {
                      handleEdit(item.id);
                    }
                  }}
                  disabled={loading}
                >
                  {editingId === item.id ? 'Save' : 'Edit'}
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full"
                  onClick={() => setDeleteModalId(item.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {deleteModalId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold">Are you sure you want to delete this item?</h3>
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                onClick={() => setDeleteModalId(null)}
                disabled={loading}
              >
                No
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 ml-2"
                onClick={handleDelete}
                disabled={loading}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;