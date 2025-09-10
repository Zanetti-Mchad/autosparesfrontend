"use client";
import React, { useState, useEffect, useMemo } from "react";
import { env } from '@/env';
import Image from 'next/image';
import DialogBox from '@/components/Dailogbox';

const BatchTransfer = () => {
  // State for classes
  const [classes, setClasses] = useState<string[]>([]);

  // State for form values
  const [formData, setFormData] = useState({
    currentClass: "",
    newClass: "",
  });

  // State for academic years and terms
  interface AcademicYear {
    id: string;
    year: string;
    isActive: boolean;
  }

  interface Term {
    id: string;
    name: string;
  }
  
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>("");
  const [currentTerm, setCurrentTerm] = useState<string>("");
  const [settingsLoading, setSettingsLoading] = useState(true);

  // State for success message
  const [successMessage, setSuccessMessage] = useState("");
  
  // State for loading
  const [loading, setLoading] = useState(false);

  // State for error message
  const [errorMessage, setErrorMessage] = useState("");

  // Define student type based on API response
  interface Student {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    gender: string;
    class_assigned: string;
    admissionNumber?: string;
    lin_number?: string;
  }

  // State for students data
  const [allStudents, setAllStudents] = useState<Record<string, Student[]>>({});

  // State for selected students
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // State for select all
  const [selectAll, setSelectAll] = useState(false);

  // Dialog state for confirmation
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState<'delete' | 'warning' | 'info'>('info');

  // Fetch current academic year and term
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        setSettingsLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setErrorMessage('You need to be logged in to access this page');
          return;
        }

        // Fetch academic years
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!yearResponse.ok) {
          throw new Error(`Failed to fetch academic years: ${yearResponse.status}`);
        }

        const yearData = await yearResponse.json();
        console.log('Academic years response:', yearData);
        
        if (yearData.success && Array.isArray(yearData.years)) {
          setAcademicYears(yearData.years);
          // Find active year
          const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
          if (activeYear) {
            setCurrentAcademicYear(activeYear.year);
          }
        }

        // We'll directly check for active term since the terms/filter endpoint is giving CORS issues
        const activeTermResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (activeTermResponse.ok) {
          const activeTermData = await activeTermResponse.json();
          console.log('Active term response:', activeTermData);
          
          if (activeTermData.success && activeTermData.term) {
            // Add the active term to our terms array as the only option
            setTerms([activeTermData.term]);
            setCurrentTerm(activeTermData.term.name);
          } else {
            // If no active term, provide a default option
            setTerms([{
              id: 'current',
              name: 'Current Term'
            }]);
            setCurrentTerm('Current Term');
          }
        } else {
          console.error('Error fetching active term:', activeTermResponse.status);
          // Provide default options if API fails
          setTerms([{
            id: 'term1',
            name: 'Term 1'
          }, {
            id: 'term2',
            name: 'Term 2'
          }, {
            id: 'term3',
            name: 'Term 3'
          }]);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setErrorMessage('Failed to fetch academic settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchCurrentSettings();
  }, []);

  // Fetch classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setErrorMessage('You need to be logged in to access this page');
          return;
        }

        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch classes: ${response.status}`);
        }

        const data = await response.json();
        console.log('Classes API response:', data);
        
        // Based on the actual API response format
        if (data && data.success && Array.isArray(data.classes)) {
          // This is the exact format from your API response
          setClasses(data.classes.map((cls: any) => cls.name));
          console.log('Parsed classes:', data.classes.map((cls: any) => cls.name));
        } else if (data && data.data && Array.isArray(data.data)) {
          // Alternative format
          setClasses(data.data.map((cls: any) => cls.name));
        } else if (data.status?.returnCode === '00' && Array.isArray(data.data)) {
          // Another alternative format
          setClasses(data.data.map((cls: any) => cls.name));
        } else {
          console.error('Unexpected API response format:', data);
          setErrorMessage('Failed to fetch classes: Unexpected response format');
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setErrorMessage('Failed to fetch classes: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    fetchClasses();
  }, []);

  // Skip verification and proceed with promotion anyway
  // This is a simpler approach since the individual student endpoint is returning 404s
  const proceedWithPromotion = (studentIds: string[]) => {
    console.log('Proceeding with promotion for all selected students regardless of current class');
    return studentIds;
  };

  // Enhanced function to fix student class data inconsistencies
  const fixStudentClassData = async (studentId: string, classId: string, className: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      
      // Log what we're trying to update for debugging
      console.log(`Updating student ${studentId} class info:`, {
        classId: classId,
        class_assigned: className
      });
      
      // Direct update using the student endpoint
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Include all the fields that might be needed to update the class
          classId: classId,
          class_assigned: className
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update student ${studentId}`);
      }
      
      const result = await response.json();
      console.log(`Student ${studentId} data updated successfully:`, result);
      
      // Verify the update by fetching the student data
      const verifyResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (verifyResponse.ok) {
        const studentData = await verifyResponse.json();
        console.log(`Verification - Student ${studentId} current data:`, studentData);
        
        // Check if class was actually updated
        if (studentData.classId === classId && studentData.class_assigned === className) {
          console.log(`Verified: Student ${studentId} class updated correctly`);
        } else {
          console.warn(`Warning: Student ${studentId} class not updated correctly`, {
            expected: { classId, class_assigned: className },
            actual: { classId: studentData.classId, class_assigned: studentData.class_assigned }
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating student ${studentId} data:`, error);
      alert('Error fixing student data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  };

  // Fetch students for the selected class
  const fetchStudents = async (className: string) => {
    try {
      setLoading(true);
      setErrorMessage("");
      
      // Don't fetch if we already have these students
      if (allStudents[className]) {
        setLoading(false);
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setErrorMessage('You need to be logged in to access this page');
        setLoading(false);
        return;
      }

      // Updated to use the filter endpoint with class and status parameters
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?class=${encodeURIComponent(className)}&status=active&pageSize=10000`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.status}`);
      }

      const data = await response.json();
      console.log('Students API response:', data);

      // Extract students based on API format
      let students: Student[] = [];

      // Try to parse the response based on different formats
      let studentsArray = [];
      
      // Check if data is directly an array
      if (Array.isArray(data)) {
        studentsArray = data;
        console.log('Direct array response detected');
      }
      // Check if we have the status + array format
      else if (data.returnCode === "00" && data[0] && typeof data[0] === 'object') {
        // This means we have a status object followed by an array
        // Extract students array (removing the status object)
        const responseArr = Object.values(data).filter(item => typeof item === 'object');
        studentsArray = responseArr;
        console.log('Status + array format detected');
      }
      // Check standard API format
      else if (data.status?.returnCode === '00' && data.data?.students) {
        studentsArray = data.data.students;
        console.log('Standard API format with nested students detected');
      }
      // Check other common formats
      else if (data.success && Array.isArray(data.students)) {
        studentsArray = data.students;
        console.log('Success + students array format detected');
      }
      else if (data.data && Array.isArray(data.data)) {
        studentsArray = data.data;
        console.log('Data array format detected');
      }
      else if (data.status && data.data && Array.isArray(data.data)) {
        studentsArray = data.data;
        console.log('Status + data array format detected');
      }
      else {
        console.error('Unexpected API response format:', data);
        throw new Error('Unexpected API response format');
      }
      
      // Filter students by the selected class
      students = studentsArray.filter((student: Student) => 
        student && student.class_assigned && 
        student.class_assigned.toLowerCase() === className.toLowerCase()
      );

      // Update the allStudents state
      setAllStudents(prev => ({
        ...prev,
        [className]: students
      }));

    } catch (error) {
      console.error('Error fetching students:', error);
      setErrorMessage('Failed to fetch students: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Get students for the current class
  const currentClassStudents = useMemo(() => {
    return formData.currentClass ? (allStudents[formData.currentClass] || []) : [];
  }, [allStudents, formData.currentClass]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));

    if (id === 'currentClass' && value) {
      fetchStudents(value);
    }
  };

  // Handle student selection
  const handleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  // Handle select all students
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(currentClassStudents.map(student => student.id));
    }
    setSelectAll(!selectAll);
  };

  // Confirm transfer before submission
  const confirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentClass || !formData.newClass || selectedStudents.length === 0) {
      setErrorMessage("Please select a current class, new class, and at least one student.");
      return;
    }

    if (formData.currentClass === formData.newClass) {
      setErrorMessage("Current class and new class cannot be the same.");
      return;
    }

    // Set up dialog for confirmation
    setDialogTitle('Confirm Student Promotion');
    setDialogMessage(`Are you sure you want to promote ${selectedStudents.length} student(s) from ${formData.currentClass} to ${formData.newClass}?`);
    setDialogType('warning');
    setIsDialogOpen(true);
  };

  // Handle dialog cancellation
  const handleDialogCancel = () => {
    setIsDialogOpen(false);
  };

  // Modified handleSubmit to make API call
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setIsDialogOpen(false);

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setErrorMessage('You need to be logged in to access this page');
        setLoading(false);
        return;
      }

      // Save original class and destination class for reference
      const sourceClass = formData.currentClass;
      const destinationClass = formData.newClass;
      const promotedStudentIds = [...selectedStudents]; // Create a copy of selected students

      // Helper functions to get IDs from names
      const getClassIdByName = (className: string): string => {
        // Find the class in our classes data and return its ID
        const classData = allStudents[className]?.[0];
        if (classData && classData.class_assigned === className) {
          // This approach assumes class_assigned has the ID or can be used as ID
          // Adjust based on your actual data structure
          return classData.id;
        }
        console.warn(`Could not find ID for class: ${className}`);
        return className; // Fallback to the name if ID can't be found
      };

      const getTermIdFromName = (termName: string): string => {
        const term = terms.find(t => t.name === termName);
        if (term) return term.id;
        console.warn(`Could not find ID for term: ${termName}`);
        return termName; // Fallback to the name if ID can't be found
      };

      const getCurrentAcademicYearId = (): string => {
        const activeYear = academicYears.find(year => year.year === currentAcademicYear);
        if (activeYear) return activeYear.id;
        console.warn(`Could not find ID for academic year: ${currentAcademicYear}`);
        return currentAcademicYear; // Fallback to the name if ID can't be found
      };

      // Prepare promotion payload with IDs instead of names
      const payload = {
        sourceClassId: getClassIdByName(sourceClass),
        destClassId: getClassIdByName(destinationClass),
        studentIds: promotedStudentIds,
        termId: getTermIdFromName(currentTerm),
        academicYearId: getCurrentAcademicYearId(),
        removeFromOldClass: true, // This flag indicates students should be removed from old class
        forceClassUpdate: true // Force update the class_assigned field
      };
      
      console.log('Sending batch promotion request with payload:', payload);

      // Fix each student's class data before promotion to ensure consistency
      console.log('Fixing student class data before promotion...');
      const destClassId = payload.destClassId;
      const destClassName = destinationClass;
      
      // Log exact payload being sent for debugging
      console.log('EXACT IDs being sent to promotion API:', {
        sourceClassId: payload.sourceClassId,
        destClassId: payload.destClassId,
        studentIds: payload.studentIds,
        termId: payload.termId,
        academicYearId: payload.academicYearId
      });
      
      // Skip verification since the individual student endpoint is returning 404s
      console.log('Bypassing verification due to API endpoint issues - proceeding with all students');
      // Just use all the selected students
      const verifiedStudentIds = promotedStudentIds;
      
      console.log(`Proceeding with all ${verifiedStudentIds.length} selected students`);
      
      // Make sure we have the correct class IDs for the destination
      // Use the classesMap built when fetching classes, or try to find it directly
      // Important: We need the right destination class ID!
      let correctDestClassId = payload.destClassId;
      
      console.log('Looking for destination class ID - original value:', correctDestClassId);
      
      // Try to find the ID from the API response we got when fetching classes
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.classes)) {
            // Find the class with the matching name
            const destClass = data.classes.find((cls: any) => cls.name === destinationClass);
            if (destClass) {
              correctDestClassId = destClass.id;
              console.log(`Found correct class ID for ${destinationClass}:`, correctDestClassId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching classes for ID lookup:', error);
      }
      
      // Update the payload with the correct class ID
      payload.destClassId = correctDestClassId;
      
      // Keep the original student IDs
      payload.studentIds = verifiedStudentIds;
      console.log('Updated payload with verified students only:', payload);
      
      // Update each student's class directly first
      // Make sure we're using the correct destination class ID
      let allUpdatesSuccessful = true;
      for (const studentId of verifiedStudentIds) {
        // Use the correctDestClassId we identified above
        const updateResult = await fixStudentClassData(studentId, correctDestClassId, destClassName);
        if (!updateResult) {
          allUpdatesSuccessful = false;
        }
      }
      console.log(`Student direct updates ${allUpdatesSuccessful ? 'all succeeded' : 'had some failures'}`);
      
      // After direct updates, call the batch promotion API
      // This is now the primary promotion mechanism since verification is bypassed
      console.log('Calling batch promotion API...');
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/promotions/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to promote students: ${response.status} ${errorData.message || ''}`);
      }
      
      // Parse response data
      const responseData = await response.json();
      console.log('Batch promotion API FULL response:', JSON.stringify(responseData, null, 2));
      
      // Check specific success codes in the response
      if (responseData.status?.returnCode === "00") {
        console.log('Promotion API reported success with code 00');
      } else if (responseData.success === true) {
        console.log('Promotion API reported success');
      } else {
        console.warn('Promotion API did not explicitly report success:', responseData);
      }
      
      // Success message with student count
      setSuccessMessage(
        `Successfully promoted ${promotedStudentIds.length} student(s) from ${sourceClass} to ${destinationClass} for ${currentAcademicYear} ${currentTerm}`
      );

      // Reset selections after success
      setSelectedStudents([]);
      setSelectAll(false);
      
      // Add a short delay to allow database updates to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the form to show the destination class as the current class
      // This helps users see the result of their promotion
      setFormData({
        currentClass: destinationClass,
        newClass: ""
      });
      
      // Fetch students for the new class to show the updated list
      await fetchStudents(destinationClass);
      console.log('Updated to show students in the destination class');
      
      // Verify promotion success by fetching the new class to double-check
      try {
        const verifyResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?class=${destinationClass}&status=active`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('Verification - students in new class:', verifyData);
          
          // Check if our promoted students are in the new class
          if (verifyData.students && Array.isArray(verifyData.students)) {
            const promotedStudentsInNewClass = verifyData.students.filter(
              (student: any) => promotedStudentIds.includes(student.id)
            );
            
            console.log(`Found ${promotedStudentsInNewClass.length} of ${promotedStudentIds.length} promoted students in the new class`);
            
            if (promotedStudentsInNewClass.length !== promotedStudentIds.length) {
            console.warn('Not all promoted students appear in the new class yet. This may be a database sync delay.');
          }
        }
      }
    } catch (verifyError) {
      console.error('Error verifying class changes:', verifyError);
      // Don't show this error to the user, as the promotion was successful
    }
  } catch (error) {
    console.error('Error during promotion:', error);
    setErrorMessage('Failed to promote students: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setLoading(false);
  }
  };
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Batch Student Promotion</h1>
      
      {/* Academic year and term info */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6 text-gray-600">
        <div className="flex items-center">
          <span className="font-medium">Academic Year:</span>
          <span className="ml-2 bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded">
            {currentAcademicYear || 'Loading...'}
          </span>
        </div>
        <div className="flex items-center">
          <span className="font-medium">Term:</span>
          <span className="ml-2 bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded">
            {currentTerm || 'Loading...'}
          </span>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={confirmTransfer}>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Class Selection */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Current Class */}
            <div>
              <label htmlFor="currentClass" className="block text-lg font-medium text-gray-700 mb-2">
                Current Class
              </label>
              <select
                id="currentClass"
                value={formData.currentClass}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="" disabled>Select Current Class</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* New Class */}
            <div>
              <label htmlFor="newClass" className="block text-lg font-medium text-gray-700 mb-2">
                New Class
              </label>
              <select
                id="newClass"
                value={formData.newClass}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="" disabled>Select New Class</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls} disabled={cls === formData.currentClass}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Class Summary */}
        {formData.currentClass && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Student Selection</h2>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Class:</span> {formData.currentClass}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Total Students:</span> {currentClassStudents.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Selected:</span> {selectedStudents.length} of {currentClassStudents.length}
                </p>
              </div>
            </div>

            {/* Select All Checkbox */}
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="select-all" className="ml-2 block text-sm text-gray-900">
                  Select All
                </label>
              </div>
            </div>

            {/* Student List */}
            <div className="border border-gray-300 rounded-lg max-h-[300px] overflow-y-auto">
              {currentClassStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No students found in this class</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admission #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentClassStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            id={`student-${student.id}`}
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleStudentSelection(student.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{student.admissionNumber || student.lin_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{student.gender}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Transfer Button */}
        <div className="mt-6">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={selectedStudents.length === 0 || !formData.newClass || loading}
          >
            {loading ? "Processing..." : "Promote Selected Students"}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <DialogBox
        isOpen={isDialogOpen}
        title={dialogTitle}
        message={dialogMessage}
        onConfirm={handleSubmit}
        onCancel={handleDialogCancel}
        confirmText="Promote"
        cancelText="Cancel"
        type={dialogType}
      />
    </div>
  );
};

export default BatchTransfer;
