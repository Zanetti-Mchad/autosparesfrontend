'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { env } from '@/env';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  class_assigned: string;
  classId: string;
}

interface AttendanceRecord {
  id?: string; // Add record ID for API updates
  attendanceId?: string; // Add attendance ID for API updates
  date: string;
  student: string;
  studentId: string;
  status: 'Present' | 'Absent';
  reason: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface LoadingState {
  general: boolean;
  students: boolean;
  attendance: boolean;
  class: boolean;
  year: boolean;
  term: boolean;
  saving: boolean;
}

interface StudentAttendance {
  date: string;
  status: 'PRESENT' | 'ABSENT';
  absenceReason?: string;
}

interface StudentStats {
  studentId: string;
  attendance: StudentAttendance[];
}

interface ClassSummaryResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    classId: string;
    className: string;
    termId: string;
    termName: string;
    classAverage: number;
    totalSchoolDays: number;
    studentStats: StudentStats[];
  };
}

interface AttendanceData {
  id: string;
  date: string;
  classId: string;
  academicYearId: string;
  termId: string;
  records: {
    id: string;
    attendanceId: string;
    studentId: string;
    status: 'PRESENT' | 'ABSENT';
    absenceReason?: string;
    student: {
      id: string;
      first_name: string;
      last_name: string;
    }
  }[];
}

interface AttendanceResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    attendance: AttendanceData
  };
}

interface SaveAttendanceResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
}

function AttendanceView() {
  const searchParams = useSearchParams();
  
  // Get the classId parameter from the URL
  const classId = searchParams?.get('classId');

  // State declarations
  const [loading, setLoading] = useState<LoadingState>({
    general: false,
    students: false,
    attendance: false,
    class: false,
    year: false,
    term: false,
    saving: false
  });

  const [error, setError] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [originalRecords, setOriginalRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const [currentClass, setCurrentClass] = useState<ClassInfo | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);

  // State for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<{ index: number; record: AttendanceRecord | null }>({
    index: -1,
    record: null,
  });
  // New state to track the current status in the edit dialog
  const [editStatus, setEditStatus] = useState<'Present' | 'Absent'>('Present');

  // Check if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

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
      
      const data = await response.json();
      console.log(`Raw API response from ${fullUrl}:`, data);
      
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
      throw error;
    }
  }, []);

  // Initialize class data from URL
  useEffect(() => {
    if (!classId) {
      setError("No class ID provided in URL");
      return;
    }

    // Initialize with basic class info from URL
    setCurrentClass({
      id: classId,
      name: 'Loading...' // Will be updated with actual name after fetch
    });

    const fetchClassDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, class: true }));
        
        // Fetch class details
        const classDetails = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/classes/${classId}`);
        console.log("Class details response:", classDetails);

        // Handle different API response formats
        let className = '';
        if (classDetails.success && classDetails.class) {
          // Handle success: true format with direct class property
          className = classDetails.class.name;
        } else if (classDetails.data?.class) {
          // Handle data.class format
          className = classDetails.data.class.name;
        } else if (classDetails.class) {
          // Handle direct class format
          className = classDetails.class.name;
        } else if (classDetails.status?.returnCode === "00" && classDetails.data?.class) {
          // Handle status.returnCode format
          className = classDetails.data.class.name;
        } else if (classDetails.name) {
          // Handle direct class data (not nested)
          className = classDetails.name;
        } else {
          throw new Error("Failed to load class details");
        }

        // Update class name
        setCurrentClass({
          id: classId,
          name: className
        });
        
        setLoading(prev => ({ ...prev, class: false }));
      } catch (error) {
        console.error("Error fetching class details:", error);
        setError(error instanceof Error ? error.message : 'Failed to load class details');
        setLoading(prev => ({ ...prev, class: false }));
      }
    };

    fetchClassDetails();
  }, [classId, fetchWithAuth]);

  // Fetch academic year and term
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(prev => ({ ...prev, year: true, term: true }));

        // Fetch active academic year
        const yearData = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/academic-years/filter?isActive=true`);
        console.log("Academic year response:", yearData);
        
        // Handle different API response structures for year
        if (yearData.status?.returnCode === "00" && yearData.data?.academicYear) {
          // Standard format
          setCurrentYear({
            id: yearData.data.academicYear.id,
            year: yearData.data.academicYear.year,
            isActive: yearData.data.academicYear.isActive
          });
        } else if (yearData.success && yearData.academicYear) {
          // success: true format
          setCurrentYear({
            id: yearData.academicYear.id,
            year: yearData.academicYear.year,
            isActive: yearData.academicYear.isActive
          });
        } else if (yearData.academicYear) {
          // Direct property format
          setCurrentYear({
            id: yearData.academicYear.id,
            year: yearData.academicYear.year,
            isActive: yearData.academicYear.isActive
          });
        } else if (yearData.data?.academicYears && Array.isArray(yearData.data.academicYears) && yearData.data.academicYears.length > 0) {
          // Array of academic years
          const activeYear = yearData.data.academicYears.find((y: any) => y.isActive) || yearData.data.academicYears[0];
          setCurrentYear({
            id: activeYear.id,
            year: activeYear.year,
            isActive: activeYear.isActive
          });
        } else if (Array.isArray(yearData) && yearData.length > 0) {
          // Direct array response
          const activeYear = yearData.find((y: any) => y.isActive) || yearData[0];
          setCurrentYear({
            id: activeYear.id,
            year: activeYear.year,
            isActive: activeYear.isActive
          });
        } else if (yearData.data && Array.isArray(yearData.data) && yearData.data.length > 0) {
          // data array property
          const activeYear = yearData.data.find((y: any) => y.isActive) || yearData.data[0];
          setCurrentYear({
            id: activeYear.id,
            year: activeYear.year,
            isActive: activeYear.isActive
          });
        } else if (yearData.years && Array.isArray(yearData.years) && yearData.years.length > 0) {
          // Check if years array exists
          const activeYear = yearData.years.find((y: any) => y.isActive) || yearData.years[0];
          setCurrentYear({
            id: activeYear.id,
            year: activeYear.year,
            isActive: activeYear.isActive
          });
        } else {
          console.error("Unrecognized academic year response format:", yearData);
        }

        // Fetch current term
        const termData = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/term/active`);
        console.log("Term response:", termData);
        
        // Handle different API response structures for term
        if (termData.status?.returnCode === "00" && termData.data?.term) {
          // Standard format
          setCurrentTerm({
            id: termData.data.term.id,
            name: termData.data.term.name
          });
        } else if (termData.success && termData.term) {
          // success: true format
          setCurrentTerm({
            id: termData.term.id,
            name: termData.term.name
          });
        } else if (termData.term) {
          // Direct property format
          setCurrentTerm({
            id: termData.term.id,
            name: termData.term.name
          });
        } else if (termData.data && termData.data.id && termData.data.name) {
          // Direct term data
          setCurrentTerm({
            id: termData.data.id,
            name: termData.data.name
          });
        } else if (termData.id && termData.name) {
          // Direct term object
          setCurrentTerm({
            id: termData.id,
            name: termData.name
          });
        } else if (yearData.years?.[0]?.terms?.[0]) {
          // Extract from years response if terms are nested inside
          const term = yearData.years[0].terms[0];
          setCurrentTerm({
            id: term.id,
            name: term.name
          });
        } else {
          console.error("Unrecognized term response format:", termData);
        }

        setLoading(prev => ({ ...prev, year: false, term: false }));
      } catch (error) {
        console.error("Error fetching settings:", error);
        setError(error instanceof Error ? error.message : 'Failed to load settings');
        setLoading(prev => ({ ...prev, year: false, term: false }));
      }
    };

    fetchSettings();
  }, [fetchWithAuth]);

  // Fetch students once we have all required data
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentClass?.id) {
        console.log("Not fetching students: missing currentClass.id");
        return;
      }
      
      if (!currentYear?.id) {
        console.log("Not fetching students: missing currentYear.id");
        return;
      }
      
      if (!currentTerm?.id) {
        console.log("Not fetching students: missing currentTerm.id");
        return;
      }
      
      try {
        setLoading(prev => ({ ...prev, students: true }));
        
        // Fetch students
        const studentsData = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=90`);
        console.log("Student data response:", studentsData);
        
        // Handle different API response structures
        if (studentsData.status?.returnCode === "00" && studentsData.data?.students) {
          // Standard format
          setStudents(studentsData.data.students);
        } else if (studentsData.success && studentsData.students) {
          // success: true format 
          setStudents(studentsData.students);
        } else if (Array.isArray(studentsData)) {
          // Direct array of students
          setStudents(studentsData);
        } else if (studentsData.data && Array.isArray(studentsData.data)) {
          // data property is array of students
          setStudents(studentsData.data);
        } else {
          console.error("Unrecognized students response format:", studentsData);
          setStudents([]);
        }
        
        setLoading(prev => ({ ...prev, students: false }));
      } catch (error) {
        console.error("Error fetching students:", error);
        setError(error instanceof Error ? error.message : 'Failed to load students');
        setLoading(prev => ({ ...prev, students: false }));
      }
    };

    fetchStudents();
  }, [currentClass?.id, currentYear?.id, currentTerm?.id, fetchWithAuth]);

  // Fetch available dates with attendance records
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!currentClass?.id) {
        console.log("Not fetching dates: missing currentClass.id");
        return;
      }
      
      if (!currentYear?.id) {
        console.log("Not fetching dates: missing currentYear.id");
        return;
      }
      
      if (!currentTerm?.id) {
        console.log("Not fetching dates: missing currentTerm.id");
        return;
      }
      
      try {
        setLoading(prev => ({ ...prev, general: true }));
        
        // Fetch dates with attendance records
        const datesData = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/attendance/by-date-range?startDate=2025-01-01&endDate=2025-12-31&classId=${currentClass.id}`);
        console.log("Available dates response:", datesData);
        
        // Handle different API response structures
        let attendanceRecords: any[] = [];
        
        if (datesData.status?.returnCode === "00" && datesData.data?.attendanceRecords) {
          // Standard format for date range response
          attendanceRecords = datesData.data.attendanceRecords;
        } else if (datesData.success && datesData.attendanceRecords) {
          // success: true format
          attendanceRecords = datesData.attendanceRecords;
        } else if (Array.isArray(datesData)) {
          // Direct array of attendance
          attendanceRecords = datesData;
        } else if (datesData.data && Array.isArray(datesData.data)) {
          // data property is array of attendance
          attendanceRecords = datesData.data;
        } else if (datesData.attendance && Array.isArray(datesData.attendance)) {
          // attendance property is array
          attendanceRecords = datesData.attendance;
        } else {
          console.error("Unrecognized attendance dates response format:", datesData);
          attendanceRecords = [];
        }
        
        if (attendanceRecords.length > 0) {
          // Extract dates from attendance records
          const uniqueDates = Array.from(new Set(
            attendanceRecords.map(record => {
              // First try to extract the date in ISO format
              const dateObj = new Date(record.date);
              return dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            })
          )) as string[];
          
          // Sort dates in descending order (newest first)
          const sortedDates = uniqueDates.sort((a: string, b: string) => 
            new Date(b).getTime() - new Date(a).getTime()
          );
          
          setAvailableDates(sortedDates);
          
          // Auto-select the newest date if no date is currently selected
          if (!selectedDate && sortedDates.length > 0) {
            setSelectedDate(sortedDates[0]);
          }
        } else {
          console.log("No attendance records found for this class/term");
          setAvailableDates([]);
        }
        
        setLoading(prev => ({ ...prev, general: false }));
      } catch (error) {
        console.error("Error fetching available dates:", error);
        setAvailableDates([]);
        setLoading(prev => ({ ...prev, general: false }));
      }
    };

    fetchAvailableDates();
  }, [currentClass?.id, currentYear?.id, currentTerm?.id, fetchWithAuth, selectedDate]);

  // Fetch attendance records for selected date
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      if (!selectedDate) {
        console.log("Not fetching attendance: missing selectedDate");
        return;
      }
      
      if (!currentClass?.id) {
        console.log("Not fetching attendance: missing currentClass.id");
        return;
      }
      
      try {
        setLoading(prev => ({ ...prev, attendance: true }));
        setHasChanges(false); // Reset changes flag when loading new data
        
        // Construct the API URL for fetching attendance
        const attendanceApiUrl = `${env.BACKEND_API_URL}/api/v1/attendance/by-date?date=${selectedDate}&classId=${currentClass.id}`;
        console.log("Fetching attendance with URL:", attendanceApiUrl);
        
        const attendanceData = await fetchWithAuth(attendanceApiUrl);
        console.log("Attendance data response:", attendanceData);
        
        // Process the attendance data into records
        if (attendanceData.status?.returnCode === "00" && attendanceData.data?.attendance) {
          // Store the complete attendance data for later use
          setAttendanceData(attendanceData.data.attendance);
          
          // Get the records from the attendance data
          const attendanceRecords = attendanceData.data.attendance.records || [];
          
          // Convert to our record format
          const newRecords = attendanceRecords.map((record: any) => {
            const student = record.student;
            const studentName = `${student.first_name} ${student.last_name}`;
            
            return {
              id: record.id,
              attendanceId: record.attendanceId,
              date: selectedDate,
              student: studentName,
              studentId: student.id,
              status: record.status === 'PRESENT' ? 'Present' : 'Absent',
              reason: record.absenceReason || ''
            };
          });
          
          setRecords(newRecords);
          setOriginalRecords([...newRecords]); // Keep a copy of original records
        } else {
          console.error("Failed to extract attendance records from response:", attendanceData);
          setRecords([]);
          setOriginalRecords([]);
          setAttendanceData(null);
        }
        
        setLoading(prev => ({ ...prev, attendance: false }));
      } catch (error) {
        console.error("Error fetching attendance records:", error);
        setRecords([]);
        setOriginalRecords([]);
        setAttendanceData(null);
        setLoading(prev => ({ ...prev, attendance: false }));
      }
    };

    fetchAttendanceRecords();
  }, [selectedDate, currentClass?.id, fetchWithAuth]);

  // Check for unsaved changes
  useEffect(() => {
    if (records.length === 0 || originalRecords.length === 0) {
      setHasChanges(false);
      return;
    }

    // Compare current records with original records
    const hasChanges = records.some((record, index) => {
      const original = originalRecords[index];
      return (
        record.status !== original.status ||
        record.reason !== original.reason
      );
    });

    setHasChanges(hasChanges);
  }, [records, originalRecords]);

  // Helper function to format date
  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const weekNumber = Math.ceil(day / 7);
    
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}, Week ${weekNumber} of ${month}`;
  };
  
  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Helper function to handle edit record
  const handleEditRecord = (index: number) => {
    console.log(`Edit record ${index}`);
    const record = records[index];
    setCurrentRecord({ index, record });
    setEditStatus(record.status); // Initialize the edit status state
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newStatus = formData.get('status') as 'Present' | 'Absent';
    const newReason = formData.get('reason') as string || '';

    if (newStatus === 'Absent' && !newReason.trim()) {
      alert('Please provide a reason for absence.');
      return;
    }

    // Create a deep copy to ensure React detects the state change
    const updatedRecords = [...records];
    updatedRecords[currentRecord.index] = {
      ...records[currentRecord.index],
      status: newStatus,
      reason: newStatus === 'Present' ? '' : newReason.trim()
    };

    console.log('Updating record:', currentRecord.index, 'from', records[currentRecord.index], 'to', updatedRecords[currentRecord.index]);
    
    // Force a re-render by setting state
    setRecords([...updatedRecords]);
    setHasChanges(true); // Explicitly set hasChanges to true
    setIsEditDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setCurrentRecord({ index: -1, record: null });
  };

  const handleSaveChanges = async () => {
    if (!attendanceData || !currentClass || !currentYear || !currentTerm) {
      setError("Missing required data to save changes");
      return;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    
    try {
      // Convert our UI records to the format the API expects
      const apiRecords = records.map(record => ({
        studentId: record.studentId,
        status: record.status === 'Present' ? 'PRESENT' : 'ABSENT',
        absenceReason: record.status === 'Absent' ? record.reason : null
      }));

      // Prepare the request payload
      const savePayload = {
        date: selectedDate,
        classId: currentClass.id,
        academicYearId: currentYear.id,
        termId: currentTerm.id,
        records: apiRecords
      };

      console.log("Saving attendance with payload:", savePayload);

      // Save the updated attendance
      const saveResponse = await fetchWithAuth(`/api/v1/attendance/save-attendance`, {
        method: 'POST',
        body: JSON.stringify(savePayload)
      });

      console.log("Save response:", saveResponse);

      if (saveResponse.status?.returnCode === "00") {
        setSaveSuccessMessage(saveResponse.status.returnMessage || "Attendance updated successfully!");
        setOriginalRecords([...records]); // Update original records to match current state
        setHasChanges(false);
      } else {
        throw new Error(saveResponse.status?.returnMessage || "Failed to save attendance");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
      
      // Clear the success message after 3 seconds
      if (saveSuccessMessage) {
        setTimeout(() => {
          setSaveSuccessMessage("");
        }, 3000);
      }
    }
  };

  return (
    <div className="bg-gray-100 p-4 min-h-screen">
      <div className="container mx-auto">
           
        <div className="flex flex-col justify-center items-center bg-white p-2 shadow-md rounded-lg">
          <h1 className="text-2xl font-semibold text-center mb-2" style={{ color: 'rgb(78, 33, 33)' }}>
            View and Edit Attendance
          </h1>
          <h2 className="text-lg text-gray-600">Class: {currentClass ? currentClass.name : 'Loading...'}</h2>
          <div className="text-sm text-gray-600 mt-2">
            Year: {currentYear?.year || 'Loading...'} | Term: {currentTerm?.name || 'Loading...'}
          </div>
        </div>

        <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="dateSelector" className="block text-gray-700 mb-2">Select Date:</label>
              <select
                id="dateSelector"
                className="border p-2 rounded-md w-full"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                <option value="">Select a date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {formatDateForDisplay(date)}
                  </option>
                ))}
              </select>
              {availableDates.length === 0 && !loading.general && (
                <p className="text-orange-500 mt-2">No attendance dates available for this class.</p>
              )}
            </div>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mt-4">
            {saveSuccessMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mt-4">
            {error}
          </div>
        )}

        <div className="overflow-x-auto mt-6 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {selectedDate ? formatDateForDisplay(selectedDate) : 'Attendance Records'}
          </h2>
          
          {loading.general || loading.students || loading.attendance ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error && !saveSuccessMessage ? (
            <div className="text-red-500 text-center p-4">Error: {error}</div>
          ) : students.length === 0 ? (
            <div className="text-center p-4 text-gray-600">No students found for this class</div>
          ) : !selectedDate ? (
            <div className="text-center p-4 text-gray-600">Please select a date to view attendance records</div>
          ) : records.length === 0 ? (
            <div className="text-center p-4 text-gray-600">No attendance records found for this date</div>
          ) : (
            <>
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="py-2 px-4 border">#</th>
                    <th className="py-2 px-4 border">Student Name</th>
                    <th className="py-2 px-4 border">Attendance</th>
                    <th className="py-2 px-4 border">Reason (if Absent)</th>
                    <th className="py-2 px-4 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={`${record.date}-${record.studentId}`} className={
                      record.status === 'Present' ? 'bg-green-50' : record.status === 'Absent' ? 'bg-red-50' : ''
                    }>
                      <td className="py-2 px-4 border">{index + 1}</td>
                      <td className="py-2 px-4 border">{record.student}</td>
                      <td className="py-2 px-4 border">
                        <div className={`border p-2 rounded-md ${
                          record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                          record.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-50'
                        }`}>
                          {record.status}
                        </div>
                      </td>
                      <td className="py-2 px-4 border">
                        {record.status === 'Absent' ? record.reason || 'No reason provided' : '-'}
                      </td>
                      <td className="py-2 px-4 border">
                        <button
                          onClick={() => handleEditRecord(index)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Edit Dialog */}
              {isEditDialogOpen && currentRecord.record && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4">
                    <h3 className="text-lg font-semibold mb-4">Edit Attendance Details</h3>
                    <form onSubmit={handleSubmitEdit}>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Student:</label>
                        <div className="p-2 border rounded-md bg-gray-50">
                          {currentRecord.record.student}
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Attendance Status:</label>
                        <select
                          name="status"
                          defaultValue={currentRecord.record.status}
                          className="w-full p-2 border rounded-md"
                          onChange={(e) => {
                            // Update the editStatus state when the dropdown changes
                            setEditStatus(e.target.value as 'Present' | 'Absent');
                          }}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </div>
                      
                      {/* Show reason field only if status is Absent */}
                      {editStatus === 'Absent' && (
                        <div className="mb-4">
                          <label className="block text-gray-700 mb-2">Reason for Absence:</label>
                          <textarea
                            name="reason"
                            defaultValue={currentRecord.record.reason}
                            placeholder="Enter reason here (required for absence)..."
                            className="w-full p-2 border rounded-md"
                            rows={3}
                          />
                        </div>
                      )}
                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md mr-2"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={handleSaveChanges}
            className={`${
              hasChanges ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'
            } text-white px-6 py-2 rounded-md flex items-center`}
            disabled={!selectedDate || loading.general || loading.students || loading.attendance || loading.saving || !hasChanges}
          >
            {loading.saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
);
}

// New page component that wraps AttendanceView in Suspense
export default function ViewAttendancePage() {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading attendance details...</p></div>}>
      <AttendanceView />
    </Suspense>
  );
}