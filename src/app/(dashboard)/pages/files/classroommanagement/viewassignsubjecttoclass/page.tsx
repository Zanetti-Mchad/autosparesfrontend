'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Check, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define interfaces for our data types
interface ClassItem {
  id: string;
  name: string;
  section?: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface ClassSubjectAssignment {
  id: string;
  classId: string;
  subjectActivityId: string;
  academicYearId?: string;
  termId?: string;
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
  
  subjectActivity?: {
    id: string;
    name: string;
    code?: string;
    type?: string;
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

// Extended assignment interface for display purposes
interface DisplayClassSubjects {
  id: string;
  classId: string;
  className: string;
  subjects: {
    id: string;       // This is the assignment ID for existing assignments
    name: string;
    subjectId?: string; // Added to track original subject ID during editing
  }[];
}

const ViewClassSubjects = () => {
  // States for data
  const [classSubjects, setClassSubjects] = useState<DisplayClassSubjects[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Academic period states
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<any>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<DisplayClassSubjects | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [classSubjectToDelete, setClassSubjectToDelete] = useState<DisplayClassSubjects | null>(null);

  // Fetch academic year and term
  useEffect(() => {
    const fetchAcademicPeriod = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        };
        
        // Fetch active academic year
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
        
        // Process academic year data
        if (yearResponse.ok) {
          const yearData = await yearResponse.json();
          console.log('Academic year data raw:', yearData);
          
          let yearInfo = null;
          if (yearData?.academicYears && yearData.academicYears.length > 0) {
            // Find active year if available
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
          console.log('Processed academic year data:', yearInfo);
        }
      } catch (error) {
        console.error('Error fetching academic period:', error);
      }
    };
    
    fetchAcademicPeriod();
  }, []);
  
  // Fetch all data from APIs
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Get access token from localStorage
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
        
        // Fetch all required data in parallel
        const [classesResponse, subjectsResponse, assignmentsResponse] = await Promise.all([
          fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`, { headers }),
          fetch(`${env.BACKEND_API_URL}/api/v1/subjects/filter?limit=100`, { headers }),
          fetch(`${env.BACKEND_API_URL}/api/v1/class-subject-assignments/assignments?page=1&pageSize=100`, { headers })
        ]);
        
        // Process classes data
        const classesData = await classesResponse.json();
        const classesList = classesData?.classes || classesData?.data?.classes || classesData;
        setClasses(Array.isArray(classesList) ? classesList : []);
        console.log('Classes data:', classesList);
        
        // Process subjects data
        const subjectsData = await subjectsResponse.json();
        let subjectsList = [];
        if (subjectsData?.success && Array.isArray(subjectsData.subjects)) {
          subjectsList = subjectsData.subjects;
        } else if (Array.isArray(subjectsData)) {
          subjectsList = subjectsData;
        } else if (subjectsData?.data && Array.isArray(subjectsData.data)) {
          subjectsList = subjectsData.data;
        }
        setSubjects(subjectsList);
        console.log('Subjects data:', subjectsList);
        
        // Process assignments data
        const assignmentsData = await assignmentsResponse.json();
        console.log('Raw assignments data:', assignmentsData);
        
        let assignmentsList: ClassSubjectAssignment[] = [];
        // Handle different possible response formats
        if (assignmentsData?.data?.assignments && Array.isArray(assignmentsData.data.assignments)) {
          assignmentsList = assignmentsData.data.assignments;
        } else if (assignmentsData?.assignments && Array.isArray(assignmentsData.assignments)) {
          assignmentsList = assignmentsData.assignments;
        } else if (Array.isArray(assignmentsData)) {
          assignmentsList = assignmentsData;
        } else if (assignmentsData?.data && Array.isArray(assignmentsData.data)) {
          assignmentsList = assignmentsData.data;
        }
        
        // Transform assignments to DisplayClassSubjects format
        const displayAssignments = processAssignments(assignmentsList, classesList, subjectsList);
        setClassSubjects(displayAssignments);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, [refreshTrigger]);
  
  // Process assignments data to create DisplayClassSubjects objects
  const processAssignments = (
    assignmentsList: ClassSubjectAssignment[],
    classesList: ClassItem[],
    subjectsList: Subject[]
  ): DisplayClassSubjects[] => {
    // Group assignments by class
    const groupedAssignments = new Map<string, DisplayClassSubjects>();
    
    assignmentsList.forEach(assignment => {
      // Check if we have the nested objects from the API response
      let classItem;
      let subject;
      let className = '';
      
      // First try to get data from nested objects if available
      if (assignment.class && assignment.subjectActivity) {
        // Extract from nested objects directly
        classItem = assignment.class;
        subject = assignment.subjectActivity;
        
        className = classItem.section ? `${classItem.name} (${classItem.section})` : classItem.name;
      } else {
        // Fall back to searching in our lists
        classItem = classesList.find(c => c.id === assignment.classId);
        subject = subjectsList.find(s => s.id === assignment.subjectActivityId);
        
        if (!classItem || !subject) return;
        
        className = classItem.section ? `${classItem.name} (${classItem.section})` : classItem.name;
      }
      
      // Create a unique key for this class
      const key = assignment.classId;
      
      if (groupedAssignments.has(key)) {
        // Add subject to existing assignment group
        const existingAssignment = groupedAssignments.get(key)!;
        existingAssignment.subjects.push({
          id: assignment.id, // Store the assignment ID for delete operations
          name: subject.name,
          subjectId: subject.id // Store the actual subject ID for reference during editing
        });
      } else {
        // Create new assignment group
        groupedAssignments.set(key, {
          id: key, // Using the class ID as the ID for the grouped assignment
          classId: assignment.classId,
          className: className,
          subjects: [{
            id: assignment.id, // Store the assignment ID for delete operations
            name: subject.name,
            subjectId: subject.id // Store the actual subject ID for reference during editing
          }]
        });
      }
    });
    
    return Array.from(groupedAssignments.values());
  };

  const handleEdit = (classSubject: DisplayClassSubjects): void => {
    setEditingId(classSubject.id);
    setEditData({...classSubject});
  };

  const handleUpdate = (): void => {
    if (!editData) return;
    
    // Get current subjects for this class
    const existingClassSubject = classSubjects.find(c => c.id === editingId);
    if (!existingClassSubject) {
      setError("Class assignment not found");
      return;
    }
    
    // Create maps of subject IDs to prevent duplication
    const existingSubjectMap = new Map(
      existingClassSubject.subjects.map(s => [s.subjectId, s])
    );
    
    const editedSubjectMap = new Map(
      editData.subjects.map(s => [s.subjectId, s])
    );
    
    // Calculate subjects to add/remove
    const toAdd = [];
    const toRemove = [];
    
    // Find subjects to remove (compare by subjectId)
    for (const subject of existingClassSubject.subjects) {
      if (!editedSubjectMap.has(subject.subjectId)) {
        toRemove.push(subject);
      }
    }
    
    // Find subjects to add (compare by subjectId)
    for (const subject of editData.subjects) {
      if (!existingSubjectMap.has(subject.subjectId)) {
        toAdd.push(subject);
      }
    }
    
    // If nothing changed, just close the edit mode
    if (toAdd.length === 0 && toRemove.length === 0) {
      handleCancel();
      return;
    }
    
    // Start the update process
    handleUpdateAssignments(toAdd, toRemove, editData);
  };

  const handleUpdateAssignments = async (
    toAdd: {id: string, name: string, subjectId?: string}[], 
    toRemove: {id: string, name: string, subjectId?: string}[],
    editData: DisplayClassSubjects
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Authentication token not found');
        setIsLoading(false);
        return;
      }
      
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      });
      
      // Process removals first
      for (const subject of toRemove) {
        try {
          // Use the assignment ID stored in the subject.id field
          const response = await fetch(`${env.BACKEND_API_URL}/api/v1/class-subject-assignments/assignments/${subject.id}`, {
            method: 'DELETE',
            headers
          });
          
          if (!response.ok) {
            console.error(`Failed to remove subject ${subject.name}`);  
          }
        } catch (err) {
          console.error(`Error removing subject ${subject.name}:`, err);
        }
      }
      
      // Process additions
      for (const subject of toAdd) {
        try {
          const assignmentData = {
            classId: editData.classId,
            subjectActivityId: subject.subjectId, // Use the actual subject ID, not the assignment ID
            academicYearId: currentAcademicYear?.id,
            termId: currentTerm?.id,
            createdById: localStorage.getItem('userId') // Use the logged in user's ID
          };
          
          const response = await fetch(`${env.BACKEND_API_URL}/api/v1/class-subject-assignments/add-assignment`, {
            method: 'POST',
            headers,
            body: JSON.stringify(assignmentData)
          });
          
          if (!response.ok) {
            console.error(`Failed to add subject ${subject.name}`);  
          }
        } catch (err) {
          console.error(`Error adding subject ${subject.name}:`, err);
        }
      }
      
      // Set success message
      setSuccessMessage(`Successfully updated subjects for ${editData.className}`);
      
      // Refresh data after update
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      setError(`Error updating assignments: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      handleCancel();
    }
  };

  // Initial delete handler - shows confirmation dialog
  const handleDelete = (classSubject: DisplayClassSubjects): void => {
    setClassSubjectToDelete(classSubject);
    setShowDeleteDialog(true);
  };
  
  // Actual delete handler - runs after confirmation
  const confirmDelete = async (): Promise<void> => {
    if (!classSubjectToDelete) return;
    
    // Immediately remove the assignment from UI state before API call
    setClassSubjects(prevClassSubjects => 
      prevClassSubjects.filter(c => c.id !== classSubjectToDelete.id)
    );
    
    setSuccessMessage(`Successfully removed all subjects from ${classSubjectToDelete.className}`);
    setIsLoading(true);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.error('Authentication token not found');
        return; // Continue with UI update even if API call can't be made
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      // Delete each assignment individually
      for (const subject of classSubjectToDelete.subjects) {
        try {
          console.log(`Deleting assignment for subject: ${subject.name}`);
          
          const response = await fetch(`${env.BACKEND_API_URL}/api/v1/class-subject-assignments/assignments/${subject.id}`, {
            method: 'DELETE',
            headers
          });
          
          console.log(`Delete response for ${subject.name}:`, response.status);
        } catch (err) {
          console.error(`Error processing delete for ${subject.name}:`, err);
          // Continue with other deletes even if one fails
        }
      }
    } catch (error) {
      console.error('Error with deletion process:', error);
    } finally {
      // Force a refresh of the assignments data after giving the API time to process
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setIsLoading(false);
      }, 1000);
    }
  };

  // Cancel editing mode
  const handleCancel = (): void => {
    setEditingId(null);
    setEditData(null);
    setError('');
  };

  // Toggle subject selection in edit mode
  const toggleSubject = (subject: Subject): void => {
    if (!editData) return;
    
    // Check if this subject is already in our edited list (by subject ID not assignment ID)
    const subjectExists = editData.subjects.some(s => s.subjectId === subject.id);
    
    if (subjectExists) {
      // Remove the subject
      setEditData({
        ...editData,
        subjects: editData.subjects.filter(s => s.subjectId !== subject.id)
      });
    } else {
      // Add the subject
      const subjectObj = { 
        id: subject.id, // Will be overwritten with assignment ID after creation
        name: subject.name,
        subjectId: subject.id // Keep track of the actual subject ID
      };
      
      setEditData({
        ...editData,
        subjects: [...editData.subjects, subjectObj]
      });
    }
  };

  // Clear error messages after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear success messages after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-200 py-8">
      
      {/* Content Wrapper */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-green-700">
            Class Subject Assignments
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
        ) : classSubjects.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg text-center">
            <p className="text-lg">No class subject assignments found. Please assign subjects to classes first.</p>
            <a 
              href="/pages/classroommanagement/assignsubjecttoclass" 
              className="mt-4 inline-block bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Go to Assign Subjects
            </a>
          </div>
        ) : (
          <>
            {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
            <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
              {classSubjects.map((classSubject, index) => (
                <div key={classSubject.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                  <div className="mb-2 font-semibold text-gray-900">{classSubject.className}</div>
                  <div className="mb-2 text-sm text-gray-700">Subjects:</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {classSubject.subjects.map(subject => (
                      <span key={subject.id} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{subject.name}</span>
                    ))}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleEdit(classSubject)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit assignment"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(classSubject)}
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
              {classSubjects.map((classSubject, index) => (
                <div key={classSubject.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                  <div className="mb-2 font-bold text-base text-gray-800">{classSubject.className}</div>
                  <div className="mb-2 text-xs text-gray-700">Subjects:</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {classSubject.subjects.map(subject => (
                      <span key={subject.id} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{subject.name}</span>
                    ))}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleEdit(classSubject)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit assignment"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(classSubject)}
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
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Class</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Assigned Subjects</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {classSubjects.map((classSubject, index) => (
                    <tr key={classSubject.id}>
                      <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">{classSubject.className}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {classSubject.subjects.map(subject => (
                            <span key={subject.id} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{subject.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(classSubject)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit assignment"
                          >
                            <Pencil size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(classSubject)}
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
            href="/pages/classroommanagement/assignsubjecttoclass"
            className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Class List
          </a>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <DialogBox
        isOpen={showDeleteDialog}
        title="Confirm Delete"
        message={`Are you sure you want to delete all subject assignments for ${classSubjectToDelete?.className || ''}?`}
        onConfirm={() => {
          confirmDelete();
          setShowDeleteDialog(false);
        }}
        onCancel={() => {
          setShowDeleteDialog(false);
          setClassSubjectToDelete(null);
        }}
        confirmText={isLoading ? 'Deleting...' : 'Delete'}
        type="delete"
      />
    </div>
  );
};

export default ViewClassSubjects;