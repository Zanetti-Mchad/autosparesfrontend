"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Calendar, ArrowLeft, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { env } from '@/env';
import NewPagination from '@/components/NewPagination';
import { supabase } from '@/lib/supabaseClient';



// Type definitions
interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  dob: string;
  country: string;
  class_assigned: string;
  classId: string;
  lin_number: string;
  religion: string;
  program: string;
  bursary: boolean;
  half_bursary: boolean;
  fees_for_program: string;
  school_pay_code: string;
  school_fees_Charged: string;
  discount_fees: string;
  stationary_amount: string;
  fees_payable: string;
  address: string;
  student_photo: string;
  guardian1_name: string;
  guardian1_relationship: string;
  guardian1_phone1: string;
  guardian2_name: string;
  guardian2_relationship: string;
  guardian2_phone1: string;
  createdAt: string;
  createdby: string;
  updatedAt: string;
  updatedby: string | null;
}

interface PaginationData {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextPage: number;
  prevPage: number;
}

const StudentManagement = () => {
  const router = useRouter();
  
  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10000;
  const [view, setView] = useState<'list' | 'detail'>('list');

  // Get selected class from URL
  const getSelectedClass = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');
    console.log('URL Parameters:', Object.fromEntries(urlParams.entries()));
    console.log('Class ID:', classId);
    return classId || '';
  };

  // Handle authentication error
  const handleAuthError = () => {
    setError('Your session has expired. Please log in again.');
    localStorage.removeItem('accessToken');
  };

  // Fetch students from API with pagination and filtering
  const fetchStudents = useCallback(async () => {
    // Reset students array when fetching new data
    setStudents([]);
    setLoading(true);
    setError('');
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const classId = getSelectedClass();
      console.log('Filtering for class ID:', classId);

      // Only fetch students if we have a class ID
      if (!classId) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // First, get the class details for this class ID
      const classResponse = await fetch(
        `${env.BACKEND_API_URL}/api/v1/classes/filter?id=${classId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!classResponse.ok) {
        console.error('Class API Response:', await classResponse.text());
        throw new Error('Failed to fetch class details');
      }

      const classResult = await classResponse.json();
      console.log('Class API Response:', classResult);

      if (!classResult.success || !classResult.classes || classResult.classes.length === 0) {
        console.error('Invalid class response:', classResult);
        throw new Error('Failed to fetch class details');
      }

      const selectedClass = classResult.classes.find((cls: any) => cls.id === classId);
      if (!selectedClass) {
        throw new Error('Class not found');
      }

      console.log('Selected class:', selectedClass);

      // Now fetch all active students
      const response = await fetch(
        `${env.BACKEND_API_URL}/api/v1/students/filter?status=active&pageSize=10000`,
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
      console.log('Students API Response:', result);
      
      if (result.status?.returnCode === "00") {
        const allStudents = result.data.students || [];
        
        // Filter students by classId
        const filteredStudents = allStudents.filter((student: Student) => student.classId === classId);
        console.log('Filtered students:', filteredStudents);
        
        // Sort students by name
        const sortedStudents = filteredStudents.sort((a: Student, b: Student) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setStudents(sortedStudents);
        setPagination({
          page: 1,
          pageSize: sortedStudents.length,
          totalCount: sortedStudents.length,
          totalPages: 1,
          nextPage: null,
          prevPage: null
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
  }, []);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchStudents();
  };

  // Load initial data
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
      'Form 3': 'Form 3' // Added to match API response
    };
    
    return classMap[classValue] || classValue;
  };

  // Formatting utilities
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatMoney = (amount?: string | number) => {
    if (amount === undefined || amount === null || amount === '') return '-';
    // Remove commas before parsing
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    if (isNaN(numericAmount)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(numericAmount);
  };

  // Update the formatNumberWithCommas function to better handle comma inputs
  const formatNumberWithCommas = (number: string | number): string => {
    if (!number) return '';
    // Remove existing commas before parsing
    const numericValue = parseFloat(number.toString().replace(/,/g, ''));
    return isNaN(numericValue) ? '' : numericValue.toLocaleString('en-US');
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
          console.error("Error creating signed URL for financial statement page:", error);
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

  // Render the list view
  const StudentListView = () => {
    if (loading && students.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row justify-between items-center pb-4">
          <CardTitle className="text-2xl font-bold">Student Management</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0 w-full md:w-auto">
            <div className="flex items-center w-full sm:w-auto">
              <input
                name="search"
                autoComplete="off"
                className="flex-1 px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search students..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    setSearchQuery(value);
                    setCurrentPage(1);
                    fetchStudents();
                  }
                }}
              />
              <button
                type="button"
                className="p-2 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200"
                onClick={() => {
                  const input = document.querySelector('input[name="search"]') as HTMLInputElement;
                  if (input) {
                    setSearchQuery(input.value);
                    setCurrentPage(1);
                    fetchStudents();
                  }
                }}
              >
                <Search className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </CardHeader>
        
        {error && (
          <div className="mx-6 my-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded flex items-center justify-between">
            <div>
              <p className="font-medium">Note:</p>
              <p>{error} {students.length > 0 ? '(Using sample data for demonstration)' : ''}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ×
            </button>
          </div>
        )}
        
        <CardContent className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    No.
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LIN Number
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bursary Status
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fees Charged
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fees Payable
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-2 py-4 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={11} className="px-2 py-4 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : !Array.isArray(students) || students.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-2 py-4 text-center text-gray-500">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((student: Student, index: number) => (
                      <tr 
                        key={student.id} 
                        className="hover:bg-gray-50 cursor-pointer transition duration-150"
                        onClick={() => {
                          const classId = getSelectedClass();
                          console.log('Navigating to student with ID:', student.id, 'from class:', classId);
                          router.push(`/pages/student/financialstatement?studentId=${student.id}&classId=${classId}`);
                        }}
                      >
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {((currentPage - 1) * pageSize) + index + 1}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StudentAvatar student={student} />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`}
                              </div>
                              <div className="text-sm text-gray-500">{student.gender}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getClassDisplayName(student.class_assigned)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.id?.substring(0, 8) || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.lin_number || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.program || '-'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.bursary ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Full Bursary
                            </span>
                          ) : student.half_bursary ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Half Bursary
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatMoney(student.school_fees_Charged)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatMoney(student.discount_fees)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatMoney(student.fees_payable)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click from triggering
                              const classId = getSelectedClass();
                              console.log('View Financial Statement for student:', student.id, 'from class:', classId);
                              router.push(`/pages/student/financialstatement?studentId=${student.id}&classId=${classId}`);
                            }}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            View Financial Statement
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && students.length > 0 && (
            <NewPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalCount={pagination.totalCount}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <StudentListView />
    </div>
  );
};

export default StudentManagement;
