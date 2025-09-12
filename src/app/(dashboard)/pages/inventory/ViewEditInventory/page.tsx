"use client";
import React, { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/apiConfig';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { Printer, Download, Edit, Save, X } from 'lucide-react';

type InventoryItem = {
  id: string;
  name: string;
  price: number;
  category: string | { id: string; name: string };
  size: string;
  stock: number;
  quantity: number;
  description: string;
  photo: string;
};

const initialInventory: InventoryItem[] = [];

const ViewEditInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [editingId, setEditingId] = useState<string | null>(null);
  type EditForm = {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    size?: string;
    stock?: number;
    photo?: string;
  };
  const [editForm, setEditForm] = useState<EditForm>({});
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch inventory from API
  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Please login first to view inventory');
          return;
        }

        const data = await fetchApi('/inventory/inventory', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
          } as any
        });
        console.log('API Response:', data);
        
        // Extract items from the response - data is nested under data.items
        let inventoryData = [];
        if (data.data && data.data.items && Array.isArray(data.data.items)) {
          inventoryData = data.data.items;
        } else if (data.items && Array.isArray(data.items)) {
          inventoryData = data.items;
        } else if (data.data && Array.isArray(data.data)) {
          inventoryData = data.data;
        } else if (Array.isArray(data)) {
          inventoryData = data;
        } else {
          console.error('Expected array but got:', typeof data, data);
          setInventory([]);
          return;
        }
        
        setInventory(inventoryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
    // Load categories for dropdown
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const token = localStorage.getItem('accessToken');
        const res = await fetchApi('/inventory/categories', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          } as any
        });
        const json = res as any;
        const list = (json?.data?.items ?? json?.data ?? json?.items ?? []);
        const mapped = Array.isArray(list) ? list.map((c: any) => ({ id: String(c.id), name: String(c.name) })) : [];
        setCategories(mapped);
      } catch (e) {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const startEdit = (item: InventoryItem) => {
    console.log('Starting edit for item:', item);
    setEditingId(item.id);
    setEditForm({ 
      name: item.name,
      description: item.description,
      price: item.price,
      category: typeof item.category === 'object' ? item.category.name : item.category,
      size: item.size,
      stock: item.quantity || item.stock,
      photo: item.photo
    });
    console.log('Edit form set to:', editForm);
  };

  const saveEdit = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please login first to update inventory items');
        return;
      }

      await fetchApi(`/inventory/inventory/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
        } as any,
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          price: editForm.price,
          category: editForm.category,
          size: editForm.size,
          quantity: editForm.stock,
          photo: editForm.photo
        })
      });
      
      setInventory(inv => inv.map(item => item.id === id ? { 
        ...item, 
        name: editForm.name || item.name,
        description: editForm.description || item.description,
        price: editForm.price || item.price,
        category: editForm.category || item.category,
        size: editForm.size || item.size,
        quantity: editForm.stock || item.quantity,
        photo: editForm.photo || item.photo
      } as InventoryItem : item));
      setEditingId(null);
      setSuccess('Item updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory item');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'size') {
      setEditForm((prev) => ({ ...prev, size: value === 'Custom' ? '' : value }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };


  const tableRef = useRef<HTMLTableElement>(null);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = inventory.map((item, index) => ({
      '#': index + 1,
      'Name': item.name,
      'Price (UGX)': item.price,
      'Category': typeof item.category === 'object' ? item.category.name : item.category,
      'Size': item.size || 'N/A',
      'Stock': item.quantity || item.stock,
      'Description': item.description
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const wscols = [
      { wch: 5 },  // #
      { wch: 25 }, // Name
      { wch: 12 }, // Price
      { wch: 20 }, // Category
      { wch: 8 },  // Size
      { wch: 8 },  // Stock
      { wch: 40 }  // Description
    ];
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Inventory Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              @media print { @page { size: landscape; } }
            </style>
          </head>
          <body>
            <h1>Inventory Report - ${new Date().toLocaleDateString()}</h1>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Price (UGX)</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Stock</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${inventory.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.price.toLocaleString()}</td>
                    <td>${typeof item.category === 'object' ? item.category.name : item.category}</td>
                    <td>${item.size || '-'}</td>
                    <td>${item.quantity || item.stock}</td>
                    <td>${item.description}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="ml-3 text-muted-foreground">Loading inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">View & Edit Inventory</h2>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-xl hover:bg-green-500/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-300 text-green-800 px-6 py-3 rounded-xl shadow-lg flex items-center animate-fade-in-out transition-all duration-500" style={{ minWidth: 320 }}>
          {success}
        </div>
      )}
      
      {/* Modal for editing */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{zIndex: 9999}}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <button 
              onClick={() => setEditingId(null)} 
              className="absolute top-4 right-4 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-semibold mb-6 text-center">Edit Inventory Item</h3>
            <form onSubmit={e => {e.preventDefault(); saveEdit(editingId!);}}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input 
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" 
                    name="name" 
                    value={editForm.name || ''} 
                    onChange={handleChange} 
                    placeholder="Product Name" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (UGX) *</label>
                  <input 
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" 
                    name="price" 
                    type="number" 
                    step="0.01"
                    value={typeof editForm.price === 'number' ? editForm.price : ''} 
                    onChange={handleChange} 
                    placeholder="0.00" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    name="category"
                    value={editForm.category ?? ''}
                    onChange={handleChange}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                    required
                  >
                    <option value="" disabled>{loadingCategories ? 'Loading categories…' : 'Select Category'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Size</label>
                  <select
                    name="size"
                    value={["XS","S","M","L","XL","XXL"].includes(editForm.size ?? '') ? editForm.size : editForm.size ? 'Custom' : ''}
                    onChange={handleChange}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  >
                    <option value="">Select Size</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="Custom">Custom</option>
                  </select>
                  {!["XS","S","M","L","XL","XXL"].includes(editForm.size ?? '') && (editForm.size ?? '') !== '' && (
                    <input
                      type="text"
                      name="customSize"
                      value={editForm.size ?? ''}
                      onChange={handleChange}
                      className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm mt-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                      placeholder="Enter custom size"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stock Quantity *</label>
                  <input 
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" 
                    name="stock" 
                    type="number" 
                    value={typeof editForm.stock === 'number' ? editForm.stock : ''} 
                    onChange={handleChange} 
                    placeholder="0" 
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea 
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" 
                    name="description" 
                    value={editForm.description || ''} 
                    onChange={handleChange} 
                    placeholder="Product description..." 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6" style={{minHeight: '60px'}}>
                <button 
                  type="button" 
                  onClick={() => setEditingId(null)} 
                  className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <table ref={tableRef} className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="bg-secondary/40">
            <th className="p-2 text-center rounded-l-xl">#</th>
            <th className="p-2 text-center">Photo</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left">Category</th>
            <th className="p-2 text-left">Size</th>
            <th className="p-2 text-left">Stock</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-center rounded-r-xl">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(inventory) && inventory.length > 0 ? inventory.map((item, index) => (
            <tr key={item.id} className="bg-white/80 dark:bg-black/30 shadow rounded-xl">
              <td className="p-2 text-center font-semibold text-muted-foreground">{index + 1}</td>
              <td className="p-2 text-center">
                {item.photo ? (
                  <Image src={item.photo} alt={item.name} width={48} height={48} className="w-12 h-12 object-cover rounded-xl border border-border/30 shadow" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-gray-400 border border-border/30 mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" /><circle cx="12" cy="12" r="3" /><path d="M16.5 7.5l-7 7" /></svg>
                  </div>
                )}
              </td>
              <>
                <td className="p-2 text-left text-foreground font-medium text-base">{item.name}</td>
                <td className="p-2 text-left text-muted-foreground text-sm">UGX {item.price}</td>
                <td className="p-2 text-left text-muted-foreground text-sm">
                  {typeof item.category === 'object' ? item.category.name : item.category}
                </td>
                <td className="p-2 text-left text-muted-foreground text-sm">{item.size || '-'}</td>
                <td className="p-2 text-left text-muted-foreground text-sm">{item.quantity || item.stock}</td>
                <td className="p-2 text-left text-muted-foreground text-xs">{item.description}</td>
                <td className="p-2 text-center">
                  <button 
                    onClick={() => startEdit(item)} 
                    className="flex items-center gap-1 px-3 py-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </td>
              </>
            </tr>
          )) : (
            <tr>
              <td colSpan={9} className="p-8 text-center text-muted-foreground">
                {isLoading ? 'Loading inventory...' : 'No inventory items found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ViewEditInventory;
