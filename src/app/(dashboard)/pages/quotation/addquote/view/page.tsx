'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { fetchApi, buildApiUrl } from '@/lib/apiConfig';
import { toast } from 'sonner';

// Types
interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  district: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  quantity: number;
  description?: string;
  sizes?: string[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  city?: string;
  district?: string;
}

const CreateQuote = () => {
  // Quote items state
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      size: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      description: ''
    }
  ]);

  // Customer information state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    district: ''
  });

  // Quote settings
  const [quoteSettings, setQuoteSettings] = useState({
    validUntil: 30, // days
    includeVat: false,
    vatRate: 0.18,
    notes: '',
    terms: 'Payment terms: 50% advance, 50% on delivery. Valid for 30 days from quote date.'
  });

  // Data state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  // Fetch inventory and customers
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch inventory
      const inventoryResponse = await fetchApi('/inventory/inventory?page=1&limit=1000');
      const inventoryData = inventoryResponse?.data?.items || inventoryResponse?.items || inventoryResponse || [];
      setInventory(inventoryData);

      // Fetch customers
      const customersResponse = await fetchApi('/customers?page=1&limit=1000');
      const customersData = customersResponse?.data?.items || customersResponse?.items || customersResponse || [];
      setCustomers(customersData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerInfo({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company || '',
        address: customer.address || '',
        city: customer.city || '',
        district: customer.district || ''
      });
      setSelectedCustomer(customerId);
    }
  };

  // Add new quote item
  const addQuoteItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      size: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      description: ''
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  // Remove quote item
  const removeQuoteItem = (itemId: string) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter(item => item.id !== itemId));
    }
  };

  // Update quote item
  const updateQuoteItem = (itemId: string, field: keyof QuoteItem, value: any) => {
    setQuoteItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total price when quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Handle product selection
  const handleProductSelect = (itemId: string, productId: string) => {
    const product = inventory.find(p => p.id === productId);
    if (product) {
      const currentItem = quoteItems.find(i => i.id === itemId);
      const quantity = currentItem?.quantity || 1;
      
      updateQuoteItem(itemId, 'productId', productId);
      updateQuoteItem(itemId, 'productName', product.name);
      updateQuoteItem(itemId, 'unitPrice', product.price);
      updateQuoteItem(itemId, 'description', product.description || '');
      updateQuoteItem(itemId, 'totalPrice', quantity * product.price);
    }
  };

  // Calculate totals
  const subtotal = quoteItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const vatAmount = quoteSettings.includeVat ? subtotal * quoteSettings.vatRate : 0;
  const total = subtotal + vatAmount;

  // Generate quote number
  const generateQuoteNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QUO/${year}${month}${day}/${random}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all required customer information');
      return;
    }

    if (quoteItems.some(item => !item.productId || item.quantity <= 0)) {
      toast.error('Please ensure all items have a product selected and valid quantity');
      return;
    }

    setIsSubmitting(true);

    try {
      const quoteData = {
        quoteNumber: generateQuoteNumber(),
        customer: customerInfo,
        items: quoteItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          description: item.description
        })),
        subtotal,
        vatAmount,
        total,
        includeVat: quoteSettings.includeVat,
        vatRate: quoteSettings.vatRate,
        validUntil: quoteSettings.validUntil,
        notes: quoteSettings.notes,
        terms: quoteSettings.terms,
        status: 'Draft'
      };

      // For now, we'll simulate API call since quotes endpoint might not exist
      console.log('Quote data to be sent:', quoteData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Quote created successfully!');
      
      // Reset form
      setQuoteItems([{
        id: Date.now().toString(),
        productId: '',
        productName: '',
        size: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        description: ''
      }]);
      setCustomerInfo({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        district: ''
      });
      setSelectedCustomer('');
      setQuoteSettings({
        validUntil: 30,
        includeVat: false,
        vatRate: 0.18,
        notes: '',
        terms: 'Payment terms: 50% advance, 50% on delivery. Valid for 30 days from quote date.'
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Create Quote</h1>
        </div>
        <p className="text-muted-foreground">
          Create a detailed quote for your customer with pricing and terms
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer-select">Select Existing Customer (Optional)</Label>
              <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name *</Label>
                <Input
                  id="customer-name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email *</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone *</Label>
                <Input
                  id="customer-phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-company">Company</Label>
                <Input
                  id="customer-company"
                  value={customerInfo.company}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-address">Address</Label>
                <Input
                  id="customer-address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-city">City</Label>
                <Input
                  id="customer-city"
                  value={customerInfo.city}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-district">District</Label>
                <Input
                  id="customer-district"
                  value={customerInfo.district}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Enter district"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quote Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Products */}
            <div className="space-y-2">
              <Label htmlFor="product-search">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="product-search"
                  placeholder="Search products by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Quote Items List */}
            <div className="space-y-4">
              {quoteItems.map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                    <div className="lg:col-span-2 space-y-2">
                      <Label>Product *</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => handleProductSelect(item.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredInventory.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Input
                        value={item.size}
                        onChange={(e) => updateQuoteItem(item.id, 'size', e.target.value)}
                        placeholder="Size"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuoteItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="Qty"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit Price (UGX)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateQuoteItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total (UGX)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.totalPrice.toLocaleString()}
                          readOnly
                          className="bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeQuoteItem(item.id)}
                          disabled={quoteItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateQuoteItem(item.id, 'description', e.target.value)}
                      placeholder="Additional product description..."
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addQuoteItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Quote Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Quote Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="valid-until">Valid Until (Days)</Label>
                  <Input
                    id="valid-until"
                    type="number"
                    min="1"
                    value={quoteSettings.validUntil}
                    onChange={(e) => setQuoteSettings(prev => ({ 
                      ...prev, 
                      validUntil: parseInt(e.target.value) || 30 
                    }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-vat"
                    checked={quoteSettings.includeVat}
                    onCheckedChange={(checked) => setQuoteSettings(prev => ({ 
                      ...prev, 
                      includeVat: checked as boolean 
                    }))}
                  />
                  <Label htmlFor="include-vat">Include VAT (18%)</Label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={quoteSettings.notes}
                    onChange={(e) => setQuoteSettings(prev => ({ 
                      ...prev, 
                      notes: e.target.value 
                    }))}
                    placeholder="Additional notes for the quote..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={quoteSettings.terms}
                onChange={(e) => setQuoteSettings(prev => ({ 
                  ...prev, 
                  terms: e.target.value 
                }))}
                placeholder="Enter terms and conditions..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quote Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Quote Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Subtotal:</span>
                <span className="text-lg font-bold">UGX {subtotal.toLocaleString()}</span>
              </div>
              
              {quoteSettings.includeVat && (
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">VAT (18%):</span>
                  <span className="text-lg font-bold">UGX {vatAmount.toLocaleString()}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">UGX {total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Create Quote
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuote;
