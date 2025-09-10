"use client";
import React, { useState, useEffect } from 'react';
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

// Dummy data - this would come from an API in a real app
const salesChartData = [
  { date: 'Mon', sales: 4000 * 3700 },
  { date: 'Tue', sales: 3000 * 3700 },
  { date: 'Wed', sales: 5000 * 3700 },
  { date: 'Thu', sales: 4500 * 3700 },
  { date: 'Fri', sales: 6000 * 3700 },
  { date: 'Sat', sales: 5500 * 3700 },
  { date: 'Sun', sales: 7000 * 3700 },
];

const recentOrders = [
  { id: '#ORD-001', customer: 'Liam Johnson', avatar: 'LJ', time: '2 min ago', amount: 'UGX 925,000', status: 'Paid', gradient: 'from-green-400 to-blue-500' },
  { id: '#ORD-002', customer: 'Olivia Smith', avatar: 'OS', time: '5 min ago', amount: 'UGX 557,775', status: 'Pending', gradient: 'from-yellow-400 to-orange-500' },
  { id: '#ORD-003', customer: 'Noah Williams', avatar: 'NW', time: '10 min ago', amount: 'UGX 1,759,350', status: 'Paid', gradient: 'from-purple-400 to-pink-500' },
  { id: '#ORD-004', customer: 'Emma Brown', avatar: 'EB', time: '12 min ago', amount: 'UGX 296,000', status: 'Shipped', gradient: 'from-indigo-400 to-cyan-500' },
];

const topProducts = [
  { name: 'Wireless Earbuds', icon: '🎧', sales: '1.2k', revenue: 'UGX 310M', change: '+15%', positive: true },
  { name: 'Smart Watch', icon: '⌚', sales: '980', revenue: 'UGX 440M', change: '+8%', positive: true },
  { name: 'Gaming Mouse', icon: '🖱️', sales: '750', revenue: 'UGX 166M', change: '-5%', positive: false },
  { name: 'VR Headset', icon: '🕶️', sales: '500', revenue: 'UGX 555M', change: '+20%', positive: true },
];

const stockAlerts = [
  { name: 'Organic Coffee Beans', category: 'Groceries', stock: 8, threshold: 10, urgency: 'high' },
  { name: 'Artisan Bread', category: 'Bakery', stock: 12, threshold: 15, urgency: 'medium' },
  { name: 'Vintage T-Shirt', category: 'Apparel', stock: 5, threshold: 5, urgency: 'high' },
];

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
  const [customerCount, setCustomerCount] = useState(0);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch customer stats from database
  useEffect(() => {
    const fetchCustomerStats = async () => {
      try {
        setLoading(true);
        
        const apiBase = process.env.NODE_ENV === 'production' 
          ? 'https://backendrdjs-production.up.railway.app/api/v1'
          : 'http://localhost:4210/api/v1';
        const url = `${apiBase}/customers/stats`;
        
        console.log('=== FETCHING CUSTOMER STATS FOR DASHBOARD ===');
        console.log('API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch customer stats: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Customer stats API response:', data);
        
        if (data.status?.returnCode === 200 || data.status?.returnCode === "00" || data.status?.returnCode === 0) {
          const stats = data.data;
          console.log('Customer stats from database:', stats);
          setCustomerCount(stats?.total || 0);
          setCustomerStats(stats);
        } else {
          throw new Error(data.status?.returnMessage || 'Failed to fetch customer stats');
        }
      } catch (err) {
        console.error('Error fetching customer stats:', err);
        // Keep default values on error
        setCustomerCount(0);
        setCustomerStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerStats();
  }, []);

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 interactive ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-foreground">UGX 311.7M</p>
              <div className="flex items-center mt-3">
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500 font-semibold">+12.5%</span>
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
              <p className="text-sm font-medium text-muted-foreground mb-2">Orders Today</p>
              <p className="text-3xl font-bold text-foreground">347</p>
              <div className="flex items-center mt-3">
                <ArrowUpRight className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-500 font-semibold">+8.2%</span>
                <span className="text-xs text-muted-foreground ml-2">vs yesterday</span>
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
              <p className="text-3xl font-bold text-foreground">1,429</p>
              <div className="flex items-center mt-3">
                <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-sm text-orange-500 font-semibold">12 low stock</span>
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
              <p className="text-3xl font-bold text-foreground">
                {loading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : (
                  customerCount.toLocaleString()
                )}
              </p>
              <div className="flex items-center mt-3">
                {(() => {
                  const pct = (customerStats?.deltaPct ?? 0).toFixed(1);
                  const up = (customerStats?.deltaPct ?? 0) >= 0;
                  return (
                    <>
                      {up ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-semibold ${up ? 'text-green-500' : 'text-red-500'}`}>
                        {up ? '+' : ''}{pct}%
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">vs last 30 days</span>
                    </>
                  );
                })()}
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
              <LineChart data={salesChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#888' }} />
                <YAxis tick={{ fill: '#888' }} />
                <Tooltip />
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
                  href="/orders/view-edit"
                  className="text-sm text-primary hover:text-primary-glow font-medium px-4 py-2 rounded-lg hover:bg-primary/5 transition-all duration-200"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentOrders.map((order, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 hover:bg-secondary/50 rounded-xl transition-all duration-300 group cursor-pointer ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${order.gradient} rounded-xl flex items-center justify-center text-white font-semibold shadow-medium`}>
                        {order.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{order.customer}</p>
                        <p className="text-sm text-muted-foreground">{order.id} • {order.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-bold text-foreground text-lg">{order.amount}</p>
                        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
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
                {topProducts.map((product, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 hover:bg-secondary/30 rounded-xl transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 150}ms` }}>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{product.icon}</div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sales} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{product.revenue}</p>
                      <div className="flex items-center">
                        {product.positive ? (
                          <ArrowUpRight className="w-3 h-3 text-success mr-1" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-error mr-1" />
                        )}
                        <p className={`text-xs font-medium ${product.positive ? 'text-success' : 'text-error'}`}>
                          {product.change}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
                {stockAlerts.map((item, index) => (
                  <div key={index} className={`p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200/50 dark:border-red-800/30 rounded-xl hover:shadow-medium transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 200}ms` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-gradient-to-r ${getUrgencyColor(item.urgency)} rounded-lg flex items-center justify-center shadow-medium`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-error">{item.stock} left</p>
                        <p className="text-xs text-muted-foreground">Min: {item.threshold}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
