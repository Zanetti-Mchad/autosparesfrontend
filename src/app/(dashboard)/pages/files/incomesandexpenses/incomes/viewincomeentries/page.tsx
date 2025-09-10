"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define the interfaces for API responses
interface IncomeCategory {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
}

interface Income {
  id: string;
  categoryId: string;
  amount: number;
  date: string;
  frequency: string;
  additionalInfo: string;
  academicYearId: string | null;
  termId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  category: IncomeCategory;
}

// Helper function to get current year-month in YYYY-MM format
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Main component
const IncomeViewer = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [summaryTotalAmount, setSummaryTotalAmount] = useState(0);

  // Filter states
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableEntry, setEditableEntry] = useState<Income | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

  // Generate weeks for the current year
  const weeks = useMemo(() => {
    const currentYear = Number(selectedYear) || new Date().getFullYear();
    const result = [];
    for (let month = 0; month < 12; month++) {
      const monthName = new Date(currentYear, month, 1).toLocaleString('default', { month: 'long' });
      let weekCount = 0;
      const firstDay = new Date(currentYear, month, 1);
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
        });
        firstDay.setDate(firstDay.getDate() + 7);
      }
    }
    return result;
  }, [selectedYear]);

  // Generate months for the selected year
  const months = useMemo(() => {
    const currentYear = Number(selectedYear) || new Date().getFullYear();
    return Array.from({ length: 12 }, (_, month) => {
      const date = new Date(currentYear, month, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      return {
        label: `${monthName} ${currentYear}`,
        value: `${currentYear}-${(month + 1).toString().padStart(2, '0')}`
      };
    });
  }, [selectedYear]);

  // Generate years for the dropdown
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - 4 + i;
      return { label: year.toString(), value: year.toString() };
    }).reverse();
  }, []);
  
  const formatNumber = (number: number): string => new Intl.NumberFormat('en-US').format(number);

  const getDateParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = { period: filterPeriod };
    switch (filterPeriod) {
      case 'day': if (selectedDate) params.date = selectedDate; break;
      case 'week': if (selectedWeek) {
          const [year, month, weekNum] = selectedWeek.split('-');
          params.week = weekNum;
          params.month = month;
          params.year = year;
        }
        break;
      case 'month': if (selectedMonth) { const [year, month] = selectedMonth.split('-'); params.month = month; params.year = year; } break;
      case 'year': if (selectedYear) params.year = selectedYear; break;
      case 'custom': if (startDate && endDate) { params.startDate = startDate; params.endDate = endDate; } break;
    }
    return params;
  }, [filterPeriod, selectedDate, selectedWeek, selectedMonth, selectedYear, startDate, endDate]);

  const fetchIncomes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setIncomes([]);
    setSummaryTotalAmount(0);

    try {
      const params = getDateParams();
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/get-incomes?${queryString}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (!response.ok) throw new Error(`Error fetching incomes: ${response.status}`);
      
      const data = await response.json();
      if (data.status?.returnCode === "00" || data.success) {
        const incomeData = data.data?.incomes || data.incomes || [];
        const totalSum = data.data?.total || data.total || 0;
        setIncomes(incomeData);
        setSummaryTotalAmount(totalSum);
      } else {
        setError(data.status?.returnMessage || data.message || 'Failed to fetch incomes');
      }
    } catch (error: any) {
      console.error('Error fetching incomes:', error);
      setError(error.message || 'Network error while fetching incomes');
    } finally {
      setIsLoading(false);
    }
  }, [getDateParams]);
  
  const handleApplyFilters = () => {
    fetchIncomes();
  };
  
  // Fetch initial data on component mount only.
  // We disable the linting rule because we intentionally want this to run only once.
  useEffect(() => {
    fetchIncomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateIncome = async () => {
    if (!editableEntry) return;
    setIsUpdating(true);
    setError('');
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/update-income/${editableEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          amount: editableEntry.amount,
          date: editableEntry.date.split('T')[0],
          categoryId: editableEntry.categoryId,
          frequency: editableEntry.frequency,
          additionalInfo: editableEntry.additionalInfo
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.status?.returnMessage || data.message || 'Failed to update income');
      setSuccessMessage('Income updated successfully');
      handleApplyFilters();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error updating income:', error);
      setError(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    setIsUpdating(true);
    setError('');
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/delete-income/${incomeToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.status?.returnMessage || data.message || 'Failed to delete income');
      setSuccessMessage('Income deleted successfully');
      handleApplyFilters();
    } catch (error: any) {
      console.error('Error deleting income:', error);
      setError(error.message);
    } finally {
      setIsUpdating(false);
      setIsDialogOpen(false);
      setIncomeToDelete(null);
    }
  };
  
  const confirmDeleteIncome = (id: string) => { setIncomeToDelete(id); setIsDialogOpen(true); };
  const handleEdit = (income: Income) => { setEditableEntry({ ...income }); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditableEntry(null); setError(''); };
  const handleAmountChange = (value: string) => { if (editableEntry) setEditableEntry({ ...editableEntry, amount: parseFloat(value) || 0 }); };
  const handleDateChange = (value: string) => { if (editableEntry) setEditableEntry({ ...editableEntry, date: value }); };

  const incomesByCategory = useMemo(() => {
    const categoryMap: Record<string, { id: string, name: string, totalAmount: number, entries: Income[] }> = {};
    incomes.forEach(income => {
      const { category } = income;
      if (!categoryMap[category.id]) {
        categoryMap[category.id] = { id: category.id, name: category.name, totalAmount: 0, entries: [] };
      }
      categoryMap[category.id].entries.push(income);
      const amountAsNumber = parseFloat(String(income.amount));
      categoryMap[category.id].totalAmount += isNaN(amountAsNumber) ? 0 : amountAsNumber;
    });
    return Object.values(categoryMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [incomes]);

  const calculatedTotalAmount = useMemo(() => {
    return incomes.reduce((sum, income) => {
      const amountAsNumber = parseFloat(String(income.amount));
      return sum + (isNaN(amountAsNumber) ? 0 : amountAsNumber);
    }, 0);
  }, [incomes]);
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center p-6">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-semibold text-center">View Income Entries</CardTitle>
          </CardHeader>
          
          {successMessage && <div className="bg-green-100 text-green-800 p-3 mb-4 rounded border border-green-200">{successMessage}</div>}
          {error && <div className="bg-red-100 text-red-800 p-3 mb-4 rounded border border-red-200">{error}</div>}

          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label htmlFor="filterPeriod" className="block text-lg font-medium mb-2">Filter By:</label>
            <select id="filterPeriod" className="border p-2 rounded-md w-full mb-4" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
              <option value="all">All Time</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="custom">Custom Date Range</option>
            </select>
            {filterPeriod === 'day' && (<input type="date" className="border p-2 rounded-md w-full" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={today} />)}
            {filterPeriod === 'week' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><select className="border p-2 rounded-md w-full" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{years.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}</select><select className="border p-2 rounded-md w-full" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}><option value="">Select a week</option>{weeks.map((week) => <option key={week.value} value={week.value}>{week.label}</option>)}</select></div>)}
            {filterPeriod === 'month' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><select className="border p-2 rounded-md w-full" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{years.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}</select><select className="border p-2 rounded-md w-full" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}><option value="">Select a month</option>{months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select></div>)}
            {filterPeriod === 'year' && (<select className="border p-2 rounded-md w-full" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{years.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}</select>)}
            {filterPeriod === 'custom' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="date" className="border p-2 rounded-md w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={today} /><input type="date" className="border p-2 rounded-md w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={today} min={startDate} /></div>)}
            
            <button onClick={handleApplyFilters} disabled={isLoading} className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center">
              {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading...</>) : 'Apply Filters'}
            </button>
          </div>

          {isLoading && (<div className="text-center py-8"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div><p className="mt-2 text-gray-600">Loading income data...</p></div>)}

          {!isLoading && (<>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100"><h3 className="text-lg font-medium mb-2">Income Summary:</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-white p-3 rounded shadow-sm border"><span className="font-semibold text-gray-600 block">Total Income:</span><span className="text-green-600 text-xl font-bold">UGX {formatNumber(calculatedTotalAmount)}</span></div><div className="bg-white p-3 rounded shadow-sm border"><span className="font-semibold text-gray-600 block">Number of Entries:</span><span className="text-blue-600 text-xl font-bold">{incomes.length}</span></div></div></div>
            {incomes.length > 0 ? (<div className="overflow-x-auto"><table className="min-w-full border-2 border-gray-300"><thead className="bg-gray-100"><tr><th className="border px-4 py-2 text-left">#</th><th className="border px-4 py-2 text-left">Category</th><th className="border px-4 py-2 text-right">Amount</th><th className="border px-4 py-2 text-center">Date</th><th className="border px-4 py-2 text-center">Frequency</th><th className="border px-4 py-2 text-center">Actions</th></tr></thead><tbody>{incomesByCategory.map((categoryData, categoryIndex) => (<React.Fragment key={categoryData.id}>{categoryData.entries.map((income, entryIndex) => (<tr key={income.id} className={entryIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}><td className="border px-4 py-2">{categoryIndex + 1}.{entryIndex + 1}</td><td className="border px-4 py-2">{income.category.name}</td><td className="border px-4 py-2 text-right font-medium">UGX {formatNumber(income.amount)}</td><td className="border px-4 py-2 text-center">{new Date(income.date).toLocaleDateString()}</td><td className="border px-4 py-2 text-center capitalize">{income.frequency}</td><td className="border px-4 py-2 text-center"><button onClick={() => handleEdit(income)} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button><button onClick={() => confirmDeleteIncome(income.id)} className="text-red-600 hover:text-red-800">Delete</button></td></tr>))}{categoryData.entries.length > 1 && (<tr className="bg-gray-100 font-medium"><td colSpan={2} className="border px-4 py-2 text-right">Subtotal for {categoryData.name}:</td><td className="border px-4 py-2 text-right">UGX {formatNumber(categoryData.totalAmount)}</td><td colSpan={3} className="border px-4 py-2"></td></tr>)}</React.Fragment>))}</tbody><tfoot className="bg-gray-200 font-bold"><tr><td colSpan={2} className="border px-4 py-3 text-right">Total:</td><td className="border px-4 py-3 text-right">UGX {formatNumber(calculatedTotalAmount)}</td><td colSpan={3} className="border px-4 py-3"></td></tr></tfoot></table></div>) : (<div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center"><p className="text-gray-500 mb-2">No income entries found for the selected period.</p><p className="text-gray-400 text-sm">Try changing your filter options or add new income entries.</p></div>)}
          </>)}
        </CardContent>
      </Card>

      {isModalOpen && editableEntry && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl w-full max-w-md"><div className="border-b px-6 py-4 bg-gray-50"><h3 className="text-xl font-semibold">Edit Income</h3></div><div className="p-6">{error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded text-sm">{error}</div>}<div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><input type="text" className="w-full p-2 border rounded-md bg-gray-100" value={editableEntry.category.name} disabled /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (UGX)</label><input type="number" className="w-full p-2 border rounded-md" value={editableEntry.amount} onChange={(e) => handleAmountChange(e.target.value)} min="0" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" className="w-full p-2 border rounded-md" value={editableEntry.date.split('T')[0]} onChange={(e) => handleDateChange(e.target.value)} max={today} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label><select className="w-full p-2 border rounded-md" value={editableEntry.frequency} onChange={(e) => setEditableEntry({ ...editableEntry, frequency: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Additional Info</label><textarea className="w-full p-2 border rounded-md" value={editableEntry.additionalInfo || ''} onChange={(e) => setEditableEntry({ ...editableEntry, additionalInfo: e.target.value })} rows={3} /></div></div></div><div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3"><button onClick={handleCloseModal} className="px-4 py-2 bg-white border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button><button onClick={handleUpdateIncome} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center" disabled={isUpdating}>{isUpdating ? (<><svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>) : 'Save Changes'}</button></div></div></div>)}
      
      <DialogBox
        isOpen={isDialogOpen}
        title="Confirm Deletion"
        message="Are you sure you want to delete this income entry?"
        onConfirm={handleDeleteIncome}
        onCancel={() => setIsDialogOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
      />
    </div>
  );
};

export default IncomeViewer;