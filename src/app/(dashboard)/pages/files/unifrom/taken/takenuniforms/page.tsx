"use client";
import Image from 'next/image';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Assuming Card components are correctly imported from your UI library
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Filter, ChevronLeft, ChevronRight, Plus, Printer, Download, FileSpreadsheet } from 'lucide-react';
import { env } from '@/env';

// Base URL for API
const API_BASE_URL = env.BACKEND_API_URL;

// Function to handle API errors consistently
const handleApiError = async (error: any, fallbackMessage: string): Promise<string> => {
  console.error(`API Error: ${fallbackMessage}`, error);
  if (error instanceof Response) {
    return `${fallbackMessage} (Status: ${error.status})`;
  } else if (error instanceof Error) {
    return error.message || fallbackMessage;
  }
  return fallbackMessage;
};

// Interface for categories and sizes from API
interface CategorySizeMapping {
  [key: string]: string[]; // categoryName: [sizeName, sizeName, ...]
}

interface UniformSizeFromAPI { // Renamed to avoid conflict
  id: string;
  size: string; // This is the size name e.g. "M", "L"
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFromAPI { // Renamed to avoid conflict
  id: string;
  name: string; // This is the category name e.g. "Shirt"
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  uniformSizes: UniformSizeFromAPI[];
  // If API returns uniformItems directly under category, adjust here
  // uniformItems: Array<{ id: string, name: string, /* other item details */ }>;
}


interface FormData {
  personName: string;
  studentClass: string;
  takenBy: string;
  dateIssued: string;
  // items array in formData is for initial structure, not directly submitted in this shape
  items: Array<{ 
    category: string; // categoryName
    size: string;     // sizeName
    quantity: number;
    description: string;
  }>;
  receipt: File | null;
  studentId: string | null; // Added studentId
}

interface Student {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  class_assigned: string;
  lin_number: string;
  isActive: boolean;
  status: string;
  createdAt?: string;
  // Other optional fields...
}

// This interface represents the structure of items in the `allInventory` state
// and what's fetched from `/api/v1/uniforms/inventory`
interface InventoryItem {
  id: string; // This is UniformInventory.id
  uniformItemId: string;
  sizeId: string;
  codeId?: string; // Optional
  totalQuantity: number;
  availableQuantity: number;
  uniformItem: {
    id: string;
    name: string; // UniformItem name with code e.g. "SPORTS SHIRT (SS-001)"
    categoryId: string;
    category: {
      id: string;
      name: string; // UniformCategory name
    };
  };
  size: {
    id: string;
    size: string; // UniformSize name (e.g., "M", "L")
  };
  code?: { // Optional
    id: string;
    code: string; // UniformCode value
  };
  // Helper method to get display name without code
  getDisplayName?: () => string;
}

// Helper function to strip codes from item names
const getDisplayNameWithoutCode = (name: string): string => {
  // Remove anything in parentheses including the parentheses
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
};


const UniformCheckoutForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    personName: '',
    studentClass: '',
    takenBy: '',
    dateIssued: new Date().toISOString().split('T')[0],
    items: [{
      category: '',
      size: '',
      quantity: 1,
      description: ''
    }],
    receipt: null,
    studentId: null, // Initialize studentId
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  // `sizes` state: keys are size names (e.g., "M"), values are arrays (currently empty, could hold associated category names or IDs)
  const [sizes, setSizes] = useState<{ [sizeName: string]: string[] }>({});
  
  // `categories` state: array of CategoryFromAPI objects
  const [categories, setCategories] = useState<CategoryFromAPI[]>([]);
  
  // `categoryOptions`: maps categoryName to an array of sizeNames available for that category
  const [categoryOptions, setCategoryOptions] = useState<CategorySizeMapping>({});
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [itemsToBeTaken, setItemsToBeTaken] = useState<number>(0);
  
  // `itemsNotTaken`: keys are inventoryId, values are quantity
  const [itemsNotTaken, setItemsNotTaken] = useState<{ [inventoryId: string]: number }>({});
  
  // `checkedItems`: keys are inventoryId, values are quantity
  const [checkedItems, setCheckedItems] = useState<{ [inventoryId: string]: number }>({});
  
  const [validationMessage, setValidationMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // Receipt upload states
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // `inventoryLookup`: maps "categoryName-sizeName" to inventoryId
  const [inventoryLookup, setInventoryLookup] = useState<{ [key: string]: string }>({});
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);


