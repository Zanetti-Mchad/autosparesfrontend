"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { env } from '@/env';

// We will use the baseUrl from the environment variables
const baseUrl = env.BACKEND_API_URL;

// Define proper TypeScript interfaces
interface Subcategory {
  id: string;
  name: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

interface ExpenseSubcategoryEntry {
  name: string;
  id: string;
  amount: string;
}

interface ExpenseEntry {
  subcategories: ExpenseSubcategoryEntry[];
}

interface Expenses {
  [key: string]: ExpenseEntry;
}

interface RecentExpense {
  id: string;
  amount: number;
  date: string;
  category: {
    name: string;
  };
  subcategory?: {
    name: string;
  };
}

// Type for headers to fix TypeScript errors
interface Headers {
  Authorization: string;
  'Content-Type': string;
}

const ExpenseTracker = () => {
  const router = useRouter();
  const [frequency, setFrequency] = useState<string>('');
  const [expenses, setExpenses] = useState<Expenses>({});
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // Debug effect to log expenses state changes
  useEffect(() => {
    if (debugMode) {
      console.log("Current expenses state:", JSON.stringify(expenses, null, 2));
    }
  }, [expenses, debugMode]);

  // Utility function to get auth headers - fixed to return proper Headers type
  const getAuthHeaders = (): Record<string, string> => {
    const accessToken = localStorage.getItem('accessToken') || '';
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch expense categories function wrapped in useCallback
  const fetchExpenseCategories = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (debugMode) {
        console.log(`Fetching expense categories from: ${baseUrl}/api/v1/finance/get-expense-categories`);
      }
      
      const response = await fetch(`${baseUrl}/api/v1/finance/get-expense-categories`, {
        headers: getAuthHeaders()
      });
      
      // Handle unauthorized response (401)
      if (response.status === 401) {
        setErrorMessage('Session expired. Please log in again.');
        setShowModal(true);
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        }, 2000);
        return;
      }
      
