import React, { useState } from 'react';
import { 
  FileText, Download, Calendar, Filter, Search, BarChart3, 
  TrendingUp, DollarSign, Users, Package, Eye, Clock
} from 'lucide-react';

const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState('sales');
  const [dateRange, setDateRange] = useState('30d');
  const [isLoaded, setIsLoaded] = useState(true);

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', icon: DollarSign, description: 'Revenue and sales performance' },
    { id: 'customers', name: 'Customer Report', icon: Users, description: 'Customer analytics and behavior' },
    { id: 'inventory', name: 'Inventory Report', icon: Package, description: 'Stock levels and movements' },
    { id: 'traffic', name: 'Traffic Report', icon: BarChart3, description: 'Website analytics and metrics' },
  ];

  const recentReports = [
    {
      name: 'Monthly Sales Summary',
      type: 'Sales',
      date: '2024-01-31',
      size: '2.4 MB',
      format: 'PDF',
      status: 'Ready',
      downloads: 15
    },
    {
      name: 'Customer Acquisition Report',
      type: 'Customers',
      date: '2024-01-30',
      size: '1.8 MB',
      format: 'Excel',
      status: 'Ready',
      downloads: 8
    },
    {
      name: 'Inventory Analysis Q1',
      type: 'Inventory',
      date: '2024-01-29',
      size: '3.1 MB',
      format: 'PDF',
      status: 'Processing',
      downloads: 0
    },
    {
      name: 'Website Traffic Overview',
      type: 'Traffic',
      date: '2024-01-28',
      size: '1.2 MB',
      format: 'CSV',
      status: 'Ready',
      downloads: 23
    },
  ];

  const quickStats = [
    { label: 'Reports Generated', value: '247', period: 'This month' },
    { label: 'Total Downloads', value: '1,432', period: 'All time' },
  ];

  const salesData = {
    totalRevenue: '$284,670',
    totalOrders: 1847,
    avgOrderValue: '$154.20',
    topProduct: 'MacBook Pro 16"',
    bestDay: 'Monday',
    growthRate: '+18.5%'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-success/10 text-success border-success/20';
      case 'Processing': return 'bg-warning/10 text-warning border-warning/20';
      case 'Failed': return 'bg-error/10 text-error border-error/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'PDF': return 'bg-red-100 text-red-700';
      case 'Excel': return 'bg-green-100 text-green-700';
      case 'CSV': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Generate and manage business reports</p>
        </div>
        <button className="bg-gradient-primary text-white px-6 py-3 rounded-xl hover:shadow-glow transition-all duration-300 flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Generate Report</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickStats.map((stat, index) => (
          <div key={index} className={`glass p-6 rounded-2xl border border-border/50 hover:shadow-large transition-all duration-300 ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
            <p className="text-sm font-medium text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-2">{stat.period}</p>
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
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Report Type</label>
                <div className="space-y-2">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReport(type.id)}
                      className={`w-full p-3 rounded-xl text-left transition-all duration-300 ${
                        selectedReport === type.id
                          ? 'bg-gradient-primary text-white shadow-medium'
                          : 'glass hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <type.icon className={`w-5 h-5 ${selectedReport === type.id ? 'text-white' : 'text-primary'}`} />
                        <div>
                          <p className={`font-medium ${selectedReport === type.id ? 'text-white' : 'text-foreground'}`}>
                            {type.name}
                          </p>
                          <p className={`text-xs ${selectedReport === type.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

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

              <button className="w-full bg-gradient-primary text-white py-3 rounded-xl hover:shadow-glow transition-all duration-300">
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="lg:col-span-2 glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Recent Reports</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    className="pl-10 pr-4 py-2 glass rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300"
                  />
                </div>
                <button className="p-2 glass rounded-lg hover:bg-secondary transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentReports.map((report, index) => (
                <div key={index} className={`p-4 hover:bg-secondary/50 rounded-xl transition-all duration-300 group ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{report.name}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getFormatColor(report.format)}`}>
                            {report.format}
                          </span>
                          <span className="text-sm text-muted-foreground">{report.size}</span>
                          <span className="text-sm text-muted-foreground">{report.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">{report.downloads} downloads</p>
                      </div>
                      {report.status === 'Ready' && (
                        <button className="p-2 text-primary hover:text-primary-glow hover:bg-primary/5 rounded-lg transition-all duration-200">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview/Summary */}
      {selectedReport === 'sales' && (
        <div className="glass rounded-2xl border border-border/50 shadow-medium">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-xl font-semibold text-foreground">Sales Report Preview</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">{salesData.totalRevenue}</p>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success font-semibold">{salesData.growthRate}</span>
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
    </div>
  );
};

export default ReportsView;