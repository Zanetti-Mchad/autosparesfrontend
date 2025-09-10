"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Building, Mail, Phone, MapPin, Calendar, ArrowLeft, Edit, Trash2, FileText, Users, Search, Filter } from 'lucide-react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'VIP': return 'bg-warning/10 text-warning border-warning/20';
    case 'Regular': return 'bg-primary/10 text-primary border-primary/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const ViewCustomer = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use production URL for now, but can switch to local if needed
        const apiBase = process.env.NODE_ENV === 'production' 
          ? 'https://backendrdjs-production.up.railway.app/api/v1'
          : 'http://localhost:4210/api/v1';
        const url = `${apiBase}/customers?page=1&pageSize=100`;
        
        console.log('=== FETCHING CUSTOMERS FROM DATABASE ===');
        console.log('API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.status?.returnCode === 200 || data.status?.returnCode === "00" || data.status?.returnCode === 0) {
          const customerList = data.data?.items || data.items || [];
          console.log('Customer list from database:', customerList);
          console.log('Number of customers found:', customerList.length);
          setCustomers(customerList);
          setFilteredCustomers(customerList);
        } else {
          throw new Error(data.status?.returnMessage || 'Failed to fetch customers');
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch customers');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Search and filter functionality
  useEffect(() => {
    let filtered = customers;

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.customerType === typeFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(customer => {
        const isCompany = customer.customerType === 'company';
        const name = isCompany ? customer.companyName : customer.name;
        const email = isCompany ? customer.workEmail : customer.email;
        const phone = customer.phone || '';
        const location = isCompany ? customer.address : customer.location;
        const contactPerson = customer.contactPerson || '';
        
        const searchLower = searchTerm.toLowerCase();
        return (
          name?.toLowerCase().includes(searchLower) ||
          email?.toLowerCase().includes(searchLower) ||
          phone?.toLowerCase().includes(searchLower) ||
          location?.toLowerCase().includes(searchLower) ||
          contactPerson?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, typeFilter, customers]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient mb-6">Customers</h1>
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading customers from database...</div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient mb-6">Customers</h1>
        <div className="text-center py-8">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Customer Directory
              </h1>
              <p className="text-slate-600 mt-2 text-base sm:text-lg">
                Manage and view all your customers in one place
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-300 text-slate-700 placeholder-slate-400"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-300 text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="company">Companies</option>
                  <option value="client">Individuals</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Stats Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 sm:px-6 py-3 shadow-lg border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800">{filteredCustomers.length}</p>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {searchTerm || typeFilter !== 'all' ? 'Found' : 'Total'} Customers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {searchTerm ? 'No customers found' : 'No customers found'}
            </h3>
            <p className="text-slate-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first customer to the system'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustomers.map((customer, index) => {
              const isCompany = customer.customerType === 'company';
              const name = isCompany ? customer.companyName : customer.name;
              const email = isCompany ? customer.workEmail : customer.email;
              const avatarInitial = (name || '').charAt(0).toUpperCase();
              const gradients = [
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-red-500',
                'from-indigo-500 to-blue-500',
                'from-pink-500 to-rose-500'
              ];
              const gradient = gradients[index % gradients.length];
              
              return (
                <motion.div 
                  key={customer.id} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                  className="group"
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center space-x-4 sm:space-x-6">
                      {/* Number */}
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shrink-0">
                        {index + 1}
                      </div>
                      
                      {/* Avatar */}
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl font-bold shadow-lg shrink-0`}>
                        {isCompany ? <Building className="w-6 h-6 sm:w-8 sm:h-8" /> : avatarInitial}
                      </div>
                      
                      {/* Customer Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium ${getStatusColor(customer.status || 'Regular')}`}>
                                {customer.status || 'Regular'}
                              </span>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                {isCompany ? 'Company' : 'Individual'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Contact Details */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-green-600" />
                              <span className="truncate max-w-[200px]">{email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-purple-600" />
                              <span>{customer.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-orange-600" />
                              <span className="truncate max-w-[150px]">
                                {isCompany ? customer.address : customer.location || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Info for Companies */}
                        {isCompany && (
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-blue-600" />
                              <span>Contact: {customer.contactPerson || 'N/A'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span>TIN: {customer.tin || 'N/A'}</span>
                            </div>
                          </div>
                        )}

                        {/* Notes - Show for both companies and individuals if they exist */}
                        {customer.notes && customer.notes.trim() && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-start space-x-2">
                              <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-slate-600 mb-1">Notes:</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{customer.notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ViewCustomer;
