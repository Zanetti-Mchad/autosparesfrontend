"use client";
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Calendar, FileText } from 'lucide-react';
import Image from 'next/image';
import { env } from '@/env';

// Define interfaces for API data types
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  class?: {
    id: string;
    name: string;
    section?: string;
  };
  class_id?: string; // In case class info is not nested
  class_assigned?: string; // Direct class assignment as string (like 'p1', 'p2')
  role?: string;
}

interface ClassItem {
  id: string;
  name: string;
  section?: string;
  isActive?: boolean;
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

const StudentSelector = () => {
  // State for data
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  
  // Current academic period state - matching currentsettings naming
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  // Fetch academic years and terms
  // Fetch current academic settings - matching currentsettings implementation
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        setIsLoading(true);
        setError('');

        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Authentication required');
          setIsLoading(false);
          return;
        }

        // First fetch the current academic year - using the proxy setup from next.config.js
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
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
          
          // Also store all years for reference
          setAcademicYears(yearData.years || []);
        }

        // Then fetch the current term - using proxy
        const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const termData = await termResponse.json();
        
        if (termData.success && termData.term) {
          setCurrentTerm(termData.term);
          // Also add to terms array for reference
          setTerms([termData.term]);
        } else {
          setCurrentTerm(null);
          // Try to get all terms if active term is not set
          const allTermsResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/terms/filter`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (allTermsResponse.ok) {
            const allTermsData = await allTermsResponse.json();
            if (allTermsData.success && Array.isArray(allTermsData.terms)) {
              setTerms(allTermsData.terms);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        // Don't set error, just set terms to null to show "Not set"
        setCurrentTerm(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentSettings();
  }, [refreshTrigger]);
  
  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setError('Authentication token not found. Please login again.');
          setIsLoading(false);
          return;
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        };
        
        // Fetch classes
        const classesResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`, { headers });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          let classesList: ClassItem[] = [];
          
          if (classesData?.classes && Array.isArray(classesData.classes)) {
            classesList = classesData.classes;
          } else if (classesData?.data?.classes && Array.isArray(classesData.data.classes)) {
            classesList = classesData.data.classes;
          } else if (Array.isArray(classesData)) {
            classesList = classesData;
          } else if (classesData?.data && Array.isArray(classesData.data)) {
            classesList = classesData.data;
          }
          
          setClasses(classesList);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError('Failed to load classes. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClasses();
  }, [refreshTrigger]);
  
  // Fetch students based on selected class - similar to student management page approach
  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setError('Authentication token not found. Please login again.');
          setIsLoading(false);
          return;
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        };
        
        // Decide which endpoint to use based on whether a class is selected
        let endpoint = `${env.BACKEND_API_URL}/api/v1/students/filter?status=active&pageSize=10000`;
        
        // If a class is selected, add it as a filter parameter
        if (selectedClassId) {
          const selectedClass = classes.find(c => c.id === selectedClassId);
          if (selectedClass) {
            console.log(`Fetching students for class: ${selectedClass.name} (${selectedClassId})`);
            endpoint = `${env.BACKEND_API_URL}/api/v1/students/filter?class=${selectedClass.name}&status=active&pageSize=10000`;
          }
        }
        
        console.log('Fetching students from endpoint:', endpoint);
        const studentsResponse = await fetch(endpoint, { headers });
        
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          console.log('Students API response:', studentsData);
          
          let studentsList: Student[] = [];
          
          // Try different response formats
          if (studentsData?.status?.returnCode === '00' && studentsData?.data?.students) {
            // Format from student management page
            studentsList = studentsData.data.students;
          } else if (studentsData?.students && Array.isArray(studentsData.students)) {
            studentsList = studentsData.students;
          } else if (studentsData?.users && Array.isArray(studentsData.users)) {
            studentsList = studentsData.users;
          } else if (studentsData?.data?.users && Array.isArray(studentsData.data.users)) {
            studentsList = studentsData.data.users;
          } else if (Array.isArray(studentsData)) {
            studentsList = studentsData;
          } else if (studentsData?.data && Array.isArray(studentsData.data)) {
            studentsList = studentsData.data;
          }
          
          // Fallback if the API endpoint doesn't work as expected
          if (studentsList.length === 0) {
            console.log('No students found with direct API, trying user endpoint...');
            // Try the users endpoint as fallback
            const usersResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users?role=student&status=active`, { headers });
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              
              if (usersData?.users && Array.isArray(usersData.users)) {
                studentsList = usersData.users;
              } else if (usersData?.data?.users && Array.isArray(usersData.data.users)) {
                studentsList = usersData.data.users;
              } else if (Array.isArray(usersData)) {
                studentsList = usersData;
              } else if (usersData?.data && Array.isArray(usersData.data)) {
                studentsList = usersData.data;
              }
              
              // Filter by class if needed (client-side)
              if (selectedClassId && studentsList.length > 0) {
                console.log(`Filtering ${studentsList.length} students for class ID: ${selectedClassId}`);
                const selectedClass = classes.find(c => c.id === selectedClassId);
                console.log(`Selected class name: ${selectedClass?.name || 'Unknown'}`);
                
                // Enhanced filtering that also checks class name matches
                studentsList = studentsList.filter(student => {
                  // Also match if class_assigned string matches the class name (like 'primary 1')
                  const classNameMatch = 
                    selectedClass && 
                    student.class_assigned && 
                    selectedClass.name.toLowerCase() === student.class_assigned.toLowerCase();
                  
                  const classMatches = 
                    (student.class?.id === selectedClassId) || 
                    (student.class_id === selectedClassId) || 
                    (student.class_assigned === selectedClassId) || 
                    (student.class?.name?.toLowerCase() === selectedClass?.name?.toLowerCase()) ||
                    classNameMatch;
                    
                  if (classNameMatch) {
                    console.log(`Name match for: ${student.first_name} ${student.last_name} - class assigned: '${student.class_assigned}' matches class name: '${selectedClass?.name}'`);
                  }
                  
                  if (classMatches) {
                    console.log(`Match found for student: ${student.first_name} ${student.last_name}`);
                  }
                  
                  return classMatches;
                });
                
                console.log(`After filtering: ${studentsList.length} students match the class criteria`);
              }
            }
          }
          
          // Log info about the fetched students
          if (studentsList.length > 0) {
            console.log(`Fetched ${studentsList.length} students`);
            console.log('First student example:', JSON.stringify(studentsList[0], null, 2));
          } else {
            console.log('No students found');
          }
          
          setStudents(studentsList);
        } else {
          console.error('Failed to fetch students:', studentsResponse.statusText);
          
          // Fallback to users endpoint if the students endpoint fails
          try {
            console.log('Trying fallback to users endpoint...');
            const usersResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users?role=student`, { headers });
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              let usersList: Student[] = [];
              
              if (usersData?.users && Array.isArray(usersData.users)) {
                usersList = usersData.users;
              } else if (usersData?.data?.users && Array.isArray(usersData.data.users)) {
                usersList = usersData.data.users;
              } else if (Array.isArray(usersData)) {
                usersList = usersData;
              } else if (usersData?.data && Array.isArray(usersData.data)) {
                usersList = usersData.data;
              }
              
              // If a class is selected, filter the users
              if (selectedClassId && usersList.length > 0) {
                console.log(`Filtering ${usersList.length} students for class ID: ${selectedClassId}`);
                const selectedClass = classes.find(c => c.id === selectedClassId);
                console.log(`Selected class name: ${selectedClass?.name || 'Unknown'}`);
                
                // Check if any student has a matching class and log details for debugging
                let hasAnyClassMatches = false;
                usersList.forEach(student => {
                  const matches = 
                    (student.class?.id === selectedClassId) || 
                    (student.class_id === selectedClassId) || 
                    (student.class_assigned === selectedClassId) || 
                    (student.class?.name?.toLowerCase() === selectedClass?.name?.toLowerCase());
                  
                  if (matches) {
                    hasAnyClassMatches = true;
                    console.log(`Match found for student: ${student.first_name} ${student.last_name}`);
                    console.log(`  Class data:`, student.class);
                    console.log(`  Class ID:`, student.class_id);
                    console.log(`  Class assigned:`, student.class_assigned);
                  }
                });
                
                if (!hasAnyClassMatches) {
                  console.log('WARNING: No students match the selected class criteria!');
                  console.log('Sample student data:', usersList[0]);
                }
                
                usersList = usersList.filter(student => {
                  // Also match if class_assigned string matches the class name (like 'primary 1')
                  const classNameMatch = 
                    selectedClass && 
                    student.class_assigned && 
                    selectedClass.name.toLowerCase() === student.class_assigned.toLowerCase();
                    
                  return (
                    (student.class?.id === selectedClassId) || 
                    (student.class_id === selectedClassId) || 
                    (student.class_assigned === selectedClassId) || 
                    (student.class?.name?.toLowerCase() === selectedClass?.name?.toLowerCase()) ||
                    classNameMatch
                  );
                });
                
                console.log(`After filtering: ${usersList.length} students match the class criteria`);
              }
              
              setStudents(usersList);
            } else {
              setError(`Failed to load students: ${usersResponse.statusText}`);
            }
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            setError('Failed to load students from all available endpoints.');
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load students. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudents();
  }, [selectedClassId, refreshTrigger, classes]);
  
  // Helper function to check if a student belongs to the selected class
  const studentHasClass = (student: Student, classId: string): boolean => {
    // Get the class name for more robust matching
    const selectedClass = classes.find(c => c.id === classId);
    const selectedClassName = selectedClass?.name?.toLowerCase() || '';
    
    // For debugging - log what we're comparing
    if (selectedClassName && student.class_assigned) {
      console.log(`Comparing class name '${selectedClassName}' with student.class_assigned '${student.class_assigned?.toLowerCase()}'`);
    }
    
    // Multiple ways a student might be associated with a class
    const hasMatchingClass = (
      // Direct ID matches
      (student.class?.id === classId) || 
      (student.class_id === classId) || 
      (student.class_assigned === classId) || 
      
      // Name-based matches (like 'primary 1')
      (student.class?.name?.toLowerCase() === selectedClassName) || 
      (student.class_assigned?.toLowerCase() === selectedClassName) || 
      (selectedClass?.name?.toLowerCase() === student.class_assigned?.toLowerCase())
    );
    
    return hasMatchingClass;
  };
  
  // Helper function to get class name for display
  const getStudentClassName = (student: Student): string => {
    if (student.class?.name) {
      return student.class.name;
    }
    
    // If the class object doesn't have a name, try to find it in our classes list
    if (student.class_id) {
      const classInfo = classes.find(c => c.id === student.class_id);
      if (classInfo) return classInfo.name;
    }
    
    // Check for class_assigned which might be a class code
    if (student.class_assigned) {
      // This could be the class ID or a name code like 'p1'
      const classAssigned = student.class_assigned; // Store in a variable to fix TS error
      const classInfo = classes.find(c => 
        c.id === classAssigned || 
        c.name.toLowerCase() === classAssigned.toLowerCase()
      );
      if (classInfo) return classInfo.name;
      return student.class_assigned; // Use as-is if we can't match
    }
    
    return 'Not assigned';
  };

  // Helper function to get full student name
  const getStudentFullName = (student: Student): string => {
    if (student.middle_name && student.middle_name.trim() !== '') {
      return `${student.first_name} ${student.middle_name} ${student.last_name}`;
    }
    return `${student.first_name} ${student.last_name}`;
  };

  // Filter students by search term and ensure they have assigned classes when a class is selected
  const filteredStudents = students.filter(student => {
    const studentName = getStudentFullName(student).toLowerCase();
    const matchesSearch = studentName.includes(searchTerm.toLowerCase());
    
    // If a class is selected, only include students with valid class assignments
    if (selectedClassId) {
      return matchesSearch && studentHasClass(student, selectedClassId);
    }
    
    return matchesSearch;
  });
  
  // Log information for debugging
  useEffect(() => {
    if (filteredStudents.length > 0) {
      console.log(`Showing ${filteredStudents.length} students after all filtering`);
      if (selectedClassId) {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        console.log(`Selected class: ${selectedClass?.name || selectedClassId}`);
      }
    }
  }, [filteredStudents.length, selectedClassId, classes]);

  // Check if student already has a boarding checklist for the current term
  const checkExistingBoardingChecklist = async (studentId: string) => {
    try {
      // Get the access token for API calls
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.error('No access token found');
        return null;
      }

      // Only check if we have current academic year and term
      if (!currentYear?.id || !currentTerm?.id) {
        console.log('Cannot check existing boarding checklist without current year and term');
        return null;
      }

      // Make API call to check for existing checklist
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/boardingchecklists/student/${studentId}?academicYearId=${currentYear.id}&termId=${currentTerm.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Existing boarding checklist check:', data);
        return data.checklist || null;
      }
      return null;
    } catch (error) {
      console.error('Error checking for existing boarding checklist:', error);
      return null;
    }
  };
  
  const handleStudentSelect = async (studentId: string) => {
    // Prevent navigation if academic year or term is not loaded
    if (!currentYear?.id || !currentTerm?.id) {
      alert('Academic Year and Term must be set before proceeding. Please wait for them to load.');
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudentId(studentId);
      
      // Use current academic year and term from the info cards
      const yearName = currentYear?.year || '';
      const termName = currentTerm?.name || '';
      const className = classes.find(c => c.id === selectedClassId)?.name || '';
      
      // Create URL parameters
      const params = new URLSearchParams({
        id: studentId, // Changed from studentId to id to match the expected parameter
        name: getStudentFullName(student),
        class: className,
        year: yearName,
        term: termName,
        academicYearId: currentYear?.id || '',
        termId: currentTerm?.id || ''
      });

      // Navigate to make first day page with student info
      window.location.href = `/pages/firstday/makefirstday?${params.toString()}`;
    }
  };


  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 py-8">
         
      {/* Content Wrapper */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-green-700">Boarding Requirements Checklist</h1>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-md hover:bg-green-200"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        
        {/* Academic Period Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg shadow-sm p-4 flex items-center space-x-4">
            <Calendar className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-gray-600">Academic Year</h2>
              <p className="text-lg font-bold text-gray-800">
                {currentYear ? currentYear.year : 'Not set'}
              </p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg shadow-sm p-4 flex items-center space-x-4">
            <FileText className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-gray-600">Current Term</h2>
              <p className="text-lg font-bold text-gray-800">
                {currentTerm ? currentTerm.name : 'Not set'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md mb-4">
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-700 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Search Bar with Autocomplete */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search student name..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    
                    // Generate suggestions
                    if (value.trim() !== '') {
                      const filtered = students.filter(student => {
                        const fullName = getStudentFullName(student).toLowerCase();
                        return fullName.includes(value.toLowerCase());
                      });
                      setSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
                      setShowSuggestions(true);
                    } else {
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchTerm.trim() !== '' && suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow for clicking on them
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && suggestions.length > 0) {
                      // Select the first suggestion when Enter is pressed
                      handleStudentSelect(suggestions[0].id);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map(student => (
                      <li 
                        key={student.id} 
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          handleStudentSelect(student.id);
                          setShowSuggestions(false);
                        }}
                      >
                        {getStudentFullName(student)}
                        <span className="text-sm text-gray-500 ml-2">
                          ({getStudentClassName(student)})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section ? `(${cls.section})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">Select a class to filter students</p>
              </div>

              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student {selectedClassId ? `(${filteredStudents.length} found)` : ''}
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    if (studentId) {
                      handleStudentSelect(studentId);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!currentYear?.id || !currentTerm?.id}
                >
                  <option value="">
                    {selectedClassId 
                      ? filteredStudents.length > 0 
                        ? `Select from ${filteredStudents.length} students` 
                        : 'No students in this class' 
                      : 'Select a class first'}
                  </option>
                  {filteredStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {getStudentFullName(student)}
                    </option>
                  ))}
                </select>
                {selectedClassId && filteredStudents.length === 0 && (
                  <p className="mt-1 text-sm text-yellow-600">No students found for this class. Try another class.</p>
                )}
                <p className="mt-2 text-sm text-gray-500">Select a student to create or view their boarding checklist</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h3>
              <ol className="list-decimal pl-4 space-y-2 text-blue-800">
                <li>Select a class from the dropdown to filter students</li>
                <li>Choose a student to view or create their boarding checklist</li>
                <li>Enter guardian information and items brought by the student</li>
                <li>Save the checklist when complete</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSelector;