"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/env';

const IncomeTracker = () => {
  const [frequency, setFrequency] = useState('');
  const [incomes, setIncomes] = useState<{ [key: string]: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [incomeCategories, setIncomeCategories] = useState<Array<{ id: string, name: string }>>([]);
  const [incomeDate, setIncomeDate] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchIncomeCategories = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/get-income-categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const result = await response.json();
      if (result.status?.returnCode === "00") {
        setIncomeCategories(result.data.incomeCategories);
      } else {
        // Handle standard REST API response format too
        if (Array.isArray(result.incomeCategories)) {
          setIncomeCategories(result.incomeCategories);
        } else {
          setErrorMessage(result.status?.returnMessage || result.returnMessage || 'Failed to fetch income categories');
        }
      }
    } catch (error) {
      console.error('Error fetching income categories:', error);
      setErrorMessage('Network error while fetching income categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeCategories();
  }, []);

  const handleIncomeChange = (categoryId: string, value: string) => {
    setIncomes(prev => ({
      ...prev,
      [categoryId]: value
    }));
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFrequency(e.target.value);
    setIncomes({});
    setShowSuccess(false);
    setErrorMessage('');
    setAdditionalInfo('');
    setIncomeDate('');
  };

  const validateData = () => {
    // Check if date is selected - required for all frequencies
    if (!incomeDate) {
      setErrorMessage('Please select a date');
      return false;
    }

    // For Weekly/Monthly frequency, additionalInfo is also required
    if ((frequency === 'Weekly' || frequency === 'Monthly') && !additionalInfo) {
      setErrorMessage(`Please select a ${frequency === 'Weekly' ? 'week' : 'month'}`);
      return false;
    }

    // Check if at least one income has valid amount
    const hasValidIncome = Object.values(incomes).some(amount => parseFloat(amount || '0') > 0);
    if (!hasValidIncome) {
      setErrorMessage('Please enter at least one income amount greater than zero');
      return false;
    }

    // Validate the date format
    try {
      new Date(incomeDate).toISOString();
    } catch (e) {
      setErrorMessage('Invalid date format');
      return false;
    }

    return true;
  };

  const saveAllIncomes = async () => {
    setErrorMessage('');
    
    // Validate form data
    if (!validateData()) {
      return;
    }

    setIsSaving(true);

    try {
      // Get valid income entries (amount > 0)
      const validIncomeEntries = Object.entries(incomes)
        .filter(([_, amount]) => parseFloat(amount || '0') > 0);

      if (validIncomeEntries.length === 0) {
        setErrorMessage('Please enter at least one income amount greater than zero');
        setIsSaving(false);
        return;
      }

      // Track successful entries
      let successCount = 0;
      let hasError = false;

      // Process each income entry separately
      for (const [categoryId, amount] of validIncomeEntries) {
        const incomeData = {
          categoryId,
          amount: parseFloat(amount),
          date: incomeDate,
          frequency: frequency.toLowerCase(),
          additionalInfo: additionalInfo || ""
        };

        console.log('Sending income data:', JSON.stringify(incomeData, null, 2));

        // Send income data to the API
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/create-income`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify(incomeData),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log('Saved Income:', result);
          successCount++;
        } else {
          hasError = true;
          console.error('API Error:', result);
          setErrorMessage(result.returnMessage || result.message || result.status?.returnMessage || 'Failed to save income');
          break;
        }
      }

      if (successCount > 0 && !hasError) {
        setShowSuccess(true);
        setIncomes({});
        setFrequency('');
        setAdditionalInfo('');
        setIncomeDate('');
        
        if (successCount > 1) {
          setSuccessMessage(`Successfully added ${successCount} income entries.`);
        } else {
          setSuccessMessage('Income saved successfully!');
        }
      }
    } catch (error) {
      console.error('Error saving incomes:', error);
      setErrorMessage('Network error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const renderAdditionalFields = () => {
    // Date input is required for all frequency types
    const dateInput = (
      <div className="mb-4">
        <label htmlFor="incomeDate" className="block text-sm font-medium mb-2">
          Select Date: <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="incomeDate"
          className="border p-2 rounded-md w-full"
          required
          value={incomeDate}
          onChange={(e) => setIncomeDate(e.target.value)}
        />
      </div>
    );

    // Additional fields based on frequency
    let additionalField = null;
    
    switch (frequency) {
      case 'Weekly':
        additionalField = (
          <div className="mb-4">
            <label htmlFor="incomeWeek" className="block text-sm font-medium mb-2">
              Select Week: <span className="text-red-500">*</span>
            </label>
            <select
              id="incomeWeek"
              className="border p-2 rounded-md w-full"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              required
            >
              <option value="">Select a Week</option>
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthName = new Date(0, monthIndex).toLocaleString('default', { month: 'long' });
                return [...Array(4)].map((_, weekIndex) => (
                  <option key={`${monthIndex}-${weekIndex}`} value={`Week ${weekIndex + 1} of ${monthName}`}>
                    Week {weekIndex + 1} of {monthName}
                  </option>
                ));
              }).flat()}
            </select>
          </div>
        );
        break;
      
      case 'Monthly':
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        additionalField = (
          <div className="mb-4">
            <label htmlFor="incomeMonth" className="block text-sm font-medium mb-2">
              Select Month: <span className="text-red-500">*</span>
            </label>
            <select
              id="incomeMonth"
              className="border p-2 rounded-md w-full"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              required
            >
              <option value="">Select a Month</option>
              {months.map(month => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        );
        break;
    }

    return (
      <>
        {dateInput}
        {additionalField}
      </>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center p-6">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Add Incomes for Different Categories
            </CardTitle>
          </CardHeader>

          <div className="mb-4">
            <label htmlFor="incomeFrequency" className="block text-sm font-medium mb-2">
              Select Income Frequency: <span className="text-red-500">*</span>
            </label>
            <select
              id="incomeFrequency"
              className="border p-2 rounded-md w-full"
              onChange={handleFrequencyChange}
              value={frequency}
              required
            >
              <option value="">Choose a frequency</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {frequency && renderAdditionalFields()}

          {isLoading ? (
            <div className="text-center py-4">Loading income categories...</div>
          ) : errorMessage ? (
            <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50 mb-4">
              {errorMessage}
            </div>
          ) : (
            frequency && incomeCategories.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Enter Incomes</h3>
                <table className="min-w-full border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border px-4 py-2">#</th>
                      <th className="border px-4 py-2">Income Category</th>
                      <th className="border px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeCategories.map((category, index) => (
                      <tr key={category.id}>
                        <td className="border px-4 py-2">{index + 1}</td>
                        <td className="border px-4 py-2">{category.name}</td>
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            placeholder="Enter Amount"
                            className="border p-2 rounded-md w-full"
                            value={incomes[category.id] || ''}
                            onChange={(e) => handleIncomeChange(category.id, e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  type="button"
                  className={`${
                    isSaving ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                  } text-white px-4 py-2 rounded-md w-full mt-4 flex justify-center items-center`}
                  onClick={saveAllIncomes}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save All Incomes'}
                </button>
              </div>
            )
          )}

          {incomeCategories.length === 0 && !isLoading && !errorMessage && (
            <div className="text-center py-4 text-gray-500">
              No income categories found. Please add some income categories first.
            </div>
          )}

          {showSuccess && (
            <div className="text-green-500 mt-4 text-center p-4 border border-green-200 rounded-md bg-green-50">
              {successMessage || 'All Incomes saved successfully!'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeTracker;