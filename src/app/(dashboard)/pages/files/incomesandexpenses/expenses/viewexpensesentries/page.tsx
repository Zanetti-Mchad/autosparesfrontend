"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { env } from '@/env';

// We will use the baseUrl from the environment variables
const baseUrl = env.BACKEND_API_URL;

// Define the type for an expense entry from the API
interface ExpenseEntry {
  id: string;
  amount: number;
  date: string;
  frequency: string;
  additionalInfo?: string;
  category: {
    id: string;
    name: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

// Type for processed entries to display
interface ProcessedExpenseEntry {
  id: string;
  category: string;
  categoryId: string;
  subcategory: string;
  subcategoryId?: string;
  amount: number;
  date: string;
  displayLabel?: string;
}

const ExpenseViewer = () => {
  const router = useRouter();
  const [expenseEntries, setExpenseEntries] = useState<ProcessedExpenseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPeriod, setFilterPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filteredEntries, setFilteredEntries] = useState<ProcessedExpenseEntry[]>([]);
  
  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('');
  const [editableEntries, setEditableEntries] = useState<ProcessedExpenseEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Utility function to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const accessToken = localStorage.getItem('accessToken') || '';
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch expenses from the API
  const fetchExpenses = useCallback(async (queryParams: string = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${baseUrl}/api/v1/finance/get-expenses${queryParams}`, {
        headers: getAuthHeaders()
      });
      
      // Handle unauthorized response
      if (response.status === 401) {
        setErrorMessage('Session expired. Please log in again.');
        setShowModal(true);
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        }, 2000);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status?.returnCode === "00" && data.data?.expenses) {
        // Process API response to match our internal format
        const processedEntries = data.data.expenses.map((expense: ExpenseEntry) => ({
          id: expense.id,
          categoryId: expense.category.id,
          category: expense.category.name,
          subcategoryId: expense.subcategory?.id,
          subcategory: expense.subcategory?.name || 'General',
          amount: expense.amount,
          date: new Date(expense.date).toISOString().split('T')[0]
        }));
        
        setExpenseEntries(processedEntries);
        setFilteredEntries(processedEntries); // Initially show all entries
      } else {
        throw new Error(data.status?.returnMessage || 'Failed to fetch expenses');
      }
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Check authentication on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        // Redirect to login if not authenticated
        router.push('/sign-in');
      } else {
        // Fetch data if authenticated
        fetchExpenses();
      }
    }
  }, [fetchExpenses, router]);

  // Generate weeks for the current year
  const weeks = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const result = [];
    
    // Create array of weeks for the year
    for (let month = 0; month < 12; month++) {
      const monthName = new Date(currentYear, month, 1).toLocaleString('default', { month: 'long' });
      let weekCount = 0;
      
      // Get the first day of the month
      const firstDay = new Date(currentYear, month, 1);
      
      // Start from the first day and increment weekly
      while (firstDay.getMonth() === month) {
        weekCount++;
        const weekStart = new Date(firstDay);
        const weekEnd = new Date(firstDay);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekEndMonth = weekEnd.getMonth();
        const weekEndDay = weekEnd.getDate();
        const weekEndMonthName = weekEnd.toLocaleString('default', { month: 'short' });
        
        const label = `Week ${weekCount} of ${monthName} (${firstDay.getDate()} - ${weekEndMonth !== month ? weekEndMonthName + ' ' : ''}${weekEndDay})`;
        
        result.push({
          label,
          value: `${currentYear}-${(month + 1).toString().padStart(2, '0')}-W${weekCount}`,
          start: new Date(weekStart),
          end: new Date(weekEnd)
        });
        
        // Move to next week
        firstDay.setDate(firstDay.getDate() + 7);
      }
    }
    
    return result;
  }, []);

  // Generate months for the current year
  const months = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const result = [];
    
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear, month, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      
      result.push({
        label: `${monthName} ${currentYear}`,
        value: `${currentYear}-${(month + 1).toString().padStart(2, '0')}`
      });
    }
    
    return result;
  }, []);

  // Format number with commas
  const formatNumber = (number: number): string => {
    return new Intl.NumberFormat('en-US').format(number);
  };

  // Apply API filters based on selected period
  const applyApiFilter = useCallback(() => {
    let queryParams = '';
    
    if (filterPeriod === 'day' && selectedDate) {
      queryParams = `?period=day&date=${selectedDate}`;
    } else if (filterPeriod === 'week' && selectedWeek) {
      const [year, weekInfo] = selectedWeek.split('-');
      queryParams = `?period=week&year=${year}&week=${weekInfo}`;
    } else if (filterPeriod === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      queryParams = `?period=month&year=${year}&month=${month}`;
    } else if (filterPeriod === 'dateRange' && startDate && endDate) {
      queryParams = `?period=custom&startDate=${startDate}&endDate=${endDate}`;
    }
    
    fetchExpenses(queryParams);
  }, [filterPeriod, selectedDate, selectedWeek, selectedMonth, startDate, endDate, fetchExpenses]);

  // Apply filter when period selection changes
  useEffect(() => {
    if (filterPeriod === 'all') {
      fetchExpenses();
    } else if (
      (filterPeriod === 'day' && selectedDate) ||
      (filterPeriod === 'week' && selectedWeek) ||
      (filterPeriod === 'month' && selectedMonth) ||
      (filterPeriod === 'dateRange' && startDate && endDate)
    ) {
      applyApiFilter();
    }
  }, [
    filterPeriod,
    selectedDate,
    selectedWeek,
    selectedMonth,
    startDate,
    endDate,
    fetchExpenses,
    applyApiFilter
  ]);

  // Reset other filters when changing the filter period
  useEffect(() => {
    // Reset all selection values when changing filter type
    if (filterPeriod !== 'day') setSelectedDate('');
    if (filterPeriod !== 'week') setSelectedWeek('');
    if (filterPeriod !== 'month') setSelectedMonth('');
    if (filterPeriod !== 'dateRange') {
      setStartDate('');
      setEndDate('');
    }
  }, [filterPeriod]);

  const totalBalance = useMemo(() => {
    // Ensure amounts are numbers before summing
    return filteredEntries.reduce((sum, entry) => {
      const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [filteredEntries]);

  // Debug function to help diagnose issues
  const debugAmounts = () => {
    console.log("All entries:", expenseEntries.length);
    console.log("Filtered entries:", filteredEntries.length);
    
    // Log each entry to verify amounts
    filteredEntries.forEach(entry => {
      console.log(`${entry.category} - ${entry.subcategory}: UGX ${entry.amount} (Type: ${typeof entry.amount})`);
    });
    
    // Calculate sum manually to verify
    const sum = filteredEntries.reduce((total, entry) => {
      const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
    console.log("Manual sum:", sum);
  };

  // Process the entries to match the expected output format
  const processedData = useMemo(() => {
    const categoryMap: Record<string, Array<ProcessedExpenseEntry>> = {};
    
    // Group entries by category
    filteredEntries.forEach(entry => {
      if (!categoryMap[entry.category]) {
        categoryMap[entry.category] = [];
      }
      categoryMap[entry.category].push(entry);
    });
    
    // Format the data for rendering
    return Object.entries(categoryMap).map(([category, entries], index) => {
      // Sort entries alphabetically by subcategory
      const sortedEntries = [...entries].sort((a, b) => {
        return a.subcategory.localeCompare(b.subcategory);
      });
      
      // Track letter index separately for each category
      let letterIndex = 0;
      
      return {
        category,
        categoryId: entries[0].categoryId, // All entries in this group have the same categoryId
        categoryIndex: index + 1,
        entries: sortedEntries.map(entry => {
          // All subcategories get lettering (a, b, c...)
          const currentLetterIndex = letterIndex++;
          return {
            ...entry,
            displayLabel: `${String.fromCharCode(97 + currentLetterIndex)}) ${entry.subcategory}`
          };
        })
      };
    });
  }, [filteredEntries]);

  const handleEdit = (category: string) => {
    // Get all entries for this category to edit
    const categoryEntries = expenseEntries.filter(entry => entry.category === category);
    
    setCurrentCategory(category);
    setEditableEntries([...categoryEntries]); // Create a copy to edit
    setIsModalOpen(true);
  };

  const handleDelete = async (category: string) => {
    try {
      setIsLoading(true);
      
      // Get the entries for this category
      const categoryEntries = expenseEntries.filter(entry => entry.category === category);
      
      if (categoryEntries.length === 0) {
        setErrorMessage('No expenses found for this category');
        setShowModal(true);
        return;
      }
      
      console.log(`Deleting ${categoryEntries.length} expenses for category: ${category}`);
      
      // Delete each expense entry using the API
      const deletePromises = categoryEntries.map(async (entry) => {
        try {
          console.log(`Deleting expense: ${entry.id}`);
          
          const response = await fetch(`${baseUrl}/api/v1/finance/delete-expense/${entry.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          
          if (response.status === 401) {
            throw new Error('Authentication failed');
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
          }
          
          // Parse the JSON response
          const data = await response.json();
          console.log(`Delete response for ${entry.id}:`, data);
          
          // Check for success in the response
          if (data.error === true || (data.status && data.status.returnCode !== "00")) {
            throw new Error(data.message || data.status?.returnMessage || 'Failed to delete expense');
          }
          
          return true; // Indicate success
        } catch (err) {
          console.error(`Error deleting expense ${entry.id}:`, err);
          throw err; // Rethrow to be caught by Promise.allSettled
        }
      });
      
      // Use Promise.allSettled to handle individual failures
      const results = await Promise.allSettled(deletePromises);
      
      // Count successful and failed deletions
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Delete results: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        // If some deletions failed, show a partial success message
        if (successful > 0) {
          setErrorMessage(`Partially deleted: ${successful} expenses deleted, ${failed} failed.`);
        } else {
          setErrorMessage('Failed to delete expenses. Please try again.');
        }
        setShowModal(true);
      }
      
      // Update the local state even if some deletions failed (remove the ones that succeeded)
      if (successful > 0) {
        const updatedEntries = expenseEntries.filter(entry => !categoryEntries.some(e => e.id === entry.id));
        setExpenseEntries(updatedEntries);
        setFilteredEntries(updatedEntries);
      }
      
    } catch (error: any) {
      console.error('Error deleting category expenses:', error);
      setErrorMessage(error.message || 'Failed to delete expenses');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentCategory('');
    setEditableEntries([]);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Update each edited expense with the API
      const updatePromises = editableEntries.map(async (entry) => {
        const response = await fetch(`${baseUrl}/api/v1/finance/update-expense/${entry.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            categoryId: entry.categoryId,
            subcategoryId: entry.subcategoryId,
            amount: entry.amount,
            date: entry.date
          })
        });
        
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.status || data.status.returnCode !== "00") {
          throw new Error(data.status?.returnMessage || 'Error updating expense');
        }
        
        return data;
      });
      
      await Promise.all(updatePromises);
      
      // Update the original entries with the edited values
      const updatedEntries = expenseEntries.map(entry => {
        // Find if this entry was edited
        const editedEntry = editableEntries.find(e => e.id === entry.id);
        if (editedEntry) {
          // Return the edited version
          return editedEntry;
        }
        // Return the original entry if it wasn't edited
        return entry;
      });
      
      setExpenseEntries(updatedEntries);
      setFilteredEntries(updatedEntries);
      handleModalClose();
      
    } catch (error: any) {
      console.error('Error updating expenses:', error);
      setErrorMessage(error.message || 'Failed to update expenses');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (id: string, newAmount: number) => {
    // Update the amount for a specific entry in the editable entries
    setEditableEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.id === id ? { ...entry, amount: newAmount } : entry
      )
    );
  };

  const handleDateChange = (id: string, newDate: string) => {
    // Update the date for a specific entry in the editable entries
    setEditableEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.id === id ? { ...entry, date: newDate } : entry
      )
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center p-6">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">

          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              View Expense Entries
            </CardTitle>
          </CardHeader>

          {/* Filter Section */}
          <div className="mb-4">
            <label htmlFor="filterPeriod" className="block text-lg font-medium mb-2">
              Filter By:
            </label>
            <select
              id="filterPeriod"
              className="border p-2 rounded-md w-full"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="dateRange">Date Range</option>
            </select>
          </div>

          {/* Daily Date Picker */}
          {filterPeriod === 'day' && (
            <div className="mb-4">
              <label htmlFor="selectedDate" className="block text-sm font-medium mb-2">
                Select Date:
              </label>
              <input
                type="date"
                id="selectedDate"
                className="border p-2 rounded-md w-full"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* Weekly Picker */}
          {filterPeriod === 'week' && (
            <div className="mb-4">
              <label htmlFor="selectedWeek" className="block text-sm font-medium mb-2">
                Select Week:
              </label>
              <select
                id="selectedWeek"
                className="border p-2 rounded-md w-full"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              >
                <option value="">Select a week</option>
                {weeks.map((week) => (
                  <option key={week.value} value={week.value}>
                    {week.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Monthly Picker */}
          {filterPeriod === 'month' && (
            <div className="mb-4">
              <label htmlFor="selectedMonth" className="block text-sm font-medium mb-2">
                Select Month:
              </label>
              <select
                id="selectedMonth"
                className="border p-2 rounded-md w-full"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">Select a month</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Picker */}
          {filterPeriod === 'dateRange' && (
            <div className="mb-4">
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Select Date Range:
              </label>
              <input
                type="date"
                id="startDate"
                className="border p-2 rounded-md w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                id="endDate"
                className="border p-2 rounded-md w-full mt-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          {/* Opening Balances */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Expense Summary:</h3>
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Total Expenses:</span>
              <span className="text-red-500">
                UGX {formatNumber(totalBalance)}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <p>Loading expenses...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          )}

          {/* Expense Table - Desktop Only */}
          {!isLoading && !error && (
            <div className="overflow-x-auto hidden lg:block">
              <table className="min-w-full border-2 border-gray-400">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-2 border-gray-400 px-4 py-2 text-left">#</th>
                    <th className="border-2 border-gray-400 px-4 py-2 text-left">Expense Category</th>
                    <th className="border-2 border-gray-400 px-4 py-2 text-left">Subcategory</th>
                    <th className="border-2 border-gray-400 px-4 py-2 text-right">Amount</th>
                    <th className="border-2 border-gray-400 px-4 py-2 text-center">Date</th>
                    <th className="border-2 border-gray-400 px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {processedData.length > 0 ? (
                    processedData.map(categoryData => (
                      <React.Fragment key={categoryData.category}>
                        {categoryData.entries.map((entry, entryIndex) => (
                          <tr 
                            key={entry.id} 
                            className={entryIndex === 0 && categoryData.entries.length > 1 ? "border-t-2 border-gray-400" : ""}
                          >
                            {entryIndex === 0 && (
                              <>
                                <td 
                                  className="border-2 border-gray-400 px-4 py-2"
                                  rowSpan={categoryData.entries.length}
                                >
                                  {categoryData.categoryIndex}
                                </td>
                                <td
                                  className="border-2 border-gray-400 px-4 py-2"
                                  rowSpan={categoryData.entries.length}
                                >
                                  {categoryData.category}
                                </td>
                              </>
                            )}
                            <td className="border-2 border-gray-400 px-4 py-2">
                              {entry.displayLabel}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-2 text-right">
                              UGX {formatNumber(entry.amount)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-2 text-center">
                              {entry.date}
                            </td>
                            {entryIndex === 0 && (
                              <td 
                                className="border-2 border-gray-400 px-4 py-2 text-center" 
                                rowSpan={categoryData.entries.length}
                              >
                                <button 
                                  onClick={() => handleEdit(categoryData.category)} 
                                  className="text-blue-500 hover:underline"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDelete(categoryData.category)} 
                                  className="text-red-500 hover:underline ml-2"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="border-2 border-gray-400 px-4 py-8 text-center text-gray-500">
                        No expense entries found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
          {!isLoading && !error && (
            <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
              {processedData.flatMap((categoryData, catIdx) => (
                categoryData.entries.map((entry, entryIndex) => (
                  <div key={entry.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold text-gray-800">{categoryData.category}</span>
                        <span className="text-xs text-gray-500">{catIdx + 1}</span>
                      </div>
                      <div className="mb-1"><span className="font-medium text-gray-700">Subcategory: </span><span className="text-gray-600 text-sm">{entry.subcategory}</span></div>
                      <div className="mb-1"><span className="font-medium text-gray-700">Amount: </span><span className="text-gray-600 text-sm">UGX {formatNumber(entry.amount)}</span></div>
                      <div className="mb-2"><span className="font-medium text-gray-700">Date: </span><span className="text-gray-600 text-sm">{entry.date}</span></div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(categoryData.category)}
                        className="text-blue-500 hover:underline w-full"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(categoryData.category)}
                        className="text-red-500 hover:underline w-full"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ))}
            </div>
          )}

          {/* Responsive Cards - Mobile (md:hidden) */}
          {!isLoading && !error && (
            <div className="md:hidden mb-6 flex flex-col gap-4">
              {processedData.flatMap((categoryData, catIdx) => (
                categoryData.entries.map((entry, entryIndex) => (
                  <div key={entry.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-semibold text-gray-800">{categoryData.category}</span>
                        <span className="text-xs text-gray-500">{catIdx + 1}</span>
                      </div>
                      <div className="mb-1"><span className="font-medium text-gray-700">Subcategory: </span><span className="text-gray-600 text-sm">{entry.subcategory}</span></div>
                      <div className="mb-1"><span className="font-medium text-gray-700">Amount: </span><span className="text-gray-600 text-sm">UGX {formatNumber(entry.amount)}</span></div>
                      <div className="mb-2"><span className="font-medium text-gray-700">Date: </span><span className="text-gray-600 text-sm">{entry.date}</span></div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(categoryData.category)}
                        className="text-blue-500 hover:underline w-full"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(categoryData.category)}
                        className="text-red-500 hover:underline w-full"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ))}
            </div>
          )}

          <div className="flex justify-between mt-4">
            <h3 className="text-lg font-medium">Total Expenses:</h3>
            <span className="text-red-500 font-bold">
              UGX {formatNumber(totalBalance)}
            </span>
          </div>

          {/* Debug button for testing */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={debugAmounts}
              className="mt-2 p-1 text-xs bg-gray-200 rounded"
            >
              Debug Amounts
            </button>
          )}
        </CardContent>
      </Card>

      {/* Modal for Editing Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Edit {currentCategory} Entries</h2>
            <div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Category:</label>
                <input
                  type="text"
                  value={currentCategory}
                  readOnly
                  className="border p-2 rounded w-full bg-gray-100"
                />
              </div>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Subcategories:</h3>
                <table className="min-w-full border-2 border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border-2 border-gray-300 px-4 py-2 text-left">Subcategory</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-right">Amount</th>
                      <th className="border-2 border-gray-300 px-4 py-2 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableEntries.map(entry => (
                      <tr key={entry.id}>
                        <td className="border-2 border-gray-300 px-4 py-2">{entry.subcategory}</td>
                        <td className="border-2 border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => handleAmountChange(entry.id, Number(e.target.value))}
                            className="border p-2 rounded w-full text-right"
                          />
                        </td>
                        <td className="border-2 border-gray-300 px-4 py-2">
                          <input
                            type="date"
                            value={entry.date}
                            onChange={(e) => handleDateChange(entry.id, e.target.value)}
                            className="border p-2 rounded w-full"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleSave} 
                  className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={handleModalClose} className="bg-gray-300 text-black px-4 py-2 rounded">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 md:w-1/3">
            <span 
              className="text-gray-500 float-right cursor-pointer" 
              onClick={() => setShowModal(false)}
            >
              &times;
            </span>
            <p className="text-center text-lg text-gray-800">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseViewer;