'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Pencil, Trash2, X, Check, RefreshCw } from 'lucide-react';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';  

// Define interfaces for our data types
interface ClassItem {
  id: string;
  name: string;
  section?: string;
}

interface User {
  id: string;
  name?: string;     // Make optional since it might be missing
  first_name?: string; // Add first_name property
  last_name?: string;  // Add last_name property
  role?: string;
  email?: string;
  // These fields reflect the actual API response structure
}

interface ClassTeacherAssignment {
  id: string;
  classId: string;
  userId: string;
  academicYearId?: string;
  termId?: string;
  isMainTeacher?: boolean;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  
  // Nested objects from API response
  class?: {
    id: string;
    name: string;
    section?: string;
    isActive?: boolean;
  };
  
  user?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  
  // Alternative name for user in API response
  teacher?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  
  academicYear?: {
    id: string;
    year: string;
    isActive?: boolean;
  };
  
  term?: {
    id: string;
    name: string;
    academicYearId?: string;
    isActive?: boolean;
  };
}

// Mapped type for frontend display
interface DisplayClassTeacher {
  id: string;
  teacherId: string;
  teacherName: string; // Must be a non-optional string
  teacherEmail: string;
  classId: string;
  className: string;
  isMainTeacher: boolean;
}

const ViewClassTeachers = () => {
  // States for data
  const [teachers, setTeachers] = useState<DisplayClassTeacher[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([]);
  
  // Academic period states
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<any>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [editingTeacher, setEditingTeacher] = useState<DisplayClassTeacher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch academic year and term data
  useEffect(() => {
    const fetchAcademicPeriod = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        };
        
        // Fetch active academic year and term
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, { headers });
        const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, { headers });
        
        // Process current term data
        if (termResponse.ok) {
          const termData = await termResponse.json();
          console.log('Current term data:', termData);
          
          let termInfo = null;
          if (termData?.term) {
            termInfo = termData.term;
          } else if (termData?.data?.term) {
            termInfo = termData.data.term;
          } else if (termData?.data) {
            termInfo = termData.data;
          } else {
            termInfo = termData;
          }
          
          setCurrentTerm(termInfo);
        }
        
        // Process academic year data
        if (yearResponse.ok) {
          const yearData = await yearResponse.json();
          console.log('Academic year data:', yearData);
          
          let yearInfo = null;
          if (yearData?.academicYears && yearData.academicYears.length > 0) {
            const activeYear = yearData.academicYears.find((year: any) => year.isActive);
            yearInfo = activeYear || yearData.academicYears[0];
          } else if (yearData?.data?.academicYears && yearData.data.academicYears.length > 0) {
            const activeYear = yearData.data.academicYears.find((year: any) => year.isActive);
            yearInfo = activeYear || yearData.data.academicYears[0];
          } else if (yearData?.data) {
            yearInfo = yearData.data;
          } else {
            yearInfo = yearData;
          }
          
          setCurrentAcademicYear(yearInfo);
        }
      } catch (error) {
        console.error('Error fetching academic period:', error);
      }
    };
    
    fetchAcademicPeriod();
  }, []);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      }
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Handle different API response structures
      if (data.status?.returnCode === "00") {
        return data;
      } else if (data.success !== undefined) {
        return data;
      } else if (Array.isArray(data)) {
        return { success: true, data };
      } else if (data.data) {
        return data;
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      
      // Handle different endpoints with appropriate fallbacks
      if (url.includes('/class-teachers')) {
        console.log('Using fallback empty response for class-teachers endpoint');
        return {
          success: true,
          teachers: [],
          data: {
            teachers: []
          }
        };
      } else if (url.includes('/classes')) {
        console.log('Using fallback empty response for classes endpoint');
        return {
          success: true,
          class: null,
          data: {
            class: null
          }
        };
      } else if (url.includes('/students')) {
        console.log('Using fallback empty response for students endpoint');
        return {
          success: true,
          students: [],
          data: {
            students: []
          }
        };
      }
      
      // For other endpoints, throw a more specific error
      throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Fetch teachers, classes, and assignments data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setError('Authentication token not found. Please login again.');
          setIsLoading(false);
          return;
        }
        
        // Fetch all required data in parallel
        const [classesResponse, teachersResponse, assignmentsResponse] = await Promise.all([
          fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`),
          fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/integration/users?role=teacher`),
          fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/class-teachers/create?page=1&pageSize=100`)
        ]);
        
        // Process classes data
        const classesData = await classesResponse;
        const classesList = classesData?.classes || classesData?.data?.classes || classesData;
        setAvailableClasses(Array.isArray(classesList) ? classesList : []);
        
        // Process teachers data
        const teachersData = await teachersResponse;
        const teachersList = teachersData?.users || teachersData?.data?.users || teachersData;
        setAvailableTeachers(Array.isArray(teachersList) ? teachersList : []);
        
        // Process assignments data
        const assignmentsData = await assignmentsResponse;
        console.log('Raw assignments data:', assignmentsData);
        
        let assignmentsList: ClassTeacherAssignment[] = [];
        // Try to handle various API response formats
        if (assignmentsData?.data?.assignments && Array.isArray(assignmentsData.data.assignments)) {
          console.log('Using data.assignments format');
          assignmentsList = assignmentsData.data.assignments;
        } else if (assignmentsData?.assignments && Array.isArray(assignmentsData.assignments)) {
          console.log('Using assignments format');
          assignmentsList = assignmentsData.assignments;
        } else if (Array.isArray(assignmentsData)) {
          console.log('Using direct array format');
          assignmentsList = assignmentsData;
        } else if (assignmentsData?.data && Array.isArray(assignmentsData.data)) {
          console.log('Using data array format');
          assignmentsList = assignmentsData.data;
        } else if (assignmentsData?.classTeacherAssignments && Array.isArray(assignmentsData.classTeacherAssignments)) {
          console.log('Using classTeacherAssignments format');
          assignmentsList = assignmentsData.classTeacherAssignments;
        } else if (assignmentsData?.data?.classTeacherAssignments && Array.isArray(assignmentsData.data.classTeacherAssignments)) {
          console.log('Using data.classTeacherAssignments format');
          assignmentsList = assignmentsData.data.classTeacherAssignments;
        }
        
        console.log('Processed assignments list:', assignmentsList);
        
        // Transform to display format
        const displayAssignments = processAssignments(assignmentsList, classesList, teachersList);
        setTeachers(displayAssignments);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, [refreshTrigger]);

  // Process API data into display format
  // Define a helper type for the intermediate results that might have undefined values
  type IntermediateResult = {
    id: string;
    teacherId: string;
    teacherName?: string; // This can be undefined in intermediate results
    teacherEmail?: string;
    classId: string;
    className: string;
    isMainTeacher?: boolean;
  };
  
  const processAssignments = (
    assignmentsList: ClassTeacherAssignment[],
    classesList: ClassItem[],
    teachersList: User[]
  ): DisplayClassTeacher[] => {
    // Create a properly typed array to collect results
    const processedAssignments: DisplayClassTeacher[] = [];
    
    // Add logging to see each assignment and debug the issue
    console.log('Processing assignments with:', { 
      assignments: assignmentsList, 
      classes: classesList,
      teachers: teachersList
    });
    
    console.log('Teacher objects structure example:', teachersList.length > 0 ? teachersList[0] : 'No teachers');
    console.log('Class objects structure example:', classesList.length > 0 ? classesList[0] : 'No classes');

    // Process each assignment
    for (const assignment of assignmentsList) {
      console.log('Processing assignment:', assignment);
      
      // Variables to store the teacher and class info
      let teacherId = '';
      let teacherName = 'Unknown Teacher'; // Default value to ensure it's never empty
      let teacherEmail = '';
      let classId = '';
      let className = 'Unknown Class'; // Default value to ensure it's never empty
      let teacher: User | undefined;
      let classItem: ClassItem | undefined;
      
      // First, try to use nested objects from API response
      if (assignment.class && assignment.user) {
        console.log('Using nested class and user objects from API');
        classItem = assignment.class;
        teacher = assignment.user;
        teacherId = teacher.id || '';
        classId = classItem.id || '';
        if (classItem.name) {
          className = classItem.section ? `${classItem.name} (${classItem.section})` : classItem.name;
        }
        
        // Extract teacher information - prioritize first_name/last_name combination
        if (teacher.first_name && teacher.last_name) {
          teacherName = `${teacher.first_name} ${teacher.last_name}`;
        } else if (teacher.name) {
          teacherName = teacher.name;
        }
        teacherEmail = teacher.email || '';
      }
      // Check for alternative nesting format
      else if (assignment.class && assignment.teacher) {
        console.log('Using nested class and teacher objects from API');
        classItem = assignment.class;
        teacher = assignment.teacher;
        teacherId = teacher.id || '';
        classId = classItem.id || '';
        if (classItem.name) {
          className = classItem.section ? `${classItem.name} (${classItem.section})` : classItem.name;
        }
        
        // Extract teacher information - prioritize first_name/last_name combination
        if (teacher.first_name && teacher.last_name) {
          teacherName = `${teacher.first_name} ${teacher.last_name}`;
        } else if (teacher.name) {
          teacherName = teacher.name;
        }
        teacherEmail = teacher.email || '';
      }
      // Fall back to searching in our available classes and teachers lists
      else {
        console.log('Looking up teacher and class by ID');
        teacherId = assignment.userId || '';
        classId = assignment.classId || '';
        
        // Find class and teacher by ID
        classItem = classesList.find(c => c.id === classId);
        teacher = teachersList.find(t => t.id === teacherId);
        
        // Extract class name
        if (classItem && classItem.name) {
          className = classItem.section ? `${classItem.name} (${classItem.section})` : classItem.name;
        }
        
        // Extract teacher information - prioritize first_name/last_name combination
        if (teacher) {
          if (teacher.first_name && teacher.last_name) {
            teacherName = `${teacher.first_name} ${teacher.last_name}`;
          } else if (teacher.name) {
            teacherName = teacher.name;
          }
          teacherEmail = teacher.email || '';
        }
      }
      
      // If name is still missing but we have an email, extract from email
      if (teacherName === 'Unknown Teacher' && teacherEmail) {
        const nameFromEmail = teacherEmail.split('@')[0];
        // Make first letter uppercase and replace dots/underscores with spaces
        teacherName = nameFromEmail.charAt(0).toUpperCase() + 
                      nameFromEmail.slice(1).replace(/[._]/g, ' ');
      }
      
      // Last resort: use the teacher ID if we have it
      if (teacherName === 'Unknown Teacher' && teacherId) {
        teacherName = `Teacher (ID: ${teacherId})`;
      }
      
      // Create a properly typed object with guaranteed non-empty values
      const displayTeacher: DisplayClassTeacher = {
        id: assignment.id || `temp-${Math.random().toString(36).substring(2, 11)}`,
        teacherId: teacherId || assignment.userId || '',
        teacherName: teacherName, // Already has a default, so never empty
        teacherEmail: teacherEmail || '',
        classId: classId || assignment.classId || '',
        className: className, // Already has a default, so never empty
        isMainTeacher: Boolean(assignment.isMainTeacher)
      };
      
      // Add to our collection
      processedAssignments.push(displayTeacher);
    }
    
    console.log('Processed assignments result:', processedAssignments);
    return processedAssignments;

  };

  const handleEdit = (teacher: DisplayClassTeacher) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  // Open delete confirmation dialog
  const handleDelete = (teacherId: string) => {
    setTeacherToDelete(teacherId);
    setShowDeleteModal(true);
  };

  // Handle confirmation from dialog
  const confirmDelete = async () => {
    if (teacherToDelete) {
      setIsLoading(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setError('Authentication token not found');
          return;
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        };
        
        // Delete the assignment using the API
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/class-teachers/delete/${teacherToDelete}`, {
          method: 'DELETE',
          headers
        });
        
        if (response.ok) {
          // Update UI state by filtering out the deleted assignment
          setTeachers(teachers.filter(t => t.id !== teacherToDelete));
          setSuccessMessage('Teacher assignment deleted successfully');
        } else {
          setError('Failed to delete teacher assignment');
        }
      } catch (err) {
        setError(`Error deleting assignment: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
        setShowDeleteModal(false);
        setTeacherToDelete(null);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;
    
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Authentication token not found');
        return;
      }
      
      const formData = new FormData(e.currentTarget);
      const teacherId = formData.get('teacherId') as string;
      const classId = formData.get('classId') as string;
      const isMainTeacher = Boolean(formData.get('isMainTeacher'));
      
      const updateData = {
        userId: teacherId,
        classId: classId,
        academicYearId: currentAcademicYear?.id,
        termId: currentTerm?.id,
        isMainTeacher: isMainTeacher
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      // Update the assignment
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/class-teachers/update/${editingTeacher.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        // Get the updated teacher and class info
        const selectedTeacher = availableTeachers.find(t => t.id === teacherId);
        const selectedClass = availableClasses.find(c => c.id === classId);
        
        if (selectedTeacher && selectedClass) {
          // Update local state
          const className = selectedClass.section 
            ? `${selectedClass.name} (${selectedClass.section})` 
            : selectedClass.name;
            
          const updatedTeachers = teachers.map(teacher => 
            teacher.id === editingTeacher.id 
              ? {
                  ...teacher,
                  teacherId: selectedTeacher.id,
                  teacherName: selectedTeacher.first_name && selectedTeacher.last_name
                    ? `${selectedTeacher.first_name} ${selectedTeacher.last_name}`
                    : selectedTeacher.name || 'Unknown Teacher', // Ensure never undefined
                  teacherEmail: selectedTeacher.email || '',
                  classId: selectedClass.id,
                  className: className,
                  isMainTeacher: isMainTeacher
                }
              : teacher
          );
          
          setTeachers(updatedTeachers);
          setSuccessMessage('Teacher assignment updated successfully');
        }
      } else {
        setError('Failed to update teacher assignment');
      }
    } catch (err) {
      setError(`Error updating assignment: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      setShowEditModal(false);
      setEditingTeacher(null);
    }
  };

  // Clear messages after delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-200 py-8">

      {/* Content Wrapper */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-green-700">
            Class Teachers Assignments
          </h1>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-md hover:bg-green-200"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md mb-4">
            <p>{error}</p>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md mb-4">
            <p>{successMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-700 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading assignments...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg text-center">
            <p className="text-lg">No class teacher assignments found. Please assign teachers to classes first.</p>
            <a 
              href="/pages/classroommanagement/assignclassteacher" 
              className="mt-4 inline-block bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Go to Assign Teachers
            </a>
          </div>
        ) : (
          <>
            {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
            <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
              {teachers.map((teacher, index) => (
                <div key={teacher.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                  <div className="mb-2">
                    <div className="font-semibold text-gray-900">{teacher.teacherName}</div>
                    <div className="text-xs text-gray-500">{teacher.teacherEmail || 'N/A'}</div>
                  </div>
                  <div className="mb-2 text-sm text-gray-700">Class: <span className="font-medium">{teacher.className}</span></div>
                  <div className="mb-2 text-sm">
                    Main Teacher: {teacher.isMainTeacher ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-1">Yes</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-1">No</span>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit assignment"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete assignment"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Responsive Stacked Cards - Mobile (md:hidden) */}
            <div className="md:hidden space-y-4 mb-6">
              {teachers.map((teacher, index) => (
                <div key={teacher.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                  <div className="mb-2">
                    <div className="font-bold text-base text-gray-800">{teacher.teacherName}</div>
                    <div className="text-xs text-gray-500">{teacher.teacherEmail || 'N/A'}</div>
                  </div>
                  <div className="mb-2 text-xs text-gray-700">Class: <span className="font-medium">{teacher.className}</span></div>
                  <div className="mb-2 text-xs">
                    Main Teacher: {teacher.isMainTeacher ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-1">Yes</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-1">No</span>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit assignment"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete assignment"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table - Desktop Only */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">#</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Teacher Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Class</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Main Teacher</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teachers.map((teacher, index) => (
                    <tr key={teacher.id}>
                      <td className="px-6 py-4 text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">{teacher.teacherName}</td>
                      <td className="px-6 py-4 text-gray-500">{teacher.teacherEmail || 'N/A'}</td>
                      <td className="px-6 py-4">{teacher.className}</td>
                      <td className="px-6 py-4">
                        {teacher.isMainTeacher ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(teacher)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit assignment"
                          >
                            <Pencil size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(teacher.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete assignment"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6">
          <a
            href="/pages/classroommanagement/assignclassteacher"
            className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Class List
          </a>
        </div>
      </div>

      {/* Custom edit modal for teacher assignment */}
      {showEditModal && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="relative w-full max-w-md p-6 mx-auto bg-white rounded-lg shadow-lg">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEditModal(false)}
            >
              <X size={20} />
            </button>
            
            <h3 className="mb-3 text-lg font-medium text-center text-gray-900">
              Edit Class Teacher Assignment
            </h3>
            
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Teacher</label>
                <select
                  name="teacherId"
                  defaultValue={editingTeacher.teacherId}
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  {availableTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name && teacher.last_name
                        ? `${teacher.first_name} ${teacher.last_name}`
                        : teacher.name || 'Unknown Teacher'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Class</label>
                <select
                  name="classId"
                  defaultValue={editingTeacher.classId}
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section && `(${cls.section})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isMainTeacher"
                    defaultChecked={editingTeacher.isMainTeacher}
                    className="form-checkbox h-5 w-5 text-green-600"
                  />
                  <span>Main Class Teacher</span>
                </label>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DialogBox
        isOpen={showDeleteModal}
        title="Confirm Delete"
        message="Are you sure you want to delete this class teacher assignment?"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        confirmText={isLoading ? 'Deleting...' : 'Delete'}
        type="delete"
      />
    </div>
  );
};

export default ViewClassTeachers;