  const handleItemChange = (sizeName: string, categoryName: string, value: string) => {
    const newValue = parseInt(value) || 0;
    const lookupKey = `${categoryName}-${sizeName}`;
    const inventoryId = inventoryLookup[lookupKey];

    if (!inventoryId) {
      setValidationMessage({ text: `No inventory ID for ${categoryName} - ${sizeName}`, type: 'error' });
      setTimeout(() => setValidationMessage(null), 4000);
      return;
    }
    
    const currentCheckedTotal = Object.values(checkedItems).reduce((sum, val) => sum + (val || 0), 0);
    const currentNotTakenTotal = Object.entries(itemsNotTaken)
      .reduce((sum, [key, val]) => key === inventoryId ? sum : sum + (val || 0), 0); // Exclude current item from sum
      
    const newGrandTotal = currentCheckedTotal + currentNotTakenTotal + newValue;
    
    if (newGrandTotal > itemsToBeTaken) {
      setValidationMessage({
        text: `Cannot allocate more items than the total to be taken (${itemsToBeTaken})`,
        type: 'error'
      });
      setTimeout(() => setValidationMessage(null), 4000);
      return;
    }
    
    setItemsNotTaken(prev => ({ ...prev, [inventoryId]: newValue }));
    setValidationMessage(null);
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch(`/api/receipts`, { // Use local Next.js API for Supabase upload
        method: 'POST',
        body: body,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to upload receipt' }));
        throw new Error(errorData.message || `Receipt upload failed with status: ${res.status}`);
      }
      const data = await res.json();
      return data.url || data.fileName || null; // Return the Supabase public URL
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      setError(err.message || 'Receipt upload failed.');
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, receipt: file }));
    if (file) {
      setReceiptPreview(URL.createObjectURL(file));
      const path = await uploadReceipt(file); // Upload immediately
      if (path) {
        setReceiptPath(path);
        setError(null); // Clear previous upload errors
      } else {
        // Error handled in uploadReceipt, state `error` will be set
        setReceiptPath(null); // Clear path if upload failed
      }
    } else {
      setReceiptPath(null);
      setReceiptPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (calculateBalance().balance !== 0) {
      setValidationMessage({ text: 'Items balance must be zero before submission', type: 'error' });
      return;
    }
    if (!receiptPath) {
      setValidationMessage({ text: 'Receipt must be uploaded before submitting.', type: 'error' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      const itemsTakenArr = Object.entries(checkedItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([inventoryId, quantity]) => ({
          inventoryId,
          quantity,
          isTaken: true,
        }));

      const itemsNotTakenArr = Object.entries(itemsNotTaken)
        .filter(([_, quantity]) => quantity > 0)
        .map(([inventoryId, quantity]) => ({
          inventoryId,
          quantity,
          isTaken: false,
        }));
      
      const allItemsForBackend = [...itemsTakenArr, ...itemsNotTakenArr].filter(item => item.quantity > 0);
      const totalItemsNotTakenCount = itemsNotTakenArr.reduce((sum, item) => sum + item.quantity, 0);

      const checkoutData = {
        personName: formData.personName,
        studentClass: formData.studentClass,
        takenBy: formData.takenBy,
        dateIssued: formData.dateIssued,
        items: allItemsForBackend,
        itemsNotTaken: totalItemsNotTakenCount,
        totalItems: itemsToBeTaken, 
        receiptPath,
        studentId: formData.studentId || null,
      };

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/uniforms/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `API Error: ${response.status}` }));
        throw new Error(errorData.message || `Failed to submit form: ${response.statusText}`);
      }

      setFormData({
        personName: '', studentClass: '', takenBy: '', studentId: null,
        dateIssued: new Date().toISOString().split('T')[0],
        items: [{ category: '', size: '', quantity: 1, description: '' }],
        receipt: null
      });
      setCheckedItems({});
      setItemsNotTaken({});
      setItemsToBeTaken(0);
      setReceiptPath(null);
      setReceiptPreview(null);
      setSearchTerm('');
      setShowSuccess(true);
      
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      // ... (student fetching logic - seems okay)
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchUniformData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        // Fetch Categories
        const catResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/uniforms/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catResponse.ok) throw new Error(`Failed to fetch categories: ${catResponse.statusText}`);
        const catData = await catResponse.json();
        const apiCategories: CategoryFromAPI[] = catData.data?.categories || [];
        
        const newCategories: CategoryFromAPI[] = [];
        const newCategoryOptions: CategorySizeMapping = {};
        const newSizes: { [sizeName: string]: string[] } = {};

        apiCategories.forEach((category) => {
          newCategories.push(category);
          newCategoryOptions[category.name] = [];
          const uniqueSizeNamesForCategory = new Set<string>();
          
          category.uniformSizes?.forEach((sizeInfo) => {
            if (sizeInfo.size) { // sizeInfo.size is the size name like "M"
              uniqueSizeNamesForCategory.add(sizeInfo.size);
              if (!newSizes[sizeInfo.size]) {
                newSizes[sizeInfo.size] = [];
              }
            }
          });
          newCategoryOptions[category.name] = Array.from(uniqueSizeNamesForCategory);
        });

        setCategories(newCategories);
        setCategoryOptions(newCategoryOptions);
        setSizes(newSizes);

        // Fetch Inventory
        const invResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/uniforms/inventory`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!invResponse.ok) throw new Error(`Failed to fetch inventory: ${invResponse.statusText}`);
        const invData = await invResponse.json();
        const inventoryItems: InventoryItem[] = invData.data?.inventory || invData.inventory || [];
        
        // Add getDisplayName method to each inventory item
        const processedInventoryItems = inventoryItems.map(item => ({
          ...item,
          getDisplayName: () => getDisplayNameWithoutCode(item.uniformItem?.name || '')
        }));
        
        setAllInventory(processedInventoryItems);
        const newInventoryLookup: { [key: string]: string } = {};
        processedInventoryItems.forEach((invItem) => {
          const categoryName = invItem.uniformItem?.category?.name;
          const sizeName = invItem.size?.size;
          if (categoryName && sizeName) {
            const key = `${categoryName}-${sizeName}`;
            newInventoryLookup[key] = invItem.id; // invItem.id is UniformInventory.id
          } else {
            console.warn("Inventory item missing critical name data:", invItem);
          }
        });
        setInventoryLookup(newInventoryLookup);

      } catch (err: any) {
        console.error('Error fetching uniform data:', err);
        setError(err.message || 'Failed to load uniform data.');
      } finally {
        setLoading(false);
      }
    };
    fetchUniformData();
  }, []);

  const formatDate = (dateString?: string) => {
    // ... (formatDate logic - seems okay)
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) { return dateString; }
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.trim() === '') {
      setFilteredStudents([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?search=${encodeURIComponent(value)}&status=active&pageSize=10000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to search students: ${errorText || response.statusText}`);
      }

      // Handle both normal responses and 304 responses
      let data;
      if (response.status === 304) {
        // For 304 responses, we might get empty body, so we need to fetch fresh data
        const freshResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?search=${encodeURIComponent(value)}&status=active&pageSize=10000&_=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        data = await freshResponse.json();
      } else {
        data = await response.json();
      }

      console.log('API Response:', data); // Debug log
      
      // Try different possible response structures
      const filteredStudents = data.students || data.data?.students || data.data || [];

      console.log('Filtered students:', filteredStudents); // Debug log
      
      setFilteredStudents(filteredStudents);
      
      // If we have a single match and the search term matches exactly, select it automatically
      if (filteredStudents.length === 1) {
        const student = filteredStudents[0];
        const fullName = `${student.first_name} ${student.last_name}`;
        if (fullName.toLowerCase() === value.toLowerCase()) {
          handleStudentSelect(student);
        }
      }
    } catch (error) {
      console.error('Error searching students:', error);
      setError(error instanceof Error ? error.message : 'Failed to search students');
      setFilteredStudents([]);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setFormData(prev => ({
      ...prev,
      personName: `${student.first_name} ${student.last_name}`,
      studentClass: student.class_assigned,
      studentId: student.id, // Store studentId
    }));
    setShowDropdown(false);
    setSearchTerm(`${student.first_name} ${student.last_name}`);
  };

  const calculateBalance = () => {
    const checkedTotal = Object.values(checkedItems).reduce((sum, val) => sum + (val || 0), 0);
    const notTakenTotal = Object.values(itemsNotTaken).reduce((sum, val) => sum + (val || 0), 0);
    const balance = itemsToBeTaken - (checkedTotal + notTakenTotal);
    return { checkedTotal, notTakenTotal, balance };
  };

  const handleCheckedItemChange = (sizeName: string, categoryName: string, value: string) => {
    const newValue = parseInt(value) || 0;
    const lookupKey = `${categoryName}-${sizeName}`;
    const inventoryId = inventoryLookup[lookupKey];

    if (!inventoryId) {
      setValidationMessage({ text: `No inventory ID for ${categoryName} - ${sizeName}`, type: 'error' });
      setTimeout(() => setValidationMessage(null), 4000);
      return;
    }
    
    const currentNotTakenTotal = Object.values(itemsNotTaken).reduce((sum, val) => sum + (val || 0), 0);
    const currentCheckedTotal = Object.entries(checkedItems)
      .reduce((sum, [key, val]) => key === inventoryId ? sum : sum + (val || 0), 0); // Exclude current item from sum

    const newGrandTotal = currentNotTakenTotal + currentCheckedTotal + newValue;

    if (newGrandTotal > itemsToBeTaken) {
      setValidationMessage({
        text: `Cannot allocate more items than the total to be taken (${itemsToBeTaken})`,
        type: 'error'
      });
      setTimeout(() => setValidationMessage(null), 4000);
      return;
    }
    
    setCheckedItems(prev => ({ ...prev, [inventoryId]: newValue }));
    setValidationMessage(null);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center py-4">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-2 w-full max-w-4xl"> {/* Increased max-width for better table layout */}
        <div className="container mx-auto bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Uniform Checkout Form</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
              <button onClick={() => setError(null)} className="absolute top-0 right-0 px-4 py-3">×</button>
            </div>
          )}

          {loading && !categories.length ? ( // Show loading spinner only if categories are not yet loaded
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student Details Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                <div className="relative">
                  <label htmlFor="search" className="block text-gray-700 font-medium mb-2">Search Student</label>
                  <div className="flex">
                    <input
                      type="text" id="search" value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); handleSearch(e.target.value);}}
                      onFocus={() => searchTerm && filteredStudents.length > 0 && setShowDropdown(true)}
                      // onBlur={() => setTimeout(() => setShowDropdown(false), 100)} // Hide on blur with delay
                      className="flex-1 px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search students by name or class..."
                    />
                    <button type="button" className="p-2 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200" onClick={() => handleSearch(searchTerm)}>
                      <Search className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-sm text-blue-600 mt-1 italic">Note: Search names in A A CAPITAL LETTERS. Example: GYOKERES</p>
                  {showDropdown && filteredStudents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredStudents.map((student) => (
                        <div key={student.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleStudentSelect(student)}>
                          <div className="font-medium">{`${student.first_name} ${student.last_name}`}</div>
                          <div className="text-sm text-gray-600">{student.class_assigned}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="personName" className="block text-gray-700 font-medium mb-2">Student Name</label>
                    <input type="text" id="personName" name="personName" value={formData.personName} readOnly className="border border-gray-300 rounded-md p-2 w-full bg-gray-100"/>
                  </div>
                  <div>
                    <label htmlFor="studentClass" className="block text-gray-700 font-medium mb-2">Student Class</label>
                    <input type="text" id="studentClass" name="studentClass" value={formData.studentClass} readOnly className="border border-gray-300 rounded-md p-2 w-full bg-gray-100"/>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="takenBy" className="block text-gray-700 font-medium mb-2">Taken By</label>
                    <input type="text" id="takenBy" name="takenBy" value={formData.takenBy} onChange={(e) => setFormData(prev => ({ ...prev, takenBy: e.target.value }))} className="border border-gray-300 rounded-md p-2 w-full" required />
                  </div>
                  <div>
                    <label htmlFor="dateIssued" className="block text-gray-700 font-medium mb-2">Date</label>
                    <input type="date" id="dateIssued" name="dateIssued" value={formData.dateIssued} onChange={(e) => setFormData(prev => ({ ...prev, dateIssued: e.target.value }))} className="border border-gray-300 rounded-md p-2 w-full" required />
                  </div>
                </div>
              </div>

              {/* Items to be Taken Input */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-4">
                <label htmlFor="itemsToBeTaken" className="block text-gray-700 font-medium mb-2">Total Items to be Taken</label>
                <input type="number" id="itemsToBeTaken" value={itemsToBeTaken} onChange={(e) => setItemsToBeTaken(Number(e.target.value))} className="border border-gray-300 rounded-md p-2 w-full" min="0"/>
                
                {categories.length > 0 ? (
                  <div className="overflow-x-auto">
                    <h3 className="font-medium text-md mb-2">Items Taken:</h3>
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2">Size</th>
                          {categories.map((category) => (
                            <th key={category.id} className="border border-gray-300 p-2">{category.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(sizes).map((sizeName) => ( // sizeName is e.g. "M", "L"
                          <tr key={sizeName}>
                            <td className="border border-gray-300 p-2 font-medium">{sizeName}</td>
                            {categories.map((category) => {
                              const lookupKey = `${category.name}-${sizeName}`;
                              const inventoryId = inventoryLookup[lookupKey];
                              return (
                                <td key={`${category.id}-${sizeName}`} className="border border-gray-300 p-1">
                                  <input
                                    type="number" min="0"
                                    className="w-full p-1 text-center border border-gray-200 rounded"
                                    placeholder="0"
                                    value={inventoryId ? (checkedItems[inventoryId] || '') : ''}
                                    onChange={(e) => handleCheckedItemChange(sizeName, category.name, e.target.value)}
                                    disabled={!inventoryId || !categoryOptions[category.name]?.includes(sizeName)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">Loading categories and sizes...</div>
                )}
              </div>

              {/* Items Not Taken Input */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-4">
                {categories.length > 0 ? ( // Only show if categories are loaded
                  <div className="overflow-x-auto">
                    <h3 className="font-medium text-md mb-2">Items NOT Taken (if any):</h3>
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2">Size</th>
                          {categories.map((category) => (
                            <th key={category.id} className="border border-gray-300 p-2">{category.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(sizes).map((sizeName) => (
                          <tr key={sizeName}>
                            <td className="border border-gray-300 p-2 font-medium">{sizeName}</td>
                            {categories.map((category) => {
                              const lookupKey = `${category.name}-${sizeName}`;
                              const inventoryId = inventoryLookup[lookupKey];
                              return (
                                <td key={`${category.id}-${sizeName}`} className="border border-gray-300 p-1">
                                  <input
                                    type="number" min="0"
                                    className="w-full p-1 text-center border border-gray-200 rounded"
                                    placeholder="0"
                                    value={inventoryId ? (itemsNotTaken[inventoryId] || '') : ''}
                                    onChange={(e) => handleItemChange(sizeName, category.name, e.target.value)}
                                    disabled={!inventoryId || !categoryOptions[category.name]?.includes(sizeName)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !loading && <div className="p-4 text-center text-gray-500">Categories not loaded.</div>
                )}
              </div>

              {/* Balance Check */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 mb-4">
                <h3 className="font-medium text-lg">Balance Check</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm">Total Items to be Taken: <span className="font-medium">{itemsToBeTaken}</span></p>
                    <p className="text-sm">Total Items Checked (Taken): <span className="font-medium">{calculateBalance().checkedTotal}</span></p>
                    <p className="text-sm">Total Items Not Taken: <span className="font-medium">{calculateBalance().notTakenTotal}</span></p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      Balance: {' '}
                      <span className={`${calculateBalance().balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateBalance().balance}
                      </span>
                    </p>
                    {calculateBalance().balance !== 0 && (
                      <p className="text-sm text-red-600">
                        {calculateBalance().balance > 0 ? `${calculateBalance().balance} items remaining to be allocated` : `${Math.abs(calculateBalance().balance)} too many items allocated`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation Message Modal */}
              {validationMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-50 px-4 bg-black bg-opacity-30">
                  <div className={`relative px-6 py-4 rounded-lg shadow-lg ${validationMessage.type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
                    <button onClick={() => setValidationMessage(null)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
                    <div className={`flex items-center space-x-2 ${validationMessage.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                      <span className="text-lg">{validationMessage.type === 'error' ? '⚠️' : '✅'}</span>
                      <p className="font-medium">{validationMessage.text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Upload Field */}
              <div>
                <label htmlFor="receipt" className="block text-gray-700 font-medium mb-2">Upload Receipt (Required)</label>
                <input type="file" id="receipt" name="receipt" onChange={handleFileChange} className="border border-gray-300 rounded-md p-2 w-full" accept="image/*" required />
                {receiptPreview && (
                  <div className="mt-2 flex justify-center">
                    <Image src={receiptPreview} alt="Receipt Preview" width={240} height={160} className="max-h-40 border rounded shadow object-contain" unoptimized={true} />
                  </div>
                )}
                {receiptPath && (<div className="text-xs text-green-700 mt-1 text-center">Receipt uploaded successfully!</div>)}
              </div>

              {/* Submit Button and Success Message */}
              <div className="flex flex-col items-center pt-4">
                <button type="submit" disabled={loading} className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                {showSuccess && (<p className="text-green-500 font-semibold mt-2">Uniform Form submitted successfully!</p>)}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UniformCheckoutForm;