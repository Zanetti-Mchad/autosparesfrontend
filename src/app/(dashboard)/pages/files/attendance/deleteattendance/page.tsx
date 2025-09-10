"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';
interface AttendanceRecord {
  date: string;
  student: string;
  studentId: string;
  status: 'Present' | 'Absent';
  reason: string;
}

interface DateOption {
  value: string;
  label: string;
}

const DeleteAttendanceViewContent: React.FC = () => {
  // Use search params to get class ID from URL
  const searchParams = useSearchParams();
  const urlClassId = searchParams?.get('classId');

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState({
    dates: false,
    records: false,
    deleting: false,
    classInfo: false
  });
  const [error, setError] = useState<string | null>(null);
  const [classInfo, setClassInfo] = useState({ id: '', name: 'Loading...' });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Helper function for API calls
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
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

    // Construct the full URL using the environment variable
    const fullUrl = url.startsWith('/') ? `${env.BACKEND_API_URL}${url}` : url;

    try {
      const response = await fetch(fullUrl, mergedOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${fullUrl}:`, error);
      throw error;
    }
  }, []);

  // Helper function to format date
  const formatDateForDisplay = useCallback((dateString: string): string => {
    const getOrdinalSuffix = (day: number): string => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const weekNumber = Math.ceil(day / 7);
    
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}, Week ${weekNumber} of ${month}`;
  }, []);

  // Fetch class details
  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, classInfo: true }));
        
        // Priority: URL parameter, localStorage, fallback
        const classId = urlClassId || 
                        localStorage.getItem('currentClassId') || 
                        '';
        
        if (!classId) {
          throw new Error("No class ID found");
        }

        // Try multiple API endpoints
        const endpoints = [
          `/api/v1/classes/${classId}`,
          `/api/v1/class/${classId}`,
          `/api/classes/${classId}`
        ];

        let classResponse = null;
        for (const endpoint of endpoints) {
          try {
            classResponse = await fetchWithAuth(endpoint);
            if (classResponse) break;
          } catch (err) {
            console.log(`Failed to fetch from ${endpoint}`);
          }
        }

        if (!classResponse) {
          throw new Error("Could not fetch class details from any endpoint");
        }

        // Extract class name with multiple fallback strategies
        const className = 
          classResponse.data?.class?.name || 
          classResponse.class?.name || 
          classResponse.name || 
          classResponse.className ||
          `Class ${classId}`;
        
        setClassInfo({ id: classId, name: className });
        setLoading(prev => ({ ...prev, classInfo: false }));
      } catch (error) {
        console.error('Error fetching class details:', error);
        setError('Failed to load class information');
        setLoading(prev => ({ ...prev, classInfo: false }));
        
        // Set a default class name if all else fails
        setClassInfo({ 
          id: urlClassId || localStorage.getItem('currentClassId') || '', 
          name: 'Unknown Class' 
        });
      }
    };

    fetchClassDetails();
  }, [fetchWithAuth, urlClassId]);

  // Fetch available dates
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!classInfo.id) return;

      try {
        setLoading(prev => ({ ...prev, dates: true }));
        const currentYear = new Date().getFullYear();
        const datesResponse = await fetchWithAuth(
          `/api/v1/attendance/by-date-range?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31&classId=${classInfo.id}`
        );
        
        let attendanceRecords: any[] = [];
        if (datesResponse.status?.returnCode === "00" && datesResponse.data?.attendanceRecords) {
          attendanceRecords = datesResponse.data.attendanceRecords;
        } else if (datesResponse.data && Array.isArray(datesResponse.data)) {
          attendanceRecords = datesResponse.data;
        } else if (Array.isArray(datesResponse)) {
          attendanceRecords = datesResponse;
        }
        
        const uniqueDates = Array.from(new Set(
          attendanceRecords.map(record => {
            const date = new Date(record.date);
            return {
              value: date.toISOString().split('T')[0],
              label: formatDateForDisplay(date.toISOString().split('T')[0])
            };
          })
        ));
        
        uniqueDates.sort((a, b) => 
          new Date(b.value).getTime() - new Date(a.value).getTime()
        );
        
        setDateOptions(uniqueDates);
        setLoading(prev => ({ ...prev, dates: false }));
      } catch (error) {
        console.error('Error fetching dates:', error);
        setError('Failed to load attendance dates');
        setLoading(prev => ({ ...prev, dates: false }));
      }
    };

    fetchAvailableDates();
  }, [classInfo.id, fetchWithAuth, formatDateForDisplay]);

  // Fetch records for selected date
  useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedDate || !classInfo.id) return;

      try {
        setLoading(prev => ({ ...prev, records: true }));
        const recordsResponse = await fetchWithAuth(
          `/api/v1/attendance/by-date?date=${selectedDate}&classId=${classInfo.id}`
        );
        
        let attendanceRecords: any[] = [];
        if (recordsResponse.status?.returnCode === "00" && recordsResponse.data?.attendance?.records) {
          attendanceRecords = recordsResponse.data.attendance.records;
        }
        
        // Transform records to match our interface with proper type conversion
        const formattedRecords = attendanceRecords.map(record => ({
          date: selectedDate,
          student: `${record.student.first_name} ${record.student.last_name}`,
          studentId: record.studentId || '',
          status: record.status === 'PRESENT' ? 'Present' : 'Absent' as 'Present' | 'Absent',
          reason: record.absenceReason || ''
        }));
        
        setRecords(formattedRecords);
        setLoading(prev => ({ ...prev, records: false }));
      } catch (error) {
        console.error('Error fetching records:', error);
        setError('Failed to load attendance records');
        setLoading(prev => ({ ...prev, records: false }));
      }
    };

    fetchRecords();
  }, [selectedDate, classInfo.id, fetchWithAuth]);

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleDelete = async () => {
    if (!selectedDate || !classInfo.id) return;
    
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(prev => ({ ...prev, deleting: true }));
      
      // API call to delete attendance records
      const deleteResponse = await fetchWithAuth('/api/v1/attendance/delete', {
        method: 'DELETE',
        body: JSON.stringify({
          date: selectedDate,
          classId: classInfo.id
        })
      });
      
      // Handle successful deletion
      if (deleteResponse.status?.returnCode === "00") {
        // Remove the date from options
        const newDateOptions = dateOptions.filter(option => option.value !== selectedDate);
        setDateOptions(newDateOptions);
        
        // Clear records and selected date
        setRecords([]);
        setSelectedDate('');
        
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), 3000);
      } else {
        throw new Error(deleteResponse.status?.returnMessage || 'Failed to delete records');
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete attendance records');
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
      setShowDeleteDialog(false);
    }
  };

  // Close dialog on cancel
  const closeDialog = () => {
    setShowDeleteDialog(false);
  };

  return (
    <div className="bg-gray-100 p-4 min-h-screen">
      <div className="container mx-auto">
    
        {/* Header Section */}
        <div className="flex flex-col justify-center items-center bg-white p-4 shadow-md rounded-lg mb-4">
          <h1 className="text-2xl font-semibold text-center mb-2" style={{ color: 'rgb(78, 33, 33)' }}>
            Delete Attendance Records
          </h1>
          <p className="text-lg text-gray-600">Class: {classInfo.name}</p>
        </div>

        {/* Error Handling */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Success Message */}
        {deleteSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mb-4">
            Attendance records deleted successfully
          </div>
        )}

        {/* Date Selector */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <label className="block text-gray-700 mb-2">Select Date:</label>
          <select
            value={selectedDate}
            onChange={handleDateChange}
            disabled={loading.dates || dateOptions.length === 0}
            className="border p-2 rounded-md w-full"
          >
            <option value="">Select a date</option>
            {dateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Records Table */}
        {selectedDate && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Attendance Records
              {loading.records && (
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              )}
            </h2>
            
            {loading.records ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : records.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="py-2 px-4 border">#</th>
                        <th className="py-2 px-4 border">Student Name</th>
                        <th className="py-2 px-4 border">Attendance</th>
                        <th className="py-2 px-4 border">Reason (if Absent)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <tr 
                          key={record.studentId} 
                          className={record.status === 'Present' ? 'bg-green-50' : 'bg-red-50'}
                        >
                          <td className="py-2 px-4 border">{index + 1}</td>
                          <td className="py-2 px-4 border">{record.student}</td>
                          <td className="py-2 px-4 border">{record.status}</td>
                          <td className="py-2 px-4 border">
                            {record.status === 'Absent' ? record.reason || 'No reason provided' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Delete Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleDelete}
                    disabled={loading.deleting}
                    className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition duration-200 flex items-center"
                  >
                    {loading.deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete All Records for This Date'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-4 text-gray-600">
                No records found for this date
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <DialogBox
          isOpen={showDeleteDialog}
          title="Delete Attendance Records"
          message={`Are you sure you want to delete all attendance records for ${formatDateForDisplay(selectedDate)}?`}
          onConfirm={confirmDelete}
          onCancel={closeDialog}
          confirmText="Delete Records"
          cancelText="Cancel"
          type="delete"
        />
      </div>
    </div>
  );
};

const DeleteAttendancePage: React.FC = () => {
  return (
    <React.Suspense fallback={<div>Loading page...</div>}>
      <DeleteAttendanceViewContent />
    </React.Suspense>
  );
};

export default DeleteAttendancePage;