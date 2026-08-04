"use client"
import React, { useEffect, useRef, useState } from 'react';
import { ApiError, fetchApi } from '@/lib/apiConfig';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { ChevronDown, FileSpreadsheet, Info, Upload } from 'lucide-react';
import {
  downloadInventoryBulkTemplate,
  parseInventoryBulkExcel,
  type InventoryBulkRow,
} from '@/lib/inventoryBulkExcel';

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

type BulkResultRow = {
  row: number;
  ok: boolean;
  error?: string;
  id?: string;
  name?: string | null;
  sku?: string | null;
  stock?: number;
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkPreview, setBulkPreview] = useState<InventoryBulkRow[]>([]);
  const [bulkParseErrors, setBulkParseErrors] = useState<string[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResultRow[] | null>(null);
  const [showColumnHelp, setShowColumnHelp] = useState(false);

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

  const clearBulk = () => {
    setBulkPreview([]);
    setBulkParseErrors([]);
    setBulkFileName('');
    setBulkResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkResults(null);
    setBulkFileName(file.name);
    try {
      const parsed = await parseInventoryBulkExcel(file);
      setBulkParseErrors(parsed.errors);
      setBulkPreview(parsed.rows);
      if (parsed.rows.length === 0 && parsed.errors.length) {
        toast.error(parsed.errors[0]);
      } else if (parsed.errors.length) {
        toast.error(`${parsed.errors.length} row(s) have issues — fix or remove them`);
      } else {
        toast.success(`${parsed.rows.length} product(s) ready to create`);
      }
    } catch (err: any) {
      setBulkPreview([]);
      setBulkParseErrors([err.message || 'Failed to read Excel file']);
      toast.error(err.message || 'Failed to read Excel file');
    }
  };

  const submitBulk = async () => {
    if (bulkPreview.length === 0) {
      toast.error('Upload an Excel file first');
      return;
    }

    try {
      setBulkUploading(true);
      const res = await fetchApi('/inventory/inventory/bulk', {
        method: 'POST',
        body: JSON.stringify({
          items: bulkPreview.map((r) => ({
            name: r.name,
            category: r.category,
            price: r.price,
            costPrice: r.costPrice ?? undefined,
            stock: r.stock,
            minStock: r.minStock ?? undefined,
            sku: r.sku,
            barcode: r.barcode,
            brand: r.brand,
            unit: r.unit,
            kind: r.kind,
            size: r.size,
            description: r.description,
          })),
        }),
      });

      const data = res?.data || {};
      const results: BulkResultRow[] = Array.isArray(data.results) ? data.results : [];
      setBulkResults(results);
      const ok = Number(data.successCount || 0);
      const fail = Number(data.failCount || 0);
      if (fail === 0) {
        toast.success(`Created ${ok} product(s)`);
        clearBulk();
      } else {
        toast.error(`${ok} succeeded, ${fail} failed — see results below`);
      }

      try {
        const json = await fetchApi('/inventory/categories') as any;
        const list = (json?.data?.items ?? json?.data ?? json?.items ?? []);
        setCategories(
          Array.isArray(list) ? list.map((c: any) => ({ id: String(c.id), name: String(c.name) })) : []
        );
      } catch {
        /* keep existing */
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.body?.data?.results) {
        setBulkResults(err.body.data.results);
        const ok = Number(err.body.data.successCount || 0);
        const fail = Number(err.body.data.failCount || 0);
        toast.error(`${ok} succeeded, ${fail} failed — see results below`);
      } else {
        toast.error(err.message || 'Bulk create failed');
      }
    } finally {
      setBulkUploading(false);
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
    <div className="max-w-4xl mx-auto mt-4 sm:mt-10 p-3 sm:p-4 md:p-8 glass rounded-2xl border border-border/50 shadow-medium min-w-0 overflow-x-hidden">
      <h2 className="text-2xl font-bold mb-2 text-center">Add Product / Stock Item</h2>
      <p className="text-center text-sm text-muted-foreground mb-3">
        Create a new product with pricing, stock levels, and catalog details
      </p>

      <div className="mb-8 rounded-xl border border-blue-200/80 bg-blue-50/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowColumnHelp((v) => !v)}
          className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition"
          aria-expanded={showColumnHelp}
        >
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-blue-900">
              How to create products
            </p>
            <p className="text-xs text-blue-800/80 mt-0.5">
              Use the form below for one product, or Excel bulk create for many.
              Click for column meanings and what is required.
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-blue-600 shrink-0 mt-0.5 transition-transform ${
              showColumnHelp ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showColumnHelp && (
          <div className="border-t border-blue-200/80 px-3 py-3 text-xs text-blue-950/80 space-y-2 bg-white/50">
            <p className="font-medium text-foreground text-sm">Excel columns — what they mean</p>
            <p>
              Creates <span className="font-medium text-foreground">new</span> products in inventory.
              Each Excel row becomes one product. The single form above uses the same fields.
            </p>
            <ul className="space-y-1.5 list-none">
              <li>
                <span className="font-mono text-foreground">Name</span>
                <span className="ml-1 rounded bg-red-100 text-red-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Required
                </span>
                — Product display name (e.g. 2.5mm Copper Cable).
              </li>
              <li>
                <span className="font-mono text-foreground">Category</span>
                <span className="ml-1 rounded bg-red-100 text-red-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Required
                </span>
                — Group name (e.g. Cables). Matched by name; created automatically if missing.
              </li>
              <li>
                <span className="font-mono text-foreground">Selling Price</span>
                <span className="ml-1 rounded bg-red-100 text-red-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Required
                </span>
                — Sale price to customers (UGX).
              </li>
              <li>
                <span className="font-mono text-foreground">Cost Price</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — What you paid / acquisition cost (UGX).
              </li>
              <li>
                <span className="font-mono text-foreground">Stock</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Opening quantity on hand (default 0).
              </li>
              <li>
                <span className="font-mono text-foreground">Min Stock</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Low-stock alert threshold.
              </li>
              <li>
                <span className="font-mono text-foreground">SKU</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Unique product code for tracking (must not already exist).
              </li>
              <li>
                <span className="font-mono text-foreground">Barcode</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Barcode / UPC for scanning at POS.
              </li>
              <li>
                <span className="font-mono text-foreground">Brand</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Exact brand name already in the system, or leave blank.
              </li>
              <li>
                <span className="font-mono text-foreground">Unit</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Unit of measure (e.g. pcs, m, kg) — name or abbreviation.
              </li>
              <li>
                <span className="font-mono text-foreground">Kind</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — product, packaging, material, or other (default: product).
              </li>
              <li>
                <span className="font-mono text-foreground">Size</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Size / rating label (e.g. 2.5mm, 16A).
              </li>
              <li>
                <span className="font-mono text-foreground">Description</span>
                <span className="ml-1 rounded bg-gray-200 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Optional
                </span>
                — Extra notes about the product.
              </li>
            </ul>
            <p className="pt-1 border-t border-blue-200/60">
              <span className="font-medium text-foreground">Required:</span> Name, Category, Selling Price.
              Delete example rows before uploading unless they are real products you want to create.
            </p>
          </div>
        )}
      </div>

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

      <div className="mt-10 pt-8 border-t border-border/50 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Bulk create (Excel)</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download the template, fill one row per product, then upload to create many at once.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                downloadInventoryBulkTemplate();
                toast.success('Template downloaded');
              } catch (err: any) {
                toast.error(err.message || 'Could not download template');
              }
            }}
            className="inline-flex items-center justify-center gap-2 border border-border/50 rounded-xl px-4 py-2.5 min-h-11 text-sm font-medium hover:bg-muted/40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download template
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 border border-border/50 rounded-xl px-4 py-2.5 min-h-11 text-sm font-medium hover:bg-muted/40"
          >
            <Upload className="h-4 w-4" />
            Choose Excel file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={onBulkFile}
          />

          {bulkPreview.length > 0 && (
            <>
              <button
                type="button"
                disabled={bulkUploading}
                onClick={submitBulk}
                className="inline-flex items-center justify-center bg-blue-600 text-white rounded-xl px-4 py-2.5 min-h-11 text-sm font-medium disabled:opacity-50"
              >
                {bulkUploading ? 'Creating…' : `Create ${bulkPreview.length} product(s)`}
              </button>
              <button
                type="button"
                disabled={bulkUploading}
                onClick={clearBulk}
                className="inline-flex items-center justify-center border border-border/50 rounded-xl px-4 py-2.5 min-h-11 text-sm text-muted-foreground"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {bulkFileName && (
          <p className="text-xs text-muted-foreground">
            File: <span className="font-medium text-foreground">{bulkFileName}</span>
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Need column details? Open{' '}
          <button
            type="button"
            onClick={() => {
              setShowColumnHelp(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-blue-600 font-medium underline-offset-2 hover:underline inline-flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            How to create products
          </button>{' '}
          above.
        </p>

        {bulkParseErrors.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 space-y-1">
            {bulkParseErrors.slice(0, 8).map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            {bulkParseErrors.length > 8 && (
              <div>…and {bulkParseErrors.length - 8} more</div>
            )}
          </div>
        )}

        {bulkPreview.length > 0 && (
          <div className="overflow-x-auto border border-border/50 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2 w-10 text-muted-foreground">#</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Brand</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreview.slice(0, 50).map((r) => (
                  <tr key={r.excelRow} className="border-t border-border/40">
                    <td className="p-2 text-muted-foreground">{r.excelRow}</td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">UGX {Number(r.price).toLocaleString()}</td>
                    <td className="p-2">{r.stock}</td>
                    <td className="p-2 font-mono text-xs">{r.sku || '—'}</td>
                    <td className="p-2">{r.brand || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkPreview.length > 50 && (
              <p className="p-2 text-xs text-muted-foreground border-t border-border/40">
                Showing first 50 of {bulkPreview.length} rows
              </p>
            )}
          </div>
        )}

        {bulkResults && bulkResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Create results</h4>
            <div className="overflow-x-auto border border-border/50 rounded-xl max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left sticky top-0">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((r) => (
                    <tr key={r.row} className="border-t border-border/40">
                      <td className="p-2">{r.row}</td>
                      <td className="p-2">
                        <span className={r.ok ? 'text-green-700' : 'text-red-600'}>
                          {r.ok ? 'OK' : 'Failed'}
                        </span>
                      </td>
                      <td className="p-2">{r.name || r.sku || '—'}</td>
                      <td className="p-2 text-muted-foreground">
                        {r.ok ? `Stock ${r.stock ?? 0}` : r.error || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateInventory;
