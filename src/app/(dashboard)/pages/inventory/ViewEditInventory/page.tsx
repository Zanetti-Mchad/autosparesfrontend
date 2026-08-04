"use client";
import { formatDisplayDate } from '@/lib/formatDate';
import React, { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/apiConfig';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { Printer, Download, Edit, Save, X, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type InventoryItem = {
  id: string;
  name: string;
  price: number;
  category: string | { id: string; name: string };
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
  size: string;
  unit?: string | null;
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
    brandId?: string;
    size?: string;
    unit?: string;
    stock?: number;
    photo?: string;
  };
  const [editForm, setEditForm] = useState<EditForm>({});
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string; abbreviation?: string | null }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

    const fetchUnits = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetchApi('/catalog/units', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          } as any,
        });
        const list = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
            ? res
            : [];
        setUnits(
          list
            .filter((u: any) => u.isActive !== false)
            .map((u: any) => ({
              id: String(u.id),
              name: String(u.name),
              abbreviation: u.abbreviation || null,
            }))
        );
      } catch {
        setUnits([]);
      }
    };
    fetchUnits();

    const fetchBrands = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetchApi('/catalog/brands', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          } as any,
        });
        const list = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
            ? res
            : [];
        setBrands(
          list
            .filter((b: any) => b.isActive !== false)
            .map((b: any) => ({ id: String(b.id), name: String(b.name) }))
        );
      } catch {
        setBrands([]);
      }
    };
    fetchBrands();
  }, []);

  const startEdit = (item: InventoryItem) => {
    console.log('Starting edit for item:', item);
    setEditingId(item.id);
    setEditForm({ 
      name: item.name,
      description: item.description,
      price: item.price,
      category: typeof item.category === 'object' ? item.category.name : item.category,
      brandId: item.brandId || item.brand?.id || '',
      size: item.size,
      unit: item.unit || '',
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
          brandId: editForm.brandId || null,
          size: editForm.size,
          unit: editForm.unit || null,
          quantity: editForm.stock,
          photo: editForm.photo
        })
      });
      
      const selectedBrand = brands.find((b) => b.id === editForm.brandId) || null;
      setInventory(inv => inv.map(item => item.id === id ? { 
        ...item, 
        name: editForm.name || item.name,
        description: editForm.description || item.description,
        price: editForm.price || item.price,
        category: editForm.category || item.category,
        brandId: editForm.brandId || null,
        brand: selectedBrand,
        size: editForm.size || item.size,
        unit: editForm.unit ?? item.unit,
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

  const requestDelete = (item: InventoryItem) => {
    setDeleting(item);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please login first to delete inventory items');
        return;
      }

      await fetchApi(`/inventory/inventory/${deleting.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        } as any,
      });

      setInventory((inv) => inv.filter((item) => item.id !== deleting.id));
      if (editingId === deleting.id) setEditingId(null);
      setDeleting(null);
      setSuccess('Item deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete inventory item');
    } finally {
      setDeleteLoading(false);
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
            <h1>Inventory Report - ${formatDisplayDate(new Date())}</h1>
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
      <div className="max-w-7xl mx-auto mt-4 sm:mt-10 p-3 sm:p-4 md:p-8 glass rounded-2xl border border-border/50 shadow-medium min-w-0 overflow-x-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="ml-3 text-muted-foreground">Loading inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-4 sm:mt-10 p-3 sm:p-4 md:p-8 glass rounded-2xl border border-gray-300 shadow-medium relative min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-lg sm:text-xl font-bold">View & Edit Inventory</h2>
        <div className="flex gap-2 sm:gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-primary rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Print</span>
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-green-600 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-300 text-green-800 px-4 sm:px-6 py-3 rounded-xl shadow-lg flex items-center animate-fade-in-out transition-all duration-500 w-[calc(100%-2rem)] max-w-md">
          {success}
        </div>
      )}
      
      {/* Modal for editing */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{zIndex: 9999}}>
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-4 sm:p-8 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 relative max-h-[92vh] overflow-y-auto">
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
                  <label className="block text-sm font-medium mb-2">Brand</label>
                  <select
                    name="brandId"
                    value={editForm.brandId ?? ''}
                    onChange={handleChange}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  >
                    <option value="">No brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
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
                  <label className="block text-sm font-medium mb-2">Unit</label>
                  <select
                    name="unit"
                    value={editForm.unit ?? ''}
                    onChange={handleChange}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  >
                    <option value="">Select unit…</option>
                    {units.map((u) => {
                      const value = u.abbreviation || u.name;
                      return (
                        <option key={u.id} value={value}>
                          {u.name}{u.abbreviation ? ` (${u.abbreviation})` : ''}
                        </option>
                      );
                    })}
                    {editForm.unit &&
                      !units.some((u) => (u.abbreviation || u.name) === editForm.unit) && (
                        <option value={editForm.unit}>{editForm.unit} (current)</option>
                      )}
                  </select>
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
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingId(null)} 
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.isArray(inventory) && inventory.length > 0 ? inventory.map((item, index) => (
          <div key={item.id} className="bg-white dark:bg-black/30 border border-gray-300 rounded-xl p-4 space-y-3">
            <div className="flex gap-3">
              {item.photo ? (
                <Image src={item.photo} alt={item.name} width={56} height={56} className="w-14 h-14 object-cover rounded-xl border border-border/30 shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-gray-400 border border-border/30 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" /><circle cx="12" cy="12" r="3" /><path d="M16.5 7.5l-7 7" /></svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground font-semibold">{index + 1}.</div>
                <div className="font-medium text-foreground truncate">{item.name}</div>
                <div className="text-sm text-muted-foreground">UGX {Number(item.price).toLocaleString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Category: {typeof item.category === 'object' ? item.category.name : item.category}</div>
              <div>Brand: {item.brand?.name || '—'}</div>
              <div>Size: {item.size || '—'}</div>
              <div>Unit: {item.unit || '—'}</div>
              <div>Stock: {item.quantity || item.stock}</div>
            </div>
            {item.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary bg-white border border-gray-300 rounded-lg text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => requestDelete(item)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 bg-white border border-red-200 rounded-lg text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )) : (
          <div className="p-6 text-center text-muted-foreground text-sm border border-gray-300 rounded-xl bg-white">
            {isLoading ? 'Loading inventory...' : 'No inventory items found'}
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto border border-gray-300 rounded-xl bg-white">
      <table ref={tableRef} className="w-full border-collapse">
        <thead>
          <tr className="bg-secondary/40 border-b border-gray-300">
            <th className="p-3 text-center">#</th>
            <th className="p-3 text-center">Photo</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Price</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-left">Brand</th>
            <th className="p-3 text-left">Size</th>
            <th className="p-3 text-left">Unit</th>
            <th className="p-3 text-left">Stock</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(inventory) && inventory.length > 0 ? inventory.map((item, index) => (
            <tr key={item.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/80">
              <td className="p-3 text-center font-semibold text-muted-foreground">{index + 1}</td>
              <td className="p-3 text-center">
                {item.photo ? (
                  <Image src={item.photo} alt={item.name} width={48} height={48} className="w-12 h-12 object-cover rounded-xl border border-gray-300 shadow" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-gray-400 border border-gray-300 mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" /><circle cx="12" cy="12" r="3" /><path d="M16.5 7.5l-7 7" /></svg>
                  </div>
                )}
              </td>
              <>
                <td className="p-3 text-left text-foreground font-medium text-base">{item.name}</td>
                <td className="p-3 text-left text-muted-foreground text-sm">UGX {item.price}</td>
                <td className="p-3 text-left text-muted-foreground text-sm">
                  {typeof item.category === 'object' ? item.category.name : item.category}
                </td>
                <td className="p-3 text-left text-muted-foreground text-sm">
                  {item.brand?.name || '—'}
                </td>
                <td className="p-3 text-left text-muted-foreground text-sm">{item.size || '-'}</td>
                <td className="p-3 text-left text-muted-foreground text-sm">{item.unit || '-'}</td>
                <td className="p-3 text-left text-muted-foreground text-sm">{item.quantity || item.stock}</td>
                <td className="p-3 text-left text-muted-foreground text-xs">{item.description}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="flex items-center gap-1 px-3 py-1 text-primary border border-gray-300 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(item)}
                      className="flex items-center gap-1 px-3 py-1 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </>
            </tr>
          )) : (
            <tr>
              <td colSpan={11} className="p-8 text-center text-muted-foreground">
                {isLoading ? 'Loading inventory...' : 'No inventory items found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && !deleteLoading && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete inventory item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
              <div className="font-medium">{deleting.name}</div>
              <div className="text-muted-foreground">
                {[
                  typeof deleting.category === 'object' ? deleting.category.name : deleting.category,
                  deleting.size ? `Size: ${deleting.size}` : null,
                  `Stock: ${deleting.quantity || deleting.stock}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setDeleting(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewEditInventory;
