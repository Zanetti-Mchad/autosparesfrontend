"use client";
import React, { useState, useEffect } from "react";
import { env } from '@/env';
import { AlertCircle, Check, ArrowLeft, X, Calendar } from "lucide-react";
import Link from "next/link";

const API_BASE_URL = env.BACKEND_API_URL;

interface ClassTermData {
  id: string;
  className: string;
  endDate: string;
  nextTermStartDate: string;
}

interface TermData {
  id: string;
  name: string;
  academicYear: {
    id: string;
    year: string;
  };
  classTermSchedules: Array<{
    id: string;
    class: {
      id: string;
      name: string;
    };
    startDate: string;
    endDate: string;
  }>;
}

const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 border rounded ${className}`}>{children}</div>
);

const EditTermDates = () => {
  const [classDates, setClassDates] = useState<ClassTermData[]>([]);
  const [currentTerm, setCurrentTerm] = useState<string>("");
  const [termId, setTermId] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [editMode, setEditMode] = useState<boolean>(false);
  
  // Fetch data from API
  useEffect(() => {
    const fetchTermData = async () => {
      try {
        setLoading(true);
        
        // Get the access token from localStorage
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setError("Authentication error: No access token found");
          setLoading(false);
          return;
        }
        
        // Call the API to get current active term
        const response = await fetch(`${API_BASE_URL}/api/v1/term/active`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.term) {
          const termData: TermData = data.term;
          
          // Set basic term info
          setTermId(termData.id);
          setCurrentTerm(termData.name || "");
          setAcademicYear(termData.academicYear?.year || "");
          setAcademicYearId(termData.academicYear?.id || "");
          
          // Transform class schedules into our component's data structure
          if (termData.classTermSchedules && Array.isArray(termData.classTermSchedules)) {
            const mappedClasses = termData.classTermSchedules.map(schedule => ({
              id: schedule.class.id,
              className: schedule.class.name,
              endDate: new Date(schedule.endDate).toISOString().split('T')[0],
              // Initialize nextTermStartDate from the API if available, or empty string
              nextTermStartDate: schedule.startDate ? 
                new Date(schedule.startDate).toISOString().split('T')[0] : ""
            }));
            
            setClassDates(mappedClasses);
          }
        } else {
          setError(data.message || "No active term found. Please set a current term first.");
        }
      } catch (error) {
        console.error("Error fetching term data:", error);
        setError("Failed to load term dates. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTermData();
  }, []);
  
  // Handler for date changes
  const handleDateChange = (id: string, field: 'endDate' | 'nextTermStartDate', value: string) => {
    setClassDates(prevDates => 
      prevDates.map(classItem => 
        classItem.id === id ? { ...classItem, [field]: value } : classItem
      )
    );
    
    // Reset messages when making changes
    setSuccess(false);
    setError("");
  };
  
  // Validate dates before saving
  const validateDates = (): boolean => {
    // Check if any dates are empty
    const missingDates = classDates.some(
      item => !item.endDate || !item.nextTermStartDate
    );
    
    if (missingDates) {
      setError("Please fill in all term dates");
      return false;
    }
    
    // Check if nextTermStartDate is after endDate for each class
    const invalidDates = classDates.some(item => {
      const endDate = new Date(item.endDate);
      const startDate = new Date(item.nextTermStartDate);
      return startDate <= endDate;
    });
    
    if (invalidDates) {
      setError("Next term start date must be after term end date for all classes");
      return false;
    }
    
    return true;
  };
  
  // Handle save - send data to API
  const handleSave = async () => {
    if (validateDates()) {
      try {
        // Get the access token
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setError("Authentication error: No access token found");
          return;
        }
        
        // Prepare data for API - use updateTerm endpoint structure
        const updatedData = {
          name: currentTerm, // Keep the current name
          // Convert class dates to classTermSchedules format
          classes: classDates.map(item => ({
            id: item.id,
            startDate: item.nextTermStartDate, // Use the nextTermStartDate value
            endDate: item.endDate
          }))
        };
        
        console.log('Sending update with data:', updatedData);
        
        // Send to API using the updateTerm endpoint
        const response = await fetch(`${API_BASE_URL}/api/v1/term/${termId}`, {
          method: 'PUT', // PUT for update endpoint
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        });
        
        const data = await response.json();
        
        if (data.success) {
          setSuccess(true);
          setEditMode(false);
          
          // Clear success message after a delay
          setTimeout(() => {
            setSuccess(false);
          }, 3000);
        } else {
          setError(data.message || "Failed to update term dates");
        }
      } catch (error) {
        console.error("Error updating term dates:", error);
        setError("Failed to update term dates. Please try again.");
      }
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Not set';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Reset to initial state and fetch fresh data
  const handleCancel = () => {
    setEditMode(false);
    setError("");
    setLoading(true);
    
    // Refresh data from API
    const fetchTermData = async () => {
      try {
        // Get the access token
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setError("Authentication error: No access token found");
          setLoading(false);
          return;
        }
        
        // Call the API to get current active term
        const response = await fetch(`${API_BASE_URL}/api/v1/term/active`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.term) {
          const termData: TermData = data.term;
          
          // Set basic term info
          setTermId(termData.id);
          setCurrentTerm(termData.name || "");
          setAcademicYear(termData.academicYear?.year || "");
          setAcademicYearId(termData.academicYear?.id || "");
          
          // Transform class schedules into our component's data structure
          if (termData.classTermSchedules && Array.isArray(termData.classTermSchedules)) {
            const mappedClasses = termData.classTermSchedules.map(schedule => ({
              id: schedule.class.id,
              className: schedule.class.name,
              endDate: new Date(schedule.endDate).toISOString().split('T')[0],
              // Initialize nextTermStartDate from the API's startDate field
              nextTermStartDate: schedule.startDate ? 
                new Date(schedule.startDate).toISOString().split('T')[0] : ""
            }));
            
            setClassDates(mappedClasses);
          }
        } else {
          setError(data.message || "No active term found");
        }
      } catch (error) {
        console.error("Error reloading term data:", error);
        setError("Failed to reload term dates. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTermData();
  };
  
  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-white p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {editMode ? "Edit Term Dates" : "Term Dates"}
                  </h1>
                  <p className="text-gray-600">{currentTerm} - Academic Year {academicYear}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Edit Dates
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : error && !success ? (
            <Alert className="m-6 border-red-400 text-red-600 bg-red-50">
              <AlertCircle className="h-4 w-4 inline-block mr-2" />
              {error}
            </Alert>
          ) : success ? (
            <Alert className="m-6 border-green-400 text-green-600 bg-green-50">
              <Check className="h-4 w-4 inline-block mr-2" />
              Term dates updated successfully.
            </Alert>
          ) : null}
          
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                {editMode 
                  ? "Edit the term end and next term start dates for each class." 
                  : "Current term dates for all classes."}
              </p>
            </div>

            {editMode ? (
              // Edit mode - show form inputs
              <div className="space-y-4">
                {classDates.map((classItem) => (
                  <div key={classItem.id} className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-700">
                        {classItem.className}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Term Ends On
                      </label>
                      <input
                        type="date"
                        value={classItem.endDate}
                        onChange={(e) => handleDateChange(classItem.id, 'endDate', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Next Term Starts On
                      </label>
                      <input
                        type="date"
                        value={classItem.nextTermStartDate}
                        onChange={(e) => handleDateChange(classItem.id, 'nextTermStartDate', e.target.value)}
                        min={classItem.endDate || undefined}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // View mode - responsive layout
              <div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term Ends On
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Term Starts On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classDates.map((classItem) => (
                        <tr key={classItem.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{classItem.className}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center">
                              <Calendar className="h-4 w-4 text-green-600 mr-2" />
                              {formatDate(classItem.endDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center">
                              <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                              {formatDate(classItem.nextTermStartDate)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {classDates.map((classItem) => (
                    <div key={classItem.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                      <div className="font-bold text-lg text-gray-800">{classItem.className}</div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Term Ends On</label>
                          <div className="text-sm text-gray-900 flex items-center mt-1">
                            <Calendar className="h-4 w-4 text-green-600 mr-2" />
                            {formatDate(classItem.endDate)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Next Term Starts On</label>
                          <div className="text-sm text-gray-900 flex items-center mt-1">
                            <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                            {formatDate(classItem.nextTermStartDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Information section */}
          <div className="p-6 bg-blue-50 border-t">
            <div className="text-sm text-blue-700">
              <h3 className="font-medium mb-2">Important Information</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Changes to term dates should be made at least 30 days before the end of the current term.</li>
                <li>All dates should be verified with the school calendar before saving.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTermDates;