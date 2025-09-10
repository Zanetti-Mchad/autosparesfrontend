import React, { useState } from 'react';
import { 
  TrendingUp, BarChart3, PieChart, Activity, Calendar, ArrowUpRight, 
  ArrowDownRight, Users, ShoppingCart, DollarSign, Eye, Target
} from 'lucide-react';

const AnalyticsView = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoaded, setIsLoaded] = useState(true);

  const kpiData = [
    { label: 'Revenue Growth', value: '+23.5%', change: '+5.2%', positive: true, icon: TrendingUp },
    { label: 'Conversion Rate', value: '3.2%', change: '+0.8%', positive: true, icon: Target },
    { label: 'Avg Order Value', value: '$89.50', change: '+12%', positive: true, icon: DollarSign },
    { label: 'Customer Retention', value: '68%', change: '-2%', positive: false, icon: Users },
  ];

  const trafficSources = [
    { source: 'Organic Search', visitors: 4250, percentage: 42, color: 'from-emerald-500 to-teal-500' },
    { source: 'Direct', visitors: 2890, percentage: 28, color: 'from-blue-500 to-indigo-500' },
    { source: 'Social Media', visitors: 1650, percentage: 16, color: 'from-purple-500 to-pink-500' },
    { source: 'Email Marketing', visitors: 980, percentage: 10, color: 'from-amber-500 to-orange-500' },
    { source: 'Paid Ads', visitors: 430, percentage: 4, color: 'from-red-500 to-pink-500' },
  ];

  const topPages = [
    { page: '/products/macbook-pro', views: 12450, conversion: '4.2%', revenue: '$52,300' },
    { page: '/products/iphone-15', views: 9680, conversion: '3.8%', revenue: '$38,700' },
    { page: '/products/airpods-pro', views: 7230, conversion: '5.1%', revenue: '$18,200' },
    { page: '/products/ipad-air', views: 5890, conversion: '3.5%', revenue: '$21,600' },
    { page: '/products/apple-watch', views: 4560, conversion: '2.9%', revenue: '$14,800' },
  ];

  const salesTrends = [
    { month: 'Jan', revenue: 45000, orders: 380 },
    { month: 'Feb', revenue: 52000, orders: 420 },
    { month: 'Mar', revenue: 48000, orders: 395 },
    { month: 'Apr', revenue: 61000, orders: 485 },
    { month: 'May', revenue: 55000, orders: 445 },
    { month: 'Jun', revenue: 67000, orders: 520 },
  ];

  const customerSegments = [
    { segment: 'New Customers', count: 1284, percentage: 35, growth: '+28%' },
    { segment: 'Returning Customers', count: 2156, percentage: 45, growth: '+12%' },
    { segment: 'VIP Customers', count: 432, percentage: 12, growth: '+8%' },
    { segment: 'Inactive Customers', count: 298, percentage: 8, growth: '-15%' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">Deep insights into your business performance</p>
        </div>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="glass rounded-xl px-4 py-2 border border-border/50"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <div key={index} className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <div className="flex items-center mt-3">
                  {kpi.positive ? (
                    <ArrowUpRight className="w-4 h-4 text-success mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-error mr-1" />
                  )}
                  <span className={`text-sm font-semibold ${kpi.positive ? 'text-success' : 'text-error'}`}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">vs last period</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
                <kpi.icon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic Sources */}
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Traffic Sources</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {trafficSources.map((source, index) => (
                <div key={index} className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 bg-gradient-to-r ${source.color} rounded-full`}></div>
                      <span className="font-medium text-foreground">{source.source}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-foreground">{source.visitors.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2">({source.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 bg-gradient-to-r ${source.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <Eye className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Top Pages</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topPages.map((page, index) => (
                <div key={index} className={`p-4 hover:bg-secondary/30 rounded-xl transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground text-sm truncate">{page.page}</p>
                    <span className="text-sm text-success font-semibold">{page.conversion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{page.views.toLocaleString()} views</p>
                    <p className="text-sm font-semibold text-foreground">{page.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Trends Chart Placeholder */}
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Sales Trends</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center bg-gradient-secondary rounded-xl">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Chart visualization would be here</p>
                <p className="text-sm text-muted-foreground mt-1">Revenue: $67,000 | Orders: 520</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Segments */}
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <PieChart className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Customer Segments</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {customerSegments.map((segment, index) => (
                <div key={index} className={`p-4 hover:bg-secondary/30 rounded-xl transition-all duration-300 ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{segment.segment}</p>
                    <span className={`text-sm font-semibold ${segment.growth.startsWith('+') ? 'text-success' : 'text-error'}`}>
                      {segment.growth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{segment.count.toLocaleString()} customers</p>
                    <p className="text-sm text-muted-foreground">{segment.percentage}%</p>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div 
                      className="h-2 bg-gradient-primary rounded-full transition-all duration-1000"
                      style={{ width: `${segment.percentage}%` }}
                    ></div>
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

export default AnalyticsView;