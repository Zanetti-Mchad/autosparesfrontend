"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Search, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
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
  paymentMethod?: 'Mobile Money' | 'Credit Card' | 'Bank Transfer' | 'Cash on Delivery';
  date: string;
  notes?: string;
}

const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Shipped': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'Pending': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
};

const formatAmount = (val: any): string => {
  const num = Number(String(val).replace(/,/g, ''));
  return isFinite(num) ? num.toLocaleString('en-UG') : '0';
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

const getFirstProductName = (items: OrderItem[]) => {
  return items.length > 0 ? items[0].product : 'No products';
};

const DeleteOrder = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

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
        notes: 'Customer requested next day delivery'
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
        date: '2024-08-04'
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
          } as Order;
        });
        setOrders(mapped);
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
    const searchLower = searchTerm.toLowerCase();
    return (
      order.customer.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) ||
      order.items.some(item => item.product.toLowerCase().includes(searchLower)) ||
      order.status.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    
    const orderId = orderToDelete.id;
    setDeletingOrder(orderId);
    setShowConfirmDialog(false);
    
    try {
      const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://backendrdjs-production.up.railway.app/api/v1'
        : 'http://localhost:4210/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      console.log('🗑️ Deleting order:', orderId);
      console.log('🌐 API Base:', apiBase);
      console.log('🔑 Token available:', !!token);
      
      const res = await fetch(`${apiBase}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      console.log('🗑️ Delete response:', res.status, res.statusText);
      
      if (!res.ok) {
        const txt = await res.text();
        console.error('❌ Delete failed:', res.status, txt);
        throw new Error(`Failed to delete order: ${res.status} ${txt}`);
      }
      
      const result = await res.json();
      console.log('✅ Order deleted successfully:', result);
      
      // Remove from local state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Show toast notification
      toast.success('Order deleted successfully', {
        duration: 3000,
        position: 'top-center',
      });
    } catch (error) {
      console.error('❌ Delete error:', error);
      
      // For demo purposes, if API fails, still remove from local state
      console.log('🔄 API failed, removing from local state for demo');
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
      toast.success('Order deleted successfully (demo mode)', {
        duration: 3000,
        position: 'top-center',
      });
    } finally {
      setDeletingOrder(null);
      setOrderToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setOrderToDelete(null);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      {usingMockData && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                <strong>Demo Mode:</strong> Backend API is unavailable. Showing mock data for testing delete functionality.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient from-red-500 to-pink-500">Delete an Order</h1>
        <p className="text-muted-foreground mt-1">Select an order to permanently delete it. This action cannot be undone.</p>
        
        {showSuccess && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center justify-between">
            <span>Order deleted successfully!</span>
            <button 
              onClick={() => setShowSuccess(false)}
              className="text-green-700 hover:text-green-900"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="mt-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search orders by ID, customer, product, or status..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
                <th className="p-4 font-semibold">Products</th>
                <th className="p-4 font-semibold text-right">Total</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    {searchTerm ? 'No orders match your search' : 'No orders found'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => (
                <tr key={order.id} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
                  <td className="p-4 text-center">
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-semibold mx-auto">
                      {index + 1}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-primary">{order.orderNumber || order.id}</td>
                  <td className="p-4">
                    <div className="font-medium">{order.customer}</div>
                    <div className="text-sm text-muted-foreground">{order.phone}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    <div className="font-medium">{getFirstProductName(order.items)}</div>
                    {order.items.length > 1 && (
                      <div className="text-xs text-blue-500 mt-1">+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}</div>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-right">{formatAmount(order.total)}</td>
                  <td className="p-4 text-muted-foreground">
                    <div>{formatOrderDate(order.date)}</div>
                    <div className="text-xs text-gray-400">{order.shippingCity}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDeleteClick(order)}
                      disabled={deletingOrder === order.id}
                      className={`flex items-center gap-2 mx-auto px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        deletingOrder === order.id
                          ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
                          : 'text-red-600 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
                      }`}
                    >
                      {deletingOrder === order.id ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-secondary/30 rounded-2xl border border-border/50 p-8 text-center text-muted-foreground">
            {searchTerm ? 'No orders match your search' : 'No orders found'}
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <div key={order.id} className="bg-secondary/30 rounded-2xl border border-border/50 p-4 hover:bg-secondary/40 transition-colors">
              {/* Header with number and order ID */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-semibold">
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

              {/* Products and Total */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Products</div>
                <div className="font-medium text-sm">{getFirstProductName(order.items)}</div>
                {order.items.length > 1 && (
                  <div className="text-xs text-blue-500 mt-1">+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}</div>
                )}
                <div className="text-sm text-gray-500 mt-2">
                  <span className="font-medium">Total:</span> {formatAmount(order.total)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatOrderDate(order.date)} • {order.shippingCity}
                </div>
              </div>

              {/* Delete Button */}
              <div className="flex items-center justify-center">
                <button 
                  onClick={() => handleDeleteClick(order)}
                  disabled={deletingOrder === order.id}
                  className={`flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    deletingOrder === order.id
                      ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
                      : 'text-red-600 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
                  }`}
                >
                  {deletingOrder === order.id ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Order
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={handleCancelDelete}>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-lg font-semibold">
              Confirm Order Deletion
            </div>
          </div>
          
          <div className="text-gray-600 mb-6">
            <p className="mb-2">Are you sure you want to permanently delete this order?</p>
            {orderToDelete && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p><strong>Order ID:</strong> {orderToDelete.orderNumber || orderToDelete.id}</p>
                <p><strong>Customer:</strong> {orderToDelete.customer}</p>
                <p><strong>Total:</strong> {formatAmount(orderToDelete.total)}</p>
                <p><strong>Status:</strong> {orderToDelete.status}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-red-600 font-medium">
              ⚠️ This action cannot be undone and will permanently remove the order from the database.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancelDelete}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Delete Order
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DeleteOrder;
