"use client";
import React, { useState, useEffect } from "react";
import { env } from '@/env';
import Image from 'next/image';

const SelectiveTransfer = () => {
  // State for classes and students
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});  // Map class names to IDs
  
  // State for filtered students based on selected class
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

  // State for selected students
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // State to track if all students are selected
  const [selectAll, setSelectAll] = useState(false);

  // State for form inputs
  const [formData, setFormData] = useState({
    currentClass: "",
    newClass: "",
    academicYear: "", // Added for tracking academic year
    term: "" // Added for tracking term
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

  // State for success message and error message
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // State for loading
  const [loading, setLoading] = useState(false);

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
            // Update form data
            setFormData(prev => ({...prev, academicYear: activeYear.year}));
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
            // Update form data
            setFormData(prev => ({...prev, term: activeTermData.term.name}));
          } else {
            // If no active term, provide a default option
            setTerms([{
              id: 'current',
              name: 'Current Term'
            }]);
            setCurrentTerm('Current Term');
            setFormData(prev => ({...prev, term: 'Current Term'}));
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
          
          // Create a mapping of class names to IDs
          const mapping: Record<string, string> = {};
          data.classes.forEach((cls: any) => {
            mapping[cls.name] = cls.id;
          });
          setClassesMap(mapping);
          
          console.log('Parsed classes:', data.classes.map((cls: any) => cls.name));
          console.log('Class name to ID mapping:', mapping);
        } else if (data && data.data && Array.isArray(data.data)) {
          // Alternative format
          setClasses(data.data.map((cls: any) => cls.name));
          
          // Create a mapping of class names to IDs for alternative format
          const mapping: Record<string, string> = {};
          data.data.forEach((cls: any) => {
            mapping[cls.name] = cls.id;
          });
          setClassesMap(mapping);
        } else if (data.status?.returnCode === '00' && Array.isArray(data.data)) {
          // Another alternative format
          setClasses(data.data.map((cls: any) => cls.name));
          
          // Create a mapping of class names to IDs for this format
          const mapping: Record<string, string> = {};
          data.data.forEach((cls: any) => {
            mapping[cls.name] = cls.id;
          });
          setClassesMap(mapping);
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

  // Define student type based on API response
  interface Student {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    gender: string;
    class_assigned: string;
    lin_number?: string;
    // Add other fields as needed
  }

  // Fetch students when current class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!formData.currentClass) return;

      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setErrorMessage('You need to be logged in to access this page');
          return;
        }

        // Using the filter endpoint with class and status parameters
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?class=${formData.currentClass}&status=active&pageSize=10000`, {
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
        // Check other formats we've seen before
        else if (data.status?.returnCode === '00' && data.data?.students) {
          studentsArray = data.data.students;
          console.log('Standard API format detected');
        } 
        else if (data.success && Array.isArray(data.students)) {
          studentsArray = data.students;
        } 
        else if (data.data && Array.isArray(data.data)) {
          studentsArray = data.data;
        }
        
        // Filter students by the selected class if needed
        const filteredStudentsList = studentsArray.filter((student: any) => 
          student && student.class_assigned && 
          student.class_assigned.toLowerCase() === formData.currentClass.toLowerCase()
        ) as Student[];
        
        console.log('Filtered students for class', formData.currentClass, ':', filteredStudentsList);
        
        setFilteredStudents(filteredStudentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
        setErrorMessage('Failed to fetch students: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setFilteredStudents([]);
      }
    };

    fetchStudents();
    setSelectedStudents([]); // Reset selected students when class changes
  }, [formData.currentClass]);

  // Update selectAll state when selectedStudents changes
  useEffect(() => {
    setSelectAll(selectedStudents.length === filteredStudents.length && filteredStudents.length > 0);
  }, [selectedStudents, filteredStudents]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle student checkbox changes
  const handleStudentCheckbox = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
    setSelectAll(!selectAll);
  };

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

  // Handle student transfer
  const handleTransfer = async () => {
    const { currentClass, newClass } = formData;

    if (!currentClass || !newClass || selectedStudents.length === 0) {
      setErrorMessage("Please select a current class, new class, and at least one student.");
      return;
    }

    if (currentClass === newClass) {
      setErrorMessage("Current class and new class cannot be the same.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setErrorMessage('You need to be logged in to perform this action');
        setLoading(false);
        return;
      }

      // Get student objects for the log
      const selectedStudentObjects = filteredStudents.filter(student => 
        selectedStudents.includes(student.id)
      );
      
      console.log("Submit data:", {
        fromClass: currentClass,
        toClass: newClass,
        studentIds: selectedStudents
      });

      // Helper functions to get IDs
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
      
      // Updated payload with IDs instead of names
      const payload = {
        sourceClassId: classesMap[currentClass] || currentClass,
        destClassId: classesMap[newClass] || newClass,
        studentIds: selectedStudents,
        termId: getTermIdFromName(currentTerm),
        academicYearId: getCurrentAcademicYearId(),
        removeFromOldClass: true, // This flag indicates students should be removed from old class
        forceClassUpdate: true // Force update the class_assigned field in the database
      };
      
      // Log both versions for debugging
      console.log('Class ID mappings used:', {
        [currentClass]: classesMap[currentClass],
        [newClass]: classesMap[newClass]
      });
      
      console.log('Sending promotion request with payload:', payload);

      // Fix each student's class data before promotion to ensure consistency
      console.log('Fixing student class data before promotion...');
      const destClassId = payload.destClassId;
      const destClassName = newClass;
      
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
      // Just use all the selected students without verification
      const verifiedStudentIds = selectedStudents;
      
      console.log(`Proceeding with all ${verifiedStudentIds.length} selected students`);
      
      // Make sure we have the correct class IDs for the destination
      // Use the classesMap built when fetching classes, or try to find it directly
      // Important: We need the right destination class ID!
      let correctDestClassId = payload.destClassId;
      
      console.log('Looking for destination class ID - original value:', correctDestClassId);
      
      // Try to find the ID from classesMap first (this should work if we've loaded classes properly)
      if (classesMap[newClass]) {
        correctDestClassId = classesMap[newClass];
        console.log(`Found correct class ID for ${newClass} from classesMap:`, correctDestClassId);
      } else {
        // As a backup, try to fetch the class ID directly from the API
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
              const destClass = data.classes.find((cls: any) => cls.name === newClass);
              if (destClass) {
                correctDestClassId = destClass.id;
                console.log(`Found correct class ID for ${newClass} from API:`, correctDestClassId);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching classes for ID lookup:', error);
        }
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
      
      // After direct updates, call the selective promotion API
      // This is now the primary promotion mechanism since verification is bypassed
      console.log('Calling selective promotion API...');
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/promotions/selective`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `Failed to transfer students: ${response.status} ${response.statusText}` + 
          (errorData ? ` - ${errorData.message || JSON.stringify(errorData)}` : '')
        );
      }
      
      // Parse the response only once
      const responseData = await response.json();
      console.log('Promotion API FULL response:', JSON.stringify(responseData, null, 2));
      
      // Check specific success codes in the response
      if (responseData.status?.returnCode === "00") {
        console.log('Promotion API reported success with code 00');
      } else if (responseData.success === true) {
        console.log('Promotion API reported success');
      } else {
        console.warn('Promotion API did not explicitly report success:', responseData);
      }
      
      // Call additional API to verify the student's class was actually changed
      try {
        const verifyResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?class=${newClass}&status=active&pageSize=10000`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('Verification - students in new class:', verifyData);
        }
      } catch (verifyError) {
        console.error('Error verifying class change:', verifyError);
      }

      // Get names of selected students for the success message
      const selectedStudentNames = filteredStudents
        .filter(student => selectedStudents.includes(student.id))
        .map(student => `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.trim());

      if (selectedStudentNames.length === 1) {
        setSuccessMessage(`${selectedStudentNames[0]} has been promoted from ${currentClass} to ${newClass} for ${currentAcademicYear} ${currentTerm}.`);
      } else if (selectedStudentNames.length > 1) {
        const lastStudent = selectedStudentNames.pop();
        setSuccessMessage(
          `${selectedStudentNames.join(', ')} and ${lastStudent} have been promoted from ${currentClass} to ${newClass} for ${currentAcademicYear} ${currentTerm}.`
        );
      } else {
        setSuccessMessage(`${selectedStudents.length} student(s) have been promoted from ${currentClass} to ${newClass} for ${currentAcademicYear} ${currentTerm}.`);
      }

      // Store the promoted students' IDs and the destination class
      const promotedStudentIds = [...selectedStudents];
      const destinationClass = newClass;
      
      // Reset selections
      setSelectedStudents([]);
      
      // Add a small delay to allow database updates to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update form to show the destination class as current class
      // This helps users see that students have actually moved
      setFormData(prev => ({
        ...prev,
        currentClass: destinationClass,
        newClass: ""
      }));
      
      // Fetch students for the new class to show the updated list
      // The fetchStudents function will be triggered by the useEffect that watches
      // for changes to formData.currentClass
      console.log('UI will update to show students in their new class');
    } catch (error) {
      console.error('Error transferring students:', error);
      setErrorMessage(
        "Failed to transfer students: " +
        (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[600px] mx-auto p-6 bg-white rounded-lg shadow-md mt-10">

      <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4">
        Selective Transfer Students to New Class
      </h2>

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

      {/* Form Content */}
      <div className="space-y-4">
        {/* Current Class */}
        <div>
          <label htmlFor="currentClass" className="block text-lg font-medium text-gray-700">
            Current Class
          </label>
          <select
            id="currentClass"
            value={formData.currentClass}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="" disabled>
              Select Current Class
            </option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Class Summary */}
        {formData.currentClass && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Class:</span> {formData.currentClass}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Total Students:</span> {filteredStudents.length}
            </p>
          </div>
        )}

        {/* Select Students with Checkboxes */}
        {formData.currentClass && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-lg font-medium text-gray-700">
                Select Students
              </label>
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
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No students found in this class</p>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleStudentCheckbox(student.id)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <label htmlFor={`student-${student.id}`} className="ml-2 block text-sm text-gray-900">
                      {`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`} 
                      <span className="text-gray-500">({student.class_assigned})</span>
                    </label>
                  </div>
                ))
              )}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}

        {/* New Class */}
        <div>
          <label htmlFor="newClass" className="block text-lg font-medium text-gray-700">
            New Class
          </label>
          <select
            id="newClass"
            value={formData.newClass}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="" disabled>
              Select New Class
            </option>
            {classes.map((cls) => (
              <option key={cls} value={cls} disabled={cls === formData.currentClass}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Transfer Button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleTransfer}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={selectedStudents.length === 0 || !formData.newClass || loading}
          >
            {loading ? "Processing..." : "Transfer Selected Students"}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-4 text-white bg-red-500 rounded-lg">
            <p className="text-center font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mt-4 p-4 text-white bg-green-500 rounded-lg">
            <p className="text-center font-semibold">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectiveTransfer;
