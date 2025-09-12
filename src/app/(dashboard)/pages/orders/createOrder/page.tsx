"use client";
import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/apiConfig';
import { PlusCircle, Package, User, Mail, Phone, MapPin, DollarSign, Hash } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category: string | { id: string; name: string };
  size: string;
  quantity: number;
  description: string;
  photo: string | null;
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

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  purchasePrice: string;
  sellingPrice: string;
  availableSizes?: SizeOption[]; // Add available sizes for the selected product
}

const CreateOrder = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      size: '',
      quantity: 1,
      purchasePrice: '',
      sellingPrice: '',
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
  });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [includeVat, setIncludeVat] = useState(false);
  const vatRate = 0.18; // 18% VAT
  
  // State for customers from database
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Fetch customers from database (clients and companies)
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
      }
    };

    fetchCustomers();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Filter customers based on search term (case-insensitive, supports company and client)
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

  // Fetch inventory items from backend
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
          }));
          setInventory(mapped);
        } else {
          setInventory([]);
        }
      } catch (e) {
        console.error('Error fetching inventory:', e);
        setInventory([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleProductSelect = (itemId: string, productId: string) => {
    const selectedProduct = inventory.find(item => item.id === productId);
    
    setOrderItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            productId: selectedProduct?.id || '',
            productName: selectedProduct?.name || '',
            size: selectedProduct?.size || '',
            purchasePrice: selectedProduct?.price.toString() || '',
            sellingPrice: selectedProduct ? (item.sellingPrice || selectedProduct.price.toString()) : '',
            availableSizes: sizeOptions, // Set available sizes for the selected product
          };
        }
        return item;
      })
    );
  };

  const handleChange = (itemId: string, field: string, value: string | number) => {
    setOrderItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleCustomerInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      address: customer.address,
      shippingCity: customer.shippingCity,
      shippingDistrict: customer.shippingDistrict,
      status: customer.status
    });
    setSearchTerm(customer.name);
    setShowDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(e.target.value.length > 0);
  };

  const addNewItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      size: '',
      quantity: 1,
      purchasePrice: '',
      sellingPrice: '',
    };
    setOrderItems([...orderItems, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter(item => item.id !== itemId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    

    const payload = {
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        shippingCity: customerInfo.shippingCity,
        shippingDistrict: customerInfo.shippingDistrict,
      },
      items: orderItems.map(it => ({
        productId: it.productId,
        productName: it.productName,
        size: it.size,
        quantity: it.quantity,
        price: Number(it.sellingPrice) || 0,
      })),
      totals: {
        subtotal: orderItems.reduce((sum, item) => sum + (Number(item.sellingPrice) || 0) * (item.quantity || 0), 0),
        vatIncluded: includeVat,
        vatRate: includeVat ? 0.18 : 0,
      },
      status: customerInfo.status,
    };

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const created = await fetchApi('/orders', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as any,
        body: JSON.stringify(payload),
      });
      console.log('Order created:', created);
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 3000);
      // Optional: reset form
      // setOrderItems([...])
    } catch (err) {
      console.error(err);
      alert('Failed to create order. Check console for details.');
    }
  };

  const calculateItemTotal = (item: OrderItem) => {
    return (parseFloat(item.sellingPrice) || 0) * (item.quantity || 0);
  };

  const calculateOrderSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateVat = () => {
    return includeVat ? calculateOrderSubtotal() * vatRate : 0;
  };

  const calculateOrderTotal = () => {
    return calculateOrderSubtotal() + calculateVat();
  };

  // Fetch inventory items on component mount
  useEffect(() => {
    // In a real app, this would be an API call to fetch inventory
    const fetchInventory = async () => {
      try {
        // Mock data - replace with actual API call
        const mockInventory: InventoryItem[] = [
          { id: '1', name: 'iPhone 14 Pro Max', price: 1200, category: 'Electronics', size: '', quantity: 3, description: 'Latest Apple iPhone', photo: '' },
          { id: '2', name: 'Wireless Headphones', price: 250, category: 'Accessories', size: '', quantity: 12, description: 'Noise cancelling', photo: '' },
          { id: '3', name: 'T-Shirt', price: 25, category: 'Clothing', size: 'M', quantity: 45, description: 'Cotton t-shirt', photo: '' },
        ];
        setInventory(mockInventory);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Define available sizes (you can customize this based on your needs)
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
          <h1 className="text-3xl font-bold text-gradient from-yellow-400 to-orange-500">New Order Entry</h1>
          <p className="text-muted-foreground mt-1">Enter order details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information */}
          <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
            <h2 className="text-xl font-semibold flex items-center gap-3 mb-6"><User className="text-orange-500"/>Customer Information</h2>
            <div className="space-y-4">             
              {/* Customer Search */}
              <div className="space-y-2 relative">
                <label className="font-medium text-sm">Search Customer</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => searchTerm && setShowDropdown(true)}
                    className="w-full form-input text-sm"
                    placeholder="Search by name or phone..."
                  />
                  
                  {/* Customer Dropdown */}
                  {showDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
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
                    className="w-full form-input text-sm"
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
                    className="w-full form-input text-sm"
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
                    className="w-full form-input text-sm"
                    placeholder="0700123456"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={customerInfo.address}
                    onChange={handleCustomerInfoChange}
                    className="w-full form-input text-sm"
                    placeholder="123 Main St"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Details */}
          <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
            <h2 className="text-xl font-semibold flex items-center gap-3 mb-6"><MapPin className="text-orange-500"/>Shipping Details</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="address" className="font-medium text-sm">Address</label>
                <input type="text" id="address" name="address" value={customerInfo.address} onChange={handleCustomerInfoChange} className="w-full form-input" placeholder="e.g., Plot 123, Acacia Avenue" />
              </div>
              <div className="space-y-2">
                <label htmlFor="shippingCity" className="font-medium text-sm">City / Town</label>
                <input type="text" id="shippingCity" name="shippingCity" value={customerInfo.shippingCity} onChange={handleCustomerInfoChange} className="w-full form-input" placeholder="e.g., Kampala" />
              </div>
              <div className="space-y-2">
                <label htmlFor="shippingDistrict" className="font-medium text-sm">District</label>
                <input type="text" id="shippingDistrict" name="shippingDistrict" value={customerInfo.shippingDistrict} onChange={handleCustomerInfoChange} className="w-full form-input" placeholder="e.g., Nakawa" />
              </div>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-secondary/30 p-6 rounded-2xl border border-border/50">
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-6">
            <Package className="text-orange-500"/>
            Order Details
          </h2>
          
          {/* Order Items List */}
          <div className="space-y-4">
            {orderItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                {/* Item Number */}
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 font-medium">
                    {index + 1}
                  </div>
                </div>
                
                {/* Product Selection */}
                <div className="space-y-2">
                  <label className="font-medium text-sm block">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(item.id, e.target.value)}
                    className="w-full form-input text-sm"
                    required
                  >
                    <option value="">-- Select --</option>
                    {inventory.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Dropdown */}
                <div className="space-y-2">
                  <label className="font-medium text-sm block">Size</label>
                  <select
                    value={item.size}
                    onChange={(e) => handleChange(item.id, 'size', e.target.value)}
                    className="w-full form-input text-sm"
                    required
                  >
                    <option value="">Select Size</option>
                    {(item.availableSizes || sizeOptions).map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Price (Read-only) */}
                <div className="space-y-2">
                  <label className="font-medium text-sm block">Cost (UGX)</label>
                  <input 
                    type="number" 
                    value={item.purchasePrice} 
                    readOnly
                    className="w-full form-input text-sm bg-gray-50" 
                    placeholder="Cost"
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-2">
                  <label className="font-medium text-sm block">Price (UGX)</label>
                  <input 
                    type="number" 
                    value={item.sellingPrice} 
                    onChange={(e) => handleChange(item.id, 'sellingPrice', e.target.value)}
                    className="w-full form-input text-sm" 
                    placeholder="Price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <label className="font-medium text-sm block">Qty</label>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => handleChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    min="1" 
                    className="w-full form-input text-sm" 
                    required
                  />
                </div>
                
                {/* Item Total */}
                <div className="space-y-2">
                  <label className="font-medium text-sm block">Total (UGX)</label>
                  <div className="p-2 bg-gray-50 rounded border text-sm font-medium h-10 flex items-center">
                    {item.sellingPrice 
                      ? `UGX ${calculateItemTotal(item).toLocaleString()}`
                      : '--'
                    }
                  </div>
                </div>

                {/* Remove Button */}
                <div className="flex items-end h-10">
                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove item"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Item Button */}
            <div className="mt-2">
              <button
                type="button"
                onClick={addNewItem}
                className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
              >
                <span className="text-lg">+</span> Add another item
              </button>
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-4 border-t">
              {/* VAT Toggle */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeVat"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <label htmlFor="includeVat" className="ml-2 text-sm font-medium text-gray-700">
                    Include 18% VAT
                  </label>
                </div>
              </div>
              
              {/* Order Summary Details */}
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span>UGX {calculateOrderSubtotal().toLocaleString()}</span>
                </div>
                
                {includeVat && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">VAT (18%):</span>
                    <span>UGX {calculateVat().toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">
                    UGX {calculateOrderTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="space-y-2">
              <label htmlFor="status" className="font-medium text-sm">Order Status</label>
              <select id="status" name="status" value={customerInfo.status} onChange={handleCustomerInfoChange} className="w-full form-input">
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="mt-6 flex justify-end">
              <div className="space-y-4">
                <button 
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                  <PlusCircle className="w-5 h-5" />
                  Place Order
                </button>
                
                {isSubmitted && (
                  <div className="p-4 text-center bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl animate-fade-in">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Order created successfully!
                    </div>
                    <p className="text-sm mt-1 text-green-500">A confirmation has been sent to your email.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateOrder;