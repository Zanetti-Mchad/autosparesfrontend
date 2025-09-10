"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Filter, ChevronLeft, ChevronRight, AlertCircle, Check, Loader2 } from 'lucide-react';
import DialogBox from '@/components/Dailogbox';
import { supabase } from '../../../../../lib/supabaseClient';

// Define Student interface to match API response
interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  class_assigned: string;
  lin_number: string;
  bursary: boolean;
  half_bursary: boolean;
  school_pay_code: string;
  student_photo: string;
  guardian1_name: string;
  guardian1_phone1: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextPage: number;
  prevPage: number;
}

const DeleteStudentManagement = () => {
  const router = useRouter();
  
  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
  }>({
    page: 1,
    pageSize: 10000,
    totalCount: 0,
    totalPages: 1,
    nextPage: null,
    prevPage: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10000;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Handle authentication error
  const handleAuthError = useCallback(() => {
    setError('Your session has expired. Please log in again.');
    localStorage.removeItem('accessToken');
    router.push('/sign-in'); // Redirect to login
  }, [router]);

  // Fetch students from API with pagination and filtering
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(
        `${env.BACKEND_API_URL}/api/v1/students/filter?page=${currentPage}&pageSize=10000${searchQuery ? `&search=${searchQuery}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch students: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.status?.returnCode === "00") {
        setStudents(result.data.students || []);
        setPagination({
          page: result.data.pagination.page || 1,
          pageSize: result.data.pagination.pageSize || pageSize,
          totalCount: result.data.pagination.totalCount || 0,
          totalPages: result.data.pagination.totalPages || 1,
          nextPage: result.data.pagination.nextPage,
          prevPage: result.data.pagination.prevPage
        });
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      if (err instanceof Error && err.message.includes('401')) {
        handleAuthError();
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, handleAuthError]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.trim());
    setCurrentPage(1);
  };

  // Load initial data
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Add auth check on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/sign-in'); // Update path to match your login route
    }
  }, [router]);

  // Function to handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Function to get proper class display name
  const getClassDisplayName = (classValue: string) => {
    const classMap: Record<string, string> = {
      'baby_class': 'Baby Class',
      'middle_class': 'Middle Class',
      'top_class': 'Top Class',
      'p1': 'P1',
      'p2': 'P2',
      'p3': 'P3',
      'p4': 'P4',
      'p5': 'P5',
      'p6': 'P6',
      'p7': 'P7',
      'Form 3': 'Form 3'
    };
    
    return classMap[classValue] || classValue;
  };

  // Get initials from name
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Generate a consistent background color based on name
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Student avatar component
  const StudentAvatar = ({ student }: { student: Student }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const getSignedUrl = async () => {
        if (!student.student_photo) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(student.student_photo, 3600);
        
        if (error) {
          console.error("Error creating signed URL for delete student page:", error);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
        
        setIsLoading(false);
      };
      
      getSignedUrl();
    }, [student.student_photo]);

    // Show a loading shimmer while fetching the URL
    if (isLoading) {
      return (
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
      );
    }
    
    // If we have a valid URL, show the image
    if (imageUrl) {
      return (
        <div className="flex-shrink-0 h-10 w-10 relative">
          <div className="h-10 w-10 rounded-full overflow-hidden">
            <Image
              src={imageUrl}
              alt={`${student.first_name} ${student.last_name}`}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized // Important for external URLs like those from Supabase
            />
          </div>
        </div>
      );
    }

    // Otherwise, show the fallback initials
    return (
      <div
        className={`h-10 w-10 rounded-full ${getColorFromName(
          student.first_name + student.last_name
        )} flex items-center justify-center text-white font-medium`}
      >
        {getInitials(student.first_name, student.last_name)}
      </div>
    );
  };

  // Delete student functions
  const initiateDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const studentId = studentToDelete.id; // Use the actual ID from the student object
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Failed to delete student: ${response.status}`;
        } catch {
          errorMessage = `Failed to delete student: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Delete response:', result);
      
      if (result.status?.returnCode === "00") {
        setSuccess(`Successfully deleted ${studentToDelete.first_name} ${studentToDelete.last_name}`);
        // Remove the deleted student from the list
        setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
        fetchStudents(); // Refresh the list to ensure pagination is correct
      } else if (result.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(result.status?.returnMessage || 'Failed to delete student');
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the student');
    } finally {
      setLoading(false);
      setIsDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDialogOpen(false);
    setStudentToDelete(null);
  };

  return (
    <div className="container p-4 mx-auto">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-2xl font-bold">Delete Student</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Row */}
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, class or guardian..."
                className="pl-8 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                onChange={handleSearch}
                value={searchQuery}
              />
            </div>
            <div className="flex space-x-2">
              <select
                className="px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by class"
              >
                <option value="">All Classes</option>
                <option value="baby_class">Baby Class</option>
                <option value="middle_class">Middle Class</option>
                <option value="top_class">Top Class</option>
                <option value="p1">P1</option>
                <option value="p2">P2</option>
                <option value="p3">P3</option>
                <option value="p4">P4</option>
                <option value="p5">P5</option>
                <option value="p6">P6</option>
                <option value="p7">P7</option>
              </select>
            </div>
          </div>
          
          {/* Error and Success Messages */}
          {error && (
            <div className="mb-4 bg-red-100 text-red-800 p-4 rounded flex items-center">
              <AlertCircle className="mr-2" size={20} />
              Error: {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-100 text-green-800 p-4 rounded flex items-center">
              <Check className="mr-2" size={20} />
              {success}
            </div>
          )}

          {/* Reusable Delete Confirmation Dialog */}
          <DialogBox
            isOpen={isDialogOpen}
            onCancel={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            title="Confirm Delete"
            message={
              studentToDelete
                ? `Are you sure you want to delete student ${studentToDelete.first_name} ${studentToDelete.last_name}? This action cannot be undone.`
                : 'Are you sure you want to delete this student?'
            }
            confirmText="Delete"
            cancelText="Cancel"
            type="delete"
          />

          {/* Loading indicator */}
          {loading && !isDialogOpen && (
            <div className="flex justify-center my-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Responsive Student List */}
          {students.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto rounded-md shadow mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LIN</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bursary</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <StudentAvatar student={student} />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{student.first_name} {student.middle_name || ''} {student.last_name}</div>
                              <div className="text-sm text-gray-500">{student.gender}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.id?.substring(0, 8) || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getClassDisplayName(student.class_assigned)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.lin_number || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {student.bursary ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Full</span>
                          ) : student.half_bursary ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Half</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{student.guardian1_name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateDeleteStudent(student);
                            }}
                            aria-label={`Delete ${student.first_name} ${student.last_name}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {students.map((student) => (
                  <div key={student.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <div className="flex items-center mb-4">
                      <StudentAvatar student={student} />
                      <div className="ml-4">
                        <p className="text-md font-semibold text-gray-900">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-gray-500">ID: {student.id?.substring(0, 8) || '-'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Class:</span> {getClassDisplayName(student.class_assigned)}</p>
                      <p><span className="font-medium">Guardian:</span> {student.guardian1_name || '-'}</p>
                      <p><span className="font-medium">Contact:</span> {student.guardian1_phone1 || '-'}</p>
                      <p><span className="font-medium">Bursary:</span>
                        {student.bursary ? (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Full</span>
                        ) : student.half_bursary ? (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Half</span>
                        ) : (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">None</span>
                        )}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                      <button
                        className="text-white bg-red-600 hover:bg-red-700 w-full px-4 py-2 rounded text-sm font-medium transition-colors"
                        onClick={() => initiateDeleteStudent(student)}
                        aria-label={`Delete ${student.first_name} ${student.last_name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            
              {/* Pagination controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}</span> of <span className="font-medium">{pagination.totalCount}</span> results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : !loading ? (
            <div className="text-center py-8 text-gray-500">
              No students found. Try adjusting your search criteria.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteStudentManagement;