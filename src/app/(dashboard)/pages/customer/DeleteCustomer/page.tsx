"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, XCircle, ArrowLeft, User, Building, Mail, Phone, MapPin, FileText, Users, Search, Filter, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'VIP': return 'bg-warning/10 text-warning border-warning/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const DeleteCustomer = () => {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiBase = process.env.NODE_ENV === 'production' 
          ? 'https://backendrdjs-production.up.railway.app/api/v1'
          : 'http://localhost:4210/api/v1';
        const url = `${apiBase}/customers?page=1&pageSize=100`;
        
        console.log('=== FETCHING CUSTOMERS FOR DELETION ===');
        console.log('API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Customers data:', data);
        
        if (data.status?.returnCode === 200 || data.status?.returnCode === "00" || data.status?.returnCode === 0) {
          const customerList = data.data?.items || data.items || [];
          console.log('Customer list from database:', customerList);
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

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCustomers.size === 0) return;

    try {
      setDeleting(true);
      setError(null);

      const apiBase = process.env.NODE_ENV === 'production' 
        ? 'https://backendrdjs-production.up.railway.app/api/v1'
        : 'http://localhost:4210/api/v1';

      // Delete customers one by one
      const deletePromises = Array.from(selectedCustomers).map(async (customerId) => {
        const url = `${apiBase}/customers/${customerId}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete customer ${customerId}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!(data.status?.returnCode === 200 || data.status?.returnCode === "00" || data.status?.returnCode === 0)) {
          throw new Error(data.status?.returnMessage || `Failed to delete customer ${customerId}`);
        }
      });

      await Promise.all(deletePromises);

      // Update local state
      setCustomers(prev => prev.filter(customer => !selectedCustomers.has(customer.id)));
      setSelectedCustomers(new Set());
    } catch (err) {
      console.error('Error deleting customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete customers');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    router.push('/pages/customer/ViewCustomer');
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="text-muted-foreground">Loading customers...</div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <button 
              onClick={() => router.push('/pages/customer/ViewCustomer')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                onClick={handleCancel} 
                className="bg-white/80 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </motion.button>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Delete Customers
              </h1>
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
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 transition-all duration-300 text-slate-700 placeholder-slate-400"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 transition-all duration-300 text-slate-700 appearance-none cursor-pointer"
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
            </div>
          </div>
        </div>

        {/* Selection Controls */}
        {filteredCustomers.length > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.1 }} 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{selectedCustomers.size === filteredCustomers.length ? 'Deselect All' : 'Select All'}</span>
                </motion.button>
                <span className="text-slate-600">
                  {selectedCustomers.size} of {filteredCustomers.length} selected
                </span>
              </div>
              
              {selectedCustomers.size > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? 'Deleting...' : `Delete ${selectedCustomers.size} Customer${selectedCustomers.size > 1 ? 's' : ''}`}</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* Customer List */}
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm ? 'No customers found' : 'No customers found'}
            </h3>
            <p className="text-slate-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No customers available for deletion'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer, index) => {
              const isCompany = customer.customerType === 'company';
              const name = isCompany ? customer.companyName : customer.name;
              const email = isCompany ? customer.workEmail : customer.email;
              const isSelected = selectedCustomers.has(customer.id);
              
              return (
                <motion.div 
                  key={customer.id} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group ${isSelected ? 'ring-2 ring-red-500' : ''}`}
                >
                  <div className={`bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-white/20 hover:shadow-md transition-all duration-200 ${isSelected ? 'bg-red-50/80' : ''}`}>
                    <div className="flex items-center space-x-3">
                      {/* Number Badge */}
                      <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      
                      {/* Selection Checkbox */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectCustomer(customer.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected 
                            ? 'bg-red-500 border-red-500 text-white' 
                            : 'border-slate-300 hover:border-red-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </motion.button>
                      
                      {/* Customer Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-800 truncate">{name}</h3>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {isCompany ? 'Company' : 'Individual'}
                            </span>
                            {customer.status && customer.status !== 'Regular' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(customer.status)}`}>
                                {customer.status}
                              </span>
                            )}
                          </div>
                          
                          {/* Contact Details */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <span className="truncate max-w-[150px]">{email || 'N/A'}</span>
                            <span>{customer.phone || 'N/A'}</span>
                            <span className="truncate max-w-[120px]">
                              {isCompany ? customer.address : customer.location || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
          >
            {error}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default DeleteCustomer;
