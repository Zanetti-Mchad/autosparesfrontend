"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Edit, Save, X, Calendar, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import StudentForm, { initialFormState } from '@/components/forms/StudentForm';
import { supabase } from '../../../../../lib/supabaseClient';

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
  const pageSize = 20;
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Handle authentication error
  const handleAuthError = () => {
    setError('Your session has expired. Please log in again.');
    localStorage.removeItem('accessToken');
  };

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
        `${env.BACKEND_API_URL}/api/v1/students/filter?page=${currentPage}&pageSize=1000${
          searchQuery ? `&search=${searchQuery}` : ''
        }&status=active`,
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
  }, [currentPage, pageSize, searchQuery]);

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

  // Event handlers
  const handleRowClick = (student: Student) => {
    setCurrentStudentId(student.id);
    // You could navigate to detail page or open modal here
    // For now, let's just log it
    console.log("Selected student:", student);
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
          console.error("Error creating signed URL for edit page:", error);
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
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">No.</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LIN Number</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bursary Status</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees Charged</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees Payable</th>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Edit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div></td></tr>
                ) : error ? (
                  <tr><td colSpan={11} className="text-center py-4 text-red-500">{error}</td></tr>
                ) : !Array.isArray(students) || students.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-gray-500">No students found.</td></tr>
                ) : (
                  students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 cursor-pointer transition duration-150" onClick={() => handleRowClick(student)}>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{((pagination?.page || 1) - 1) * pageSize + index + 1}</td>
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StudentAvatar student={student} />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`}</div>
                            <div className="text-sm text-gray-500">{student.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{getClassDisplayName(student.class_assigned)}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{student.id?.substring(0, 8) || '-'}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{student.lin_number || '-'}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{student.program || '-'}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.bursary ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Full Bursary</span>
                        ) : student.half_bursary ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Half Bursary</span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">None</span>
                        )}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{formatMoney(student.school_fees_Charged)}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{formatMoney(student.discount_fees)}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{formatMoney(student.fees_payable)}</td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setShowEditForm(true); }} className="flex items-center p-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="Edit Student">
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tablet View - 2 columns */}
          <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-4 mt-4">
            {loading ? (
              <div className="col-span-2 flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="col-span-2 text-center py-4 text-red-500">{error}</div>
            ) : !Array.isArray(students) || students.length === 0 ? (
              <div className="col-span-2 text-center py-4 text-gray-500">No students found.</div>
            ) : (
              students.map((student) => (
                <div key={student.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <StudentAvatar student={student} />
                      <div>
                        <p className="font-semibold text-gray-900">{`${student.first_name || ''} ${student.last_name || ''}`}</p>
                        <p className="text-sm text-gray-500">{getClassDisplayName(student.class_assigned)} • {student.id?.substring(0, 8) || '-'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setShowEditForm(true); }} 
                      className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0"
                      title="Edit Student"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Program</p>
                      <p className="font-medium">{student.program || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Bursary</p>
                      <p className="font-medium">
                        {student.bursary ? (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded bg-green-100 text-green-800">Full</span>
                        ) : student.half_bursary ? (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded bg-yellow-100 text-yellow-800">Half</span>
                        ) : (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded bg-gray-100 text-gray-800">None</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Fees Payable</p>
                      <p className="font-medium">{formatMoney(student.fees_payable)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Status</p>
                      <p className="font-medium">
                        <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded bg-green-100 text-green-800">Active</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">{error}</div>
            ) : !Array.isArray(students) || students.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No students found.</div>
            ) : (
              students.map((student) => (
                <div key={student.id} className="bg-white p-4 rounded-lg shadow" onClick={() => handleRowClick(student)}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <StudentAvatar student={student} />
                      <div>
                        <p className="font-bold text-gray-900">{`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`}</p>
                        <p className="text-sm text-gray-500">{student.gender}</p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setShowEditForm(true); }} className="flex items-center p-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="Edit Student">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Class</p>
                      <p className="font-medium">{getClassDisplayName(student.class_assigned)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Student ID</p>
                      <p className="font-medium">{student.id?.substring(0, 8) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">LIN</p>
                      <p className="font-medium">{student.lin_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Program</p>
                      <p className="font-medium">{student.program || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Bursary</p>
                      <p className="font-medium">
                        {student.bursary ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Full Bursary</span>
                        ) : student.half_bursary ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Half Bursary</span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">None</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fees Payable</p>
                      <p className="font-medium">{formatMoney(student.fees_payable)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination && students.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-2 py-3">
              <div className="text-sm text-gray-700">
                Showing {((pagination?.page || 1) - 1) * pageSize + 1} to{' '}
                {Math.min((pagination?.page || 1) * pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} results
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={(pagination?.page || 1) === 1}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={(pagination?.page || 1) === 1 || (pagination?.prevPage || 0) === 0}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1">
                  Page {(pagination?.page || 1)} of {(pagination?.totalPages || 1)}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min((pagination?.totalPages || 1), prev + 1))}
                  disabled={(pagination?.page || 1) === (pagination?.totalPages || 1) || (pagination?.nextPage || 0) === 0}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                
                <button
                  onClick={() => setCurrentPage(pagination?.totalPages || 1)}
                  disabled={(pagination?.page || 1) === (pagination?.totalPages || 1)}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Student Edit Form
  const StudentEditForm = () => {
    const formRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [selectedClassName, setSelectedClassName] = useState<string>('');

    // Fetch class data for dropdown
    useEffect(() => {
      const fetchClasses = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
          const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch classes');
          }

          const data = await response.json();
          console.log('Classes fetched:', data.classes);
          setClasses(data.classes); 
          
          if (data.classes && Array.isArray(data.classes)) {
            data.classes.forEach((cls: { id: string, name: string }) => {
              console.log(`Class mapping: ID=${cls.id}, Name=${cls.name}`);
            });
          }
        } catch (error) {
          console.error('Error fetching classes:', error);
        }
      };

      fetchClasses();
    }, []); // Empty dependency array

    // Load student data
    useEffect(() => {
      // Skip if no selected student
      if (!selectedStudent) return;
      
      if (selectedStudent) {
        console.log("Loading student data:", selectedStudent);
        console.log("Class assigned from API:", selectedStudent.class_assigned);
        console.log("Class ID from API:", selectedStudent.classId);
        
        // Set the selectedClassName based on class_assigned (display name)
        setSelectedClassName(selectedStudent.class_assigned || '');
        
        // Also ensure the form gets the correct initial data by triggering a re-render
        // This helps synchronize the form's internal state with the new student data
        // Use classId for the form since dropdown expects IDs
        if (formRef.current && formRef.current.updateFormData) {
          formRef.current.updateFormData({
            class_assigned: selectedStudent.classId || '' // Use classId for dropdown
          });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStudent]); // Add selectedStudent to dependency array so it runs when student changes

    // Update the stationaryAmount based on the class
    const updateStationaryAmount = (classValue: string): string => {
      if (!classValue) return '70000';
      
      const classLower = classValue.toLowerCase();
      
      if (
        classLower.includes('baby') || 
        classLower.includes('middle') || 
        classLower.includes('top') || 
        classLower.includes('nursery') ||
        classLower === 'baby_class' || 
        classLower === 'middle_class' || 
        classLower === 'top_class'
      ) {
        return '70000';
      } else if (
        classLower.includes('p1') || 
        classLower.includes('p2') || 
        classLower.includes('p3') || 
        classLower.includes('primary 1') || 
        classLower.includes('primary 2') || 
        classLower.includes('primary 3') ||
        classLower === 'p1' || 
        classLower === 'p2' || 
        classLower === 'p3'
      ) {
        return '80000';
      } else if (
        classLower.includes('p4') || 
        classLower.includes('p5') || 
        classLower.includes('primary 4') || 
        classLower.includes('primary 5') ||
        classLower === 'p4' || 
        classLower === 'p5'
      ) {
        return '140000';
      } else if (
        classLower.includes('p6') || 
        classLower.includes('p7') || 
        classLower.includes('primary 6') || 
        classLower.includes('primary 7') ||
        classLower === 'p6' || 
        classLower === 'p7'
      ) {
        return '160000';
      }
      return '70000';
    };

    // Upload photo helper
    const uploadPhoto = async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload photo: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      if (!data.fileName) throw new Error('No fileName returned from upload');
      return data.fileName;
    };

    // Handle form submission
    const handleSubmit = async (formData: any, photoFile: File | null) => {
      if (!selectedStudent || !selectedStudent.id) return;
      
      setLoading(true);
      setApiError('');
      
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          handleAuthError();
          return;
        }

        // Check required fields
        const requiredFields = [
          'first_name',
          'last_name',
          'gender',
          'dob',
          'country',
          'class_assigned',
          'religion',
          'program',
          'fees_payable',
          'address',
          'guardian1_name',
          'guardian1_relationship',
          'guardian1_phone1'
        ];
        
        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Upload photo if changed
        if (photoFile && formData.student_photo && formData.student_photo !== selectedStudent.student_photo) {
          try {
            const uploadedFileName = await uploadPhoto(photoFile);
            formData.student_photo = uploadedFileName;
          } catch (photoError) {
            setApiError(photoError instanceof Error ? photoError.message : 'Failed to upload photo');
            setLoading(false);
            return;
          }
        }

        // Send the updated student data to the API
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/${selectedStudent.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            class_assigned: selectedClassName, // Use the class name instead of ID
            bursary: formData.bursary ? true : false,
            half_bursary: formData.half_bursary ? true : false,
            updatedby: "ac25c4ca-048e-40ea-ad83-f0930cef52be"
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleAuthError();
            return;
          }
          
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || 'Failed to update student';
          } catch {
            errorMessage = `Failed to update student: ${response.status} ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log("API Success Response:", result);
        
        if (result.status?.returnCode === "00") {
          setShowSuccess(true);
          
          // Refresh student list after update
          setTimeout(() => {
            fetchStudents();
            setShowEditForm(false);
          }, 1500);
        } else if (result.status?.returnCode === "401") {
          handleAuthError();
          return;
        } else {
          throw new Error(result.status?.returnMessage || 'Failed to update student');
        }
      } catch (err) {
        console.error('Error updating student:', err);
        setApiError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Handle class change
    const handleClassChange = (value: string): boolean => {
      console.log(`Class dropdown changed to value: "${value}"`);
        
      // Find the class in our classes array to get the name
      const selectedClass = classes.find(cls => cls.id === value);
      let className = value; // Default to the value itself if no match
      
      if (selectedClass) {
        className = selectedClass.name;
        console.log(`Found class in API data: ID=${selectedClass.id}, Name=${selectedClass.name}`);
      } else {
        console.log(`Could not find class with ID "${value}" in API data, using value as is`);
      }
      
      setSelectedClassName(className);
      console.log(`Set selectedClassName to: "${className}"`);
      
      // Calculate the stationary amount based on the class
      const stationaryAmount = updateStationaryAmount(className);
      console.log(`Calculated stationary amount: ${stationaryAmount} based on class name: "${className}"`);
      
      // Update the form with the new class and stationary amount
      if (formRef.current && formRef.current.updateFormData) {
        formRef.current.updateFormData({
          class_assigned: value,
          stationary_amount: stationaryAmount
        });
      }
      
      return true; // Allow form update
    };

    if (!selectedStudent) return null;

    // Initialize form data from selected student
    const initialData = {
      first_name: selectedStudent.first_name || '',
      middle_name: selectedStudent.middle_name || '',
      last_name: selectedStudent.last_name || '',
      gender: selectedStudent.gender || '',
      dob: selectedStudent.dob ? selectedStudent.dob.substring(0, 10) : '',
      country: selectedStudent.country || '',
      class_assigned: selectedStudent.classId || '', // Use classId for dropdown, not class_assigned (which is the name)
      lin_number: selectedStudent.lin_number || '',
      religion: selectedStudent.religion || '',
      program: selectedStudent.program || '',
      bursary: selectedStudent.bursary || false,
      half_bursary: selectedStudent.half_bursary || false,
      fees_for_program: selectedStudent.fees_for_program || '',
      school_pay_code: selectedStudent.school_pay_code || '',
      school_fees_Charged: selectedStudent.school_fees_Charged || '',
      discount_fees: selectedStudent.discount_fees || '',
      stationary_amount: selectedStudent.stationary_amount || '70000',
      fees_payable: selectedStudent.fees_payable || '',
      address: selectedStudent.address || '',
      student_photo: selectedStudent.student_photo || '',
      guardian1_name: selectedStudent.guardian1_name || '',
      guardian1_relationship: selectedStudent.guardian1_relationship || '',
      guardian1_phone1: selectedStudent.guardian1_phone1 || '',
      guardian2_name: selectedStudent.guardian2_name || '',
      guardian2_relationship: selectedStudent.guardian2_relationship || '',
      guardian2_phone1: selectedStudent.guardian2_phone1 || ''
    };
    
    // Debug logging for class assignment
    console.log("=== STUDENT EDIT FORM DEBUG ===");
    console.log("Selected Student:", selectedStudent);
    console.log("Class NAME from API:", selectedStudent.class_assigned);
    console.log("Class ID from API:", selectedStudent.classId);
    console.log("Initial Data class_assigned (should be ID):", initialData.class_assigned);
    console.log("Selected Class Name state:", selectedClassName);
    console.log("Available classes:", classes);
    console.log("Classes dropdown options:", classes.map(c => `ID: ${c.id}, Name: ${c.name}`));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-screen overflow-y-auto">
          <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Edit Student: {selectedStudent.first_name} {selectedStudent.last_name}</h2>
            <button 
              onClick={() => setShowEditForm(false)}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-6">
            <StudentForm
              ref={formRef}
              onSubmit={handleSubmit}
              classes={classes}
              loading={loading}
              apiError={apiError}
              showSuccess={showSuccess}
              initialData={initialData}
              submitButtonText="Save Changes"
              onClassChange={handleClassChange}
              setPhotoFile={setPhotoFile} // Pass setPhotoFile to StudentForm
            />
            
            {showSuccess && (
              <div className="mt-4 bg-green-100 text-green-800 p-4 rounded flex items-center">
                <Check className="mr-2" size={20} />
                Student information updated successfully!
              </div>
            )}
            
            {apiError && (
              <div className="mt-4 bg-red-100 text-red-800 p-4 rounded flex items-center">
                <AlertCircle className="mr-2" size={20} />
                Error: {apiError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <StudentListView />
      {showEditForm && selectedStudent && <StudentEditForm />}
    </div>
  );
};

export default StudentManagement;