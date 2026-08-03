'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  Search,
  Calculator,
  FileText,
  User,
  Package,
  DollarSign,
  PlusCircle,
  MapPin
} from 'lucide-react';
import { fetchApi } from '@/lib/apiConfig';
import { toast } from 'sonner';

// Types
interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category: string | { id: string; name: string };
  size: string;
  quantity: number;
  description: string;
  photo: string | null;
  sizes?: string[];
}

interface SizeOption {
  value: string;
  label: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  shippingCity: string;
  shippingDistrict: string;
  status: string;
  company?: string;
}

// Type for customer data from the API
interface ApiCustomer {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customerType?: 'client' | 'company';
  address?: string;
  location?: string;
  shippingAddress?: string;
  shippingCity?: string;
  city?: string;
  shippingDistrict?: string;
  district?: string;
  status?: string;
  companyName?: string | null;
  contactPerson?: string | null;
  workEmail?: string | null;
}

interface Customer extends CustomerInfo {
  id: string;
  customerType?: 'client' | 'company';
  companyName?: string | null;
  contactPerson?: string | null;
}

interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  purchasePrice: string;
  sellingPrice: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  availableSizes?: SizeOption[];
}

const CreateQuote = () => {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      size: '',
      quantity: 1,
      purchasePrice: '',
      sellingPrice: '',
      unitPrice: 0,
      totalPrice: 0,
      description: '',
      availableSizes: [],
    }
  ]);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    shippingCity: '',
    shippingDistrict: '',
    status: 'Pending',
    company: '',
  });

  const [quoteSettings, setQuoteSettings] = useState({
    validUntil: 30,
    includeVat: false,
    notes: '',
    terms: 'Cash payment', // Changed default value here
    status: 'Draft'
  });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const data = await fetchApi('/customers', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          } as any
        });
        const items: ApiCustomer[] = (data?.data?.items || data?.items || data || []) as ApiCustomer[];

        const formattedCustomers: Customer[] = items.map((c) => {
          const isCompany = c.customerType === 'company';
          const displayName = isCompany
            ? (c.companyName || c.name || '')
            : (c.name || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim());

          return {
            id: String(c.id),
            name: displayName,
            email: c.email ?? c.workEmail ?? '',
            phone: c.phone ?? '',
            address: isCompany ? (c.address ?? '') : (c.location ?? c.address ?? ''),
            shippingCity: c.shippingCity ?? c.city ?? '',
            shippingDistrict: c.shippingDistrict ?? c.district ?? '',
            status: c.status ?? 'active',
            customerType: c.customerType,
            companyName: c.companyName ?? null,
            contactPerson: c.contactPerson ?? null,
          };
        });

        setCustomers(formattedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers. Please try again.');
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const data = await fetchApi('/inventory/inventory', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          } as any
        });
        const items = (data?.data?.items ?? data?.items ?? data) as any[];
        if (Array.isArray(items)) {
          const mapped: InventoryItem[] = items.map((it: any) => ({
            id: String(it.id),
            name: it.name,
            price: Number(it.price) || 0,
            category: it.category ?? it.category?.name ?? it.categoryId ?? '',
            size: it.size ?? '',
            quantity: typeof it.quantity === 'number' ? it.quantity : (it.stock ?? 0),
            description: it.description ?? '',
            photo: it.photo ?? null,
            sizes: it.sizes || [],
          }));
          setInventory(mapped);
        } else {
          setInventory([]);
        }
      } catch (e) {
        console.error('Error fetching inventory:', e);
        toast.error('Failed to load inventory. Please try again.');
        setInventory([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.category).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter((customer) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      customer.name.toLowerCase().includes(q) ||
      customer.phone.toLowerCase().includes(q) ||
      customer.email.toLowerCase().includes(q) ||
      (customer.address ?? '').toLowerCase().includes(q) ||
      (customer.companyName ?? '').toLowerCase().includes(q) ||
      (customer.contactPerson ?? '').toLowerCase().includes(q)
    );
  });

  const handleCustomerInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerInfo({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address ?? '',
      shippingCity: customer.shippingCity ?? '',
      shippingDistrict: customer.shippingDistrict ?? '',
      status: customer.status || 'Pending',
      company: customer.companyName || '',
    });
    setSearchTerm(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowCustomerDropdown(e.target.value.length > 0);
  };

  // New handler for quote settings changes
  const handleQuoteSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setQuoteSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addQuoteItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      size: '',
      quantity: 1,
      purchasePrice: '',
      sellingPrice: '',
      unitPrice: 0,
      totalPrice: 0,
      description: '',
      availableSizes: [],
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  const removeQuoteItem = (itemId: string) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter(item => item.id !== itemId));
    }
  };

  const updateQuoteItem = (itemId: string, field: keyof QuoteItem, value: any) => {
    setQuoteItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          if (field === 'quantity' || field === 'purchasePrice' || field === 'sellingPrice') {
            const currentPurchasePrice = parseFloat(updatedItem.purchasePrice) || 0;
            const currentSellingPrice = parseFloat(updatedItem.sellingPrice) || 0;
            const currentQuantity = parseInt(updatedItem.quantity.toString()) || 0;

            updatedItem.unitPrice = currentSellingPrice;
            updatedItem.totalPrice = currentQuantity * currentSellingPrice;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleProductSelect = (itemId: string, productId: string) => {
    const selectedProduct = inventory.find(p => p.id === productId);
    if (selectedProduct) {
      const currentItem = quoteItems.find(i => i.id === itemId);
      const quantity = currentItem?.quantity || 1;

      updateQuoteItem(itemId, 'productId', productId);
      updateQuoteItem(itemId, 'productName', selectedProduct.name);
      updateQuoteItem(itemId, 'description', selectedProduct.description || '');
      updateQuoteItem(itemId, 'purchasePrice', selectedProduct.price.toString());
      updateQuoteItem(itemId, 'sellingPrice', selectedProduct.price.toString());
      updateQuoteItem(itemId, 'availableSizes', selectedProduct.sizes || []);

      const effectivePrice = parseFloat(selectedProduct.price.toString()) || 0;
      updateQuoteItem(itemId, 'totalPrice', quantity * effectivePrice);
      updateQuoteItem(itemId, 'unitPrice', effectivePrice);
    }
  };

  const calculateItemTotal = (item: QuoteItem) => {
    return (parseFloat(item.sellingPrice) || 0) * (item.quantity || 0);
  };

  const calculateQuoteSubtotal = () => {
    return quoteItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateVat = () => {
    const FIXED_VAT_RATE = 0.18;
    return quoteSettings.includeVat ? calculateQuoteSubtotal() * FIXED_VAT_RATE : 0;
  };

  const calculateQuoteTotal = () => {
    return calculateQuoteSubtotal() + calculateVat();
  };

  const generateQuoteNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QUO/${year}${month}${day}/${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all required customer information');
      return;
    }

    if (quoteItems.some(item => !item.productId || item.quantity <= 0 || parseFloat(item.sellingPrice) <= 0)) {
      toast.error('Please ensure all items have a product selected, valid quantity, and selling price');
      return;
    }

    setIsSubmitting(true);

    try {
      const quoteData = {
        quoteNumber: generateQuoteNumber(),
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address,
          customerCity: customerInfo.shippingCity, // Changed from shippingCity
          customerDistrict: customerInfo.shippingDistrict, // Changed from shippingDistrict
          company: customerInfo.company,
        },
        items: quoteItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: parseFloat(item.sellingPrice) || 0,
          totalPrice: item.totalPrice,
          description: item.description,
        })),
        subtotal: calculateQuoteSubtotal(),
        vatAmount: calculateVat(),
        total: calculateQuoteTotal(),
        includeVat: quoteSettings.includeVat,
        vatRate: 0.18,
        validUntil: quoteSettings.validUntil,
        notes: quoteSettings.notes,
        terms: quoteSettings.terms,
        status: quoteSettings.status
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const createdQuote = await fetchApi('/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as any,
        body: JSON.stringify(quoteData),
      });

      console.log('Quote created:', createdQuote);
      setIsSubmitted(true);
      toast.success('Quote created successfully!');
      setTimeout(() => setIsSubmitted(false), 3000);

      setQuoteItems([
        {
          id: Date.now().toString(),
          productId: '',
          productName: '',
          size: '',
          quantity: 1,
          purchasePrice: '',
          sellingPrice: '',
          unitPrice: 0,
          totalPrice: 0,
          description: '',
          availableSizes: [],
        }
      ]);
      setCustomerInfo({
        name: '',
        email: '',
        phone: '',
        address: '',
        shippingCity: '',
        shippingDistrict: '',
        status: 'Pending',
        company: '',
      });
      setSearchTerm('');
      setShowCustomerDropdown(false);
      setQuoteSettings({
        validUntil: 30,
        includeVat: false,
        notes: '',
        terms: 'Cash payment', // Reset to cash payment
        status: 'Draft'
      });

    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Failed to create quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const sizeOptions: SizeOption[] = [
    { value: 'XS', label: 'XS' },
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
    { value: 'XXL', label: 'XXL' },
    { value: 'One Size', label: 'One Size' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient from-yellow-400 to-orange-500">New Quote Entry</h1>
          <p className="text-muted-foreground mt-1">Enter quote details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information and Shipping Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
            <h2 className="text-xl font-semibold flex items-center gap-3 mb-6"><User className="text-orange-500"/>Customer Information</h2>
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <label className="font-medium text-sm">Search Customer</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => searchTerm && setShowCustomerDropdown(true)}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="Search by name or phone..."
                  />

                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-medium text-sm">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleCustomerInfoChange}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleCustomerInfoChange}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={customerInfo.phone}
                    onChange={handleCustomerInfoChange}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="0700123456"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={customerInfo.company}
                    onChange={handleCustomerInfoChange}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="Optional Company Name"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
            <h2 className="text-xl font-semibold flex items-center gap-3 mb-6"><MapPin className="text-orange-500"/>Shipping Details</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="address" className="font-medium text-sm">Address</label>
                <input type="text" id="address" name="address" value={customerInfo.address} onChange={handleCustomerInfoChange} className="w-full form-input border border-gray-300 rounded-lg px-3 py-2 bg-white" placeholder="e.g., Plot 123, Acacia Avenue" required/>
              </div>
              <div className="space-y-2">
                <label htmlFor="shippingCity" className="font-medium text-sm">City / Town</label>
                <input type="text" id="shippingCity" name="shippingCity" value={customerInfo.shippingCity} onChange={handleCustomerInfoChange} className="w-full form-input border border-gray-300 rounded-lg px-3 py-2 bg-white" placeholder="e.g., Kampala" required/>
              </div>
              <div className="space-y-2">
                <label htmlFor="shippingDistrict" className="font-medium text-sm">District</label>
                <input type="text" id="shippingDistrict" name="shippingDistrict" value={customerInfo.shippingDistrict} onChange={handleCustomerInfoChange} className="w-full form-input border border-gray-300 rounded-lg px-3 py-2 bg-white" placeholder="e.g., Nakawa" required/>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Items */}
        <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-6">
            <Package className="text-orange-500"/>
            Quote Items
          </h2>

          <div className="space-y-4">
            {quoteItems.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end rounded-xl border border-gray-300 bg-white p-4"
              >
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 font-medium">
                    {index + 1}
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="font-medium text-sm block">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(item.id, e.target.value)}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    required
                  >
                    <option value="">-- Select --</option>
                    {inventory.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {typeof product.category === 'object' ? product.category.name : product.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-sm block">Size</label>
                  <select
                    value={item.size}
                    onChange={(e) => updateQuoteItem(item.id, 'size', e.target.value)}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    required
                  >
                    <option value="">Select Size</option>
                    {(item.availableSizes && item.availableSizes.length > 0 ? item.availableSizes : sizeOptions).map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-sm block">Cost (UGX)</label>
                  <input
                    type="number"
                    value={item.purchasePrice}
                    readOnly
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    placeholder="Cost"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-sm block">Price (UGX)</label>
                  <input
                    type="number"
                    value={item.sellingPrice}
                    onChange={(e) => updateQuoteItem(item.id, 'sellingPrice', e.target.value)}
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="Price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-sm block">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuoteItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full form-input text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-sm block">Total (UGX)</label>
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-300 text-sm font-medium h-10 flex items-center px-3">
                    {item.sellingPrice
                      ? `UGX ${calculateItemTotal(item).toLocaleString()}`
                      : '--'
                    }
                  </div>
                </div>

                <div className="flex items-end h-10">
                  {quoteItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuoteItem(item.id)}
                      className="text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2 h-10"
                      title="Remove item"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-2">
              <button
                type="button"
                onClick={addQuoteItem}
                className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
              >
                <span className="text-lg">+</span> Add another item
              </button>
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeVat"
                    checked={quoteSettings.includeVat}
                    onChange={(e) => setQuoteSettings(prev => ({ ...prev, includeVat: e.target.checked }))}
                    className="form-checkbox h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <label htmlFor="includeVat" className="ml-2 text-sm font-medium text-gray-700">
                    Include VAT
                  </label>
                </div>
              </div>

              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span>UGX {calculateQuoteSubtotal().toLocaleString()}</span>
                </div>

                {quoteSettings.includeVat && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">VAT:</span>
                    <span>UGX {calculateVat().toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">
                    UGX {calculateQuoteTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Settings */}
        <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-6"><Calculator className="text-orange-500"/>Quote Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="validUntil" className="font-medium text-sm">Valid Until (Days)</label>
              <input
                type="number"
                id="validUntil"
                name="validUntil"
                min="1"
                value={quoteSettings.validUntil}
                onChange={(e) => setQuoteSettings(prev => ({ ...prev, validUntil: parseInt(e.target.value) || 30 }))}
                className="w-full form-input border border-gray-300 rounded-lg px-3 py-2 bg-white"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="terms" className="font-medium text-sm">Terms & Conditions</label>
              <Textarea
                id="terms"
                name="terms"
                value={quoteSettings.terms}
                onChange={handleQuoteSettingsChange}
                placeholder="Enter terms and conditions..."
                rows={3}
                className="border border-gray-300 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="font-medium text-sm">Notes</label>
              <Textarea
                id="notes"
                name="notes"
                value={quoteSettings.notes}
                onChange={handleQuoteSettingsChange}
                placeholder="Additional notes for the quote..."
                rows={3}
                className="border border-gray-300 rounded-lg"
              />
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <label htmlFor="status" className="font-medium text-sm">Quote Status</label>
              <select
                id="status"
                name="status"
                value={quoteSettings.status}
                onChange={handleQuoteSettingsChange}
                className="w-full form-input border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* CREATE QUOTE BUTTON MOVED HERE */}
        <div className="mt-6 flex justify-end">
          <div className="space-y-4">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-transform"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  Create Quote
                </>
              )}
            </button>

            {isSubmitted && (
              <div className="p-4 text-center bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl animate-fade-in">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Quote created successfully!
                </div>
                <p className="text-sm mt-1 text-green-500">A confirmation has been sent to your email.</p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateQuote;