      // Handle other HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (debugMode) {
        console.log('Expense categories response:', JSON.stringify(responseData, null, 2));
      }
      
      // Handle the correct API response structure
      if (responseData.status?.returnCode === "00" && responseData.data?.expenseCategories) {
        // Transform the data to match our component's expected format
        const categories: ExpenseCategory[] = responseData.data.expenseCategories.map((category: any) => {
          return {
            name: category.name,
            id: category.id,
            subcategories: category.subcategories.map((sub: any) => ({
              id: sub.id,
              name: sub.name
            }))
          };
        });
        
        if (debugMode) {
          console.log('Transformed expense categories:', JSON.stringify(categories, null, 2));
        }
        
        setExpenseCategories(categories);
        initializeExpenses(categories);
      } else {
        console.error('Failed to fetch expense categories:', responseData);
        if (responseData.status?.returnCode === "401") {
          setErrorMessage('Authentication failed. Please log in again.');
          setShowModal(true);
        } else {
          setErrorMessage(responseData.message || 'Failed to load expense categories');
          setShowModal(true);
        }
      }
    } catch (error: any) {
      console.error('Error fetching expense categories:', error);
      setErrorMessage(error.message || 'Failed to load expense categories');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  }, [router, debugMode]);

  // Check authentication on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        // Redirect to login if not authenticated
        router.push('/sign-in');
      } else {
        // Fetch data if authenticated
        fetchExpenseCategories();
      }
    }
  }, [fetchExpenseCategories, router]); // Added fetchExpenseCategories to fix exhaustive-deps warning

  // Initialize expenses object based on fetched categories
  const initializeExpenses = (categories: ExpenseCategory[]): void => {
    const initialExpenses: Expenses = {};
    
    categories.forEach((category) => {
      initialExpenses[category.id] = {
        subcategories: category.subcategories.map(sub => ({
          name: sub.name,
          id: sub.id,
          amount: ''
        }))
      };
    });
    
    setExpenses(initialExpenses);
  };

  const fetchRecentExpenses = async (): Promise<void> => {
    try {
      const response = await fetch(`${baseUrl}/api/v1/finance/get-expenses?period=day`, {
        headers: getAuthHeaders()
      });
      
      // Handle unauthorized response
      if (response.status === 401) {
        setErrorMessage('Session expired. Please log in again.');
        setShowModal(true);
        // Redirect to login after a short delay
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          router.push('/sign-in');
        }, 2000);
        return;
      }
      
      const responseData = await response.json();
      
      // Handle the correct API response structure
      if (responseData.status?.returnCode === "00" && responseData.data?.expenses) {
        setRecentExpenses(responseData.data.expenses);
      } else {
        console.error('Error fetching recent expenses:', responseData);
        if (responseData.status?.returnCode === "401") {
          setErrorMessage('Authentication failed. Please log in again.');
          setShowModal(true);
          // Redirect to login after a short delay
          setTimeout(() => {
            localStorage.removeItem('accessToken');
            router.push('/sign-in');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error fetching recent expenses:', error);
    }
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setFrequency(e.target.value);
    // Don't reset expenses here as it clears the inputs
    // setExpenses({});
    setShowSuccess(false);
    setAdditionalInfo('');
  };

  // Modified handleSubcategoryChange function with direct update approach
  const handleSubcategoryChange = (categoryId: string, subcategoryId: string, value: string): void => {
    console.log(`Updating: Category ID: ${categoryId}, Subcategory ID: ${subcategoryId}, Value: ${value}`);
    
    // Create a deep copy of the expenses object
    const updatedExpenses = JSON.parse(JSON.stringify(expenses));
    
    // Make sure the category exists
    if (updatedExpenses[categoryId]) {
      // Find the subcategory
      const subcategories = updatedExpenses[categoryId].subcategories;
      for (let i = 0; i < subcategories.length; i++) {
        if (subcategories[i].id === subcategoryId) {
          subcategories[i].amount = value;
          break;
        }
      }
      
      // Update the state with the new expenses object
      setExpenses(updatedExpenses);
    }
  };

  const saveAllExpenses = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Format expense data for the API
      const expenseData: any[] = [];
      
      // Validate date input first
      if (!additionalInfo && frequency) {
        setErrorMessage(`Please select a ${frequency.toLowerCase()} for your expenses`);
        setShowModal(true);
        setIsLoading(false);
        return;
      }
      
      Object.entries(expenses).forEach(([categoryId, { subcategories }]) => {
        subcategories.forEach(sub => {
          const amount = parseFloat(sub.amount);
          if (!sub.amount || amount <= 0) return;
          
          // Make sure we have the correct data format for the API
          expenseData.push({
            categoryId,
            subcategoryId: sub.id,
            amount: amount,
            date: additionalInfo,  // Pass the date directly - it's validated on backend
            frequency: frequency.toLowerCase()
          });
        });
      });
      
      if (expenseData.length === 0) {
        console.error('No expenses to save');
        setErrorMessage('Please enter at least one expense amount');
        setShowModal(true);
        setIsLoading(false);
        return;
      }
      
      // Debug log the data being sent
      if (debugMode) {
        console.log('Expense data being sent:', JSON.stringify(expenseData, null, 2));
      }
      
      // Save each expense with an API call - with more detailed error handling
      const savePromises = expenseData.map(async (expense, index) => {
        try {
          if (debugMode) {
            console.log(`Sending expense ${index + 1}:`, JSON.stringify(expense));
          }
          
          const response = await fetch(`${baseUrl}/api/v1/finance/create-expense`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(expense)
          });
          
          // Handle HTTP errors
          if (response.status === 401) {
            throw new Error('Authentication failed');
          }
          
          // Check for other HTTP errors
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
          }
          
          const data = await response.json();
          
          // Debug log the response
          if (debugMode) {
            console.log(`Response for expense ${index + 1}:`, JSON.stringify(data));
          }
          
          // Handle API errors
          if (!data.success) {
            const errorMessage = data.message || data.status?.returnMessage || 'Error saving expense';
            console.error(`API error for expense ${index + 1}:`, errorMessage);
            throw new Error(errorMessage);
          }
          
          return data;
        } catch (error: any) {
          console.error(`Error saving expense ${index + 1}:`, error);
          throw error; // Re-throw to be caught by Promise.all
        }
      });
      
      try {
        await Promise.all(savePromises);
        
        // Show success message and reset form
        setShowSuccess(true);
        
        // Reinitialize expenses instead of setting to empty object
        initializeExpenses(expenseCategories);
        
        // Fetch recent expenses to update the list
        fetchRecentExpenses();
      } catch (error: any) {
        console.error('Error in savePromises:', error);
        
        // Handle authentication errors
        if (error.message === 'Authentication failed') {
          setErrorMessage('Session expired. Please log in again.');
          setShowModal(true);
          setTimeout(() => {
            localStorage.removeItem('accessToken');
            router.push('/sign-in');
          }, 2000);
        } else {
          setErrorMessage(error.message || 'Failed to save expenses');
          setShowModal(true);
        }
      }
    } catch (error: any) {
      console.error('Error saving expenses:', error);
      setErrorMessage(error.message || 'An unexpected error occurred');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAdditionalFields = (): React.ReactNode => {
    switch (frequency) {
      case 'Daily':
        return (
          <div className="mb-4">
            <label htmlFor="expenseDate" className="block text-sm font-medium mb-2">
              Select Date:
            </label>
            <input
              type="date"
              id="expenseDate"
              className="border p-2 rounded-md w-full"
              required
              value={additionalInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdditionalInfo(e.target.value)}
            />
          </div>
        );
      case 'Weekly':
        // Change the weekly selection to use ISO week format YYYY-Www that the backend expects
        return (
          <div className="mb-4">
            <label htmlFor="expenseWeek" className="block text-sm font-medium mb-2">
              Select Week:
            </label>
            <input
              type="week" 
              id="expenseWeek"
              className="border p-2 rounded-md w-full"
              required
              value={additionalInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdditionalInfo(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-1">
              Select week in YYYY-Www format (e.g., 2025-W16)
            </div>
          </div>
        );
      case 'Monthly':
        // Change the monthly selection to use YYYY-MM format
        return (
          <div className="mb-4">
            <label htmlFor="expenseMonth" className="block text-sm font-medium mb-2">
              Select Month:
            </label>
            <input
              type="month"
              id="expenseMonth"
              className="border p-2 rounded-md w-full"
              required
              value={additionalInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdditionalInfo(e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Add debug buttons to help troubleshoot issues
  const renderDebugTools = (): React.ReactNode => {
    if (!debugMode) return null;
    
    return (
      <div className="mt-4 p-4 border border-gray-300 rounded bg-gray-50">
        <h3 className="text-sm font-bold mb-2">Debug Tools</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
            onClick={() => console.log("Current expenses state:", JSON.stringify(expenses, null, 2))}
          >
            Log Expenses
          </button>
          <button 
            className="bg-green-500 text-white px-2 py-1 text-xs rounded"
            onClick={() => console.log("Auth headers:", JSON.stringify(getAuthHeaders(), null, 2))}
          >
            Log Headers
          </button>
          <button 
            className="bg-purple-500 text-white px-2 py-1 text-xs rounded"
            onClick={() => console.log("Categories:", JSON.stringify(expenseCategories, null, 2))}
          >
            Log Categories
          </button>
          <button 
            className="bg-red-500 text-white px-2 py-1 text-xs rounded"
            onClick={() => setDebugMode(false)}
          >
            Disable Debug
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center p-6">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Add Expenses for Different Categories
            </CardTitle>
          </CardHeader>

          <div className="mb-4">
            <label htmlFor="expenseFrequency" className="block text-sm font-medium mb-2">
              Select Expense Frequency:
            </label>
            <select
              id="expenseFrequency"
              className="border p-2 rounded-md w-full"
              onChange={handleFrequencyChange}
              value={frequency}
            >
              <option value="">Choose a frequency</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {frequency && renderAdditionalFields()}

          {frequency && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Enter Expenses</h3>
              {isLoading ? (
                <p className="text-center py-4">Loading categories...</p>
              ) : (
                <table className="min-w-full border border-gray-800">
                  <thead>
                    <tr>
                      <th className="border border-gray-800 px-4 py-2">Expense Category</th>
                      <th className="border border-gray-800 px-4 py-2">Subcategory</th>
                      <th className="border border-gray-800 px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCategories.map((category, categoryIndex) => (
                      <React.Fragment key={category.id}>
                        {category.subcategories.map((subcategory, subIndex) => (
                          <tr key={`${category.id}-${subcategory.id}`}>
                            {subIndex === 0 && (
                              <td className="border border-gray-800 px-4 py-2" rowSpan={category.subcategories.length}>
                                {categoryIndex + 1}. {category.name}
                              </td>
                            )}
                            <td className="border border-gray-800 px-4 py-2">
                              {String.fromCharCode(97 + subIndex)}) {subcategory.name}
                            </td>
                            <td className="border border-gray-800 px-4 py-2">
                              <input
                                type="number"
                                placeholder="Enter Amount"
                                className="border border-gray-800 p-2 rounded-md w-full"
                                // Find the current value in the expenses state
                                value={
                                  expenses[category.id]?.subcategories.find(
                                    sub => sub.id === subcategory.id
                                  )?.amount || ''
                                }
                                // Use a simplified onChange handler with direct event value
                                onChange={(e) => {
                                  handleSubcategoryChange(
                                    category.id,
                                    subcategory.id,
                                    e.target.value
                                  );
                                }}
                                min="0"
                                step="0.01"
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}

              <button
                type="button"
                className="bg-green-500 text-white px-4 py-2 rounded-md w-full mt-4"
                onClick={saveAllExpenses}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save All Expenses'}
              </button>
            </div>
          )}

          {showSuccess && (
            <div className="text-green-500 mt-4 text-center">
              All expenses saved successfully!
            </div>
          )}

          {renderDebugTools()}
        </CardContent>
      </Card>

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

export default ExpenseTracker;