'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { env } from '@/env';

interface DateInfo {
  month: string;
  day: string;
  date: number;
  year: number;
  weekNumber: number;
  heading: string;
}

interface ActiveCell {
  cellId: string;
  studentId: string;
  studentName: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_assigned: string;
  classId: string;
  middle_name?: string;
}

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface ClassTeacher {
  id: string;
  class: {
    id: string;
    name: string;
  };
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
}

interface TeacherData {
  id: string;
  isMainTeacher?: boolean;
  user?: {
    first_name: string;
    last_name: string;
  };
  teacher?: {
    first_name: string;
    last_name: string;
  };
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface TeacherResponse {
  status?: {
    returnCode: string;
  };
  success?: boolean;
  teachers?: TeacherData[];
  data?: {
    teachers?: TeacherData[];
    data?: {
      teachers?: TeacherData[];
    };
  };
}

const AttendanceTrackerContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the classId parameter from the URL
  const classId = searchParams?.get('classId');
  
  const [loading, setLoading] = useState<LoadingState>({
    general: true,
    students: false
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [absenceReason, setAbsenceReason] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");

  // State for students and class
  const [students, setStudents] = useState<Student[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassTeacher | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Fetch class details
  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!classId) {
        setError("No class selected. Please select a class first.");
        setLoading(prev => ({ ...prev, general: false }));
        return;
      }

      try {
        setLoading(prev => ({ ...prev, general: true }));
        
        // Fetch class details
        const classDetails = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/classes/${classId}`);
        console.log("Class details response:", classDetails);
        
        if (classDetails.success && classDetails.class) {
          // Set initial class details
          setCurrentClass({
            id: classDetails.class.id,
            class: {
              id: classDetails.class.id,
              name: classDetails.class.name
            }
          });
        } else {
          throw new Error("Failed to load class details");
        }
        
        setLoading(prev => ({ ...prev, general: false }));
      } catch (error) {
        console.error("Error fetching class details:", error);
        setError(error instanceof Error ? error.message : 'Failed to load class details');
        setLoading(prev => ({ ...prev, general: false }));
      }
    };

    fetchClassDetails();
  }, [classId]);

  // Fetch academic year and term
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentClass) return; // Don't proceed if no class is selected
      
      try {
        setLoading(prev => ({ ...prev, general: true }));

        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error("Authentication required");
        }

        // Fetch active academic year
        const yearData = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/academic-years/filter?isActive=true`);
        
        if (yearData.success && yearData.years && yearData.years.length > 0) {
          const activeYear = yearData.years.find((year: AcademicYear) => year.isActive) || yearData.years[0];
          setCurrentYear(activeYear);
        }

        // Fetch current term
        const termData = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/term/active`);
        
        if (termData.success && termData.term) {
          setCurrentTerm(termData.term);
        }

        setLoading(prev => ({ 
          ...prev, 
          general: false 
        }));
      } catch (error) {
        console.error("Error fetching settings:", error);
        setError(error instanceof Error ? error.message : 'Failed to load settings');
        setLoading(prev => ({ 
          ...prev, 
          general: false 
        }));
      }
    };

    fetchSettings();
  }, [currentClass]);

  // Fetch students once we have all required data
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentClass?.class.id || !currentYear?.id || !currentTerm?.id) return;
      
      try {
        setLoading(prev => ({ ...prev, students: true }));
        
        // Log the URL to verify parameters
        const studentApiUrl = `${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=10000&classId=${currentClass.class.id}&academicYearId=${currentYear.id}&termId=${currentTerm.id}&status=active`;
        console.log("Fetching students with URL:", studentApiUrl);
        
        const studentsData = await fetchWithAuth(studentApiUrl);
        console.log("Student data response:", studentsData);
        
        // Extract students from the response, handling different data structures
        let allStudents: Student[] = [];
        
        if (studentsData.status?.returnCode === "00") {
          // For the newer API structure (as shown in your JSON sample)
          if (studentsData.data?.students) {
            allStudents = studentsData.data.students;
          } else if (studentsData.data?.data?.students) {
            allStudents = studentsData.data.data.students;
          }
        } else if (studentsData.success && studentsData.data) {
          // For the older API structure
          allStudents = Array.isArray(studentsData.data) 
            ? studentsData.data 
            : studentsData.data.students || [];
        }
        
        console.log("All students from API:", allStudents.length);
        
        // Multi-level filtering strategy based on your database schema
        // 1. First try with exact match on classId
        let filteredStudents = allStudents.filter(student => 
          student.classId === currentClass.class.id
        );
        
        console.log("Students filtered by classId:", filteredStudents.length);
        
        // 2. If no matches, try with class_assigned field (exact match)
        if (filteredStudents.length === 0) {
          const className = currentClass.class.name.toLowerCase();
          
          filteredStudents = allStudents.filter(student => {
            const assignedClass = student.class_assigned?.toLowerCase() || '';
            return assignedClass === className;
          });
          
          console.log("Students filtered by exact class_assigned match:", filteredStudents.length);
          
          // 3. If still few matches, try with partial matching on class_assigned
          if (filteredStudents.length === 0) {
            filteredStudents = allStudents.filter(student => {
              const assignedClass = student.class_assigned?.toLowerCase() || '';
              return assignedClass.includes(className) || className.includes(assignedClass);
            });
            
            console.log("Students filtered by partial class_assigned match:", filteredStudents.length);
          }
        }
        
        // If we found students through any method, use them
        // Otherwise, just use an empty array
        console.log("Final filtered students count:", filteredStudents.length);
        setStudents(filteredStudents);
        
        setLoading(prev => ({ ...prev, students: false }));
      } catch (error) {
        console.error("Error fetching students:", error);
        setError(error instanceof Error ? error.message : 'Failed to load students');
        setLoading(prev => ({ ...prev, students: false }));
      }
    };

    fetchStudents();
  }, [currentClass?.class.id, currentYear?.id, currentTerm?.id, currentClass?.class.name]);

  const formatDate = (date: string): DateInfo => {
    const selectedDate = new Date(date + 'T00:00:00');
    const month = selectedDate.toLocaleString('default', { month: 'long' });
    const day = selectedDate.toLocaleString('default', { weekday: 'long' });
    const dateNum = selectedDate.getDate();
    const year = selectedDate.getFullYear();
    const firstDayOfMonth = new Date(year, selectedDate.getMonth(), 1);
    const firstWeekday = firstDayOfMonth.getDay();
    const weekNumber = Math.ceil((dateNum + firstWeekday) / 7);

    return {
      month,
      day,
      date: dateNum,
      year,
      weekNumber,
      heading: `${dateNum}th ${month} ${year}, Week ${weekNumber} of ${month}`
    };
  };

  const updateHeadingAndTable = (date: string) => {
    setSelectedDate(date);
    setAttendanceRecords({});
  };

  const markPresent = (studentId: string, studentName: string) => {
    const updatedRecords = { ...attendanceRecords };
    updatedRecords[studentName] = "PRESENT";
    setAttendanceRecords(updatedRecords);
  };

  const openDialog = (studentId: string, studentName: string) => {
    setActiveCell({ 
      cellId: `${studentId}-absent`, 
      studentId, 
      studentName 
    });
    setShowDialog(true);
  };

  const submitAbsenceReason = () => {
    if (!activeCell) return;
    
    if (absenceReason.trim()) {
      const updatedRecords = { ...attendanceRecords };
      updatedRecords[activeCell.studentName] = `ABSENT:${absenceReason}`;
      setAttendanceRecords(updatedRecords);
      setShowDialog(false);
      setAbsenceReason('');
    } else {
      alert("Please provide a reason for absence.");
    }
  };

  const saveAttendance = async () => {
    try {
      if (!selectedDate || !currentClass?.class.id || !currentYear?.id || !currentTerm?.id) {
        throw new Error("Please select a date, class, academic year, and term first");
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error("Authentication required");
      }

      const records = students.map(student => {
        const studentName = `${student.first_name} ${student.last_name}`;
        const attendanceEntry = attendanceRecords[studentName] || '';
        const [status, absenceReason] = attendanceEntry.split(':');
        
        return {
          studentId: student.id,
          status: status || 'ABSENT',
          absenceReason: status === 'ABSENT' ? absenceReason : null
        };
      });

      console.log("Saving attendance with data:", {
        date: selectedDate,
        classId: currentClass.class.id,
        academicYearId: currentYear.id,
        termId: currentTerm.id,
        records: records
      });

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/attendance/save-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: selectedDate,
          classId: currentClass.class.id,
          academicYearId: currentYear.id,
          termId: currentTerm.id,
          records: records
        })
      });

      console.log("Response status:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const textResponse = await response.text();
      console.log("Raw response text:", textResponse);

      try {
        const responseData = JSON.parse(textResponse);
        console.log("Parsed response data:", responseData);

        // Check for success status
        if (responseData.status?.returnCode === "00" && 
            responseData.status?.returnMessage === "Attendance saved successfully") {
          setSaveSuccessMessage("Attendance saved successfully!");
          setAttendanceRecords({}); // Clear records after successful save
          return;
        }

        // Check for error status
        if (responseData.status?.returnCode !== "00") {
          throw new Error(responseData.status?.returnMessage || 
                         responseData.message || 
                         "Failed to save attendance");
        }

        // If we got here, it's an unexpected response format
        console.error("Unexpected response format:", {
          rawText: textResponse,
          parsedData: responseData
        });
        throw new Error("Unexpected response format from server. Please try again.");

      } catch (parseError) {
        console.error("Failed to parse response:", {
          error: parseError,
          rawText: textResponse
        });
        throw new Error(`Failed to parse server response: ${textResponse}`);
      }

    } catch (error) {
      console.error('Error saving attendance:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorObject: error
      });
      
      // Show error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Failed to save attendance';
      
      // Clear any success message if there was an error
      setSaveSuccessMessage("");
    }
  };

  // Clear success message after a few seconds
  useEffect(() => {
    if (saveSuccessMessage) {
      const timer = setTimeout(() => setSaveSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccessMessage]);

  const AttendanceTable = () => {
    if (loading.general || loading.students) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    if (!selectedDate) return null;

    const dateInfo = formatDate(selectedDate);

    if (!students.length) {
      return (
        <div className="text-center p-4 text-gray-500">
          No students found for this class
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead className="bg-blue-100">
            <tr>
              <th className="py-2 px-4 border text-center">#</th>
              <th className="py-2 px-4 border text-left">Student Name</th>
              <th className="py-2 px-4 border text-center">{dateInfo.day}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              // Create full student name including all components
              const studentFullName = [
                student.first_name,
                student.middle_name,
                student.last_name
              ].filter(Boolean).join(' ');
              
              // Keep using studentName for attendance records since that's what existing records use
              const studentName = `${student.first_name} ${student.last_name}`;
              const attendanceEntry = attendanceRecords[studentName] || '';
              const [status] = attendanceEntry.split(':');
              
              const isPresent = status === 'PRESENT';
              const isAbsent = status === 'ABSENT';

              return (
                <tr 
                  key={student.id} 
                  className={`text-center ${
                    isPresent ? 'bg-green-50' : 
                    isAbsent ? 'bg-red-50' : 
                    'bg-white'
                  }`}
                >
                  <td className="py-2 px-4 border">{index + 1}</td>
                  <td className="py-2 px-4 border text-left">{studentFullName}</td>
                  <td className="py-2 px-4 border">
                    <div className="flex flex-row items-center gap-2 justify-center">
                      {!isAbsent && (
                        <button
                          className={`p-2 hover:bg-green-100 rounded-full transition-colors duration-200 ${
                            isPresent ? 'bg-green-300' : 'bg-green-100'
                          }`}
                          onClick={() => markPresent(student.id, studentName)}
                          disabled={isPresent}
                        >
                          <Check className="text-green-600" />
                        </button>
                      )}
                      {!isPresent && (
                        <button
                          className={`p-2 hover:bg-red-100 rounded-full transition-colors duration-200 ${
                            isAbsent ? 'bg-red-300' : 'bg-red-100'
                          }`}
                          onClick={() => openDialog(student.id, studentName)}
                          disabled={isAbsent}
                        >
                          <X className="text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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
      
      throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4" style={{width: '900px'}}>
        <div className="flex flex-col justify-center items-center bg-white p-4 shadow-md rounded-lg">
         
          <h1 className="text-2xl font-semibold text-center mb-2" style={{color: 'rgb(78, 33, 33)'}}>
            Weekly Attendance Tracker
          </h1>
          <h2 className="text-lg font-semibold text-center text-gray-700">
            Class: {currentClass?.class.name || 'Loading...'}
          </h2>
          <div className="text-sm text-gray-600 mt-2">
            Year: {currentYear?.year || 'Not set'} | Term: {currentTerm?.name || 'Not set'}
          </div>
        </div>

        <div className="flex justify-between items-center my-4 p-4 bg-white shadow-md rounded-lg">
          <label htmlFor="calendar" className="font-medium text-gray-700 mr-2">Select Date:</label>
          <input
            type="date"
            id="calendar"
            className="border p-2 rounded-md"
            onChange={(e) => updateHeadingAndTable(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <h2 className="text-center text-lg font-semibold text-gray-600 mb-4">
            {selectedDate ? formatDate(selectedDate).heading : 'Select a Date'}
          </h2>
          <AttendanceTable />
        </div>

        <div className="flex flex-col items-center justify-center bg-white p-4 shadow-md rounded-lg mt-4">
          <button
            onClick={saveAttendance}
            className="bg-green-500 text-white px-6 py-2 rounded-md mt-4 hover:bg-green-600"
            disabled={!selectedDate || loading.general || loading.students}
          >
            Save Attendance
          </button>
        </div>

        {saveSuccessMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md mb-4">
            <p>{saveSuccessMessage}</p>
          </div>
        )}

        {showDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-1/3">
              <h3 className="text-lg font-semibold mb-4">Reason for Absence</h3>
              <textarea
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Enter reason here..."
                className="w-full p-2 border rounded-md"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={submitAbsenceReason}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowDialog(false);
                    setAbsenceReason('');
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AttendanceTrackerPage: React.FC = () => {
  return (
    <React.Suspense fallback={<div>Loading attendance tracker...</div>}>
      <AttendanceTrackerContent />
    </React.Suspense>
  );
};

export default AttendanceTrackerPage;