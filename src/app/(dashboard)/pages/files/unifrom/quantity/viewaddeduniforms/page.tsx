"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;
interface UniformItem {
  id: string;
  uniformItemId: string;
  categoryId: string;
  sizeId: string;
  codeId: string;
  category: string;
  code: string;
  size: string;
  totalQuantity: number;
  availableQuantity: number;
  previousQuantity: number;
  addedQuantity: number;
  takenQuantity: number;
}

const UniformListView = () => {
  // Dialog state
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
  const showDialog = (options: Partial<typeof dialog>) => {
    setDialog({
      ...dialog,
      isOpen: true,
      ...options,
      onCancel: options.onCancel || (() => setDialog((d) => ({ ...d, isOpen: false }))),
    });
  };
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [uniforms, setUniforms] = useState<UniformItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<UniformItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUniforms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/uniforms/inventory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.status.returnMessage);
      }

      const data = await response.json();
      if (data.status.returnCode === '00') {
        const inventory = data.data?.inventory || data.inventory || [];
        const formattedUniforms = inventory.map((item: any) => ({
          id: String(item.id),
          uniformItemId: String(item.uniformItemId),
          categoryId: String(item.categoryId),
          sizeId: String(item.sizeId),
          codeId: String(item.codeId),
          category: item.uniformItem?.category?.name || item.uniformItem?.category?.description || '',
          code: item.code?.code || item.code?.name || '',
          size: item.size?.size || item.size?.name || item.size?.code || '',
          totalQuantity: Number(item.totalQuantity) || 0,
          availableQuantity: Number(item.availableQuantity) || 0,
          previousQuantity: Number(item.previousQuantity) || 0,
          addedQuantity: Number(item.addedQuantity) || 0,
          takenQuantity: Number(item.takenQuantity) || 0
        }));
        setUniforms(formattedUniforms);
      } else {
        throw new Error(data.status.returnMessage || 'Failed to fetch uniforms');
      }
    } catch (error) {
      console.error('Error fetching uniforms:', error);
      setUniforms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniforms();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportToExcel = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/uniforms/inventory/export/excel`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to export to Excel');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uniforms.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showDialog({
        title: 'Export Failed',
        message: 'Failed to export to Excel',
        type: 'warning',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
      });
    }
    setShowExportMenu(false);
  };

  const handleExportToPDF = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/uniforms/inventory/export/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to export to PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uniforms.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      showDialog({
        title: 'Export Failed',
        message: 'Failed to export to PDF',
        type: 'warning',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
      });
    }
    setShowExportMenu(false);
  };

  const handleEdit = async (uniform: UniformItem) => {
    if (editingId === uniform.id) {
      // Save changes
      if (editData) {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) return;

          // Calculate the adjustment quantity (difference between new and old values)
          const adjustmentQuantity = editData.availableQuantity - uniform.availableQuantity;
          
          // Use the correct HTTP method (POST) based on your backend route
          const response = await fetch(`${API_BASE_URL}/uniforms/inventory/adjust`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inventoryId: editData.id,
              adjustmentQuantity,
              reason: 'Manual adjustment from UI'
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.status?.returnMessage || 'Failed to update uniform');
          }

          showDialog({
            title: 'Success',
            message: 'Inventory updated successfully',
            type: 'info',
            confirmText: 'OK',
            cancelText: '',
            onConfirm: async () => {
              setDialog((d) => ({ ...d, isOpen: false }));
              await fetchUniforms();
              setEditingId(null);
              setEditData(null);
            }
          });
        } catch (error) {
          console.error('Error updating uniform:', error);
          showDialog({
            title: 'Update Failed',
            message: 'Failed to update uniform: ' + (error instanceof Error ? error.message : 'Unknown error'),
            type: 'warning',
            confirmText: 'OK',
            cancelText: '',
            onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
          });
        }
      }
    } else {
      setEditingId(uniform.id);
      setEditData(uniform);
    }
  };

  const handleInputChange = (field: keyof UniformItem, value: string) => {
    if (editData) {
      setEditData({
        ...editData,
        [field]: field === 'totalQuantity' || field === 'availableQuantity' || 
                 field === 'previousQuantity' || field === 'addedQuantity' || 
                 field === 'takenQuantity' ? Number(value) : value
      });
    }
  };

  const handleDelete = async (id: string) => {
    showDialog({
      title: 'Delete Uniform',
      message: 'Are you sure you want to delete this uniform?',
      type: 'delete',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDialog((d) => ({ ...d, isOpen: false }));
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) return;

          const response = await fetch(`${API_BASE_URL}/uniforms/inventory/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to delete uniform');
          }

          await fetchUniforms();
        } catch (error) {
          console.error('Error deleting uniform:', error);
          showDialog({
            title: 'Delete Failed',
            message: 'Failed to delete uniform',
            type: 'warning',
            confirmText: 'OK',
            cancelText: '',
            onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
          });
        }
      },
      onCancel: () => setDialog((d) => ({ ...d, isOpen: false })),
    });
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 mt-4">

        <h2 className="text-2xl font-semibold text-center mb-4">Uniform List</h2>

        <div className="flex justify-end mb-4">
          <button
            onClick={handlePrint}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mr-2"
          >
            Print
          </button>
          <div className="relative inline-block">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg">
                <button
                  onClick={handleExportToExcel}
                  className="block w-full px-4 py-2 text-gray-800 hover:bg-gray-200 text-left"
                >
                  Excel
                </button>
                <button
                  onClick={handleExportToPDF}
                  className="block w-full px-4 py-2 text-gray-800 hover:bg-gray-200 text-left"
                >
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">View Uniform List</h2>
        <div className="overflow-x-auto">
          {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
          <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
            {uniforms.map(uniform => (
              <div key={uniform.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                <div className="mb-2 font-semibold text-gray-900">{uniform.category}</div>
                <div className="mb-2 text-xs text-gray-700">Code: <span className="font-medium">{uniform.code}</span></div>
                <div className="mb-2 text-xs text-gray-700">Size: <span className="font-medium">{uniform.size}</span></div>
                <div className="mb-2 text-xs text-gray-700">Available: <span className="font-medium">{uniform.availableQuantity}</span></div>
                <div className="mb-2 text-xs text-gray-700">Previous: <span className="font-medium">{uniform.previousQuantity}</span></div>
                <div className="mb-2 text-xs text-gray-700">Added: <span className="font-medium">{uniform.addedQuantity}</span></div>
                <div className="mb-2 text-xs text-gray-700">Taken: <span className="font-medium">{uniform.takenQuantity}</span></div>
                <div className="flex space-x-2 mt-2">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                    onClick={() => handleEdit(uniform)}
                  >
                    {editingId === uniform.id ? 'Save' : 'Edit'}
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
                    onClick={() => handleDelete(uniform.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Responsive Stacked Cards - Mobile (md:hidden) */}
          <div className="md:hidden space-y-4 mb-6">
            {uniforms.map(uniform => (
              <div key={uniform.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                <div className="mb-2 font-bold text-base text-gray-800">{uniform.category}</div>
                <div className="mb-2 text-xs text-gray-700">Code: <span className="font-medium">{uniform.code}</span></div>
                <div className="mb-2 text-xs text-gray-700">Size: <span className="font-medium">{uniform.size}</span></div>
                <div className="mb-2 text-xs text-gray-700">Available: <span className="font-medium">{uniform.availableQuantity}</span></div>
                <div className="mb-2 text-xs text-gray-700">Previous: <span className="font-medium">{uniform.previousQuantity}</span></div>
                <div className="mb-2 text-xs text-gray-700">Added: <span className="font-medium">{uniform.addedQuantity}</span></div>
                <div className="mb-2 text-xs text-gray-700">Taken: <span className="font-medium">{uniform.takenQuantity}</span></div>
                <div className="flex space-x-2 mt-2">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                    onClick={() => handleEdit(uniform)}
                  >
                    {editingId === uniform.id ? 'Save' : 'Edit'}
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
                    onClick={() => handleDelete(uniform.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table - Desktop Only */}
          <div className="hidden lg:block">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-2">Category</th>
                  <th className="border border-gray-300 px-4 py-2">Code</th>
                  <th className="border border-gray-300 px-4 py-2">Size</th>
                  <th className="border border-gray-300 px-4 py-2">Uniform Balances</th>
                  <th className="border border-gray-300 px-4 py-2">Previous Balances</th>
                  <th className="border border-gray-300 px-4 py-2">Added Quantity</th>
                  <th className="border border-gray-300 px-4 py-2">Taken Uniforms</th>
                  <th className="border border-gray-300 px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uniforms.map(uniform => (
                  <tr key={uniform.id}>
                    <td className="border border-gray-300 px-4 py-2">
                      {uniform.category}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {uniform.code}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {uniform.size}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {editingId === uniform.id ? (
                        <input
                          type="number"
                          value={editData?.availableQuantity || 0}
                          onChange={(e) => handleInputChange('availableQuantity', e.target.value)}
                          className="border rounded-md p-1 w-full"
                        />
                      ) : (
                        uniform.availableQuantity
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{uniform.previousQuantity}</td>
                    <td className="border border-gray-300 px-4 py-2">{uniform.addedQuantity}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {editingId === uniform.id ? (
                        <input
                          type="number"
                          value={editData?.takenQuantity || 0}
                          onChange={(e) => handleInputChange('takenQuantity', e.target.value)}
                          className="border rounded-md p-1 w-full"
                        />
                      ) : (
                        uniform.takenQuantity
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                          onClick={() => handleEdit(uniform)}
                        >
                          {editingId === uniform.id ? 'Save' : 'Edit'}
                        </button>
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
                          onClick={() => handleDelete(uniform.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/* DialogBox for alerts, errors, and confirmations */}
    <DialogBox
      isOpen={dialog.isOpen}
      title={dialog.title}
      message={dialog.message}
      onConfirm={dialog.onConfirm}
      onCancel={dialog.onCancel}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
      type={dialog.type}
    />
  </div>
  );
};

export default UniformListView;