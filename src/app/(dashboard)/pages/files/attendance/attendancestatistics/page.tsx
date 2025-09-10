'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PrintableContent from '@/components/ui/print';
import { env } from '@/env';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string;
}

interface AttendanceRecord {
  id: string;
  attendanceId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT';
  absenceReason: string | null;
  student: Student;
}

interface AttendanceData {
  id: string;
  date: string;
  classId: string;
  academicYearId: string;
  termId: string;
  class: {
    id?: string;
    name: string;
    section?: string;
  };
  records: AttendanceRecord[];
}

interface DateOption {
  date: string;
  display: string;
}

interface ClassData {
  id: string;
  name: string;
  section: string;
  isActive: boolean;
}

interface ClassAttendance {
  id: string;
  name: string;
  male: number;
  female: number;
  total: number;
  absentMale: number;
  absentFemale: number;
  absentTotal: number;
  classTotal: number;
}

interface SectionSummary {
  title: string;
  classes: ClassAttendance[];
  totalMale: number;
  totalFemale: number;
  totalPresent: number;
  totalAbsentMale: number;
  totalAbsentFemale: number;
  totalAbsent: number;
  sectionTotal: number;
}

// Helper function for API calls
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
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
    return data;
  } catch (error) {
    console.error(`Error fetching ${fullUrl}:`, error);
    throw error;
  }
};

export default function AttendanceSummaryPage() {
  // Helper function to merge student data with attendance records
  const mergeStudentData = useCallback((attendanceRecords: any[], studentsList: any[]) => {
    return attendanceRecords.map(record => {
      // Find the corresponding student from the students list
      const fullStudentData = studentsList.find(
        student => student.id === record.studentId
      );

      // Log for debugging
      console.log('Merging record:', {
        recordStudentId: record.studentId,
        recordStudentName: record.student.first_name + ' ' + record.student.last_name,
        fullStudentData: fullStudentData
      });

      // Merge the attendance record with full student data
      return {
        ...record,
        student: {
          ...record.student,
          gender: fullStudentData ? fullStudentData.gender : 'UNKNOWN'
        }
      };
    });
  }, []);

  // Process attendance data into sections
  const processAttendanceData = useCallback((attendanceData: AttendanceData[]) => {
    if (!attendanceData || attendanceData.length === 0) {
      setSections({});
      setGrandTotals({
        male: 0, female: 0, present: 0, 
        absentMale: 0, absentFemale: 0, absent: 0, total: 0
      });
      return;
    }
    
    // Group classes by section
    const sectionMap: Record<string, ClassAttendance[]> = {};
    
    // Process each class's attendance
    attendanceData.forEach(data => {
      // Ensure section exists (default to UNSORTED if not specified)
      const sectionName = data.class.section || 'UNSORTED';
      if (!sectionMap[sectionName]) {
        sectionMap[sectionName] = [];
      }
      
      // More detailed logging
      console.log('Processing class:', data.class.name);
      
      // Count students by attendance status and gender
      const records = data.records || [];
      
      // Detailed gender and status counting
      const presentMaleCount = records.filter(r => 
        r.status === 'PRESENT' && r.student.gender?.toUpperCase() === 'MALE'
      ).length;
      
      const presentFemaleCount = records.filter(r => 
        r.status === 'PRESENT' && r.student.gender?.toUpperCase() === 'FEMALE'
      ).length;
      
      const absentMaleCount = records.filter(r => 
        r.status === 'ABSENT' && r.student.gender?.toUpperCase() === 'MALE'
      ).length;
      
      const absentFemaleCount = records.filter(r => 
        r.status === 'ABSENT' && r.student.gender?.toUpperCase() === 'FEMALE'
      ).length;
      
      // Logging for verification
      console.log('Counts:', {
        presentMaleCount,
        presentFemaleCount,
        absentMaleCount,
        absentFemaleCount
      });
      
      // Total counts
      const presentTotal = records.filter(r => r.status === 'PRESENT').length;
      const absentTotal = records.filter(r => r.status === 'ABSENT').length;
      
      sectionMap[sectionName].push({
        id: data.class.id || data.classId,
        name: data.class.name,
        male: presentMaleCount,
        female: presentFemaleCount,
        total: presentTotal,
        absentMale: absentMaleCount,
        absentFemale: absentFemaleCount,
        absentTotal: absentTotal,
        classTotal: records.length
      });
    });
    
    // Calculate section totals
    const sectionSummaries: Record<string, SectionSummary> = {};
    
    Object.entries(sectionMap).forEach(([section, classes]) => {
      const totalMale = classes.reduce((sum, cls) => sum + cls.male, 0);
      const totalFemale = classes.reduce((sum, cls) => sum + cls.female, 0);
      const totalPresent = classes.reduce((sum, cls) => sum + cls.total, 0);
      
      const totalAbsentMale = classes.reduce((sum, cls) => sum + cls.absentMale, 0);
      const totalAbsentFemale = classes.reduce((sum, cls) => sum + cls.absentFemale, 0);
      const totalAbsent = classes.reduce((sum, cls) => sum + cls.absentTotal, 0);
      
      sectionSummaries[section] = {
        title: section.toUpperCase() + " SECTION",
        classes: classes,
        totalMale,
        totalFemale,
        totalPresent,
        totalAbsentMale,
        totalAbsentFemale,
        totalAbsent,
        sectionTotal: totalPresent + totalAbsent
      };
    });
    
    // Calculate grand totals
    const grandTotalMale = Object.values(sectionSummaries).reduce((sum, section) => sum + section.totalMale, 0);
    const grandTotalFemale = Object.values(sectionSummaries).reduce((sum, section) => sum + section.totalFemale, 0);
    const grandTotalPresent = Object.values(sectionSummaries).reduce((sum, section) => sum + section.totalPresent, 0);
    
    const grandTotalAbsentMale = Object.values(sectionSummaries).reduce((sum, section) => sum + section.totalAbsentMale, 0);
    const grandTotalAbsentFemale = Object.values(sectionSummaries).reduce((sum, section) => sum + section.totalAbsentFemale, 0);
    const grandTotalAbsent = Object.values(sectionSummaries).reduce((sum, section) => sum + section.totalAbsent, 0);
    
    const grandTotal = grandTotalPresent + grandTotalAbsent;
    
    setSections(sectionSummaries);
    setGrandTotals({
      male: grandTotalMale,
      female: grandTotalFemale,
      present: grandTotalPresent,
      absentMale: grandTotalAbsentMale,
      absentFemale: grandTotalAbsentFemale,
      absent: grandTotalAbsent,
      total: grandTotal
    });
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [schoolName, setSchoolName] = useState("SCHOOL ATTENDANCE SUMMARY");
  const [sections, setSections] = useState<Record<string, SectionSummary>>({});
  const [grandTotals, setGrandTotals] = useState({
    male: 0,
    female: 0,
    present: 0,
    absentMale: 0,
    absentFemale: 0,
    absent: 0,
    total: 0
  });

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = useCallback((day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }, []);

  // Helper function to format date
  const formatDateForDisplay = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    const weekNumber = Math.ceil(day / 7);
    
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}, Week ${weekNumber} of ${month}`;
  }, [getOrdinalSuffix]);

  // Fetch available classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`);
        
        let classesList = [];
        if (response.status?.returnCode === "00" && response.data?.classes) {
          classesList = response.data.classes;
        } else if (response.success && response.classes) {
          classesList = response.classes;
        } else if (response.classes && Array.isArray(response.classes)) {
          classesList = response.classes;
        }
        
        setAllClasses(classesList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setError(error instanceof Error ? error.message : 'Failed to load classes');
        setAllClasses([]);
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Fetch available dates
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (allClasses.length === 0) {
        setAvailableDates([]);
        return;
      }

      try {
        setLoading(true);

        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);

        // Fetch attendance records for all classes in parallel
        const attendancePromises = allClasses.map(cls =>
          fetchWithAuth(
            `${env.BACKEND_API_URL}/api/v1/attendance/by-date-range?startDate=${startOfYear.toISOString().split('T')[0]}&endDate=${endOfYear.toISOString().split('T')[0]}&classId=${cls.id}`
          )
        );

        const allResults = await Promise.all(attendancePromises);
        let allAttendanceRecords: any[] = [];

        allResults.forEach(datesData => {
          if (datesData?.status?.returnCode === "00" && datesData.data?.attendanceRecords) {
            allAttendanceRecords = allAttendanceRecords.concat(datesData.data.attendanceRecords);
          } else if (datesData?.data && Array.isArray(datesData.data)) {
            allAttendanceRecords = allAttendanceRecords.concat(datesData.data);
          } else if (Array.isArray(datesData)) {
            allAttendanceRecords = allAttendanceRecords.concat(datesData);
          }
        });

        // Extract unique dates
        const uniqueDates = new Set<string>();
        const formattedDates = allAttendanceRecords
          .map(record => {
            if (!record.date) return null;
            const dateObj = new Date(record.date);
            if (isNaN(dateObj.getTime())) return null;
            const formattedDate = dateObj.toISOString().split('T')[0];
            if (!uniqueDates.has(formattedDate)) {
              uniqueDates.add(formattedDate);
              return {
                date: formattedDate,
                display: formatDateForDisplay(formattedDate)
              };
            }
            return null;
          })
          .filter(Boolean) as DateOption[];

        // Sort dates descending
        formattedDates.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setAvailableDates(formattedDates);

        if (formattedDates.length > 0 && !selectedDate) {
          setSelectedDate(formattedDates[0].date);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching available dates:", error);
        setAvailableDates([]);
        setLoading(false);
      }
    };

    fetchAvailableDates();
  }, [allClasses, formatDateForDisplay, selectedDate]);

  // Fetch attendance data for selected date
  useEffect(() => {
    const fetchAllClassAttendance = async () => {
      if (!selectedDate || allClasses.length === 0) {
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch students list first
        const studentsResponse = await fetchWithAuth(`${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=1000`);
        const studentsList = studentsResponse.data?.students || [];
        
        console.log('Fetched students:', studentsList.length);
        
        // Fetch attendance for all classes on this date
        const attendancePromises = allClasses.map(cls => 
          fetchWithAuth(`/api/v1/attendance/by-date?date=${selectedDate}&classId=${cls.id}`)
            .then(response => {
              if (response.status?.returnCode === "00" && response.data?.attendance) {
                // Merge student data
                const attendance = response.data.attendance;
                const mergedRecords = mergeStudentData(
                  attendance.records, 
                  studentsList
                );
                
                // Add class info to attendance data
                attendance.records = mergedRecords;
                attendance.class = {
                  ...attendance.class,
                  id: cls.id,
                  section: cls.section || 'UNSORTED'
                };
                return attendance;
              }
              return null;
            })
            .catch(err => {
              console.error(`Error fetching attendance for class ${cls.name}:`, err);
              return null;
            })
        );
        
        const results = await Promise.all(attendancePromises);
        const validAttendance = results.filter(Boolean);
        
        setAttendanceData(validAttendance);
        
        // Process data into sections
        processAttendanceData(validAttendance);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setError(error instanceof Error ? error.message : 'Failed to load attendance data');
        setAttendanceData([]);
        setLoading(false);
      }
    };

    fetchAllClassAttendance();
  }, [selectedDate, allClasses, processAttendanceData, mergeStudentData]);

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value);
  };

  // Print functionality is now handled by the PrintableContent component

  const displayValue = (value: number) => value === 0 ? '-' : value;

  const TableSection = ({ title, classes }: { title: string, classes: ClassAttendance[] }) => {
    const totalMale = classes.reduce((sum, c) => sum + c.male, 0);
    const totalFemale = classes.reduce((sum, c) => sum + c.female, 0);
    const totalPresent = classes.reduce((sum, c) => sum + c.total, 0);
    
    const totalAbsentMale = classes.reduce((sum, c) => sum + c.absentMale, 0);
    const totalAbsentFemale = classes.reduce((sum, c) => sum + c.absentFemale, 0);
    const totalAbsent = classes.reduce((sum, c) => sum + c.absentTotal, 0);
    
    const sectionTotal = totalPresent + totalAbsent;

    return (
      <div className="mb-6">
        <h3 className="font-bold mb-2">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-gray-500">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-500 p-2 text-left">Class</th>
                <th colSpan={3} className="border-2 border-gray-500 border-r-4 p-2 text-center">Present</th>
                <th colSpan={3} className="border-2 border-gray-500 border-r-4 p-2 text-center">Absent</th>
                <th className="border border-gray-500 p-2 text-center">Class Total</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-gray-500 p-2"></th>
                <th className="border border-gray-500 p-2 text-center">Male</th>
                <th className="border border-gray-500 p-2 text-center">Female</th>
                <th className="border border-gray-500 p-2 text-center">Total</th>
                <th className="border border-gray-500 p-2 text-center">Male</th>
                <th className="border border-gray-500 p-2 text-center">Female</th>
                <th className="border border-gray-500 p-2 text-center">Total</th>
                <th className="border border-gray-500 p-2 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-500 p-2">{cls.name}</td>
                  <td className="border border-gray-500 p-2 text-center">{displayValue(cls.male)}</td>
                  <td className="border border-gray-500 p-2 text-center">{displayValue(cls.female)}</td>
                  <td className="border-2 border-gray-500 border-r-4 p-2 text-center">{displayValue(cls.total)}</td>
                  <td className="border-2 border-gray-500 p-2 text-center">{displayValue(cls.absentMale)}</td>
                  <td className="border-2 border-gray-500 p-2 text-center">{displayValue(cls.absentFemale)}</td>
                  <td className="border-2 border-gray-500 border-r-4 p-2 text-center">{displayValue(cls.absentTotal)}</td>
                  <td className="border-2 border-gray-500 p-2 text-center">{displayValue(cls.classTotal)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td className="border border-gray-500 p-2">Section Total</td>
                <td className="border border-gray-500 p-2 text-center">{displayValue(totalMale)}</td>
                <td className="border border-gray-500 p-2 text-center">{displayValue(totalFemale)}</td>
                <td className="border border-gray-500 p-2 text-center border-r-4">{displayValue(totalPresent)}</td>
                <td className="border border-gray-500 p-2 text-center">{displayValue(totalAbsentMale)}</td>
                <td className="border border-gray-500 p-2 text-center">{displayValue(totalAbsentFemale)}</td>
                <td className="border border-gray-500 p-2 text-center border-r-4">{displayValue(totalAbsent)}</td>
                <td className="border border-gray-500 p-2 text-center">{displayValue(sectionTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Get current date and time for display
  const currentDate = new Date();
  const formattedCurrentDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedCurrentTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get day of the week for selected date
  const selectedDayOfWeek = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })
    : '';

  return (
    <div className="bg-gray-100 p-4 min-h-screen">
      <div className="container mx-auto">
        <PrintableContent 
          title={schoolName}
          printButtonLabel="Print Attendance Report"
          className="bg-white p-6 rounded-lg shadow-md mb-6"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-center">{schoolName}</h1>
            <h2 className="text-xl mb-4 text-center">DAILY SCHOOL ATTENDANCE SUMMARY</h2>
            
            <div className="flex justify-between items-center print:hidden">
              <div>
                <label htmlFor="dateSelector" className="mr-2">Select Date:</label>
                <select
                  id="dateSelector"
                  className="border p-2 rounded w-80"
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={loading || availableDates.length === 0}
                >
                  <option value="">Select a date</option>
                  {availableDates.map(date => (
                    <option key={date.date} value={date.date}>
                      {date.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedDate && (
              <div className="flex flex-col items-center mb-4">
                <div className="text-lg font-semibold">
                  {formatDateForDisplay(selectedDate)}
                </div>
                <div className="flex gap-4 items-center justify-center">
                  <p>Day: {selectedDayOfWeek}</p>
                  <p>Time: {formattedCurrentTime}</p>
                </div>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">Error: {error}</div>
          ) : availableDates.length === 0 ? (
            <div className="text-center p-4 text-gray-600">No attendance records available</div>
          ) : !selectedDate ? (
            <div className="text-center p-4 text-gray-600">Please select a date to view attendance summary</div>
          ) : Object.keys(sections).length === 0 ? (
            <div className="text-center p-4 text-gray-600">No attendance data found for this date</div>
          ) : (
            <>
              {Object.entries(sections).map(([key, section], index) => (
                <TableSection 
                  key={key}
                  title={section.title}
                  classes={section.classes}
                />
              ))}
              
              <div className="font-bold text-lg p-4 bg-gray-50 rounded-lg">
                <div className="mb-2">Grand Totals:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p>Present: Male: {displayValue(grandTotals.male)} | Female: {displayValue(grandTotals.female)} | Total: {displayValue(grandTotals.present)}</p>
                  </div>
                  <div>
                    <p>Absent: Male: {displayValue(grandTotals.absentMale)} | Female: {displayValue(grandTotals.absentFemale)} | Total: {displayValue(grandTotals.absent)}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p>Total Enrollment: {displayValue(grandTotals.total)}</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg print-footer">
                <p className="text-center text-gray-600 text-sm">
                  Report generated on {formattedCurrentDate} at {formattedCurrentTime}
                </p>
              </div>
            </>
          )}
        </PrintableContent>
      </div>
    </div>
  );
}