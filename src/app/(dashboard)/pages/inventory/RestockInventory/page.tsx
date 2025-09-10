"use client";
import React, { useEffect, useState } from 'react';
import { PlusCircle, X } from 'lucide-react';

type InventoryItem = {
  id: string;
  name: string;
  price: number;
  category: string | { id: string; name: string };
  size: string;
  quantity: number;
  description: string;
  photo: string | null;
};

const initialInventory: InventoryItem[] = [];

const RestockInventory = () => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Fetch inventory items from API
  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Please login first to view inventory');
          return;
        }

        const response = await fetch('http://localhost:4210/api/v1/inventory/inventory', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch inventory');
        }

        const data = await response.json();
        const items = (data?.data && data.data.items) ? data.data.items : (data.items ?? data.data ?? data);
        if (Array.isArray(items)) {
          setInventory(items as InventoryItem[]);
        } else {
          console.error('Expected array but got:', typeof items, items);
          setInventory([]);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load inventory');
        setInventory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !quantity) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Please login first to restock inventory');
      return;
    }

    const userId = localStorage.getItem('userId') || undefined;
    const qty = parseInt(quantity, 10);
    const unitCost = purchasePrice ? parseFloat(purchasePrice) : undefined;

    try {
      const response = await fetch('http://localhost:4210/api/v1/inventory/inventory/restock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inventoryId: selectedItem.id,
          userId,
          quantity: qty,
          unitCost,
          supplier: location || undefined,
          notes: notes || undefined,
          restockDate: purchaseDate
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.status?.returnMessage || 'Failed to restock');
      }

      // Optimistically update list
      setInventory(inv => inv.map(item => item.id === selectedItem.id ? { ...item, quantity: (item.quantity || 0) + qty } : item));
      setSuccess(`Restocked ${qty} units of ${selectedItem.name}`);
      setTimeout(() => setSuccess(''), 4000);

      // Reset form
      setSelectedItem(null);
      setQuantity('');
      setPurchasePrice('');
      setLocation('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to restock inventory');
    }
  };

  const newBalance = selectedItem 
    ? (selectedItem.quantity || 0) + (parseInt(quantity) || 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium relative">
      <h2 className="text-2xl font-bold mb-6">Restock Inventory</h2>
      
      {/* Success Message */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-300 text-green-800 px-6 py-3 rounded-xl shadow-lg flex items-center animate-fade-in-out transition-all duration-500" style={{ minWidth: 320 }}>
          {success}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory by name or category..."
          className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm"
        />
      </div>

      {/* Inventory List */}
      <div className="flex flex-col space-y-3 mb-8">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading inventory...</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : inventory.length === 0 ? (
          <div className="text-sm text-muted-foreground">No inventory items found.</div>
        ) : inventory
            .filter((item) => {
              const term = search.trim().toLowerCase();
              if (!term) return true;
              const name = item.name.toLowerCase();
              const category = (typeof item.category === 'object' ? item.category.name : item.category || '').toLowerCase();
              return name.includes(term) || category.includes(term);
            })
            .map((item, index) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="flex items-center p-4 border border-border/30 rounded-xl hover:bg-secondary/20 cursor-pointer transition-colors"
          >
            <span className="w-8 text-lg font-bold text-muted-foreground">{index + 1}.</span>
            <div className="flex-grow">
              <h3 className="font-medium text-foreground">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{typeof item.category === 'object' ? item.category.name : item.category} {item.size && `• ${item.size}`}</p>
            </div>
            <div className="flex items-center space-x-4">
              <p className="text-sm text-right">
                <span className="font-medium text-muted-foreground">Stock: </span> 
                <span className="font-bold">{item.quantity}</span>
              </p>
              <PlusCircle className="h-5 w-5 text-primary" />
            </div>
          </div>
        ))}
      </div>

      {/* Restock Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 glass rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-border/60 relative animate-fade-in">
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h3 className="text-xl font-semibold mb-6">Restock {selectedItem.name}</h3>
            
            <form onSubmit={handleRestock}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-muted-foreground">Current Stock</label>
                  <div className="text-lg font-medium">{selectedItem.quantity} units</div>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="purchaseDate" className="block text-sm font-medium text-muted-foreground">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    id="purchaseDate"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="quantity" className="block text-sm font-medium text-muted-foreground">
                    Quantity to Add
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    min="-1000"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm"
                    placeholder="Enter quantity (positive or negative)"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="purchasePrice" className="block text-sm font-medium text-muted-foreground">
                    Unit Cost (each)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">UGX</span>
                    <input
                      type="number"
                      id="purchasePrice"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full glass rounded-xl border border-border/50 pl-14 pr-4 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="location" className="block text-sm font-medium text-muted-foreground">
                    Supplier
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm"
                    placeholder="e.g., Main Warehouse, Supplier Inc."
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-muted-foreground">New Stock Balance</label>
                  <div className="text-lg font-medium">{newBalance} units</div>
                </div>
                
                <div className="md:col-span-2 space-y-1">
                  <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full glass rounded-xl border border-border/50 px-4 py-2 text-sm min-h-[80px]"
                    placeholder="Any additional notes about this restock..."
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                  disabled={!quantity || quantity === '0' || isNaN(parseInt(quantity))}
                >
                  Save Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestockInventory;
