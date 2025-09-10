"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Filter, ChevronLeft, ChevronRight, Plus, Printer, Download, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
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
  is_active: boolean;
}

interface PaginationData {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextPage: number;
  prevPage: number;
}

const StudentManagementView = () => {
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
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
    nextPage: null,
    prevPage: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
        `${env.BACKEND_API_URL}/api/v1/students/filter?page=${currentPage}&pageSize=${pageSize}${
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
  const handleClassFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setClassFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

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
        // Don't run if there's no photo path
        if (!student.student_photo) {
          setIsLoading(false);
          return;
        }

        // Fetch the signed URL from Supabase. It's valid for 1 hour.
        const { data, error } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(student.student_photo, 3600); // 3600 seconds = 1 hour
        
        if (error) {
          console.error("Error creating signed URL:", error);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
        
        setIsLoading(false);
      };
      
      getSignedUrl();
    }, [student.student_photo]); // Rerun only when the photo path changes

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

  // Export to Excel function
  const handleExportToExcel = async () => {
    setIsExporting(true);
    setError(''); // Clear any previous errors
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Please log in again to export data');
        return;
      }

      // Always fetch all students for export
      try {
        const response = await fetch(
          `${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=100000&status=active`,
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
          throw new Error(`Failed to fetch all students: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status?.returnCode === "00") {
          // Use the complete dataset for export
          const allStudents = result.data.students || [];
          
          if (!allStudents.length) {
            setError('No students available to export');
            return;
          }

          type ExportRow = {
            'No.': string;
            'Student Name': string;
            'Class': string;
            'Gender': string;
            'Date of Birth': string;
            'Religion': string;
            'Student ID': string;
            'LIN Number': string;
            'Program': string;
            'Bursary Status': string;
            'School Fees Charged': string;
            'Discount': string;
            'Fees Payable': string;
            'Guardian Name': string;
            'Guardian Phone': string;
            'Registration Date': string;
            'Status': string;
          };

          // Transform students data for export
          const exportData: ExportRow[] = allStudents.map((student: Student, index: number) => ({
            'No.': (index + 1).toString(),
            'Student Name': `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
            'Class': getClassDisplayName(student.class_assigned),
            'Gender': student.gender,
            'Date of Birth': formatDate(student.dob),
            'Religion': student.religion,
            'Student ID': student.id,
            'LIN Number': student.lin_number,
            'Program': student.program,
            'Bursary Status': student.bursary ? 'Full Bursary' : student.half_bursary ? 'Half Bursary' : 'None',
            'School Fees Charged': formatMoney(student.school_fees_Charged).replace('UGX', '').trim(),
            'Discount': formatMoney(student.discount_fees).replace('UGX', '').trim(),
            'Fees Payable': formatMoney(student.fees_payable).replace('UGX', '').trim(),
            'Guardian Name': student.guardian1_name,
            'Guardian Phone': student.guardian1_phone1,
            'Registration Date': formatDate(student.createdAt),
            'Status': 'Active'
          }));

          // Create worksheet
          const ws = XLSX.utils.json_to_sheet(exportData);

          // Auto-size columns
          const colWidths: number[] = [];
          exportData.forEach(row => {
            (Object.keys(row) as Array<keyof ExportRow>).forEach((key, i) => {
              const value = String(row[key]);
              // Use smaller width for number column
              const maxWidth = key === 'No.' ? 8 : 50;
              colWidths[i] = Math.max(colWidths[i] || key.length, Math.min(value.length, maxWidth));
            });
          });

          ws['!cols'] = colWidths.map((width, i) => ({
            width: i === 0 ? width : Math.min(width + 2, 50) // Add less padding to number column
          }));

          // Add currency formatting for money columns
          const moneyColumns = ['K', 'L', 'M']; // School Fees, Discount, Fees Payable columns
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          moneyColumns.forEach(col => {
            for (let row = 2; row <= range.e.r + 1; row++) {
              const cell = ws[`${col}${row}`];
              if (cell) {
                cell.z = '#,##0';
              }
            }
          });

          // Create workbook
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Students');

          // Generate filename with current date
          const date = new Date().toISOString().split('T')[0];
          const filename = `all_students_${date}.xlsx`;

          // Save file
          XLSX.writeFile(wb, filename);
        } else if (result.status?.returnCode === "401") {
          handleAuthError();
          return;
        } else {
          throw new Error(result.status?.returnMessage || 'Failed to fetch all students');
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.message.includes('401')) {
          handleAuthError();
          return;
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export data to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Add print styles
  useEffect(() => {
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        /* Hide elements not needed in print */
        button, 
        select,
        input,
        .no-print {
          display: none !important;
        }

        /* Reset background colors for better printing */
        body {
          background: white !important;
        }

        /* Make the main container full width for print */
        .container {
          width: 100vw !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Set page size to A4 */
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        /* Ensure table fits on page */
        table {
          width: 100% !important;
          font-size: 12px !important;
        }

        /* Make sure table headers are visible */
        th {
          background-color: #f3f4f6 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Ensure text is black for better printing */
        td, th {
          color: black !important;
        }

        /* Add page breaks where needed */
        tr {
          page-break-inside: avoid;
        }

        /* Add title to printed page */
        .print-title {
          display: block !important;
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
        }

        /* Adjust card padding for print */
        .card {
          box-shadow: none !important;
          border: none !important;
        }

        /* Ensure pagination info is visible */
        .pagination-info {
          display: block !important;
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
            <select
              value={classFilter}
              onChange={handleClassFilterChange}
              className="px-4 py-2 border rounded w-full sm:w-auto"
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
        </CardHeader>
        
        <div className="flex justify-between px-2 py-2 no-print">
          <Link
            href="/pages/student/addstudent"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Student
          </Link>
          
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            
            <button 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExportToExcel}
              disabled={isExporting}
              title={isExporting ? 'Exporting...' : 'Export all students to Excel'}
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 border-t-2 border-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" /> 
                  Export All to Excel
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mx-6 my-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded flex items-center justify-between no-print">
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
          <div className="print-title">Student Management Report</div>
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
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
                      Date of Birth
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Religion
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
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guardian
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="px-2 py-4 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={14} className="px-2 py-4 text-center text-red-500">
                        {error}
                      </td>
                    </tr>
                  ) : !Array.isArray(students) || students.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-2 py-4 text-center text-gray-500">
                        No students found. Add a new student to get started.
                      </td>
                    </tr>
                  ) : (
                    students.map((student: Student, index: number) => (
                      <tr 
                        key={student.id} 
                        className="hover:bg-gray-50 cursor-pointer transition duration-150"
                        onClick={() => handleRowClick(student)}
                      >
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {((pagination?.page || 1) - 1) * pageSize + index + 1}
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
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{getClassDisplayName(student.class_assigned)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(student.dob)}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{student.religion || '-'}</td>
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
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.guardian1_name}</div>
                          <div className="text-sm text-gray-500">{student.guardian1_phone1}</div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(student.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Tablet View - 3 columns */}
            <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-4 mt-4">
              {loading ? (
                <div className="col-span-3 flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="col-span-3 text-center py-4 text-red-500">{error}</div>
              ) : !Array.isArray(students) || students.length === 0 ? (
                <div className="col-span-3 text-center py-4 text-gray-500">No students found.</div>
              ) : (
                students.map((student: Student) => (
                  <div 
                    key={student.id} 
                    className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200"
                    onClick={() => handleRowClick(student)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <StudentAvatar student={student} />
                        <div>
                          <p className="font-semibold text-gray-900">{`${student.first_name || ''} ${student.last_name || ''}`}</p>
                          <p className="text-sm text-gray-500">{getClassDisplayName(student.class_assigned)} • {student.id?.substring(0, 8) || '-'}</p>
                        </div>
                      </div>
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
                        <p className="text-gray-500 text-xs">Guardian</p>
                        <p className="font-medium">{student.guardian1_name || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                  <div className="flex justify-center items-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
              ) : error ? (
                  <div className="px-2 py-4 text-center text-red-500">{error}</div>
              ) : !Array.isArray(students) || students.length === 0 ? (
                  <div className="px-2 py-4 text-center text-gray-500">No students found.</div>
              ) : (
                students.map((student: Student, index: number) => (
                  <div 
                    key={student.id} 
                    className="bg-white p-4 rounded-lg shadow border border-gray-200 cursor-pointer hover:bg-gray-50 transition duration-150"
                    onClick={() => handleRowClick(student)}
                  >
                    <div className="flex items-center">
                      <StudentAvatar student={student} />
                      <div className="ml-4">
                        <div className="font-bold text-lg text-gray-800">
                          {`${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          Class: {getClassDisplayName(student.class_assigned)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-500 text-xs uppercase">Student ID</label>
                        <p className="text-gray-800">{student.id?.substring(0, 8) || '-'}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500 text-xs uppercase">Fees Payable</label>
                        <p className="text-gray-800 font-semibold">{formatMoney(student.fees_payable)}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500 text-xs uppercase">Guardian</label>
                        <p className="text-gray-800">{student.guardian1_name}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500 text-xs uppercase">Contact</label>
                        <p className="text-gray-800">{student.guardian1_phone1}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {pagination && students.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-2 py-3 pagination-info">
              <div className="text-sm text-gray-700">
                Showing {((pagination?.page || 1) - 1) * pageSize + 1} to{' '}
                {Math.min((pagination?.page || 1) * pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} results
              </div>
              
              <div className="flex space-x-2 no-print">
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

  return (
    <div className="container mx-auto py-6 px-4">
      <StudentListView />
    </div>
  );
};

const StudentManagementPageWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading student data...</p></div>}>
      <StudentManagementView />
    </Suspense>
  );
};

export default StudentManagementPageWrapper;
