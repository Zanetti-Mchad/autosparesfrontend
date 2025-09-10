"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

const API_BASE_URL = env.BACKEND_API_URL;

interface ClassOption {
  id: string;
  name: string;
}

interface ExamSetAssignment {
  id: string;
  examSetType: string;
  classId: string;
  termId: string;
  examSetId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
    academicYear: {
      id: string;
      year: string;
    };
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const ManageExamSets = () => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [examSetAssignments, setExamSetAssignments] = useState<ExamSetAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editingAssignment, setEditingAssignment] = useState<ExamSetAssignment | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string>('');

  // Exam types for editing
  const examTypes = [
    { id: 'bot', label: 'Beginning Of Term (BOT)', value: 'Beginning Of Term (BOT)' },
    { id: 'mid', label: 'Mid Term', value: 'Mid Term' },
    { id: 'eot', label: 'End Of Term (EOT)', value: 'End Of Term (EOT)' },
    { id: 'ca', label: 'Continuous Assessment (C.A)', value: 'Continuous Assessment (C.A)' }
  ];

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Move fetchExamSetAssignments inside useCallback
  const fetchExamSetAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError("Authentication error: No access token found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/exams/class-assignments/${selectedClass}?page=${currentPage}&limit=${pagination.limit}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('API URL:', `${API_BASE_URL}/api/v1/exams/class-assignments/${selectedClass}?page=${currentPage}&limit=${pagination.limit}`);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.status?.returnCode === "00" && data.data?.examSets) {
        setExamSetAssignments(data.data.examSets);
        setPagination(data.data.pagination);
      } else {
        setExamSetAssignments([]);
        setError(data.status?.returnMessage || "No exam sets found for this class");
      }
    } catch (error) {
      console.error("Error fetching exam set assignments:", error);
      setError("Failed to load exam sets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, currentPage, pagination.limit]);

  // Update useEffect to include fetchExamSetAssignments
  useEffect(() => {
    if (selectedClass) {
      fetchExamSetAssignments();
    }
  }, [selectedClass, currentPage, fetchExamSetAssignments]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError("Authentication error: No access token found");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/classes/filter?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.classes) {
        const activeClasses = data.classes
          .filter((cls: any) => cls.isActive)
          .map((cls: any) => ({
            id: cls.id,
            name: cls.name
          }));
        setClasses(activeClasses);
      } else {
        setError("Failed to load classes");
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      setError("Failed to load classes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(event.target.value);
    setCurrentPage(1);
    setSuccessMessage('');
    setError('');
  };

  const handleEditClick = (assignment: ExamSetAssignment) => {
    setEditingAssignment(assignment);
    setIsEditing(true);
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (editingAssignment) {
      setEditingAssignment({
        ...editingAssignment,
        examSetType: event.target.value
      });
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditingAssignment(null);
  };

  const handleEditSave = async () => {
    if (!editingAssignment) return;
    
    try {
      // Find the original assignment to compare with
      const originalAssignment = examSetAssignments.find(assignment => assignment.id === editingAssignment.id);
      
      // Check if any changes were made
      if (originalAssignment && originalAssignment.examSetType === editingAssignment.examSetType) {
        setError("No changes made. Data is the same");
        return;
      }

      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError("Authentication error: No access token found");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/exams/update/${editingAssignment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          examSetType: editingAssignment.examSetType
        })
      });
      
      const data = await response.json();
      
      if (data.status?.returnCode === "00") {
        setSuccessMessage("Exam set updated successfully");
        setIsEditing(false);
        setEditingAssignment(null);
        fetchExamSetAssignments(); // Refresh the list
      } else {
        // Check for specific error messages
        const errorMessage = data.status?.returnMessage || "Failed to update exam set";
        if (errorMessage.includes("Unique constraint failed") || errorMessage.includes("ExamSetAssignment_classId_termId_examSetType_key")) {
          setError("This Exam Set Type already exists for this class and term. Please choose a different type.");
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error updating exam set:", error);
      setError("Failed to update exam set. Please try again.");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteId('');
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError("Authentication error: No access token found");
        return;
      }

      console.log('Attempting to delete exam set with ID:', deleteId);
      const response = await fetch(`${API_BASE_URL}/api/v1/exams/delete/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deleteAll: true // This flag will tell the backend to delete all related data
        })
      });
      
      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Delete response data:', data);
      
      if (data.status?.returnCode === "00") {
        setSuccessMessage("Exam set and all related data permanently deleted");
        setShowDeleteDialog(false);
        setDeleteId('');
        
        // Add a small delay before refreshing to ensure backend has processed the deletion
        setTimeout(() => {
          fetchExamSetAssignments();
        }, 500);
      } else {
        const errorMessage = data.status?.returnMessage || "Failed to delete exam set";
        console.error('Delete operation failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting exam set:", error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setError("Unable to connect to the server. Please check if the server is running and try again.");
      } else if (error instanceof Error) {
        setError(`Error: ${error.message}`);
      } else {
        setError("Failed to delete exam set. Please try again.");
      }
      setShowDeleteDialog(false);
      setDeleteId('');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                
          <h1 className="text-2xl font-semibold text-center text-white bg-green-600 py-2 rounded-md mb-6">
            Manage Exam Set Assignments
          </h1>
          
          <div className="flex justify-between items-center mb-6">
            <div className="w-full">
              <label className="block text-gray-700 font-medium mb-2">Select Class</label>
              <select
                value={selectedClass}
                onChange={handleClassChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                <option value="">Select a Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {successMessage && (
            <div className="p-3 mb-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : selectedClass && examSetAssignments.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-md">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Class</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Term</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Academic Year</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Exam Set Type</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {examSetAssignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">{assignment.class.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{assignment.term.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{assignment.term.academicYear.year}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{assignment.examSetType}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          <button
                            onClick={() => handleEditClick(assignment)}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(assignment.id)}
                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {examSetAssignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <div className="font-bold text-lg text-gray-800">{assignment.class.name}</div>
                    <div className="text-sm text-gray-600">{assignment.term.name} - {assignment.term.academicYear.year}</div>
                    
                    <div className="mt-4 space-y-2">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">Exam Set Type</label>
                            <p className="text-sm text-gray-800">{assignment.examSetType}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(assignment)}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(assignment.id)}
                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination controls */}
              {pagination.pages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {[...Array(pagination.pages)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(index + 1)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === index + 1 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.pages}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === pagination.pages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : selectedClass ? (
            <div className="text-center py-8 border border-gray-200 rounded-md">
              <p className="text-gray-600">No exam sets found for this class. Please assign exam sets first.</p>
            </div>
          ) : (
            <div className="text-center py-8 border border-gray-200 rounded-md">
              <p className="text-gray-600">Please select a class to view exam set assignments.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Modal */}
      {isEditing && editingAssignment && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Exam Set</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Class</label>
              <div className="p-2 bg-gray-100 rounded-md">{editingAssignment.class.name}</div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Term</label>
              <div className="p-2 bg-gray-100 rounded-md">
                {editingAssignment.term.name} - {editingAssignment.term.academicYear.year}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Exam Set Type</label>
              <select
                value={editingAssignment.examSetType}
                onChange={handleEditChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {examTypes.map((type) => (
                  <option key={type.id} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleEditCancel}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog using the custom DialogBox component */}
      <DialogBox
        isOpen={showDeleteDialog}
        title="Confirm Exam Set Deletion"
        message="Are you sure you want to delete this exam set assignment? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
      />
    </div>
  );
};

export default ManageExamSets;