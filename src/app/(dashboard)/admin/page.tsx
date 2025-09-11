"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ArrowUpRight,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Activity,
  Star,
  ChevronRight,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
  TrendingDown
} from 'lucide-react';

// Interfaces for API data
interface Order {
  id: string;
  orderNumber?: string;
  customer: string;
  email: string;
  phone: string;
  total: string;
  status: string;
  paymentStatus: string;
  date: string;
  items: Array<{
    id: string;
    product: string;
    category?: string;
    quantity: number;
    price: string;
    total: string;
  }>;
}

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  minQuantity: number;
  sellingPrice: number;
  totalSold?: number;
  revenue?: number;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueChange: number;
  ordersChange: number;
  productsChange: number;
  customersChange: number;
}

interface SalesChartData {
  date: string;
  sales: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return 'bg-success/10 text-success border-success/20';
    case 'Pending': return 'bg-warning/10 text-warning border-warning/20';
    case 'Shipped': return 'bg-primary/10 text-primary border-primary/20';
    default: return 'bg-muted/20 text-muted-foreground border-muted/30';
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'high': return 'from-red-500 to-orange-500';
    case 'medium': return 'from-orange-400 to-yellow-500';
    default: return 'from-yellow-400 to-lime-500';
  }
};

const AdminPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Dashboard data state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    revenueChange: 0,
    ordersChange: 0,
    productsChange: 0,
    customersChange: 0
  });
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<InventoryItem[]>([]);
  const [stockAlerts, setStockAlerts] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Helper function to format amounts
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

  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async () => {
    try {
      const apiBase = process.env.NODE_ENV === 'production' 
        ? 'https://autosparesbackend-production.up.railway.app/api/v1'
        : 'http://localhost:4210/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      // Fetch orders for revenue and order count
      const ordersResponse = await fetch(`${apiBase}/orders?page=1&limit=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });

      let ordersData: any[] = [];
      if (ordersResponse.ok) {
        const ordersResult = await ordersResponse.json();
        ordersData = ordersResult?.data?.items ?? ordersResult?.items ?? ordersResult ?? [];
      }

      // Calculate revenue and order stats
      const totalRevenue = ordersData.reduce((sum, order) => {
        const total = toNumber(order.total ?? order.totals?.total ?? order.amount?.total ?? 0);
        return sum + total;
      }, 0);

      const totalOrders = ordersData.length;

      // Fetch customers count
      let customerCount = 0;
      try {
        const customersResponse = await fetch(`${apiBase}/customers/stats`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        if (customersResponse.ok) {
          const customersResult = await customersResponse.json();
          customerCount = customersResult?.data?.total ?? 0;
        }
      } catch (err) {
        console.warn('Failed to fetch customer stats:', err);
      }

      // Fetch inventory for product count and stock alerts
      let productCount = 0;
      let inventoryItems: InventoryItem[] = [];
      try {
        const inventoryResponse = await fetch(`${apiBase}/inventory/inventory`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        if (inventoryResponse.ok) {
          const inventoryResult = await inventoryResponse.json();
          const items = inventoryResult?.data?.items ?? inventoryResult?.items ?? inventoryResult ?? [];
          productCount = items.length;
          inventoryItems = items.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.productName ?? 'Unknown Product',
            category: item.category?.name ?? item.categoryName ?? '',
            quantity: toNumber(item.quantity ?? item.stock ?? 0),
            minQuantity: toNumber(item.minQuantity ?? item.minStock ?? 10),
            sellingPrice: toNumber(item.sellingPrice ?? item.price ?? 0),
            totalSold: toNumber(item.totalSold ?? 0),
            revenue: toNumber(item.revenue ?? 0)
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch inventory:', err);
      }

      // Generate sales chart data (last 7 days)
      const salesData: SalesChartData[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Filter orders for this day
        const dayOrders = ordersData.filter((order: any) => {
          const orderDate = new Date(order.date ?? order.createdAt ?? order.placedAt ?? '');
          return orderDate.toDateString() === date.toDateString();
        });
        
        const dayRevenue = dayOrders.reduce((sum, order) => {
          return sum + toNumber(order.total ?? order.totals?.total ?? order.amount?.total ?? 0);
        }, 0);
        
        salesData.push({
          date: dayName,
          sales: dayRevenue
        });
      }

      // Get recent orders (last 4)
      const recentOrdersData = ordersData
        .sort((a, b) => new Date(b.date ?? b.createdAt ?? '').getTime() - new Date(a.date ?? a.createdAt ?? '').getTime())
        .slice(0, 4)
        .map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber ?? order.shortId ?? order.displayId,
          customer: order.customer?.name ?? order.customerName ?? order.clientName ?? 'Unknown',
          email: order.customer?.email ?? order.customerEmail ?? order.email ?? '',
          phone: order.customer?.phone ?? order.customerPhone ?? order.phone ?? '',
          total: String(order.total ?? order.totals?.total ?? order.amount?.total ?? 0),
          status: order.orderStatus ?? order.status ?? 'Pending',
          paymentStatus: order.payment?.status ?? order.paymentStatus ?? 'Pending',
          date: order.date ?? order.createdAt ?? order.placedAt ?? '',
          items: Array.isArray(order.items) ? order.items : []
        }));

      // Get top products from consolidated API
      console.log('🔄 Fetching top products from consolidated API...');
      let topProductsData: InventoryItem[] = [];
      
      try {
        const dashboardResponse = await fetch(`${apiBase}/orders/dashboard/stats`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        
        if (dashboardResponse.ok) {
          const dashboardResult = await dashboardResponse.json();
          console.log('📊 Dashboard API response:', dashboardResult);
          
          if (dashboardResult.status?.returnCode === 200 && dashboardResult.data?.topProducts) {
            topProductsData = dashboardResult.data.topProducts.map((product: any) => ({
              id: product.id,
              name: product.name,
              category: product.category,
              quantity: product.quantity || 0,
              minQuantity: product.minQuantity || 0,
              sellingPrice: product.sellingPrice || 0,
              totalSold: product.totalSold || 0,
              revenue: product.totalRevenue || 0
            }));
            console.log('⭐ Top products from API:', topProductsData);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch top products from dashboard API:', err);
      }
      
      // Fallback to inventory items if dashboard API fails
      if (topProductsData.length === 0) {
        console.log('📦 Using inventory items as fallback for top products:', inventoryItems);
        topProductsData = inventoryItems
          .map(item => {
            const hasRevenue = item.revenue && item.revenue > 0;
            const hasTotalSold = item.totalSold && item.totalSold > 0;
            console.log(`Product ${item.name}: revenue=${item.revenue}, totalSold=${item.totalSold}, sellingPrice=${item.sellingPrice}, hasRevenue=${hasRevenue}, hasTotalSold=${hasTotalSold}`);
            
            // If no sales data, use selling price as a proxy for "value"
            const sortValue = hasRevenue ? item.revenue : 
                             hasTotalSold ? ((item.totalSold ?? 0) * item.sellingPrice) : 
                             item.sellingPrice;
            
            return {
              ...item,
              sortValue: sortValue || 0
            };
          })
          .sort((a, b) => b.sortValue - a.sortValue)
          .slice(0, 4)
          .map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            minQuantity: item.minQuantity,
            sellingPrice: item.sellingPrice,
            totalSold: item.totalSold || 0,
            revenue: item.revenue || 0
          }));
      }
      
      console.log('⭐ Final top products data:', topProductsData);

      // Get stock alerts from dedicated API
      console.log('🔄 Fetching stock alerts from dedicated API...');
      let stockAlertsData: InventoryItem[] = [];
      
      try {
        const stockAlertsResponse = await fetch(`${apiBase}/inventory/stock-alerts`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        
        if (stockAlertsResponse.ok) {
          const stockAlertsResult = await stockAlertsResponse.json();
          console.log('📊 Stock alerts API response:', stockAlertsResult);
          
          if (stockAlertsResult.status?.returnCode === 200 && stockAlertsResult.data?.alerts) {
            stockAlertsData = stockAlertsResult.data.alerts.map((alert: any) => ({
              id: alert.id,
              name: alert.name,
              category: alert.category,
              quantity: alert.quantity || 0,
              minQuantity: alert.minStock || alert.minQuantity || 0,
              sellingPrice: 0,
              totalSold: 0,
              revenue: 0
            }));
            console.log('⚠️ Stock alerts from API:', stockAlertsData);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch stock alerts from dedicated API:', err);
      }
      
      // Fallback to inventory items if stock alerts API fails
      if (stockAlertsData.length === 0) {
        console.log('📦 Using inventory items as fallback for stock alerts:', inventoryItems);
        stockAlertsData = inventoryItems
          .filter(item => item.quantity <= item.minQuantity)
          .sort((a, b) => a.quantity - b.quantity)
          .slice(0, 3);
      }
      
      console.log('⚠️ Final stock alerts data:', stockAlertsData);

      setDashboardStats({
        totalRevenue,
        totalOrders,
        totalProducts: productCount,
        totalCustomers: customerCount,
        revenueChange: 12.5, // This would need historical data to calculate
        ordersChange: 8.2,   // This would need historical data to calculate
        productsChange: 0,   // This would need historical data to calculate
        customersChange: 0   // This would need historical data to calculate
      });

      setSalesChartData(salesData);
      setRecentOrders(recentOrdersData);
      setTopProducts(topProductsData);
      setStockAlerts(stockAlertsData);
      setUsingMockData(false);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setUsingMockData(true);
      
      // Fallback to mock data
      setDashboardStats({
        totalRevenue: 311700000,
        totalOrders: 347,
        totalProducts: 1429,
        totalCustomers: 0,
        revenueChange: 12.5,
        ordersChange: 8.2,
        productsChange: 0,
        customersChange: 0
      });

      setSalesChartData([
        { date: 'Mon', sales: 4000 * 3700 },
        { date: 'Tue', sales: 3000 * 3700 },
        { date: 'Wed', sales: 5000 * 3700 },
        { date: 'Thu', sales: 4500 * 3700 },
        { date: 'Fri', sales: 6000 * 3700 },
        { date: 'Sat', sales: 5500 * 3700 },
        { date: 'Sun', sales: 7000 * 3700 },
      ]);

      setRecentOrders([
        { id: 'ORD-001', customer: 'Liam Johnson', email: 'liam@example.com', phone: '0755123456', total: '925000', status: 'Paid', paymentStatus: 'Paid', date: '2024-01-15', items: [] },
        { id: 'ORD-002', customer: 'Olivia Smith', email: 'olivia@example.com', phone: '0777123456', total: '557775', status: 'Pending', paymentStatus: 'Pending', date: '2024-01-15', items: [] },
        { id: 'ORD-003', customer: 'Noah Williams', email: 'noah@example.com', phone: '0788123456', total: '1759350', status: 'Paid', paymentStatus: 'Paid', date: '2024-01-15', items: [] },
        { id: 'ORD-004', customer: 'Emma Brown', email: 'emma@example.com', phone: '0799123456', total: '296000', status: 'Shipped', paymentStatus: 'Paid', date: '2024-01-15', items: [] },
      ]);

      setTopProducts([
        { id: '1', name: 'Wireless Earbuds', category: 'Electronics', quantity: 50, minQuantity: 10, sellingPrice: 150000, totalSold: 1200, revenue: 180000000 },
        { id: '2', name: 'Smart Watch', category: 'Electronics', quantity: 30, minQuantity: 5, sellingPrice: 300000, totalSold: 980, revenue: 294000000 },
        { id: '3', name: 'Gaming Mouse', category: 'Electronics', quantity: 75, minQuantity: 15, sellingPrice: 80000, totalSold: 750, revenue: 60000000 },
        { id: '4', name: 'VR Headset', category: 'Electronics', quantity: 25, minQuantity: 5, sellingPrice: 500000, totalSold: 500, revenue: 250000000 },
      ]);

      setStockAlerts([
        { id: '1', name: 'Organic Coffee Beans', category: 'Groceries', quantity: 8, minQuantity: 10, sellingPrice: 25000 },
        { id: '2', name: 'Artisan Bread', category: 'Bakery', quantity: 12, minQuantity: 15, sellingPrice: 15000 },
        { id: '3', name: 'Vintage T-Shirt', category: 'Apparel', quantity: 5, minQuantity: 5, sellingPrice: 45000 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <div>
      {usingMockData && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                <strong>Demo Mode:</strong> Some API endpoints are unavailable. Showing mock data for testing dashboard functionality.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 interactive ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-foreground">UGX {formatAmount(dashboardStats.totalRevenue)}</p>
                  <div className="flex items-center mt-3">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500 font-semibold">+{dashboardStats.revenueChange}%</span>
                    <span className="text-xs text-muted-foreground ml-2">vs last month</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-medium">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 interactive ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Orders</p>
                  <p className="text-3xl font-bold text-foreground">{dashboardStats.totalOrders.toLocaleString()}</p>
                  <div className="flex items-center mt-3">
                    <ArrowUpRight className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-sm text-blue-500 font-semibold">+{dashboardStats.ordersChange}%</span>
                    <span className="text-xs text-muted-foreground ml-2">vs last month</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-medium">
                  <ShoppingCart className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 interactive ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Products</p>
                  <p className="text-3xl font-bold text-foreground">{dashboardStats.totalProducts.toLocaleString()}</p>
                  <div className="flex items-center mt-3">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-sm text-orange-500 font-semibold">{stockAlerts.length} low stock</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-medium">
                  <Package className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 interactive ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Customers</p>
                  <p className="text-3xl font-bold text-foreground">{dashboardStats.totalCustomers.toLocaleString()}</p>
                  <div className="flex items-center mt-3">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500 font-semibold">+{dashboardStats.customersChange}%</span>
                    <span className="text-xs text-muted-foreground ml-2">vs last month</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-medium">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Sales Chart and Side Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Sales This Week Chart */}
              <div className="glass rounded-2xl border border-border/50 shadow-medium p-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Sales This Week</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={salesChartData} margin={{ top: 10, right: 30, left: 50, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} />
                    <YAxis 
                      tick={{ fill: '#888', fontSize: 12 }} 
                      tickFormatter={(value) => formatAmount(value)}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value) => [`UGX ${formatAmount(value)}`, 'Sales']} 
                      labelStyle={{ color: '#333' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Orders */}
              <div className="glass rounded-2xl border border-border/50 shadow-medium hover:shadow-large transition-all duration-300">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-semibold text-foreground">Recent Orders</h3>
                    </div>
                    <Link 
                      href="/pages/orders/OrdersView"
                      className="text-sm text-primary hover:text-primary-glow font-medium px-4 py-2 rounded-lg hover:bg-primary/5 transition-all duration-200"
                    >
                      View All
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentOrders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No recent orders found</p>
                      </div>
                    ) : (
                      recentOrders.map((order, index) => {
                        const initials = order.customer.split(' ').map(n => n[0]).join('').toUpperCase();
                        const timeAgo = new Date(order.date).toLocaleDateString();
                        return (
                          <div key={order.id} className={`flex items-center justify-between p-4 hover:bg-secondary/50 rounded-xl transition-all duration-300 group cursor-pointer ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-medium">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{order.customer}</p>
                                <p className="text-sm text-muted-foreground">{order.orderNumber || order.id} • {timeAgo}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-bold text-foreground text-lg">UGX {formatAmount(order.total)}</p>
                                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
              {/* Top Products */}
              <div className="glass rounded-2xl border border-border/50 shadow-medium hover:shadow-large transition-all duration-300">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center space-x-3">
                    <Star className="w-6 h-6 text-warning" />
                    <h3 className="text-xl font-semibold text-foreground">Top Products</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-5">
                    {topProducts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No product data available</p>
                      </div>
                    ) : (
                      topProducts.map((product, index) => (
                        <div key={product.id} className={`flex items-center justify-between p-3 hover:bg-secondary/30 rounded-xl transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 150}ms` }}>
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">📦</div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.totalSold || 0} sold</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground text-sm">UGX {formatAmount(product.revenue || 0)}</p>
                            <div className="flex items-center">
                              <ArrowUpRight className="w-3 h-3 text-success mr-1" />
                              <p className="text-xs font-medium text-success">
                                +{Math.round(Math.random() * 20)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Stock Alerts */}
              <div className="glass rounded-2xl border border-border/50 shadow-medium hover:shadow-large transition-all duration-300">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">Stock Alerts</h3>
                    </div>
                    <span className="bg-error/10 text-error text-xs px-3 py-1 rounded-full font-medium border border-error/20">
                      {stockAlerts.length} items
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {stockAlerts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>All products are well stocked</p>
                      </div>
                    ) : (
                      stockAlerts.map((item, index) => {
                        const urgency = item.quantity <= item.minQuantity ? 'high' : 'medium';
                        return (
                          <div key={item.id} className={`p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200/50 dark:border-red-800/30 rounded-xl hover:shadow-medium transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 200}ms` }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 bg-gradient-to-r ${getUrgencyColor(urgency)} rounded-lg flex items-center justify-center shadow-medium`}>
                                  <Package className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.category || 'General'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-error">{item.quantity} left</p>
                                <p className="text-xs text-muted-foreground">Min: {item.minQuantity}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPage;
