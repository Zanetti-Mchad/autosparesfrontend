"use client";
import React, { useState } from 'react';
import { Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  date: string;
}

const initialOrders: Order[] = [
  { id: 'ORD-001', customer: 'John Mukasa', product: 'Fresh Tilapia', amount: '50,000 UGX', status: 'Completed', date: '2024-08-03' },
  { id: 'ORD-002', customer: 'Jane Achen', product: 'Organic Avocadoes (x5)', amount: '15,000 UGX', status: 'Processing', date: '2024-08-04' },
  { id: 'ORD-003', customer: 'David Okello', product: 'Craft Coffee Beans (1kg)', amount: '45,000 UGX', status: 'Shipped', date: '2024-08-04' },
  { id: 'ORD-004', customer: 'Maria Nanteza', product: 'Handwoven Basket', amount: '25,000 UGX', status: 'Pending', date: '2024-08-05' },
];

const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Shipped': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'Pending': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
};

const DeleteOrder = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.customer.toLowerCase().includes(searchLower) ||
      order.product.toLowerCase().includes(searchLower) ||
      order.status.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = (orderId: string) => {
    setDeletingOrder(orderId);
    // Simulate API call
    setTimeout(() => {
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setDeletingOrder(null);
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Show toast notification
      toast.success('Order deleted successfully', {
        duration: 3000,
        position: 'top-center',
      });
    }, 500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
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

      <div className="bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-secondary/50">
            <tr>
              <th className="p-4 font-semibold">#</th>
              <th className="p-4 font-semibold">Order ID</th>
              <th className="p-4 font-semibold">Customer</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {searchTerm ? 'No orders match your search' : 'No orders found'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, index) => (
              <tr key={order.id} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
                <td className="p-4 font-bold text-lg text-center text-slate-400">{index + 1}.</td>
                <td className="p-4 font-medium text-primary">{(order as any).orderNumber || order.id}</td>
                <td className="p-4">{order.customer}</td>
                <td className="p-4 font-semibold">{order.amount}</td>
                <td className="p-4 text-muted-foreground">{order.date}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => handleDelete(order.id)}
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
  );
};

export default DeleteOrder;
