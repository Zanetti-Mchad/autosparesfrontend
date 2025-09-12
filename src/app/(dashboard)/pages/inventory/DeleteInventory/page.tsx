"use client"
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/apiConfig';

type InventoryItem = {
  id: string;
  name: string;
  price: number;
  category: string | { id: string; name: string };
  size: string;
  quantity?: number;
  stock?: number;
  description: string;
  photo: string | null;
};

const initialInventory: InventoryItem[] = [];

const DeleteInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        // Handle nested API formats: { data: { items: [...] } } or { items: [...] } or array
        let items: unknown = (data?.data && data.data.items) ? data.data.items : (data.items ?? data.data ?? data);
        if (Array.isArray(items)) {
          setInventory(items as InventoryItem[]);
        } else {
          console.error('Expected array but got:', typeof items, items);
          setInventory([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const confirmDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please login first to delete inventory items');
        return;
      }

      await fetchApi(`/inventory/inventory/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
        } as any
      });
      
      setInventory(inv => inv.filter(item => item.id !== id));
      setDeleteId(null);
      setSuccess('Item deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete inventory item');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmingId(id);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="ml-3 text-muted-foreground">Loading inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium">
      <h2 className="text-xl font-bold mb-6">Delete Inventory Items</h2>
      
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
          {success}
        </div>
      )}
      <ul className="divide-y divide-border/30">
        {Array.isArray(inventory) && inventory.map((item, index) => (
          <li key={item.id} className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-4">
                <span className="font-bold text-lg text-slate-400 w-6 text-right pt-px">{index + 1}.</span>
                <div>
                    <div className="font-medium text-base">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{typeof item.category === 'object' ? item.category.name : item.category} | Size: {item.size || '-'} | UGX {item.price}</div>
                    <div className="text-xs text-muted-foreground">Stock: {typeof item.quantity === 'number' ? item.quantity : (item.stock ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
            </div>
            <button onClick={() => handleDelete(item.id)} className="text-error hover:underline">Delete</button>
          </li>
        ))}
      </ul>
      {confirmingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this inventory item? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmingId(null)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => { await confirmDelete(confirmingId); setConfirmingId(null); }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteInventory;
