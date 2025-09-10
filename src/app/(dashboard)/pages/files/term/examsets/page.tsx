"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { env } from '@/env';

const API_BASE_URL = env.BACKEND_API_URL;

interface ClassOption {
  id: string;
  name: string;
}

interface TermData {
  id: string;
  name: string;
  academicYear: {
    id: string;
    year: string;
  };
}

const AssignExamSets = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [previousClass, setPreviousClass] = useState<string>('');
  const [previousTerms, setPreviousTerms] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [currentTerm, setCurrentTerm] = useState<TermData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const MAX_SELECTIONS = 3;
  
  const examTypes = [
    { id: 'bot', label: 'Beginning Of Term (BOT)', value: 'Beginning Of Term (BOT)' },
    { id: 'mid', label: 'Mid Term', value: 'Mid Term' },
    { id: 'eot', label: 'End Of Term (EOT)', value: 'End Of Term (EOT)' },
    { id: 'ca', label: 'Continuous Assessment (C.A)', value: 'Continuous Assessment (C.A)' }
  ];

  // Fetch classes and current term from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setError("Authentication error: No access token found");
          return;
        }

        // Fetch active term
        const termResponse = await fetch(`${API_BASE_URL}/api/v1/term/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const termData = await termResponse.json();
        
        if (termData.success && termData.term) {
          setCurrentTerm({
            id: termData.term.id,
            name: termData.term.name,
            academicYear: {
              id: termData.term.academicYear.id,
              year: termData.term.academicYear.year
            }
          });
        } else {
          setError("No active term found. Please set an active term first.");
        }
        
        // Fetch active classes
        const classesResponse = await fetch(`${API_BASE_URL}/api/v1/classes/filter?limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const classesData = await classesResponse.json();
        
        if (classesData.success && classesData.classes) {
          const activeClasses = classesData.classes
            .filter((cls: any) => cls.isActive)
            .map((cls: any) => ({
              id: cls.id,
              name: cls.name
            }));
          setClasses(activeClasses);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load classes or term data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(event.target.value);
    // Clear any previous success message when changing selection
    setSuccessMessage('');
  };

  const handleCheckboxTermChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    
    // Clear any previous success message when changing selection
    setSuccessMessage('');
    
    if (event.target.checked) {
      if (selectedTerms.length >= MAX_SELECTIONS) {
        setError(`You can only select up to ${MAX_SELECTIONS} exam sets`);
        event.target.checked = false;
        return;
      }
      setSelectedTerms(prev => Array.from(new Set([...prev, term]))); // Ensure unique values
    } else {
      setSelectedTerms(prev => prev.filter(t => t !== term));
    }
  };

  const showMessage = (text: string, type: string) => {
    if (type === "info") {
      setSuccessMessage(text);
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } else {
      setError(text);
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    // Check for no changes
    if (selectedClass === previousClass && JSON.stringify(selectedTerms) === JSON.stringify(previousTerms)) {
      showMessage("No changes made. Changes are the Same.", "info");
      setIsSubmitting(false);
      return;
    }

    // Update previous values
    setPreviousClass(selectedClass);
    setPreviousTerms(selectedTerms);

    try {
      // Validate all required fields
      if (!selectedClass) {
        setError("Please select a class");
        setIsSubmitting(false);
        return;
      }

      if (!currentTerm?.name) {
        setError("No active term found");
        setIsSubmitting(false);
        return;
      }

      if (!currentTerm?.academicYear?.year) {
        setError("No academic year found");
        setIsSubmitting(false);
        return;
      }

      if (selectedTerms.length === 0) {
        setError("Please select at least one exam set");
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("Authentication error: No access token found");
        setIsSubmitting(false);
        return;
      }

      // Match exactly what the backend expects
      const examSetsData = {
        classId: selectedClass,
        termName: currentTerm.name,
        academicYear: currentTerm.academicYear.year,
        examSets: selectedTerms
      };

      console.log('Submitting data:', examSetsData);

      const response = await fetch(`${API_BASE_URL}/api/v1/exams/assign-sets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(examSetsData)
      });

      const data = await response.json();
      console.log('Response:', data);

      // Check for success response
      if (data.status?.returnCode === "00" || data.success) {
        setSuccessMessage("Exam sets assigned successfully!");
        // Reset form
        setSelectedTerms([]);
        setSelectedClass('');
      } else {
        // Only throw error if it's actually an error
        const errorMessage = data.status?.returnMessage || data.message || 'Failed to assign exam sets';
        if (!errorMessage.toLowerCase().includes('success')) {
          throw new Error(errorMessage);
        } else {
          setSuccessMessage(errorMessage);
          // Reset form
          setSelectedTerms([]);
          setSelectedClass('');
        }
      }

    } catch (error) {
      console.error("Error saving exam sets:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to save. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        
        <h2 className="text-xl font-semibold text-center text-white bg-green-600 py-2 rounded-md mb-4">
          Assign Exam Sets to a Class
        </h2>
        
        <p className="text-red-600 font-semibold text-center mb-4">
          Note: Select only THREE Sets Per Class E.g B.O.T, E.O.T and CA
        </p>
        
        {successMessage && (
          <div className="p-3 mb-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-gray-600 font-medium">Term and Year</label>
            <div className="bg-gray-100 p-2 rounded-md shadow-inner">
              {loading ? 'Loading...' : currentTerm ? (
                `${currentTerm.name} - Academic Year ${currentTerm.academicYear.year}`
              ) : (
                'No active term found'
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-gray-600 font-medium">Select Class</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className={`w-full max-w-xs p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                !selectedClass ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading || isSubmitting}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-gray-600 font-medium block">
                Select Exam Sets <span className="text-red-500">*</span>
              </label>
              <span className="text-sm text-gray-500">
                Selected: {selectedTerms.length}/{MAX_SELECTIONS}
              </span>
            </div>
            <div className="w-full p-4 border border-gray-300 rounded-md bg-white space-y-3">
              {examTypes.map((examType) => (
                <div key={examType.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={examType.id}
                    value={examType.value}
                    onChange={handleCheckboxTermChange}
                    checked={selectedTerms.includes(examType.value)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    disabled={isSubmitting || !selectedClass || (selectedTerms.length >= MAX_SELECTIONS && !selectedTerms.includes(examType.value))}
                  />
                  <label
                    htmlFor={examType.id}
                    className="ml-2 text-gray-700 cursor-pointer select-none"
                  >
                    {examType.label}
                  </label>
                </div>
              ))}
            </div>
            {selectedTerms.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Please select at least one exam set
              </p>
            )}
          </div>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || !selectedClass || selectedTerms.length === 0 || !currentTerm}
            className={`w-full py-3 rounded-md font-semibold transition-colors ${
              isSubmitting || !selectedClass || selectedTerms.length === 0 || !currentTerm
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Term Papers'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssignExamSets;