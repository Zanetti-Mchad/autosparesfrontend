'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  FileText, Download, Calendar, Filter, Search, BarChart3, 
  TrendingUp, DollarSign, Users, Package, Check
} from 'lucide-react';

const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState('customers');
  const [dateRange, setDateRange] = useState('30d');
  const [isLoaded, setIsLoaded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber?: string;
    customer?: string;
    total?: number;
    status?: string;
    paymentStatus?: string;
    date?: string;
  }>>([]);

  const [orderQuery, setOrderQuery] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  type RecentOrder = {
    id: string;
    orderNumber?: string;
    customer?: string;
    total?: number;
    status?: string;
    paymentStatus?: string;
    date?: string;
  };

  type DashboardStats = {
    totalRevenue: number;
    totalOrders: number;
    totalProducts?: number;
    totalCustomers?: number;
    revenueChange?: number;
    ordersChange?: number;
    recentOrders: RecentOrder[];
    topProducts: Array<{ id: string; name: string; category?: string; totalRevenue?: number; totalSold?: number }>;
    stockAlerts: Array<{ id: string; name: string; quantity: number; minStock?: number; minQuantity?: number }>;
    salesChartData: Array<{ date: string; revenue: number }>;
  };

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesOrders, setSalesOrders] = useState<Array<{
    id: string;
    orderNumber?: string;
    customer?: string;
    total: number;
    paidAmount: number;
    balance: number;
    date?: string;
  }>>([]);

  // Inventory list (reuse API from ViewEditInventory)
  const [inventoryItems, setInventoryItems] = useState<Array<{
    id: string;
    name: string;
    price?: number;
    category?: string;
    size?: string;
    quantity?: number;
    photo?: string;
    description?: string;
  }>>([]);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4210/api/v1').replace(/\/$/, '');

  // Inline report rendering; no routing/navigation needed

  const formatAmount = (value?: number) => {
    if (value == null) return '-';
    try {
      return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(value);
    } catch {
      return `${value}`;
    }
  };

  // CSV helpers
  const csvEscape = (val: unknown) => {
    const s = val == null ? '' : String(val);
    const needsQuotes = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const downloadCSV = (filename: string, headers: string[], rows: Array<Array<unknown>>) => {
    const csv = [headers.map(csvEscape).join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const handleExportFilteredOrders = (list: RecentOrder[]) => {
    const headers = ['Order', 'Customer', 'Total', 'Status', 'Payment Status', 'Date'];
    const rows = list.map(o => [o.orderNumber || o.id, o.customer || '', o.total ?? '', o.status || '', o.paymentStatus || '', o.date || '']);
    downloadCSV(`orders_filtered_${todayStr()}.csv`, headers, rows);
  };

  const handleExportSales = () => {
    const data = salesOrders || [];
    const headers = ['#', 'Order', 'Customer', 'Total', 'Paid', 'Balance', 'Date'];
    const rows = data.map((row, idx) => [
      idx + 1,
      row.orderNumber || row.id,
      row.customer || '',
      row.total ?? 0,
      row.paidAmount ?? 0,
      row.balance ?? 0,
      row.date || ''
    ]);
    downloadCSV(`sales_orders_${todayStr()}.csv`, headers, rows);
  };

  const handleExportTopProducts = () => {
    const data = stats?.topProducts || [];
    const headers = ['Product', 'Category', 'Total Revenue', 'Total Sold'];
    const rows = data.map(p => [p.name, p.category || '', p.totalRevenue ?? 0, p.totalSold ?? 0]);
    downloadCSV(`inventory_top_products_${todayStr()}.csv`, headers, rows);
  };

  const handleExportStockAlerts = () => {
    const data = stats?.stockAlerts || [];
    const headers = ['Product', 'Quantity', 'Min Stock'];
    const rows = data.map(a => [a.name, a.quantity, (a.minStock ?? a.minQuantity ?? '')]);
    downloadCSV(`inventory_stock_alerts_${todayStr()}.csv`, headers, rows);
  };

  const handleExportInventoryList = () => {
    const rows = inventoryItems.map((it, idx) => [
      idx + 1,
      it.name,
      it.price ?? '',
      it.category || '',
      it.size || '',
      it.quantity ?? '',
    ]);
    downloadCSV(`inventory_list_${todayStr()}.csv`, ['#','Name','Price','Category','Size','Stock'], rows);
  };

  // Load dashboard stats (summary)
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setError(null);
        const token = localStorage.getItem('accessToken');
        const url = `${apiBase}/orders/dashboard/stats`;
        const res = await fetch(url, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        console.log('[Reports] Fetch stats ->', { url, status: res.status, ok: res.ok });
        if (!res.ok) {
          throw new Error(`Failed to fetch stats: ${res.status}`);
        }
        const result = await res.json();
        console.log('[Reports] Stats JSON:', result);
        const data = result?.data || result;
        setStats({
          totalRevenue: data.totalRevenue ?? 0,
          totalOrders: data.totalOrders ?? 0,
          totalProducts: data.totalProducts ?? 0,
          totalCustomers: data.totalCustomers ?? 0,
          revenueChange: data.revenueChange ?? 0,
          ordersChange: data.ordersChange ?? 0,
          recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
          topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
          stockAlerts: Array.isArray(data.stockAlerts) ? data.stockAlerts : [],
          salesChartData: Array.isArray(data.salesChartData) ? data.salesChartData : [],
        });
      } catch (e: any) {
        console.error('[Reports] Stats load error:', e);
        setError(e?.message || 'Failed to load reports');
        setStats(null);
      }
    };

    fetchDashboardStats();
  }, [apiBase]);

  // Load full orders list for filtering
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const url = `${apiBase}/orders`;
      const res = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      console.log('[Reports] Fetch orders ->', { url, status: res.status, ok: res.ok });
      if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
      const result = await res.json();
      console.log('[Reports] Orders JSON:', result);
      const payload = result?.data ?? result;
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.items) ? payload.items : []);
      const mapped: RecentOrder[] = list.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber ?? o.shortId ?? o.displayId ?? undefined,
        customer: o.customerName ?? o.customer ?? '',
        total: o.total ?? o.amount ?? 0,
        status: o.status ?? '',
        paymentStatus: o.paymentStatus ?? '',
        date: o.createdAt ?? o.date ?? '',
      }));
      console.log('[Reports] Orders mapped count:', mapped.length);
      setOrders(mapped);
    } catch (e: any) {
      console.error('[Reports] Orders load error:', e);
      setError(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // Load sales using the same APIs as orders/payments page
  const loadSalesFromPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const ordersUrl = `${apiBase}/orders?page=1&limit=200`;
      const ordersRes = await fetch(ordersUrl, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      console.log('[Reports] Sales fetch orders ->', { url: ordersUrl, status: ordersRes.status, ok: ordersRes.ok });
      if (!ordersRes.ok) throw new Error(`Failed to load orders for sales: ${ordersRes.status}`);
      const ordersJson = await ordersRes.json();
      const orderItems: any[] = (ordersJson?.data?.items ?? ordersJson?.items ?? (Array.isArray(ordersJson) ? ordersJson : [])) as any[];
      console.log('[Reports][Sales] Orders for payments count:', Array.isArray(orderItems) ? orderItems.length : 0);

      const paymentsByDay: Record<string, number> = {};
      const paidByOrder: Record<string, number> = {};
      const orderMeta: Record<string, { id: string; orderNumber?: string; customer?: string; total: number; date?: string } > = {};

      for (const o of orderItems) {
        const orderId = String(o.id ?? o.orderId ?? '');
        if (!orderId) continue;
        orderMeta[orderId] = {
          id: orderId,
          orderNumber: o.orderNumber ?? o.shortId ?? o.displayId ?? undefined,
          customer: o.customer?.name ?? o.customerName ?? o.clientName ?? 'Unknown',
          total: Number(o.total ?? o.amount?.total ?? o.totalAmount ?? o.subtotal ?? 0) || 0,
          date: o.date ?? o.createdAt ?? undefined,
        };
        const paymentsUrl = `${apiBase}/orders/${orderId}/payments`;
        try {
          const payRes = await fetch(paymentsUrl, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
          });
          if (!payRes.ok) {
            console.warn('[Reports] Failed payments fetch for order', orderId, payRes.status);
            continue;
          }
          const payJson = await payRes.json();
          const payments: any[] = payJson?.data ?? payJson ?? [];
          console.log(`[Reports][Sales] Payments for order ${orderId}:`, payments);
          for (const p of payments) {
            const amount = Number(p.amount ?? 0) || 0;
            const dateIso = p.paidAt || p.createdAt || o.createdAt || o.date;
            if (!dateIso) continue;
            const day = new Date(dateIso);
            if (isNaN(day.getTime())) continue;
            const key = day.toISOString().slice(0, 10);
            paymentsByDay[key] = (paymentsByDay[key] || 0) + amount;
            paidByOrder[orderId] = (paidByOrder[orderId] || 0) + amount;
            console.log('[Reports][Sales] Counted payment', { orderId, key, amount });
          }
        } catch (e) {
          console.warn('[Reports] Payments fetch error for order', orderId, e);
        }
      }

      const salesChartData = Object.entries(paymentsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue }));
      console.log('[Reports][Sales] Aggregated daily totals:', salesChartData);
      const totalRevenue = salesChartData.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
      const totalOrdersWithPayments = Object.keys(paidByOrder).length;

      // Build per-order rows for table view
      const salesOrderRows = Object.keys(paidByOrder).map((orderId) => {
        const meta = orderMeta[orderId] || { id: orderId, total: 0 } as any;
        const paidAmount = paidByOrder[orderId] || 0;
        const total = Number(meta.total || 0);
        const balance = Math.max(total - paidAmount, 0);
        return {
          id: meta.id,
          orderNumber: meta.orderNumber,
          customer: meta.customer,
          total,
          paidAmount,
          balance,
          date: meta.date,
        };
      });

      setStats(prev => ({
        totalRevenue,
        totalOrders: totalOrdersWithPayments,
        totalProducts: prev?.totalProducts ?? 0,
        totalCustomers: prev?.totalCustomers ?? 0,
        revenueChange: prev?.revenueChange ?? 0,
        ordersChange: prev?.ordersChange ?? 0,
        recentOrders: prev?.recentOrders ?? [],
        topProducts: prev?.topProducts ?? [],
        stockAlerts: prev?.stockAlerts ?? [],
        salesChartData,
      }));
      setSalesOrders(salesOrderRows);
    } catch (e: any) {
      console.error('[Reports] Sales from payments error:', e);
      setError(e?.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-load sales when Sales Report is selected
  useEffect(() => {
    if (selectedReport === 'sales') {
      loadSalesFromPayments();
    }
  }, [selectedReport, loadSalesFromPayments]);

  // Load inventory when Inventory Report is selected
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const url = `${apiBase}/inventory/inventory`;
      const res = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
      const result = await res.json();
      const payload = result?.data?.items ?? result?.items ?? (Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []));
      const list: any[] = Array.isArray(payload) ? payload : [];
      const mapped = list.map((it: any) => ({
        id: String(it.id ?? ''),
        name: it.name ?? 'Item',
        price: it.price ?? it.unitPrice ?? undefined,
        category: it.category?.name ?? it.category ?? undefined,
        size: it.size ?? '',
        quantity: it.quantity ?? it.stock ?? undefined,
        photo: it.photo ?? undefined,
        description: it.description ?? undefined,
      }));
      setInventoryItems(mapped);
    } catch (e: any) {
      console.error('[Reports] Inventory load error:', e);
      setError(e?.message || 'Failed to load inventory');
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (selectedReport === 'inventory') {
      loadInventory();
    }
  }, [selectedReport, loadInventory]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderQuery.trim()) {
      const q = orderQuery.trim().toLowerCase();
      list = list.filter(o => (o.orderNumber || o.id).toLowerCase().includes(q));
    }
    if (fromDate) {
      const from = new Date(fromDate).getTime();
      list = list.filter(o => (o.date ? new Date(o.date).getTime() : 0) >= from);
    }
    if (toDate) {
      const to = new Date(toDate).getTime();
      list = list.filter(o => (o.date ? new Date(o.date).getTime() : 0) <= to + 24*60*60*1000 - 1);
    }
    return list.slice(0, 200);
  }, [orders, orderQuery, fromDate, toDate]);

  const reportTypes = [
    { id: 'customers', name: 'Order Report', icon: FileText, description: 'Filter by order and date range' },
    { id: 'sales', name: 'Sales Report', icon: DollarSign, description: 'Revenue and sales performance' },
    { id: 'inventory', name: 'Inventory Report', icon: Package, description: 'Stock levels and movements' },
  ];

  const quickStats = useMemo(() => ([
    { label: 'Total Revenue', value: formatAmount(stats?.totalRevenue), period: 'All time', icon: DollarSign, hue: 'from-fuchsia-500 to-pink-500' },
    { label: 'Total Orders', value: `${stats?.totalOrders ?? 0}`, period: 'All time', icon: BarChart3, hue: 'from-indigo-500 to-blue-500' },
  ]), [stats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Processing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Failed': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Overdue': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const salesData = useMemo(() => {
    const avg = (stats?.totalOrders || 0) > 0
      ? (stats!.totalRevenue / stats!.totalOrders)
      : 0;
    return {
      totalRevenue: formatAmount(stats?.totalRevenue),
      totalOrders: stats?.totalOrders ?? 0,
      avgOrderValue: formatAmount(avg),
      topProduct: stats?.topProducts?.[0]?.name || '—',
      bestDay: stats?.salesChartData?.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, undefined as any)?.date || '—',
      growthRate: `${(stats?.revenueChange ?? 0) > 0 ? '+' : ''}${stats?.revenueChange ?? 0}%`,
    };
  }, [stats]);

  // Sales data filtered by quick dateRange
  const filteredSalesData = useMemo(() => {
    const data = stats?.salesChartData || [];
    if (!data.length) return [] as { date: string; revenue: number }[];
    const today = new Date();
    const from = new Date();
    switch (dateRange) {
      case '7d':
        from.setDate(today.getDate() - 6);
        break;
      case '30d':
        from.setDate(today.getDate() - 29);
        break;
      case '90d':
        from.setDate(today.getDate() - 89);
        break;
      case '1y':
        from.setFullYear(today.getFullYear() - 1);
        break;
      default:
        from.setDate(today.getDate() - 29);
    }
    const fromMs = from.getTime();
    return data.filter(d => {
      const t = new Date(d.date).getTime();
      return t >= fromMs && t <= today.getTime();
    });
  }, [stats?.salesChartData, dateRange]);

  const renderOrdersFilter = () => (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground mb-1 block">Select Order</label>
      <input
        value={orderQuery}
        onChange={(e) => setOrderQuery(e.target.value)}
        placeholder="Search by order number..."
        className="w-full glass rounded-xl px-4 py-2 border border-border/50"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">From date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full glass rounded-xl px-4 py-2 border border-border/50" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">To date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full glass rounded-xl px-4 py-2 border border-border/50" />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button onClick={loadOrders} className="px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary text-sm">Reload</button>
        <button onClick={() => handleExportFilteredOrders(filteredOrders)} className="px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Export (CSV)
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filteredOrders.length} of {orders.length} orders</p>
    </div>
  );

  const renderListHeader = () => {
    if (selectedReport === 'customers') {
      return (
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Order Results</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => handleExportFilteredOrders(filteredOrders)} className="p-2 glass rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (selectedReport === 'sales') {
      return (
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Sales (Daily)</h3>
            <div className="flex items-center gap-2">
              <button onClick={loadSalesFromPayments} className="px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary text-sm">Reload</button>
              <button onClick={handleExportSales} className="p-2 glass rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Inventory Report</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleExportStockAlerts} className="p-2 glass rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderListBody = () => {
    if (loading) {
      return (
        <div className="p-6 space-y-4">
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
        </div>
      );
    }

    if (selectedReport === 'customers') {
      if (filteredOrders.length === 0) return <div className="p-6 text-sm text-muted-foreground">No orders found.</div>;
      return (
        <div className="p-6 space-y-3">
          {filteredOrders.map((o, index) => (
            <div key={o.id} className={`p-4 hover:bg-secondary/50 rounded-xl transition-all duration-300 group ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 60}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Order {o.orderNumber || o.id}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{o.customer || '—'}</span>
                    <span>•</span>
                    <span>{o.date ? new Date(o.date).toLocaleString() : ''}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatAmount(o.total)}</div>
                  <div className="text-xs"><span className={`px-2 py-0.5 rounded-full ${getFormatColor(o.paymentStatus || '')}`}>{o.paymentStatus || 'N/A'}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedReport === 'sales') {
      if (salesOrders.length === 0) return <div className="p-6 text-sm text-muted-foreground">No sales data.</div>;
      return (
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="p-3 text-sm font-semibold w-12">#</th>
                  <th className="p-3 text-sm font-semibold">Order ID</th>
                  <th className="p-3 text-sm font-semibold">Customer</th>
                  <th className="p-3 text-sm font-semibold text-right">Total</th>
                  <th className="p-3 text-sm font-semibold text-right">Paid</th>
                  <th className="p-3 text-sm font-semibold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.map((row, idx) => (
                  <tr key={row.id} className="border-t border-border/50">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3 font-medium text-primary">{row.orderNumber || row.id}</td>
                    <td className="p-3">{row.customer || '—'}</td>
                    <td className="p-3 text-right font-semibold">{formatAmount(row.total)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatAmount(row.paidAmount)}</td>
                    <td className="p-3 text-right font-semibold"><span className={row.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatAmount(row.balance)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const items = (stats?.stockAlerts || []).map(a => ({ title: a.name, chip: `${a.quantity} / ${a.minStock ?? a.minQuantity ?? '-'}` }));
    if (items.length === 0) return <div className="p-6 text-sm text-muted-foreground">No stock alerts.</div>;
    return (
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/50">
              <tr>
                <th className="p-3 text-sm font-semibold w-12">#</th>
                <th className="p-3 text-sm font-semibold">Name</th>
                <th className="p-3 text-sm font-semibold">Price</th>
                <th className="p-3 text-sm font-semibold">Category</th>
                <th className="p-3 text-sm font-semibold">Size</th>
                <th className="p-3 text-sm font-semibold text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((it, idx) => (
                <tr key={it.id} className="border-t border-border/50">
                  <td className="p-3 text-center">{idx + 1}</td>
                  <td className="p-3 font-medium">{it.name}</td>
                  <td className="p-3">{formatAmount(it.price)}</td>
                  <td className="p-3">{it.category || '—'}</td>
                  <td className="p-3">{it.size || '—'}</td>
                  <td className="p-3 text-right">{it.quantity ?? ''}</td>
                </tr>
              ))}
              {inventoryItems.length === 0 && (
                <tr>
                  <td className="p-6 text-sm text-muted-foreground" colSpan={6}>No inventory items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Generate and manage business reports</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex bg-white border border-border/50 rounded-xl p-1">
            {['7d','30d','90d','1y'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-2 rounded-lg text-sm ${dateRange === r ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'} transition`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="bg-gradient-primary text-white px-4 sm:px-6 py-3 rounded-xl hover:shadow-glow transition-all duration-300 flex items-center space-x-2 disabled:opacity-60" disabled={loading} onClick={() => {
            if (selectedReport === 'customers') {
              loadOrders();
            } else if (selectedReport === 'sales') {
              loadSalesFromPayments();
            }
          }}>
            <FileText className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickStats.map((stat, index) => (
          <div key={index} className={`relative overflow-hidden glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
            <div className={`absolute -top-8 -right-10 h-24 w-24 bg-gradient-to-br ${stat.hue} opacity-10 rounded-full`} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stat.period}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report Generator */}
        <div className="lg:col-span-1 glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-xl font-semibold text-foreground">Report Generator</h3>
          </div>
          <div className="p-6">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Report Type</label>
                <div className="space-y-2">
                  {reportTypes.map((type) => {
                    const active = selectedReport === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedReport(type.id)}
                        aria-pressed={active}
                        className={`w-full p-3 rounded-xl text-left transition-all duration-300 border ${
                          active
                            ? 'bg-primary/10 text-primary border-primary/50 ring-2 ring-primary/20'
                            : 'glass hover:bg-secondary border-border/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <type.icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-primary'}`} />
                            <div>
                              <p className={`font-medium ${active ? 'text-primary' : 'text-foreground'}`}>
                                {type.name}
                              </p>
                              <p className={`text-xs ${active ? 'text-primary/80' : 'text-muted-foreground'}`}>
                                {type.description}
                              </p>
                            </div>
                          </div>
                          {active && (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                              <Check className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedReport === 'customers' && (
                <>{renderOrdersFilter()}</>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Date Range</label>
                <select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-2 border border-border/50"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
              </div>

              <button className="w-full bg-gradient-primary text-white py-3 rounded-xl hover:shadow-glow transition-all duration-300" disabled={loading}>
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic List Panel */}
        <div className="lg:col-span-2 glass rounded-2xl border border-border/50 shadow-medium">
          {renderListHeader()}
          {renderListBody()}
        </div>
      </div>

      {/* Report Preview/Summary */}
      {selectedReport === 'sales' && (
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Sales Overview</h3>
            <button onClick={handleExportSales} className="px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">{salesData.totalRevenue}</p>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600 mr-1" />
                  <span className="text-sm text-emerald-700 font-semibold">{salesData.growthRate}</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{salesData.totalOrders}</p>
                <p className="text-sm text-muted-foreground">Avg: {salesData.avgOrderValue}</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Top Product</p>
                <p className="text-lg font-semibold text-foreground">{salesData.topProduct}</p>
                <p className="text-sm text-muted-foreground">Best day: {salesData.bestDay}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'inventory' && (
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Inventory Overview</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleExportTopProducts} className="px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Top Products
              </button>
              <button onClick={handleExportStockAlerts} className="px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Stock Alerts
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalProducts ?? 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Stock Alerts</p>
                <p className="text-2xl font-bold text-foreground">{stats?.stockAlerts?.length ?? 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Top Product by Revenue</p>
                <p className="text-lg font-semibold text-foreground">{stats?.topProducts?.[0]?.name || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;