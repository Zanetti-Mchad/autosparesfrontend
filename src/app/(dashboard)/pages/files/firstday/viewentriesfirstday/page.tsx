"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Printer, Edit2, X, RefreshCw, Calendar, AlertCircle, Check } from 'lucide-react';
import { NextPage } from 'next';
import { env } from '@/env';

// Base URL for API
const API_BASE_URL = env.BACKEND_API_URL;

// Define interfaces for API data types - matching the boarding checklist format
interface BoardingChecklistItem {
  id?: string;
  name: string;
  required: number;
  brought: number;
}

interface BoardingChecklist {
  id: string;
  studentId: string;
  academicYearId: string;
  termId: string;
  guardianName: string;
  guardianPhone?: string;
  preparedBy: string;
  createdAt?: string;
  updatedAt?: string;
  items: BoardingChecklistItem[];
  notes: string;
  // Additional fields from student data
  student?: {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name?: string;
    class?: string;
    class_assigned?: string;
  };
}

// For display in the interface
interface StudentEntry {
  id: string;
  name: string;
  class: string;
  dateReported: string;
  guardianName: string;
  phone: string;
  preparedBy: string;
  items: BoardingChecklistItem[];
  notes: string;
  // Save original data for API updates
  originalData: BoardingChecklist;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive?: boolean;
}

interface Term {
  id: string;
  name: string;
  academicYearId?: string;
  isActive?: boolean;
}

