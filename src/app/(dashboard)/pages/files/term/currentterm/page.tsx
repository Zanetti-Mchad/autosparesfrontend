"use client";
import React, { useState, useEffect } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { AlertCircle, Check, Trash2 } from "lucide-react";

const API_BASE_URL = env.BACKEND_API_URL;

const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 border rounded ${className}`}>{children}</div>
);

interface ClassTerm {
  id: string;
  name: string;
  termEndsOn: string;   // Maps to endDate in backend
  nextTermStartsOn: string;  // Maps to startDate in backend
}

interface Class {
  id: string;
  name: string;
  isActive: boolean;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  term?: any;
  years: AcademicYear[];
  classes?: Class[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ApiError {
  success: false;
  message: string;
}

interface DateRange {
  id: string;
  name: string;
  termEndsOn: string;   // Maps to endDate in backend
  nextTermStartsOn: string;  // Maps to startDate in backend
}

interface TermPayload {
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  classes: Array<{
    id: string;
    startDate: string;
    endDate: string;
  }>;
}

const CurrentTerm = () => {
  const [selectedTerm, setSelectedTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [apiError, setApiError] = useState(""); // New state for API-specific errors
  
  // Class term dates mapped by class ID
  const [classTerms, setClassTerms] = useState<DateRange[]>([]);
  
  // Predefined terms
  const terms = [
    { id: "1", name: "Term 1" },
    { id: "2", name: "Term 2" },
    { id: "3", name: "Term 3" }
  ];
  
  // Add this to display the current term and academic year
  const [termTitle, setTermTitle] = useState("");
  
  useEffect(() => {
    const fetchAcademicYear = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');

        if (!token) {
          console.error('No access token found');
          setApiError("Authentication error: No access token found");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data: ApiResponse = await response.json();
        console.log('Academic year data:', data);

        if (data.success && data.years && data.years.length > 0) {
          // Fix the type error by explicitly typing the year parameter
          const activeYear = data.years.find((year: AcademicYear) => year.isActive) || data.years[0];
          console.log('Setting year:', activeYear);
          
          if (activeYear) {
            setCurrentYear({
              id: activeYear.id,
              year: activeYear.year,
              isActive: activeYear.isActive
            });
          }
        }
      } catch (error: unknown) {
        // Fix error type
        console.error('Error fetching academic year:', error instanceof Error ? error.message : 'Unknown error');
        setApiError("Failed to fetch academic year data");
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicYear();
  }, []);
  
  // Fetch all classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          console.error('No access token found');
          setApiError("Authentication error: No access token found");
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/v1/classes/filter?limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('Classes API response:', data);

        if (data.success && data.classes) {
          // Set both classes and classTerms
          const activeClasses = data.classes.filter((cls: Class) => cls.isActive);
          
          setClasses(activeClasses);
          
          // Set classTerms with empty dates for the active classes
          const classTermsList = activeClasses.map((cls: Class) => ({
            id: cls.id,
            name: cls.name,
            termEndsOn: '',     // Will map to endDate in API payload
            nextTermStartsOn: '' // Will map to startDate in API payload
          }));
          
          setClassTerms(classTermsList);
          console.log('Classes loaded:', activeClasses.length);
          console.log('Class terms set:', classTermsList.length);
        } else {
          console.warn('No classes found in API response');
          setError("No classes found");
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError("Failed to fetch classes. Please check your connection.");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  const handleDateChange = (classId: string, field: 'termEndsOn' | 'nextTermStartsOn', value: string) => {
    setClassTerms(prev => prev.map(term =>
      term.id === classId ? { ...term, [field]: value } : term
    ));
  };

  const validateDates = () => {
    setError("");
    setSuccess(false);

    // Check if any dates are empty
    const emptyDates = classTerms.some(classTerm => 
      !classTerm.termEndsOn || !classTerm.nextTermStartsOn
    );

    if (emptyDates) {
      setError("All dates must be filled");
      return false;
    }

    // Validate dates for each class term
    for (const classTerm of classTerms) {
      const termEndDate = new Date(classTerm.termEndsOn);
      const nextTermStartDate = new Date(classTerm.nextTermStartsOn);

      if (nextTermStartDate.getTime() <= termEndDate.getTime()) {
        setError(`Next term start date for ${classTerm.name} must be after term end date`);
        return false;
      }

      // Check if the gap between term end and next term start is reasonable (e.g., not more than 2 months)
      const twoMonths = 1000 * 60 * 60 * 24 * 60; // 60 days
      if (nextTermStartDate.getTime() - termEndDate.getTime() > twoMonths) {
        setError(`Gap between term end and next term start for ${classTerm.name} cannot exceed 2 months`);
        return false;
      }
    }

    return true;
  };

  const getEarliestDate = (classes: Array<{ termEndsOn: string }>) => {
    const dates = classes
      .map(c => new Date(c.termEndsOn))
      .filter(date => !isNaN(date.getTime()));
    return dates.length > 0 
      ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString()
      : new Date().toISOString();
  };

  const getLatestDate = (classes: Array<{ nextTermStartsOn: string }>) => {
    const dates = classes
      .map(c => new Date(c.nextTermStartsOn))
      .filter(date => !isNaN(date.getTime()));
    return dates.length > 0
      ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
      : new Date().toISOString();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setApiError("");

    // Validation checks
    if (!selectedTerm) {
      setError("Please select a term");
      return;
    }

    const selectedTermObject = terms.find(term => term.id === selectedTerm);
    
    if (!selectedTermObject?.name) {
      setError("Term name is required");
      return;
    }

    if (!currentYear?.id) {
      setError("Academic year is required");
      return;
    }

    if (!classTerms || !Array.isArray(classTerms) || classTerms.length === 0) {
      setError("At least one class must be provided");
      return;
    }

    if (validateDates()) {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setApiError("Authentication error: No access token found");
          return;
        }

        const formatDate = (dateString: string) => {
          return new Date(dateString).toISOString().split('T')[0];
        };

        // First, check if term already exists
        const checkResponse = await fetch(
          `${API_BASE_URL}/api/v1/term/filter?academicYearId=${currentYear.id}&name=${encodeURIComponent(selectedTermObject.name)}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const checkData = await checkResponse.json();
        
        if (checkData.success && checkData.terms && checkData.terms.length > 0) {
          setError(`Term "${selectedTermObject.name}" already exists for this academic year. Please choose a different term.`);
          return;
        }

        // Calculate term-wide start and end dates
        const termEndDate = formatDate(getEarliestDate(classTerms));
        const termStartDate = formatDate(new Date(new Date(termEndDate).setMonth(new Date(termEndDate).getMonth() - 1)).toISOString());

        // IMPORTANT: Here's the key mapping change
        // In the payload, we map our UI fields to the database fields:
        // UI "termEndsOn" → DB "endDate"
        // UI "nextTermStartsOn" → DB "startDate"
        const payload = {
          name: selectedTermObject.name,
          academicYearId: currentYear.id,
          startDate: termStartDate,  // Overall term start date (derived)
          endDate: termEndDate,      // Overall term end date (derived)
          classes: classTerms.map((classTerm) => ({
            id: classTerm.id,
            startDate: formatDate(classTerm.nextTermStartsOn), // CORRECTED: Map nextTermStartsOn to startDate
            endDate: formatDate(classTerm.termEndsOn)         // CORRECTED: Map termEndsOn to endDate
          }))
        };

        console.log('Sending term payload:', payload);

        const response = await fetch(`${API_BASE_URL}/api/v1/term/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific HTTP status codes
          switch (response.status) {
            case 400:
              throw new Error(data.message || "Invalid data provided");
            case 401:
              throw new Error("Session expired. Please log in again.");
            case 409:
              throw new Error(`Term "${selectedTermObject.name}" already exists for this academic year`);
            default:
              throw new Error(data.message || `Server error: ${response.status}`);
          }
        }

        if (data.success) {
          console.log('Term created successfully:', data.term);
          setSuccess(true);
          setError("");
          
          // Set the term title
          const termName = selectedTermObject.name;
          const yearString = currentYear?.year || "";
          setTermTitle(`${termName} - Academic Year ${yearString}`);
          
          // Reset form
          setSelectedTerm("");
          setClassTerms(prev => prev.map(term => ({
            ...term,
            termEndsOn: '',
            nextTermStartsOn: ''
          })));
        } else {
          throw new Error(data.message || "Failed to create term");
        }

      } catch (error: unknown) {
        console.error("Request failed:", {
          error,
          type: typeof error,
          isError: error instanceof Error,
          message: error instanceof Error ? error.message : String(error)
        });

        if (error instanceof Error) {
          if (error.message.includes('Unique constraint failed') || 
              error.message.includes('already exists')) {
            setError(`Term "${selectedTermObject.name}" already exists for this academic year`);
          } else if (error.message.includes('expired')) {
            setError("Your session has expired. Please log in again.");
          } else {
            setError(error.message);
          }
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      }
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
     
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">
          Set Current Term and Class Dates
        </h2>

        {termTitle && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
              {termTitle}
            </h2>
          </div>
        )}

        {apiError && (
          <Alert className="mb-6 border-yellow-400 text-yellow-700 bg-yellow-50">
            <AlertCircle className="h-4 w-4 inline-block mr-2" />
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label 
                htmlFor="year" 
                className="block text-gray-600 font-medium"
              >
                Academic Year
              </label>
              <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                {loading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : currentYear ? (
                  <span className="font-medium">{currentYear.year}</span>
                ) : (
                  <div>
                    <span className="text-gray-400">No academic year set</span>
                    <button 
                      type="button" 
                      onClick={() => window.location.href = '/admin/academic-year'}
                      className="ml-2 text-sm text-blue-500 hover:text-blue-700"
                    >
                      Create one
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="term" className="block text-gray-600 font-medium mb-2">
                Choose Current Term
              </label>
              {loading ? (
                <div className="w-full p-3 border border-gray-300 rounded-md text-gray-400">
                  Loading terms...
                </div>
              ) : (
                <select
                  id="term"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  disabled={!currentYear}
                >
                  <option value="">-- Select Term --</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Class-Specific Term Dates</h3>
            
            {loadingClasses ? (
              <div className="p-4 border border-gray-200 rounded-md text-gray-500">
                Loading classes...
              </div>
            ) : classTerms.length > 0 ? (
              <div className="space-y-4">
                {classTerms.map((classTerm, index) => (
                  <div key={classTerm.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-md">
                    <div>
                      <label className="block text-gray-600 font-medium">
                        {index + 1}. {classTerm.name}
                      </label>
                    </div>
                    
                    <div>
                      <label htmlFor={`termEnd-${classTerm.id}`} className="block text-gray-600 font-medium mb-2">
                        Term Ends On
                      </label>
                      <input
                        type="date"
                        id={`termEnd-${classTerm.id}`}
                        value={classTerm.termEndsOn}
                        onChange={(e) => handleDateChange(classTerm.id, 'termEndsOn', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`nextTermStart-${classTerm.id}`} className="block text-gray-600 font-medium mb-2">
                        Next Term Starts On
                      </label>
                      <input
                        type="date"
                        id={`nextTermStart-${classTerm.id}`}
                        value={classTerm.nextTermStartsOn}
                        onChange={(e) => handleDateChange(classTerm.id, 'nextTermStartsOn', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-md text-gray-500">
                No classes found. Please add classes to your system first.
              </div>
            )}
          </div>

          {error && (
            <Alert className="mt-4 border-red-400 text-red-600 bg-red-50">
              <AlertCircle className="h-4 w-4 inline-block mr-2" />
              {error}
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-green-400 text-green-600 bg-green-50">
              <Check className="h-4 w-4 inline-block mr-2" />
              Term {terms.find(t => t.id === selectedTerm)?.name} successfully set with class-specific dates.
            </Alert>
          )}

          <button
            type="submit"
            disabled={loading || loadingClasses || !selectedTerm || !currentYear || classTerms.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || loadingClasses ? 'Loading...' : 'Set Term'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CurrentTerm;