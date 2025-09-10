import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, ShoppingCart, Calendar, Filter, Download,
  ArrowUpRight, ArrowDownRight, Eye, MoreHorizontal, Search
} from 'lucide-react';

const SalesView = () => {
  const [dateRange, setDateRange] = useState('7d');
  const [isLoaded, setIsLoaded] = useState(true);

  const salesData = [
    { date: 'Today', revenue: '$12,543', orders: 89, growth: '+23%', positive: true },
    { date: 'Yesterday', revenue: '$10,234', orders: 76, growth: '+18%', positive: true },
    { date: 'This Week', revenue: '$78,432', orders: 542, growth: '+15%', positive: true },
    { date: 'This Month', revenue: '$234,567', orders: 1842, growth: '+12%', positive: true },
  ];

  const recentSales = [
    { id: '#15467', customer: 'Alice Cooper', product: 'MacBook Pro 16"', amount: '$2,499', time: '5 min ago', status: 'completed' },
    { id: '#15466', customer: 'Bob Wilson', product: 'iPhone 15 Pro', amount: '$1,199', time: '12 min ago', status: 'pending' },
    { id: '#15465', customer: 'Carol Smith', product: 'AirPods Pro', amount: '$249', time: '23 min ago', status: 'completed' },
    { id: '#15464', customer: 'David Brown', product: 'iPad Air', amount: '$599', time: '45 min ago', status: 'processing' },
    { id: '#15463', customer: 'Eva Davis', product: 'Apple Watch Series 9', amount: '$399', time: '1 hour ago', status: 'completed' },
  ];

  const topProducts = [
    { name: 'MacBook Pro 16"', revenue: '$45,680', units: 23, growth: '+34%', positive: true },
    { name: 'iPhone 15 Pro', revenue: '$38,760', units: 42, growth: '+28%', positive: true },
    { name: 'AirPods Pro', revenue: '$12,450', units: 67, growth: '-5%', positive: false },
    { name: 'iPad Air', revenue: '$18,990', units: 38, growth: '+19%', positive: true },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'processing': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Sales Overview</h1>
          <p className="text-muted-foreground mt-2">Track your sales performance and revenue</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="glass rounded-xl px-4 py-2 border border-border/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="glass rounded-xl px-4 py-2 flex items-center space-x-2 hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Sales Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {salesData.map((stat, index) => (
          <div key={index} className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{stat.date}</p>
              <div className="flex items-center space-x-1">
                {stat.positive ? (
                  <ArrowUpRight className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-error" />
                )}
                <span className={`text-sm font-semibold ${stat.positive ? 'text-success' : 'text-error'}`}>
                  {stat.growth}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mb-2">{stat.revenue}</p>
            <p className="text-sm text-muted-foreground">{stat.orders} orders</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales */}
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Recent Sales</h3>
              <button className="text-sm text-primary hover:text-primary-glow font-medium">View All</button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentSales.map((sale, index) => (
                <div key={index} className={`flex items-center justify-between p-4 hover:bg-secondary/50 rounded-xl transition-all duration-300 group cursor-pointer ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-foreground">{sale.customer}</p>
                      <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{sale.product}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sale.id} • {sale.time}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-foreground text-lg">{sale.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-xl font-semibold text-foreground">Top Selling Products</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className={`flex items-center justify-between p-4 hover:bg-secondary/30 rounded-xl transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 150}ms` }}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-12 rounded-full ${index === 0 ? 'bg-gradient-primary' : index === 1 ? 'bg-gradient-success' : index === 2 ? 'bg-gradient-warning' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}></div>
                    <div>
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.units} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{product.revenue}</p>
                    <div className="flex items-center">
                      {product.positive ? (
                        <ArrowUpRight className="w-3 h-3 text-success mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-error mr-1" />
                      )}
                      <p className={`text-sm font-medium ${product.positive ? 'text-success' : 'text-error'}`}>
                        {product.growth}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesView;