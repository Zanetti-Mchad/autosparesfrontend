"use client"
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/apiConfig';
import Image from 'next/image';

const CUT_TYPES = [
  'Whole Chicken', 'Fillets', 'Drumsticks', 'Wings', 'Gizzards',
  'Liver', 'Thighs', 'Breast', 'Neck', 'Feet', 'Minced chicken',
];

type InventoryForm = {
  name: string;
  price: string;
  costPrice: string;
  photo: string;
  category: string;
  size: string;
  stock: string;
  description: string;
  sku: string;
  barcode: string;
  cutType: string;
  weightBand: string;
  weight: string;
  grade: string;
  batchNumber: string;
  expiryDate: string;
  kind: string;
  unit: string;
  brandId: string;
  minStock: string;
};

const emptyForm = (): InventoryForm => ({
  name: '',
  price: '',
  costPrice: '',
  photo: '',
  category: '',
  size: '',
  stock: '',
  description: '',
  sku: '',
  barcode: '',
  cutType: '',
  weightBand: '',
  weight: '',
  grade: 'Grade-1',
  batchNumber: '',
  expiryDate: '',
  kind: 'product',
  unit: '',
  brandId: '',
  minStock: '10',
});

const CreateInventory = () => {
  const [form, setForm] = useState<InventoryForm>(emptyForm());
  const [photoPreview, setPhotoPreview] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string; abbreviation?: string | null }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const json = await fetchApi('/inventory/categories') as any;
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

    const fetchUnits = async () => {
      try {
        const json = await fetchApi('/catalog/units') as any;
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const active = list.filter((u: any) => u.isActive !== false);
        setUnits(
          active.map((u: any) => ({
            id: String(u.id),
            name: String(u.name),
            abbreviation: u.abbreviation || null,
          }))
        );
        setForm((prev) => {
          if (prev.unit && active.some((u: any) => (u.abbreviation || u.name) === prev.unit)) {
            return prev;
          }
          const first = active[0];
          if (!first) return prev;
          return { ...prev, unit: first.abbreviation || first.name };
        });
      } catch (e) {
        console.warn('Units fetch error:', e);
        setUnits([]);
      }
    };

    const fetchBrands = async () => {
      try {
        const json = await fetchApi('/catalog/brands') as any;
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setBrands(
          list
            .filter((b: any) => b.isActive !== false)
            .map((b: any) => ({ id: String(b.id), name: String(b.name) }))
        );
      } catch (e) {
        console.warn('Brands fetch error:', e);
        setBrands([]);
      }
    };

    fetchCategories();
    fetchUnits();
    fetchBrands();
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

      await fetchApi('/inventory/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
          category: form.category,
          size: form.size || form.weightBand,
          stock: parseInt(form.stock),
          photo: form.photo,
          sku: form.sku || undefined,
          barcode: form.barcode || undefined,
          cutType: form.cutType || undefined,
          weightBand: form.weightBand || undefined,
          weight: form.weight ? parseFloat(form.weight) : undefined,
          grade: form.grade || undefined,
          batchNumber: form.batchNumber || undefined,
          expiryDate: form.expiryDate || undefined,
          kind: form.kind || 'product',
          unit: form.unit || undefined,
          brandId: form.brandId || undefined,
          minStock: form.minStock ? parseInt(form.minStock) : undefined,
        }),
      });

      setSuccess(`Saved: ${form.name}`);
      setTimeout(() => setSuccess(''), 3000);
      setForm(emptyForm());
      setPhotoPreview('');
    } catch (err) {
      setSuccess('');
      console.error('Error creating inventory item:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 glass rounded-2xl border border-border/50 shadow-medium">
      <h2 className="text-2xl font-bold mb-2 text-center">Add Product / Stock Item</h2>
      <p className="text-center text-sm text-muted-foreground mb-8">Mwima Eliken · chicken cuts, packaging & materials</p>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col items-center gap-3 mb-4">
          <label htmlFor="photo" className="cursor-pointer group relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary/30 flex items-center justify-center border-2 border-border/50 hover:border-primary/60 transition-all">
            {photoPreview ? (
              <Image src={photoPreview} alt="Product" width={112} height={112} className="w-28 h-28 rounded-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-center text-sm p-2">Upload Photo</span>
            )}
            <input type="file" id="photo" name="photo" accept="image/*" onChange={handleChange} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Product Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" placeholder="e.g. Chicken Fillet" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm bg-white" required>
              <option value="" disabled>{loadingCategories ? 'Loading…' : 'Select Category'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Brand</label>
            <select name="brandId" value={form.brandId} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm bg-white">
              {brands.length === 0 ? (
                <option value="">Add brands under Brands first</option>
              ) : (
                <>
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Item Kind</label>
            <select name="kind" value={form.kind} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm">
              <option value="product">Processed Chicken</option>
              <option value="packaging">Packaging</option>
              <option value="material">Material</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cut Type</label>
            <select name="cutType" value={form.cutType} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm">
              <option value="">N/A (packaging/material)</option>
              {CUT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Selling Price (UGX)</label>
            <input type="number" name="price" value={form.price} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cost Price (UGX)</label>
            <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">SKU</label>
            <input name="sku" value={form.sku} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" placeholder="MW-FIL-01" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Barcode</label>
            <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" placeholder="Scan or type" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Weight Band</label>
            <input name="weightBand" value={form.weightBand} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" placeholder="1.1-1.3kg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Net Weight (kg)</label>
            <input type="number" step="0.01" name="weight" value={form.weight} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Grade</label>
            <input name="grade" value={form.grade} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Batch Number</label>
            <input name="batchNumber" value={form.batchNumber} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Best Before</label>
            <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stock Quantity</label>
            <input type="number" name="stock" value={form.stock} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" min="0" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Stock Alert</label>
            <input type="number" name="minStock" value={form.minStock} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Unit</label>
            <select name="unit" value={form.unit} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm bg-white" required={units.length > 0}>
              {units.length === 0 ? (
                <option value="">Add units under Product Units first</option>
              ) : (
                <>
                  <option value="">Select unit…</option>
                  {units.map((u) => {
                    const value = u.abbreviation || u.name;
                    return (
                      <option key={u.id} value={value}>
                        {u.name}{u.abbreviation ? ` (${u.abbreviation})` : ''}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm min-h-[80px]" placeholder="Fresh & Healthy..." />
          </div>
        </div>

        {success && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-300 text-green-800 px-6 py-3 rounded-xl shadow-lg text-sm">
            {success}
          </div>
        )}

        <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
          Save Product
        </button>
      </form>
    </div>
  );
};

export default CreateInventory;
