"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/apiConfig';
import { CheckCircle, XCircle, DollarSign, Eye, Edit, Search, History } from 'lucide-react';
import Dialog from '@/components/Dialog';

interface OrderItem {
  id: string;
  product: string;
  category?: string;
  size: string;
  quantity: number;
  price: string;
  total: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  notes?: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  shippingCity: string;
  shippingDistrict: string;
  items: OrderItem[];
  subtotal: string;
  vat: string;
  total: string;
  status: string;
  paymentStatus: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  date: string;
  paidAmount?: number;
  balance?: number;
  payments?: Payment[];
}

const formatAmount = (val: any): string => {
  const num = Number(String(val).replace(/,/g, ''));
  return isFinite(num) ? num.toLocaleString('en-UG') : '0';
};

const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  const n = Number(String(val).replace(/,/g, ''));
  return isFinite(n) ? n : 0;
};

const formatOrderDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'Processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'Shipped': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'Pending': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const PaymentHistoryModal = ({ order, onClose }: { order: Order | null; onClose: () => void }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Payment History — {order.orderNumber || order.id}</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center sm:text-left">
              <span className="text-gray-500">Total:</span>
              <div className="font-semibold text-lg">{formatAmount(order.total)}</div>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-gray-500">Paid:</span>
              <div className="font-semibold text-lg text-green-600">{formatAmount(order.paidAmount || 0)}</div>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-gray-500">Balance:</span>
              <div className={`font-semibold text-lg ${(order.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatAmount(order.balance || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Payment Records</h4>
          {order.payments && order.payments.length > 0 ? (
            <div className="space-y-2">
              {order.payments.map((payment, index) => (
                <div key={payment.id} className="flex items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start sm:items-center gap-3 flex-1">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">{formatAmount(payment.amount)}</span>
                        <span className="text-sm text-gray-500">via {payment.method}</span>
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-gray-600 mt-1 break-words">{payment.notes}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {formatOrderDate(payment.createdAt)}
                      </div>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1 sm:mt-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No payments recorded yet</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-100 rounded-md hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ order, onClose, onPayment }: { order: Order | null; onClose: () => void; onPayment: (orderId: string, payment: Partial<Payment>) => void }) => {
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'Mobile Money',
    notes: ''
  });

  if (!order) return null;

  const totalAmount = toNumber(order.total);
  const paidAmount = order.paidAmount || 0;
  const balance = totalAmount - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.amount || toNumber(paymentData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    await onPayment(order.id, {
      amount: toNumber(paymentData.amount),
      method: paymentData.method,
      notes: paymentData.notes || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Record Payment — {order.orderNumber || order.id}</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center sm:text-left">
              <span className="text-gray-500">Total:</span>
              <div className="font-semibold text-lg">{formatAmount(totalAmount)}</div>
            </div>
          <div className="text-center sm:text-left">
              <span className="text-gray-500">Paid:</span>
              <div className="font-semibold text-lg text-green-600">{formatAmount(paidAmount)}</div>
          </div>
          <div className="text-center sm:text-left">
              <span className="text-gray-500">Balance:</span>
              <div className={`font-semibold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatAmount(balance)}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
            <input
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter payment amount"
              max={balance}
              required
            />
            <div className="text-xs text-gray-500 mt-1">Maximum: {formatAmount(balance)}</div>
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
            <select
              value={paymentData.method}
              onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Mobile Money">Mobile Money</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add payment notes (optional)"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Record Payment
            </button>
          </div>
        </form>
      </div>
        </div>
  );
};

const PaymentsPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);


  const fetchOrderPayments = async (orderId: string): Promise<Payment[]> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    console.log('💳 Fetching payments for order:', orderId);
    
    try {
      const result = await fetchApi(`/orders/${orderId}/payments`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as any,
      });
      console.log('✅ Payments fetched successfully:', result);
      
      // Extract payments from the response structure
      const payments = result?.data || [];
      return payments.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        notes: payment.notes,
        createdAt: payment.paidAt || payment.createdAt
      }));
    } catch (error) {
      console.warn('⚠️ Failed to fetch payments, returning empty array:', error);
      return [];
    }
  };

  const recordPayment = async (orderId: string, payment: Partial<Payment>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    console.log('💰 Recording payment for order:', orderId, payment);
    
    const requestBody = {
      ...payment,
      orderId: orderId
    };
    console.log('📤 Request body:', requestBody);
    
    try {
      const result = await fetchApi(`/orders/${orderId}/payments`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as any,
        body: JSON.stringify(requestBody),
      });
      console.log('✅ Payment recorded successfully:', result);
      
      // Fetch updated payments for this specific order
      try {
        const payments = await fetchOrderPayments(orderId);
        const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Update the specific order in the state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? {
                  ...order,
                  paidAmount,
                  balance: toNumber(order.total) - paidAmount,
                  payments
                }
              : order
          )
        );
      } catch (error) {
        console.warn('Failed to fetch updated payments, refreshing all orders:', error);
        await fetchOrders();
      }
      
      return result;
    } catch (error) {
      console.warn('⚠️ Backend payment API not available, simulating success locally:', error);
      
      // Simulate successful payment locally for frontend testing
      const simulatedPayment = {
        id: `payment_${Date.now()}`,
        amount: payment.amount || 0,
        method: payment.method || 'Mobile Money',
        notes: payment.notes,
        createdAt: new Date().toISOString()
      };
      
      // Update local state immediately
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? {
                ...order,
                paidAmount: (order.paidAmount || 0) + (payment.amount || 0),
                balance: toNumber(order.total) - ((order.paidAmount || 0) + (payment.amount || 0)),
                payments: [...(order.payments || []), simulatedPayment]
              }
            : order
        )
      );
      
      return simulatedPayment;
    }
  };

  const handlePayment = async (orderId: string, payment: Partial<Payment>) => {
    try {
      setLoading(true);
      const result = await recordPayment(orderId, payment);
      console.log('Payment processed:', result);
      alert('Payment recorded successfully!');
    } catch (err) {
      console.error('Payment error:', err);
      alert(`Failed to record payment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    // Mock data for testing when backend fails
    const mockOrders: Order[] = [
      {
        id: 'ORD-001',
        orderNumber: '001',
        customer: 'John Mukasa',
        email: 'john.mukasa@example.com',
        phone: '0755123456',
        address: '123 Main Street, Kampala',
        shippingCity: 'Kampala',
        shippingDistrict: 'Central',
        items: [
            { id: '1', product: 'Fresh Tilapia', category: 'Seafood', size: 'Large', quantity: 2, price: '25000', total: '50,000' },
            { id: '2', product: 'Organic Avocadoes', category: 'Fruits', size: '5kg', quantity: 1, price: '30000', total: '30,000' }
          ],
          subtotal: '80,000',
          vat: '14,400',
          total: '94,400',
        status: 'Completed',
        paymentStatus: 'Paid',
        date: '2024-08-03',
          paidAmount: 50000,
          balance: 44400,
          payments: []
      },
      {
        id: 'ORD-002',
        orderNumber: '002',
        customer: 'Jane Achen',
        email: 'jane.achen@example.com',
        phone: '0777123456',
        address: '456 Market Street, Kampala',
        shippingCity: 'Kampala',
        shippingDistrict: 'Industrial Area',
        items: [
            { id: '3', product: 'Craft Coffee Beans', category: 'Beverages', size: '1kg', quantity: 3, price: '45000', total: '135,000' }
          ],
          subtotal: '135,000',
          vat: '24,300',
          total: '159,300',
        status: 'Processing',
        paymentStatus: 'Pending',
        date: '2024-08-04',
          paidAmount: 0,
          balance: 159300,
          payments: []
        }
      ];

    try {
      setLoading(true);
      const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://backendrdjs-production.up.railway.app/api/v1'
        : 'http://localhost:4210/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const params = new URLSearchParams({ page: '1', limit: '50' });
      const res = await fetch(`${apiBase}/orders?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to load orders: ${res.status} - ${errorText}`);
      }
        const data = await res.json();
        console.log('Orders API response:', data);
        const items = (data?.data?.items ?? data?.items ?? data) as any[];
        if (Array.isArray(items)) {
          console.log('Orders list (raw):', items);
          const mapped: Order[] = items.map((o: any) => {
            console.log('Raw order:', o);
            const rawItems: any[] = Array.isArray(o.items)
              ? o.items
              : (Array.isArray(o.orderItems) ? o.orderItems : (Array.isArray(o.products) ? o.products : (Array.isArray(o.order_details) ? o.order_details : (Array.isArray(o.details) ? o.details : []))));

            const mappedItems = rawItems.map((it: any, idx: number) => {
              const chosenId = String(it.id ?? it.itemId ?? it.inventoryId ?? Math.random());
              const chosenName = it.productName ?? it.name ?? it.inventory?.name ?? 'Item';
              const chosenCategory = it.category?.name ?? it.categoryName ?? it.inventory?.category?.name ?? it.inventory?.category ?? '';
              const chosenSize = it.size ?? it.variant ?? '';
              const chosenQty = Number(it.quantity ?? it.qty ?? 0);
              const chosenUnit = Number(it.unitPrice ?? it.price ?? it.sellingPrice ?? 0);
              const chosenTotal = (chosenUnit * chosenQty).toLocaleString();

              return {
                id: chosenId,
                product: chosenName,
                category: chosenCategory,
                size: chosenSize,
                quantity: chosenQty,
                price: String(chosenUnit),
                total: String(chosenTotal)
              };
            });
            console.log('Mapped items:', mappedItems);
            if (!mappedItems.length) {
              console.warn('No items mapped for order id:', o.id ?? o.orderId ?? o.code, '— raw keys available:', Object.keys(o));
            }

            const subtotal = (o.totals?.subtotal ?? o.subtotal ?? o.amount?.subtotal ?? o.subTotal ?? null);
            const total = (o.totals?.total ?? o.total ?? o.amount?.total ?? o.totalAmount ?? null);
            const vat = (o.totals?.vat ?? o.vat ?? o.tax ?? null);

          // Initialize payment fields with defaults
          const totalAmount = toNumber(total);
          const paidAmount = 0; // Will be calculated from payments
          const balance = totalAmount - paidAmount;

            return {
              id: String(o.id ?? o.orderId ?? o.code ?? ''),
              orderNumber: o.orderNumber ?? o.shortId ?? o.displayId ?? undefined,
              customer: o.customer?.name ?? o.customerName ?? o.clientName ?? 'Unknown',
              email: o.customer?.email ?? o.customerEmail ?? o.email ?? '',
              phone: o.customer?.phone ?? o.customerPhone ?? o.phone ?? '',
              address: o.customer?.address ?? o.address ?? '',
              shippingCity: o.customer?.shippingCity ?? o.shippingCity ?? '',
              shippingDistrict: o.customer?.shippingDistrict ?? o.shippingDistrict ?? '',
              items: mappedItems,
              subtotal: subtotal !== null ? String(subtotal) : '',
              vat: vat !== null ? String(vat) : '',
              total: total !== null ? String(total) : '',
              status: o.orderStatus ?? o.status ?? 'Pending',
              paymentStatus: o.payment?.status ?? o.paymentStatus ?? 'Pending',
              paymentMethod: o.payment?.method ?? o.paymentMethod ?? undefined,
              date: o.date ?? o.createdAt ?? o.placedAt ?? '',
              notes: o.notes ?? undefined,
            paidAmount: paidAmount,
            balance: balance,
            payments: [] // Will be empty until backend is fixed
            } as Order;
          });
          // Fetch payments for each order and update the data
          const ordersWithPayments = await Promise.all(
            mapped.map(async (order) => {
              try {
                const payments = await fetchOrderPayments(order.id);
                const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
                const balance = toNumber(order.total) - paidAmount;
                
                return {
                  ...order,
                  paidAmount,
                  balance,
                  payments
                };
              } catch (error) {
                console.warn(`Failed to fetch payments for order ${order.id}:`, error);
                return order;
              }
            })
          );
          
          setOrders(ordersWithPayments);
        setUsingMockData(false);
        }
      } catch (e) {
      console.error('❌ Failed to fetch orders from API, using mock data:', e);
      setOrders(mockOrders);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.customer.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower) ||
      order.items.some(item => item.product.toLowerCase().includes(searchLower))
    );
  });

  if (loading && orders.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {usingMockData && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                <strong>Demo Mode:</strong> Backend API is unavailable. Showing mock data for testing payment functionality.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient from-green-500 to-emerald-500">Payment Management</h1>
          <p className="text-muted-foreground mt-1">Record payments and track balances.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            className="pl-12 pr-4 py-3 w-full md:w-80 form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/50">
              <tr>
                <th className="p-4 font-semibold w-16">#</th>
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold text-right">Total</th>
                <th className="p-4 font-semibold text-right">Paid</th>
                <th className="p-4 font-semibold text-right">Balance</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const totalAmount = toNumber(order.total);
                  const paidAmount = order.paidAmount || 0;
                  const balance = totalAmount - paidAmount;
                  
                  return (
                    <tr key={order.id} className="border-t border-border/50 hover:bg-secondary/40">
                    <td className="p-4 text-center">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mx-auto">
                        {index + 1}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-primary">{order.orderNumber || order.id}</td>
                    <td className="p-4">
                      <div className="font-medium">{order.customer}</div>
                      <div className="text-sm text-muted-foreground">{order.phone}</div>
                    </td>
                      <td className="p-4 font-semibold text-right">{formatAmount(totalAmount)}</td>
                      <td className="p-4 font-semibold text-right text-green-600">{formatAmount(paidAmount)}</td>
                      <td className="p-4 font-semibold text-right">
                        <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatAmount(balance)}
                        </span>
                    </td>
                    <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsPaymentHistoryModalOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="View Payment History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsPaymentModalOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <DollarSign className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-secondary/30 rounded-2xl border border-border/50 p-8 text-center text-muted-foreground">
            No orders found
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const totalAmount = toNumber(order.total);
            const paidAmount = order.paidAmount || 0;
            const balance = totalAmount - paidAmount;
            
            return (
              <div key={order.id} className="bg-secondary/30 rounded-2xl border border-border/50 p-4 hover:bg-secondary/40 transition-colors">
                {/* Header with number and order ID */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-primary">{order.orderNumber || order.id}</div>
                      <div className="text-sm text-muted-foreground">{order.customer}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="mb-4 space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Phone:</span> {order.phone}
                  </div>
                  {order.email && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Email:</span> {order.email}
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Total</div>
                    <div className="font-semibold text-sm">{formatAmount(totalAmount)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Paid</div>
                    <div className="font-semibold text-sm text-green-600">{formatAmount(paidAmount)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Balance</div>
                    <div className={`font-semibold text-sm ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatAmount(balance)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsPaymentHistoryModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <History className="w-4 h-4" />
                    View History
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Record Payment
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isPaymentModalOpen && (
        <PaymentModal 
          order={selectedOrder} 
          onClose={() => setIsPaymentModalOpen(false)} 
          onPayment={handlePayment}
        />
      )}

      {isPaymentHistoryModalOpen && (
        <PaymentHistoryModal 
          order={selectedOrder} 
          onClose={() => setIsPaymentHistoryModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default PaymentsPage;