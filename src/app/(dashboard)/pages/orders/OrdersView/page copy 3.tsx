"use client";
import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
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
import { Eye, Edit, Search } from 'lucide-react';

type OrderModalProps = {
  order: Order | null;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (updated: Order) => void;
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl">{children}</div>
    </div>
  );
};

const formatOrderDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const monthIdx = d.getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[monthIdx] || '';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  const n = Number(String(val).replace(/,/g, ''));
  return isFinite(n) ? n : 0;
};

const formatAmount = (val: any): string => {
  return toNumber(val).toLocaleString('en-UG');
};

const OrderModal: React.FC<OrderModalProps> = ({ order, mode, onClose, onSave }) => {
  const [draft, setDraft] = useState<Order | null>(order);

  if (!draft) return null;

  return (
    <Modal open={true} onClose={onClose}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {mode === 'view' ? 'View Order' : 'Edit Order'} — {draft.id}
          </h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Customer</div>
            <div className="font-medium">{draft.customer}</div>
            <div className="text-sm text-gray-500 mt-2">Email</div>
            <div className="font-medium">{draft.email}</div>
            <div className="text-sm text-gray-500 mt-2">Phone</div>
            <div className="font-medium">{draft.phone}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Address</div>
            <div className="font-medium">{draft.address}</div>
            <div className="text-sm text-gray-500 mt-2">City / District</div>
            <div className="font-medium">{draft.shippingCity} / {draft.shippingDistrict}</div>
            <div className="text-sm text-gray-500 mt-2">Status</div>
            <div className="font-medium">{draft.status}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-gray-500 mb-2">Items</div>
          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map(it => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">{it.product}</td>
                    <td className="p-3 text-center">{it.category || '-'}</td>
                    <td className="p-3 text-center">{it.size}</td>
                    <td className="p-3 text-center">{it.quantity}</td>
                    <td className="p-3 text-right">{formatAmount(it.price)}</td>
                    <td className="p-3 text-right">{formatAmount(toNumber(it.price) * (it.quantity || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
          {mode === 'edit' && (
            <button
              onClick={() => onSave(draft)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          )}
        </div>
    </Modal>
  );
};

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customer: 'John Mukasa',
    email: 'john.mukasa@example.com',
    phone: '0755123456',
    address: '123 Main Street, Kampala',
    shippingCity: 'Kampala',
    shippingDistrict: 'Central',
    items: [
      { id: '1', product: 'Fresh Tilapia', size: 'Large', quantity: 2, price: '25,000 UGX', total: '50,000 UGX' },
      { id: '2', product: 'Organic Avocadoes', size: '5kg', quantity: 1, price: '30,000 UGX', total: '30,000 UGX' }
    ],
    subtotal: '80,000 UGX',
    vat: '14,400 UGX',
    total: '94,400 UGX',
    status: 'Completed',
    paymentStatus: 'Paid',
    paymentMethod: 'Mobile Money',
    date: '2024-08-03',
    notes: 'Customer requested next day delivery'
  },
  {
    id: 'ORD-002',
    customer: 'Jane Achen',
    email: 'jane.achen@example.com',
    phone: '0777123456',
    address: '456 Market Street, Kampala',
    shippingCity: 'Kampala',
    shippingDistrict: 'Industrial Area',
    items: [
      { id: '3', product: 'Craft Coffee Beans', size: '1kg', quantity: 3, price: '45,000 UGX', total: '135,000 UGX' }
    ],
    subtotal: '135,000 UGX',
    vat: '24,300 UGX',
    total: '159,300 UGX',
    status: 'Processing',
    paymentStatus: 'Pending',
    paymentMethod: 'Credit Card',
    date: '2024-08-04'
  },
  {
    id: 'ORD-003',
    customer: 'David Okello',
    email: 'david.okello@example.com',
    phone: '0701123456',
    address: '789 Garden City, Entebbe Road',
    shippingCity: 'Entebbe',
    shippingDistrict: 'Wakiso',
    items: [
      { id: '4', product: 'Handwoven Basket', size: 'Medium', quantity: 1, price: '25,000 UGX', total: '25,000 UGX' },
      { id: '5', product: 'Smoked Beef', size: '500g', quantity: 2, price: '37,500 UGX', total: '75,000 UGX' }
    ],
    subtotal: '100,000 UGX',
    vat: '18,000 UGX',
    total: '118,000 UGX',
    status: 'Shipped',
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    date: '2024-08-04',
    notes: 'Gift wrapping requested'
  },
  {
    id: 'ORD-004',
    customer: 'Maria Nanteza',
    email: 'maria.n@example.com',
    phone: '0755987654',
    address: '321 Ntinda Road',
    shippingCity: 'Kampala',
    shippingDistrict: 'Ntinda',
    items: [
      { id: '6', product: 'Organic Honey', size: '500ml', quantity: 1, price: '15,000 UGX', total: '15,000 UGX' },
      { id: '7', product: 'Shea Butter', size: '250g', quantity: 3, price: '10,000 UGX', total: '30,000 UGX' }
    ],
    subtotal: '45,000 UGX',
    vat: '8,100 UGX',
    total: '53,100 UGX',
    status: 'Pending',
    paymentStatus: 'Pending',
    paymentMethod: 'Cash on Delivery',
    date: '2024-08-05'
  },
  {
    id: 'ORD-005',
    customer: 'Robert Kizza',
    email: 'robert.k@example.com',
    phone: '0788123456',
    address: '567 Kololo Heights',
    shippingCity: 'Kampala',
    shippingDistrict: 'Kololo',
    items: [
      { id: '8', product: 'Premium Vanilla Beans', size: '10g', quantity: 5, price: '15,000 UGX', total: '75,000 UGX' }
    ],
    subtotal: '75,000 UGX',
    vat: '13,500 UGX',
    total: '88,500 UGX',
    status: 'Completed',
    paymentStatus: 'Paid',
    paymentMethod: 'Mobile Money',
    date: '2024-08-02',
    notes: 'Customer is a VIP - 10% discount applied'
  }
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

const ViewEditOrder = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: string, newStatus: string, type: 'order' | 'payment'}>();

  const handleStatusChange = (id: string, newStatus: string) => {
    setPendingStatusChange({ id, newStatus, type: 'order' });
    setShowConfirmDialog(true);
  };

  const handlePaymentStatusChange = (id: string, newPaymentStatus: 'Paid' | 'Pending' | 'Failed' | 'Refunded') => {
    setPendingStatusChange({ id, newStatus: newPaymentStatus, type: 'payment' });
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = () => {
    if (!pendingStatusChange) return;
    
    const { id, newStatus, type } = pendingStatusChange;
    
    if (type === 'order') {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: newStatus } : order
      ));
    } else {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, paymentStatus: newStatus as 'Paid' | 'Pending' | 'Failed' | 'Refunded' } : order
      ));
    }
    
    setShowConfirmDialog(false);
    setPendingStatusChange(undefined);
  };

  const cancelStatusChange = () => {
    setShowConfirmDialog(false);
    setPendingStatusChange(undefined);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const fetchOrderById = async (orderId: string): Promise<Order | null> => {
    try {
      const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://backendrdjs-production.up.railway.app/api/v1'
        : 'http://localhost:4210/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${apiBase}/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (!res.ok) throw new Error(`Failed to load order ${orderId}: ${res.status}`);
      const data = await res.json();
      console.log('Order detail API response:', data);
      const o: any = (data?.data ?? data?.order ?? data) as any;
      const rawItems: any[] = Array.isArray(o.items)
        ? o.items
        : (Array.isArray(o.orderItems) ? o.orderItems : (Array.isArray(o.products) ? o.products : (Array.isArray(o.order_details) ? o.order_details : (Array.isArray(o.details) ? o.details : []))));
      const mappedItems = rawItems.map((it: any) => ({
        id: String(it.id ?? it.itemId ?? it.inventoryId ?? Math.random()),
        product: it.productName ?? it.name ?? it.inventory?.name ?? 'Item',
        size: it.size ?? it.variant ?? '',
        quantity: Number(it.quantity ?? it.qty ?? 0),
        price: String(it.unitPrice ?? it.price ?? it.sellingPrice ?? ''),
        total: String((Number(it.unitPrice ?? it.price ?? it.sellingPrice ?? 0) * Number(it.quantity ?? it.qty ?? 0)).toLocaleString())
      }));

      const mapped: Order = {
        id: String(o.id ?? o.orderId ?? o.code ?? orderId),
        customer: o.customer?.name ?? o.customerName ?? 'Unknown',
        email: o.customer?.email ?? o.customerEmail ?? '',
        phone: o.customer?.phone ?? o.customerPhone ?? '',
        address: o.customer?.address ?? o.shippingAddress ?? '',
        shippingCity: o.customer?.shippingCity ?? o.shippingCity ?? '',
        shippingDistrict: o.customer?.shippingDistrict ?? o.shippingDistrict ?? '',
        items: mappedItems,
        subtotal: String(o.totals?.subtotal ?? o.subtotal ?? ''),
        vat: String(o.totals?.vat ?? o.vatAmount ?? ''),
        total: String(o.totals?.total ?? o.total ?? ''),
        status: o.orderStatus ?? o.status ?? 'Pending',
        paymentStatus: o.payment?.status ?? o.paymentStatus ?? 'Pending',
        paymentMethod: o.payment?.method ?? o.paymentMethod ?? undefined,
        date: o.date ?? o.createdAt ?? '',
        notes: o.notes ?? undefined,
      };
      return mapped;
    } catch (err) {
      console.error(err);
        return null;
    }
  };

    // Fetch orders from backend
  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        const apiBase = process.env.NODE_ENV === 'production'
          ? 'https://backendrdjs-production.up.railway.app/api/v1'
          : 'http://localhost:4210/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const params = new URLSearchParams({ page: '1', limit: '20' });
        const res = await fetch(`${apiBase}/orders?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        if (!res.ok) throw new Error(`Failed to load orders: ${res.status}`);
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

              // Debug each item mapping and where values came from
              console.log('Order item raw['+idx+']:', it);
              console.log('Item mapping → id:', chosenId,
                '| name from:',
                it.productName ? 'productName' : (it.name ? 'name' : (it.inventory?.name ? 'inventory.name' : 'N/A')),
                '| size from:', it.size ? 'size' : (it.variant ? 'variant' : 'N/A'),
                '| qty from:', it.quantity !== undefined ? 'quantity' : (it.qty !== undefined ? 'qty' : 'N/A'),
                '| price from:', it.unitPrice !== undefined ? 'unitPrice' : (it.price !== undefined ? 'price' : (it.sellingPrice !== undefined ? 'sellingPrice' : 'N/A')),
                '| inventory object:', it.inventory || null
              );

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
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrders();
  }, []);

  // Sort orders by date in descending order (newest first)
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const filteredOrders = activeFilter === 'All' 
    ? sortedOrders 
    : sortedOrders.filter(order => order.status === activeFilter);
    
  // Filter orders based on search term (customer name, order ID, or product name)
  const filteredAndSearchedOrders = filteredOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.customer.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower) ||
      order.items.some(item => 
        item.product.toLowerCase().includes(searchLower)
      )
    );
  });

    const handleOpenModal = async (order: Order, mode: 'view' | 'edit') => {
    // Fetch fresh details (with items) if current order has empty items
    let enriched = order;
    if (!order.items || order.items.length === 0) {
      const detailed = await fetchOrderById(order.id);
      if (detailed) enriched = detailed;
    }
    setSelectedOrder(enriched);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

    const handleSaveOrder = (updatedOrder: Order) => {
    setOrders(orders.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };


  // Function to get the first product name for display in the orders list
  const getFirstProductName = (items: OrderItem[]) => {
    return items.length > 0 ? items[0].product : 'No products';
  };
  
  // Function to get the first category name for display in the orders list
  const getFirstCategoryName = (items: OrderItem[]) => {
    if (items.length === 0) return '-';
    const cat = items[0].category;
    return cat && String(cat).trim().length > 0 ? String(cat) : '-';
  };

  // Function to get all product names for display in the orders list
  const getAllProductNames = (items: OrderItem[]) => {
    if (items.length === 0) return 'No products';
    if (items.length === 1) return items[0].product;
    return `${items[0].product} +${items.length - 1} more`;
  };

  const statusFilters = ['All', 'Pending', 'Processing', 'Shipped', 'Completed'];
  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient from-blue-500 to-indigo-500">Manage Orders</h1>
          <p className="text-muted-foreground mt-1">View, edit, or search for existing orders.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by ID, customer, or product..." 
            className="pl-12 pr-4 py-3 w-full md:w-80 form-input"
            value={searchTerm}
            onChange={handleSearch}
          />
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="font-medium text-amber-600">💡 Quick Tip:</span>
            Click on any status dropdown to update order or payment status
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 mb-6">
        {statusFilters.map(filter => (
          <button 
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              activeFilter === filter
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/80'
            }`}>
            {filter}
          </button>
        ))}
      </div>

      {/* Responsive Cards for Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {filteredAndSearchedOrders.map(order => (
          <div key={order.id} className="bg-secondary/30 rounded-2xl border border-border/50 p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="font-bold text-primary">{order.id}</span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="flex justify-between items-start w-full">
              <div>
                <p className="font-semibold">{order.customer}</p>
                <p className="text-sm text-muted-foreground">{getAllProductNames(order.items)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatAmount(order.total)}</p>
                <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => handleOpenModal(order, 'view')} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Eye className="w-5 h-5" />
              </button>
              <button onClick={() => handleOpenModal(order, 'edit')} className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors">
                <Edit className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table for Desktop */}
      <div className="hidden md:block bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 bg-secondary/50 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold">
            {filteredAndSearchedOrders.length} order{filteredAndSearchedOrders.length !== 1 ? 's' : ''} found
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {orders.filter(o => o.status === 'Completed').length} Completed
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {orders.filter(o => o.status === 'Pending').length} Pending
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {orders.filter(o => o.paymentStatus === 'Paid').length} Paid
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/50">
              <tr>
                <th className="p-4 font-semibold">#</th>
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Products</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold text-right">Total</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSearchedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No orders found matching your search
                  </td>
                </tr>
              ) : (
                filteredAndSearchedOrders.map((order, index) => (
                  <tr key={order.id} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="p-4 font-medium text-muted-foreground">{index + 1}</td>
                    <td className="p-4 font-medium text-primary">{order.id}</td>
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
                    <td className="p-4 text-muted-foreground">
                      <div className="font-medium">{getFirstCategoryName(order.items)}</div>
                    </td>
                    <td className="p-4 font-semibold text-right">{formatAmount(order.total)}</td>
                    <td className="p-4 text-muted-foreground">
                      <div>{formatOrderDate(order.date)}</div>
                      <div className="text-xs text-gray-400">{order.shippingCity}</div>
                    </td>
                    <td className="p-4">
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`w-full text-xs font-semibold rounded-full border text-center appearance-none cursor-pointer transition-colors ${getStatusColor(order.status)}`}
                        onClick={(e) => e.stopPropagation()} // Prevents row hover effects
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select 
                        value={order.paymentStatus}
                        onChange={(e) => handlePaymentStatusChange(order.id, e.target.value as 'Paid' | 'Pending' | 'Failed' | 'Refunded')}
                        className={`w-full text-xs font-semibold rounded-full border text-center appearance-none cursor-pointer transition-colors ${
                          order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' :
                          order.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          order.paymentStatus === 'Failed' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-purple-100 text-purple-800 border-purple-200'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Failed">Failed</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                      {order.paymentMethod && (
                        <div className="text-xs text-gray-500 mt-1">{order.paymentMethod}</div>
                      )}
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenModal(order, 'view')} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleOpenModal(order, 'edit')} className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors">
                        <Edit className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <OrderModal 
          order={selectedOrder} 
          mode={modalMode} 
          onClose={handleCloseModal} 
          onSave={handleSaveOrder} 
        />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={cancelStatusChange}>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-lg font-semibold">
              Confirm Status Update
            </div>
          </div>
          
          <div className="text-gray-600 mb-6">
            Are you sure you want to change this {pendingStatusChange?.type} status to &quot;{pendingStatusChange?.newStatus}&quot;?
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={cancelStatusChange}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmStatusChange}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Confirm
            </button>
      </div>
      </div>
      </Dialog>
    </div>
  );
};

export default ViewEditOrder;
