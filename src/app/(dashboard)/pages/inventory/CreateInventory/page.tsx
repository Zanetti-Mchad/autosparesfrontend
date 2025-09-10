"use client"
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

type InventoryForm = {
  name: string;
  price: string;
  photo: string;
  category: string;
  size: string;
  stock: string;
  description: string;
};

const CreateInventory = ({ onItemCreated }: { onItemCreated?: (item: InventoryForm) => void }) => {
  const [form, setForm] = useState<InventoryForm>({
    name: '',
    price: '',
    photo: '',
    category: '',
    size: '',
    stock: '',
    description: ''
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:4210/api/v1/inventory/categories', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          console.warn('Failed to load categories:', res.status);
          setCategories([]);
          return;
        }
        const json = await res.json();
        const list = (json?.data?.items ?? json?.data ?? json?.items ?? []);
        const mapped = Array.isArray(list) ? list.map((c: any) => ({ id: String(c.id), name: String(c.name) })) : [];
        setCategories(mapped);
      } catch (e) {
        console.warn('Categories fetch error:', e);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, files } = target as HTMLInputElement;
    if (name === 'photo' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
        setForm((prev) => ({ ...prev, photo: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } else if (name === 'size') {
      setForm((prev) => ({ ...prev, size: value === 'Custom' ? '' : value }));
    } else if (name === 'customSize') {
      setForm((prev) => ({ ...prev, size: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setSuccess('');
        console.error('Please login first to create inventory items');
        return;
      }

      const response = await fetch('http://localhost:4210/api/v1/inventory/inventory', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          category: form.category,
          size: form.size,
          stock: parseInt(form.stock),
          photo: form.photo
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.status?.returnMessage || 'Failed to create inventory item');
      }
      
      const successMsg = `Saved: ${form.name}`
        + (form.price ? ` • UGX ${parseFloat(form.price)}` : '')
        + (form.category ? ` • ${form.category}` : '')
        + (form.size ? ` • Size ${form.size}` : '')
        + (form.stock ? ` • Qty ${parseInt(form.stock) || 0}` : '');
      setSuccess(successMsg);
      if (onItemCreated) onItemCreated(form);
      setTimeout(() => setSuccess(''), 3000);
      setForm({ name: '', price: '', photo: '', category: '', size: '', stock: '', description: '' });
      setPhotoPreview('');
    } catch (err) {
      setSuccess('');
      console.error('Error creating inventory item:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium">
      <h2 className="text-2xl font-bold mb-8 text-center">Add New Inventory Item</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col items-center gap-3 mb-4">
          <label htmlFor="photo" className="cursor-pointer group relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary/30 flex items-center justify-center border-2 border-border/50 hover:border-primary/60 transition-all">
            {photoPreview ? (
              <Image src={photoPreview} alt="Product" width={112} height={112} className="w-28 h-28 rounded-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-center text-sm p-2">Upload Photo</span>
            )}
            <input
              type="file"
              id="photo"
              name="photo"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleChange}
            />
          </label>
          <span className="text-xs text-muted-foreground">Click to upload Product Photo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Column 1 */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Product Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., Wireless Headphones"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., 99.99"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="" disabled>{loadingCategories ? 'Loading categories…' : 'Select Category'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Size</label>
              <select
                name="size"
                value={["XS","S","M","L","XL","XXL"].includes(form.size) ? form.size : form.size ? 'Custom' : ''}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50"
                required
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
              {!["XS","S","M","L","XL","XXL"].includes(form.size) && form.size !== '' && (
                <input
                  type="text"
                  name="customSize"
                  value={form.size}
                  onChange={handleChange}
                  className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm mt-2 transition-all focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter custom size"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Stock Quantity</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., 150"
                min="0"
                required
              />
            </div>
          </div>

          {/* Spanning full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm min-h-[80px] transition-all focus:ring-2 focus:ring-primary/50"
              placeholder="A brief description of the product..."
            />
          </div>
        </div>

        {success && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-300 text-green-800 px-6 py-3 rounded-xl shadow-lg text-sm">
            {success}
          </div>
        )}
        
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-glow hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
        >
          Add Item to Inventory
        </button>
      </form>
    </div>
  );
};

export default CreateInventory;
