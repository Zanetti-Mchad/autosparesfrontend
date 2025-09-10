"use client";
import React, { useState, useEffect, Suspense } from "react";
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { env } from "@/env";

// Define the types for our data
interface ClassUser {
  id: string;
  name: string;       // Changed to match class properties needed in the dropdown
  section?: string;  // Added to match class properties needed in the dropdown
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  subjectId?: string;
  activityType?: string;
}

interface Assignment {
  id: string;
  userId: string;            // class ID
  subjectActivityId: string; // Subject ID
  classId: string;          // Class ID
  academicYearId?: string;
  termId?: string;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

interface Term {
  id: string;
  name: string;
  academicYear: {
    id: string;
    year: string;
  };
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

const AssignSubjectsToClassesView = () => {
  const searchParams = useSearchParams();
  const classIdFromUrl = searchParams ? searchParams.get('classId') : null;
  
  // State for data
  const [classUsers, setClassUsers] = useState<ClassUser[]>([]);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [selectedClassInfo, setSelectedClassInfo] = useState<ClassItem | null>(null);
  
  // State for selections
  const [selectedClassUser, setSelectedClassUser] = useState<string>(classIdFromUrl || "");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Data will be fetched from API, no mock data needed

  // Define API settings - use proxy to avoid CORS issues
  // Routes through next.config.js proxy instead of calling the API directly
  const API_BASE_URL = '';

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        };

        // Fetch classes from API using proxy
        const classesResponseForDropdown = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`, { headers });
        const classesDataForDropdown = await classesResponseForDropdown.json();
        const classesListForDropdown = classesDataForDropdown?.classes || classesDataForDropdown?.data?.classes || classesDataForDropdown;
        setClassUsers(Array.isArray(classesListForDropdown) ? classesListForDropdown.map(c => ({
          id: c.id,
          name: c.name,
          section: c.section
        })) : []);
        console.log('Classes data for dropdown:', classesDataForDropdown);
        
        // Fetch current term and academic year using proxy
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, { headers });
        const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, { headers });
        
        // Process current term data with improved extraction logic
        if (termResponse.ok) {
          const termData = await termResponse.json();
          console.log('Current term data raw:', termData);
          
          // Handle all possible response formats
          let termInfo = null;
          if (termData?.term) {
            // Format: { term: {...} }
            termInfo = termData.term;
          } else if (termData?.data?.term) {
            // Format: { data: { term: {...} } }
            termInfo = termData.data.term;
          } else if (termData?.data) {
            // Format: { data: {...} }
            termInfo = termData.data;
          } else {
            // Direct format: {...}
            termInfo = termData;
          }
          
          setCurrentTerm(termInfo);
          console.log('Processed term data:', termInfo);
        }
        
        // Process academic year data with more comprehensive format handling
        if (yearResponse.ok) {
          const yearData = await yearResponse.json();
          console.log('Academic year data raw:', JSON.stringify(yearData, null, 2));
          
          // Log all possible paths to help debug
          console.log('Checking possible paths for academic years:');
          console.log('Is Array?', Array.isArray(yearData));
          console.log('yearData.academicYears exists?', Boolean(yearData?.academicYears));
          console.log('yearData.academic_years exists?', Boolean(yearData?.academic_years));
          console.log('yearData.data exists?', Boolean(yearData?.data));
          console.log('yearData.years exists?', Boolean(yearData?.years));
          
          // Handle all possible response formats to extract the years array
          let years = [];
          
          if (Array.isArray(yearData)) {
            console.log('Using direct array format');
            years = yearData;
          } else if (yearData?.academicYears && Array.isArray(yearData.academicYears)) {
            console.log('Using academicYears format');
            years = yearData.academicYears;
          } else if (yearData?.academic_years && Array.isArray(yearData.academic_years)) {
            console.log('Using academic_years format');
            years = yearData.academic_years;
          } else if (yearData?.years && Array.isArray(yearData.years)) {
            console.log('Using years format');
            years = yearData.years;
          } else if (yearData?.data && Array.isArray(yearData.data)) {
            console.log('Using data array format');
            years = yearData.data;
          } else if (yearData?.data?.academicYears && Array.isArray(yearData.data.academicYears)) {
            console.log('Using data.academicYears format');
            years = yearData.data.academicYears;
          } else if (yearData?.data?.years && Array.isArray(yearData.data.years)) {
            console.log('Using data.years format');
            years = yearData.data.years;
          } else {
            // If we have a single year object instead of an array
            if (yearData?.id && yearData?.year) {
              console.log('Using single year object format');
              years = [yearData];
            } else if (yearData?.data?.id && yearData?.data?.year) {
              console.log('Using data.year single object format');
              years = [yearData.data];
            }
          }
          
          console.log('Extracted years array:', years);
          
          // Find active year or use first one if available
          if (years.length > 0) {
            const currentYearData = years.find((year: AcademicYear) => year.isActive) || years[0];
            setCurrentYear(currentYearData);
            console.log('Selected year data:', currentYearData);
          } else {
            console.error('No academic years found in any expected format');
          }
        }
        
        // Note: We already fetched classes above, no need to fetch them again
        // If we have a classId from URL, set it as selected
        if (classIdFromUrl) {
          // Find the matching class info
          const matchingClass = classesListForDropdown?.find((c: any) => c.id.toString() === classIdFromUrl.toString());
          if (matchingClass) {
            setSelectedClassInfo({
              id: matchingClass.id,
              name: matchingClass.name,
              section: matchingClass.section
            });
          }
        }
        
        // Fetch subjects using the filter endpoint through proxy
        try {
          const subjectsResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/subjects/filter?limit=100`, { headers });
          const subjectsData = await subjectsResponse.json();
          console.log('Subjects data:', subjectsData);
          
          // Handle different response formats based on the shown structure
          let subjectItems = [];
          if (subjectsData?.success && Array.isArray(subjectsData.subjects)) {
            // This matches the actual API response structure you provided
            subjectItems = subjectsData.subjects;
          } else if (Array.isArray(subjectsData)) {
            subjectItems = subjectsData;
          } else if (subjectsData?.data && Array.isArray(subjectsData.data)) {
            subjectItems = subjectsData.data;
          }
          
          setSubjects(subjectItems);
        } catch (subjectError) {
          console.error('Error fetching subjects:', subjectError);
          // Continue with other API calls even if subjects fail
        }
        
        // Term and academic year data are already fetched earlier in this function using the proxy approach
        
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("Failed to load necessary data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [classIdFromUrl]); // Added classIdFromUrl as dependency

  // Handle subject selection
  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Basic validation
    if (!selectedClassUser) {
      setError("Please select a class.");
      return;
    }
    
    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    // Log selection for debugging
    console.log('Selected subjects count:', selectedSubjects.length);
    console.log('Selected subject IDs:', selectedSubjects);
    
    // Start loading state
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      // Get authentication token
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError("Not authenticated. Please login again.");
        setIsLoading(false);
        return;
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      // First check if any of these assignments already exist to prevent duplicates
      const checkResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/class-subject-assignments/assignments?classId=${selectedClassUser}`, { headers });
      const checkData = await checkResponse.json();
      
      // Extract existing assignments from response
      let existingAssignments: Assignment[] = [];
      if (checkData?.data?.assignments && Array.isArray(checkData.data.assignments)) {
        existingAssignments = checkData.data.assignments;
      } else if (checkData?.assignments && Array.isArray(checkData.assignments)) {
        existingAssignments = checkData.assignments;
      } else if (Array.isArray(checkData)) {
        existingAssignments = checkData;
      } else if (checkData?.data && Array.isArray(checkData.data)) {
        existingAssignments = checkData.data;
      }
      
      console.log('Existing assignments:', existingAssignments);
      
      // Categorize subjects as already assigned or needing assignment
      const alreadyAssignedSubjects: string[] = [];
      const subjectsToAssign: string[] = [];
      
      for (const subjectId of selectedSubjects) {
        const alreadyExists = existingAssignments.some(
          assignment => assignment.subjectActivityId === subjectId
        );
        
        if (alreadyExists) {
          const subjectName = subjects.find(s => s.id === subjectId)?.name || subjectId;
          alreadyAssignedSubjects.push(subjectName);
        } else {
          subjectsToAssign.push(subjectId);
        }
      }
      
      // If all subjects are already assigned, show an error and stop
      if (alreadyAssignedSubjects.length > 0 && subjectsToAssign.length === 0) {
        setError(`All selected subjects are already assigned to this class and class: ${alreadyAssignedSubjects.join(', ')}`);
        setIsLoading(false);
        return;
      }
      
      // Show a warning if some subjects are already assigned
      if (alreadyAssignedSubjects.length > 0) {
        console.warn(`These subjects are already assigned: ${alreadyAssignedSubjects.join(', ')}`);
        setError(`Note: ${alreadyAssignedSubjects.join(', ')} already assigned. Processing only the new subjects.`);
      }
      
      // Track results
      const results = {
        successful: [] as string[],
        failed: [] as {subject: string, error: string}[]
      };
      
      // Process each new subject one by one
      for (const subjectId of subjectsToAssign) {
        try {
          // Get subject name for better logging
          const subjectName = subjects.find(s => s.id === subjectId)?.name || subjectId;
          
          // Match the exact field names from the database schema
          const assignment = {
            classId: selectedClassUser,            // Using classId for the class
            subjectActivityId: subjectId,      // Schema uses subjectActivityId (not subjectId)
            academicYearId: currentTerm?.academicYear?.id || currentYear?.id || null,
            termId: currentTerm?.id || null,
            // Adding createdById which is required by the schema
            createdById: localStorage.getItem('userId') || "system"      // Use user ID if available, otherwise system
          };

          console.log(`Sending assignment for subject ${subjectName}:`, assignment);
          
          // Use the proxied API route with the updated endpoint
          const response = await fetch(`${env.BACKEND_API_URL}/api/v1/class-subject-assignments/add-assignment`, {
            method: 'POST',
            headers,
            body: JSON.stringify(assignment),
          });
          
          // Check individual response
          if (response.ok) {
            console.log(`Successfully assigned subject: ${subjectName}`);
            results.successful.push(subjectName);
          } else {
            const errorData = await response.json();
            console.error(`Failed to assign subject ${subjectName}:`, errorData);
            results.failed.push({ subject: subjectName, error: errorData?.message || 'Unknown error' });
          }
        } catch (subjectError) {
          console.error(`Error processing subject ${subjectId}:`, subjectError);
          results.failed.push({ subject: subjectId, error: 'Processing error' });
        }
      }
      
      // Update UI based on results
      if (results.successful.length > 0) {
        // Get display data for success message
        const classItem = classUsers.find(c => c.id === selectedClassUser);
        
        const termText = currentTerm
          ? ` for ${currentTerm.name} (${currentTerm.academicYear.year})` 
          : '';
        
        // Show how many subjects were successfully assigned
        if (results.failed.length === 0) {
          // All subjects were successful
          setSuccessMessage(
            `Successfully assigned ${results.successful.join(", ")} to class ${classItem?.name}${termText}.`
          );
          // Clear any previous error message if showing partial success
          if (!alreadyAssignedSubjects.length) {
            setError("");
          }
        } else {
          // Some subjects failed
          setSuccessMessage(
            `Successfully assigned ${results.successful.join(", ")} to class ${classItem?.name}${termText}. However, some subjects failed to assign.`
          );
          
          // Also set an error message for the failed subjects
          const failedSubjects = results.failed.map(f => f.subject).join(", ");
          setError(`Failed to assign: ${failedSubjects}. Please try again.`);
        }
        
        // Reset subject selection only if all were successful and none were already assigned
        if (results.failed.length === 0 && alreadyAssignedSubjects.length === 0) {
          setSelectedSubjects([]);
        } else {
          // Keep only the failed subjects selected for retry
          const failedIds = subjects
            .filter(s => results.failed.some(f => f.subject === s.name))
            .map(s => s.id);
          
          setSelectedSubjects(failedIds);
        }
      } else if (subjectsToAssign.length > 0) {
        // All new subjects failed to assign
        setSuccessMessage("");
        setError("Failed to save assignments. Please try again.");
      }
      
    } catch (err: any) {
      console.error("Error assigning class subjects:", err);
      setError("Failed to save assignments. Please try again.");
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear messages after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-200 py-8">
  
      {/* Content Wrapper */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h2 className="text-3xl font-semibold text-center text-green-700 mb-2">
          Assign Subjects to Classes
        </h2>
        
        {/* Academic Year and Term Info */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
            <h3 className="text-sm font-semibold text-green-800 mb-1">Current Academic Year</h3>
            <p className="text-lg font-bold text-green-700">
              {/* Add more fallbacks and display debug info */}
              {currentYear ? (
                <>
                  {currentYear.year || 'Year property missing'}
                  {process.env.NODE_ENV === 'development' && !currentYear.year && (
                    <span className="block text-xs text-red-500 mt-1">
                      Year missing! Available props: {Object.keys(currentYear).join(', ')}
                    </span>
                  )}
                </>
              ) : (
                'Not set'
              )}
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
            <h3 className="text-sm font-semibold text-green-800 mb-1">Current Term</h3>
            <p className="text-lg font-bold text-green-700">
              {currentTerm?.name || 'Not set'}
            </p>
          </div>
        </div>

        {/* Selected Class Info */}
        {selectedClassInfo && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 text-center">
            <p className="text-lg font-medium text-green-800">
              Selected Class: <span className="font-bold">{selectedClassInfo.name}</span>
              {selectedClassInfo.section && <span> ({selectedClassInfo.section})</span>}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-700 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Class Selection - only show if not already selected from previous page */}
              {!selectedClassInfo && (
                <div>
                  <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Class
                  </label>
                  <select
                    id="classSelect"
                    value={selectedClassUser}
                    onChange={(e) => setSelectedClassUser(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                  >
                    <option value="">-- Select a Class --</option>
                    {Array.isArray(classUsers) && classUsers.length > 0 ? (
                      classUsers.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name} {classItem.section && `(${classItem.section})`}
                        </option>
                      ))
                    ) : (
                      <option value="">No classes available</option>
                    )}
                  </select>
                </div>
              )}

              {/* This div remains empty to maintain grid layout */}
              <div></div>
            </div>

            {/* Subject Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Select Subjects to Assign</h3>
              
              {Array.isArray(subjects) && subjects.length > 0 ? (
                <div className="grid grid-cols-4 gap-4 mt-2">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center">
                      <input
                        id={`subject-${subject.id}`}
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => toggleSubjectSelection(subject.id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`subject-${subject.id}`} className="ml-2 block text-sm text-gray-700">
                        {subject.name} {subject.code && `(${subject.code})`}
                        {subject.activityType && <span className="text-xs text-gray-500 ml-1">({subject.activityType})</span>}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-700">
                  No subjects available. Please add subjects first.
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
                <p>{error}</p>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
                <p>{successMessage}</p>
              </div>
            )}

            {/* Submit and cancel buttons */}
            <div className="flex justify-between items-center mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Assign Subjects
              </button>
              <button
                type="button"
                className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                onClick={() => window.location.href = '/pages/classroommanagement/assignsubjecttoclass'}
              >
                Back to List
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const AssignSubjectsToClassesPage = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading subject assignment details...</p></div>}>
      <AssignSubjectsToClassesView />
    </Suspense>
  );
};

export default AssignSubjectsToClassesPage;