const StudentEntriesList: NextPage = () => {
  // State for entries and loading state
  const [entries, setEntries] = useState<StudentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StudentEntry | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // Academic year and term for filtering
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [hasSettingsBeenFetched, setHasSettingsBeenFetched] = useState(false);
  
  // State for prepared by field and save status
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | ''>('');
  const [successTimeout, setSuccessTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('Current environment variables:', {
      API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV
    });
  }, []);

  // Fetch boarding checklist entries from API
  const fetchChecklistEntries = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Authentication token not found. Please login again.');
        setIsLoading(false);
        return;
      }
      
      // Use academic year and term if available for filtering
      let apiUrl = `${API_BASE_URL}/api/v1/boardingchecklists`;
      if (currentYear?.id && currentTerm?.id) {
        apiUrl = `${API_BASE_URL}/api/v1/boardingchecklists/filter?academicYearId=${currentYear.id}&termId=${currentTerm.id}`;
      }
      
      console.log('API Base URL:', API_BASE_URL);
      console.log('Full API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      
      // Transform API data to match our UI format
      let checklistEntries: StudentEntry[] = [];
      
      // Handle different possible response formats
      const checklists = data.checklists || data.data?.checklists || (Array.isArray(data) ? data : []);
      
      if (checklists && checklists.length > 0) {
        // Map API response to our UI format
        checklistEntries = await Promise.all(checklists.map(async (checklist: BoardingChecklist) => {
          // For each checklist, try to get student details if not already included
          let studentName = 'Unknown Student';
          let studentClass = 'Unknown Class';
          
          if (checklist.student) {
            // Use student data from the checklist if available
            const { first_name, middle_name, last_name } = checklist.student;
            studentName = [first_name, middle_name, last_name].filter(Boolean).join(' ');
            studentClass = checklist.student.class || checklist.student.class_assigned || 'Unknown Class';
          } else {
            // Otherwise fetch student details
            try {
              const studentResponse = await fetch(`${API_BASE_URL}/api/v1/students/${checklist.studentId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (studentResponse.ok) {
                const studentData = await studentResponse.json();
                const student = studentData.student || studentData.data?.student || studentData;
                
                if (student) {
                  const { first_name, middle_name, last_name } = student;
                  studentName = [first_name, middle_name, last_name].filter(Boolean).join(' ');
                  studentClass = student.class?.name || student.class_assigned || 'Unknown Class';
                }
              }
            } catch (err) {
              console.error('Error fetching student details:', err);
            }
          }
          
          // Format date for display
          const dateReported = new Date(checklist.createdAt || Date.now()).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Create standard boarding items with default values
          const defaultBoardingItems: BoardingChecklistItem[] = [
            { name: "Non-metallic suit case", required: 1, brought: 0 },
            { name: "Pad lock", required: 1, brought: 0 },
            { name: "Mosquito net", required: 1, brought: 0 },
            { name: "Cotton night wear", required: 2, brought: 0 },
            { name: "Cotton bed sheets", required: 2, brought: 0 },
            { name: "Blanket", required: 1, brought: 0 },
            { name: "Bathing soap", required: 3, brought: 0 },
            { name: "Washing soap", required: 3, brought: 0 },
            { name: "Detergent", required: 1, brought: 0 },
            { name: "Local bathing sponge", required: 2, brought: 0 },
            { name: "Pants", required: 12, brought: 0 },
            { name: "Pant peg", required: 1, brought: 0 },
            { name: "Hankies", required: 6, brought: 0 },
            { name: "Nail cutter", required: 1, brought: 0 },
            { name: "Vaseline", required: 1, brought: 0 },
            { name: "Black shoes", required: 1, brought: 0 },
            { name: "Shoe polish", required: 1, brought: 0 },
            { name: "Canvas shoes", required: 1, brought: 0 },
            { name: "Open shoes", required: 1, brought: 0 },
            { name: "Sandals", required: 1, brought: 0 },
            { name: "Toothbrushes", required: 3, brought: 0 },
            { name: "Toothpaste", required: 2, brought: 0 },
            { name: "Toilet bag", required: 1, brought: 0 },
            { name: "Towel", required: 1, brought: 0 },
            { name: "Comb", required: 1, brought: 0 },
            { name: "Bucket", required: 1, brought: 0 },
            { name: "Basin", required: 1, brought: 0 },
            { name: "Hangers", required: 2, brought: 0 },
            { name: "Soap dish", required: 1, brought: 0 },
            { name: "Holy book / Yasarunah", required: 1, brought: 0 },
            { name: "School bag", required: 1, brought: 0 },
            { name: "Passport photos", required: 1, brought: 0 },
            { name: "Religious attire", required: 1, brought: 0 },
            { name: "Prayer mat", required: 1, brought: 0 },
            { name: "Half petty", required: 1, brought: 0 },
            { name: "Wrist watch", required: 1, brought: 0 },
            { name: "Rechargeable torch", required: 1, brought: 0 },
            { name: "Pegs", required: 12, brought: 0 },
            { name: "Water bottle", required: 1, brought: 0 },
            { name: "Shoe brush", required: 1, brought: 0 }
          ];
          
          // Normalize checklist items to match our expected format
          let checklistItems: BoardingChecklistItem[] = [];
          
          // Handle different possible formats for items in the API response
          if (Array.isArray(checklist.items)) {
            // Format 1: Array of {name, required, brought} objects
            if (checklist.items.length > 0 && 'name' in checklist.items[0]) {
              checklistItems = checklist.items;
            } 
            // Format 2: Array of {itemName, requiredQuantity, broughtQuantity} objects
            else if (checklist.items.length > 0 && 'itemName' in checklist.items[0]) {
              checklistItems = checklist.items.map((item: any) => ({
                name: item.itemName,
                required: item.requiredQuantity,
                brought: item.broughtQuantity
              }));
            }
          }
          
          console.log(`Original items for student ${studentName}:`, checklistItems);
          
          // Merge checklist items with standard items
          const itemMap = new Map();
          
          // First add all standard items to the map
          defaultBoardingItems.forEach(item => {
            itemMap.set(item.name, {...item});
          });
          
          // Then update with values from API response
          checklistItems.forEach(item => {
            if (item && item.name) {
              // Get the standard item or create a new one
              const existingItem = itemMap.get(item.name) || {
                name: item.name,
                required: 0,
                brought: 0
              };
              
              // Update with API values (if they exist and are valid)
              if (typeof (item as any).required === 'number' && !isNaN((item as any).required)) {
                existingItem.required = (item as any).required;
              } else if (typeof (item as any).requiredQuantity === 'number' && !isNaN((item as any).requiredQuantity)) {
                existingItem.required = (item as any).requiredQuantity;
              }
              
              if (typeof (item as any).brought === 'number' && !isNaN((item as any).brought)) {
                existingItem.brought = (item as any).brought;
              } else if (typeof (item as any).broughtQuantity === 'number' && !isNaN((item as any).broughtQuantity)) {
                existingItem.brought = (item as any).broughtQuantity;
              }
              
              // Update the item in the map
              itemMap.set(item.name, existingItem);
            }
          });
          
          // Convert map back to array
          const mergedItems = Array.from(itemMap.values());
          
          console.log(`Merged items for student ${studentName}:`, mergedItems);
          
          return {
            id: checklist.id,
            name: studentName,
            class: studentClass,
            dateReported,
            guardianName: checklist.guardianName,
            phone: checklist.guardianPhone || '',
            preparedBy: checklist.preparedBy,
            items: mergedItems,
            notes: checklist.notes || '',
            originalData: {
              ...checklist,
              // Make sure we store the formatted items in originalData too
              items: mergedItems
            }
          };
        }));
      }
      
      console.log('Processed entries:', checklistEntries);
      setEntries(checklistEntries);
    } catch (error) {
      console.error('Error fetching boarding checklists:', error);
      setError('Failed to load boarding checklists. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentTerm]);
  
  // Fetch current academic year and term settings
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      if (hasSettingsBeenFetched) {
        return;
      }
      try {
        setIsLoading(true);
        setError('');

        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Authentication required');
          setIsLoading(false);
          return;
        }

        // Fetch the current academic year using the same API as the student selector
        const yearResponse = await fetch(`${API_BASE_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const yearData = await yearResponse.json();
        
        if (yearData.success) {
          // Find the active academic year
          const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
          setCurrentYear(activeYear || null);
        }

        // Then fetch the current term
        const termResponse = await fetch(`${API_BASE_URL}/api/v1/term/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const termData = await termResponse.json();
        
        if (termData.success && termData.term) {
          setCurrentTerm(termData.term);
        }
      } catch (error) {
        console.error('Error fetching academic settings:', error);
        setError('Failed to load academic year and term settings');
      } finally {
        // After fetching settings, then fetch the checklist data
        fetchChecklistEntries();
      }
    };
    
    fetchCurrentSettings();
    setHasSettingsBeenFetched(true);
   }, [refreshTrigger, fetchChecklistEntries, hasSettingsBeenFetched]);
  
  // Function to update a boarding checklist through the API
  const updateBoardingChecklist = async (updatedEntry: StudentEntry) => {
    try {
      setIsLoading(true);
      setSaveStatus('');
      
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Authentication token not found. Please login again.');
        setIsLoading(false);
        setSaveStatus('error');
        return false;
      }
      
      const apiUrl = `${API_BASE_URL}/api/v1/boardingchecklists/${updatedEntry.id}`;
      console.log('Updating boarding checklist:', apiUrl);
      
      // Prepare updated data for API
      // Check if we need to transform the items to match the API's expected format
      const items = updatedEntry.items.map(item => {
        // If the API expects itemName, requiredQuantity, broughtQuantity format, transform the items
        if (updatedEntry.originalData.items && 
            updatedEntry.originalData.items.length > 0 && 
            'itemName' in updatedEntry.originalData.items[0]) {
          return {
            itemName: item.name,
            requiredQuantity: item.required,
            broughtQuantity: item.brought
          };
        }
        // Otherwise, keep the format as is
        return {
          name: item.name,
          required: item.required,
          brought: item.brought
        };
      });
      
      console.log('Updating with items:', items);
      
      // Prepare updated data for API - merge with original data
      const updatedData = {
        ...updatedEntry.originalData,
        guardianName: updatedEntry.guardianName,
        guardianPhone: updatedEntry.phone,
        preparedBy: updatedEntry.preparedBy || updatedEntry.originalData.preparedBy,
        items: items,
      };

      // Compare the original and updated data to see if there are any actual changes
      const hasDataChanged = JSON.stringify(updatedEntry.originalData) !== JSON.stringify(updatedData);

      console.log('Data being sent to API:', JSON.stringify(updatedData));

      if (hasDataChanged) { // Only call the API if the data has changed
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update checklist: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Update response:', data);
        
        // Set success status
        setSaveStatus('success');
        setError('Checklist updated successfully!');
        
        // Refresh the list after update
        setRefreshTrigger(prev => prev + 1);
        
        // Clear success message after 5 seconds
        if (successTimeout) {
          clearTimeout(successTimeout);
        }
        setSuccessTimeout(setTimeout(() => {
          setSaveStatus('');
          setError('');
        }, 5000));
        
        return true;
      } else {
        console.log('No changes detected, skipping API call.');
        return true;
      }
    } catch (error) {
      console.error('Error updating boarding checklist:', error);
      setError('Failed to update boarding checklist. Please try again.');
      setSaveStatus('error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Filter entries based on search and class
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.guardianName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClass || entry.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const handleEdit = (entry: StudentEntry) => {
    // Create a copy of the entry 
    const entryCopy = { ...entry };
    
    console.log("Original entry items:", JSON.stringify(entryCopy.items));
    
    // Define the standard boarding items list
    const standardBoardingItems = [
      { name: "Non-metallic suit case", required: 1, brought: 0 },
      { name: "Pad lock", required: 1, brought: 0 },
      { name: "Mosquito net", required: 1, brought: 0 },
      { name: "Cotton night wear", required: 2, brought: 0 },
      { name: "Cotton bed sheets", required: 2, brought: 0 },
      { name: "Blanket", required: 1, brought: 0 },
      { name: "Bathing soap", required: 3, brought: 0 },
      { name: "Washing soap", required: 3, brought: 0 },
      { name: "Detergent", required: 1, brought: 0 },
      { name: "Local bathing sponge", required: 2, brought: 0 },
      { name: "Pants", required: 12, brought: 0 },
      { name: "Pant peg", required: 1, brought: 0 },
      { name: "Hankies", required: 6, brought: 0 },
      { name: "Nail cutter", required: 1, brought: 0 },
      { name: "Vaseline", required: 1, brought: 0 },
      { name: "Black shoes", required: 1, brought: 0 },
      { name: "Shoe polish", required: 1, brought: 0 },
      { name: "Canvas shoes", required: 1, brought: 0 },
      { name: "Open shoes", required: 1, brought: 0 },
      { name: "Sandals", required: 1, brought: 0 },
      { name: "Toothbrushes", required: 3, brought: 0 },
      { name: "Toothpaste", required: 2, brought: 0 },
      { name: "Toilet bag", required: 1, brought: 0 },
      { name: "Towel", required: 1, brought: 0 },
      { name: "Comb", required: 1, brought: 0 },
      { name: "Bucket", required: 1, brought: 0 },
      { name: "Basin", required: 1, brought: 0 },
      { name: "Hangers", required: 2, brought: 0 },
      { name: "Soap dish", required: 1, brought: 0 },
      { name: "Holy book / Yasarunah", required: 1, brought: 0 },
      { name: "School bag", required: 1, brought: 0 },
      { name: "Passport photos", required: 1, brought: 0 },
      { name: "Religious attire", required: 1, brought: 0 },
      { name: "Prayer mat", required: 1, brought: 0 },
      { name: "Half petty", required: 1, brought: 0 },
      { name: "Wrist watch", required: 1, brought: 0 },
      { name: "Rechargeable torch", required: 1, brought: 0 },
      { name: "Pegs", required: 12, brought: 0 },
      { name: "Water bottle", required: 1, brought: 0 },
      { name: "Shoe brush", required: 1, brought: 0 }
    ];
    
    // Use the standard boarding items list instead of the default items from state
    let finalItems = [...standardBoardingItems];
    
    // If there are existing items with brought values, merge them in
    if (entryCopy.items && Array.isArray(entryCopy.items) && entryCopy.items.length > 0) {
      // Create a map of names to existing items for easy lookup
      const existingItemsMap = new Map();
      entryCopy.items.forEach(item => {
        if (item && item.name) {
          existingItemsMap.set(item.name, item);
        }
      });
      
      // Update the finalItems with the brought values from existing items
      finalItems = finalItems.map(standardItem => {
        const existingItem = existingItemsMap.get(standardItem.name);
        if (existingItem && typeof existingItem.brought === 'number' && !isNaN(existingItem.brought)) {
          return {
            ...standardItem,
            brought: existingItem.brought
          };
        }
        return standardItem;
      });
    }
    
    // Update the entry with the final items list
    entryCopy.items = finalItems;
    
    console.log("Final items for edit:", entryCopy.items);
    
    setSelectedEntry(entryCopy);
    setPreparedBy(entryCopy.preparedBy || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (updatedEntry: StudentEntry) => {
    // Use the API update function instead of just updating local state
    const success = await updateBoardingChecklist(updatedEntry);
    if (success) {
      // API call will refresh entries, so we just need to close the dialog
      setShowEditDialog(false);
      setSelectedEntry(null);
    }
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Boarding Items List</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print List
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by student or guardian name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Classes</option>
          {entries.map(entry => (
            <option key={entry.class} value={entry.class}>{entry.class}</option>
          ))}
        </select>
      </div>

      {/* Main Table - Desktop Only */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden hidden lg:block">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading boarding checklist entries...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>No boarding checklist entries found. {searchTerm || selectedClass ? 'Try changing your search filters.' : ''}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Reported</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{entry.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{entry.class}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{entry.dateReported}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{entry.guardianName}</div>
                    <div className="text-sm text-gray-500">{entry.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
        {filteredEntries.map((entry, index) => (
          <div key={entry.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-800">{entry.name}</span>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
              <div className="mb-1"><span className="font-medium text-gray-700">Class: </span><span className="text-gray-600 text-sm">{entry.class}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Date: </span><span className="text-gray-600 text-sm">{entry.dateReported}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Guardian: </span><span className="text-gray-600 text-sm">{entry.guardianName}</span></div>
              <div className="mb-2"><span className="font-medium text-gray-700">Phone: </span><span className="text-gray-600 text-sm">{entry.phone}</span></div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleEdit(entry)}
                className="text-blue-500 hover:underline w-full flex items-center justify-center"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Responsive Cards - Mobile (md:hidden) */}
      <div className="md:hidden mb-6 flex flex-col gap-4">
        {filteredEntries.map((entry, index) => (
          <div key={entry.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-gray-800">{entry.name}</span>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
              <div className="mb-1"><span className="font-medium text-gray-700">Class: </span><span className="text-gray-600 text-sm">{entry.class}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Date: </span><span className="text-gray-600 text-sm">{entry.dateReported}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Guardian: </span><span className="text-gray-600 text-sm">{entry.guardianName}</span></div>
              <div className="mb-2"><span className="font-medium text-gray-700">Phone: </span><span className="text-gray-600 text-sm">{entry.phone}</span></div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleEdit(entry)}
                className="text-blue-500 hover:underline w-full flex items-center justify-center"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      {showEditDialog && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-h-[90vh] overflow-y-auto max-w-7xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Student Items</h2>
              <button
                onClick={() => setShowEditDialog(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  value={selectedEntry.name}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    name: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  value={selectedEntry.class}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    class: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {entries.map(entry => (
                    <option key={entry.class} value={entry.class}>{entry.class}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Name
                </label>
                <input
                  type="text"
                  value={selectedEntry.guardianName}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    guardianName: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={selectedEntry.phone}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    phone: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            {/* Prepared By Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prepared By
              </label>
              <input
                type="text"
                value={selectedEntry.preparedBy}
                onChange={(e) => setSelectedEntry({
                  ...selectedEntry,
                  preparedBy: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border border-gray-300 text-left">#</th>
                    <th className="px-4 py-2 border border-gray-300 text-left">Item Name</th>
                    <th className="px-4 py-2 border border-gray-300 text-center w-24">Required</th>
                    <th className="px-4 py-2 border border-gray-300 text-center w-24">Brought</th>
                    <th className="px-4 py-2 border border-gray-300 text-center w-24">Remaining</th>
                    <th className="px-4 py-2 border border-gray-300 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.items.map((item, index) => {
                    // Handle potential null or undefined values
                    const required = typeof item.required === 'number' && !isNaN(item.required) ? item.required : 0;
                    const brought = typeof item.brought === 'number' && !isNaN(item.brought) ? item.brought : 0;
                    const remaining = required - brought;
                    
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 border border-gray-300 text-center">{index + 1}</td>
                        <td className="px-4 py-2 border border-gray-300">
                          {item.name || `Item ${index + 1}`}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-center">
                          {required}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          <input
                            type="number"
                            value={brought}
                            onChange={(e) => {
                              const newItems = [...selectedEntry.items];
                              const newValue = Math.min(Math.max(0, parseInt(e.target.value) || 0), required);
                              newItems[index] = {
                                ...item,
                                brought: newValue
                              };
                              setSelectedEntry({
                                ...selectedEntry,
                                items: newItems,
                              });
                            }}
                            className="w-20 px-2 py-1 border rounded text-center mx-auto block"
                            min="0"
                            max={required}
                          />
                        </td>
                        <td className={`px-4 py-2 border border-gray-300 text-center ${remaining > 0 ? "text-red-500" : "text-green-500"}`}>
                          {remaining === 0 ? "-" : remaining}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-center">
                          {remaining === 0 ? (
                            <Check className="text-green-500 w-5 h-5 mx-auto" />
                          ) : (
                            <X className="text-red-500 w-5 h-5 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Notes Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={selectedEntry.notes || ''}
                onChange={(e) => setSelectedEntry({
                  ...selectedEntry,
                  notes: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                placeholder="Add any additional notes here..."
              ></textarea>
            </div>

            {/* Save Status Message */}
            {saveStatus === 'success' && (
              <div className="mt-4 p-2 bg-green-100 text-green-700 rounded-md">
                Changes saved successfully!
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md">
                Failed to save changes. Please try again.
              </div>
            )}
            {error && (
              <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(selectedEntry)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Dialog */}
      {showPrintDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Print Preview</h2>
              <button
                onClick={() => setShowPrintDialog(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 print:space-y-4">
              <h1 className="text-2xl font-bold text-center mb-6">Student Boarding Records</h1>

              <table className="w-full border-collapse border">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 border">#</th>
                    <th className="text-left p-3 border">Student Name</th>
                    <th className="text-left p-3 border">Class</th>
                    <th className="text-left p-3 border">Date Reported</th>
                    <th className="text-left p-3 border">Guardian Name</th>
                    <th className="text-left p-3 border">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-3 border">{index + 1}</td>
                      <td className="p-3 border">{entry.name}</td>
                      <td className="p-3 border">{entry.class}</td>
                      <td className="p-3 border">{entry.dateReported}</td>
                      <td className="p-3 border">{entry.guardianName}</td>
                      <td className="p-3 border">{entry.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Detailed Items Table */}
              <table className="w-full border-collapse border mt-8">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border text-left">Student Name</th>
                    <th className="px-4 py-2 border text-left">Items Details</th>
                    <th className="px-4 py-2 border text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const totalItems = entry.items.length;
                    const completedItems = entry.items.filter(item => item.brought === item.required).length;
                    const status = `${completedItems}/${totalItems} items complete`;
                    
                    return (
                      <tr key={entry.id}>
                        <td className="px-4 py-2 border">{entry.name}</td>
                        <td className="px-4 py-2 border">
                          <div className="grid grid-cols-2 gap-4">
                            {entry.items.map((item, itemIndex) => (
                              <div key={itemIndex}>
                                {item.name}: {item.brought}/{item.required}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 border text-center">{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowPrintDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowPrintDialog(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEntriesList;