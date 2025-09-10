"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { env } from '@/env';
import { useSearchParams } from 'next/navigation';

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface Student {
  id: string;
  originalId: string;
  name: string;
  marks: Record<string, number | null>; // Allow null values for marks
}

interface Mark {
  id?: string;
  studentId?: string;
  name?: string;
  mark: string | number | null;
  markId?: string | null;
  [key: string]: any;
}

const ViewMarksheetPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState({
    className: '',
    examName: '',
    termName: '',
    yearName: ''
  });
  
  // Using relative URL path to avoid hardcoded base URL
  const baseUrl = env.BACKEND_API_URL;
  
  // Helper function to get string param
  const getStringParam = (param: string | null | undefined): string => {
    return param || "";
  };

  // Helper function to process mark values consistently
  const processMarkValue = (mark: Mark): number | null => {
    // For numerical marks (from creation response)
    if (typeof mark.mark === 'number') {
      // Return null for -1 values (student missed the paper)
      return mark.mark === -1 ? null : mark.mark;
    } 
    // For string marks (from retrieval response)
    else if (mark.mark !== undefined) {
      const trimmedMark = String(mark.mark).trim();
      // Check if the string is empty
      if (trimmedMark === "") {
        return null; // Return null for empty marks
      } 
      // Check for "-1" string
      if (trimmedMark === "-1") {
        return -1; // Return -1 to indicate student missed the paper
      }
      // Try to parse as integer
      const parsedMark = parseInt(trimmedMark || "0", 10);
      return isNaN(parsedMark) ? 0 : parsedMark; // Return 0 for non-numeric values
    } 
    // For undefined marks
    else {
      return null;
    }
  };

  // Get auth token from localStorage
  const getAuthHeaders = (): HeadersInit => {
    // Safe check for browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
    
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.warn('No access token found in localStorage. User might need to log in again.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Extract display info from URL params
  useEffect(() => {
    if (!searchParams) return;
    
    // Get direct values from URL parameters and decode them
    const classNameFromParams = searchParams.get('class') 
      ? decodeURIComponent(searchParams.get('class')!) 
      : 'Unknown Class';
      
    const examNameFromParams = searchParams.get('exam') 
      ? decodeURIComponent(searchParams.get('exam')!) 
      : 'End Of Term (EOT)';
      
    const termNameFromParams = searchParams.get('term') 
      ? decodeURIComponent(searchParams.get('term')!) 
      : 'Unknown Term';
      
    const yearNameFromParams = searchParams.get('year') 
      ? decodeURIComponent(searchParams.get('year')!) 
      : 'Unknown Year';
    
    setPageInfo({
      className: classNameFromParams,
      examName: examNameFromParams,
      termName: termNameFromParams,
      yearName: yearNameFromParams
    });
  }, [searchParams]);

  // Add print-specific styles
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const printStyles = `
      @media print {
        .no-print {
          display: none;
        }
        body {
          padding: 20px;
          font-size: 12pt;
        }
        table {
          width: 100%;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th, td {
          padding: 5px;
        }
      }
    `;
    
    const existingStyle = document.getElementById('print-styles');
    if (existingStyle) return; // Don't add duplicate styles
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'print-styles';
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      const styleToRemove = document.getElementById('print-styles');
      if (styleToRemove && styleToRemove.parentNode) {
        styleToRemove.parentNode.removeChild(styleToRemove);
      }
    };
  }, []);

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!searchParams) return;

        // Log all search parameters
        console.log("Search Parameters:", {
          classId: searchParams.get('classId'),
          termId: searchParams.get('termId'),
          academicYearId: searchParams.get('academicYearId'),
          examSetId: searchParams.get('examSetId'),
          assessmentType: searchParams.get('assessmentType')
        });

        const classId = getStringParam(searchParams.get('classId'));
        const termId = getStringParam(searchParams.get('termId'));
        const academicYearId = getStringParam(searchParams.get('academicYearId'));
        const examSetId = getStringParam(searchParams.get('examSetId'));
        const urlAssessmentType = getStringParam(searchParams.get('assessmentType'));
        
        // Skip if critical params are missing
        if (!classId || classId === 'defaultClassId') {
          throw new Error('Missing required parameter: classId');
        }
        
        // Define assessment types - prioritize the one from URL first, then try others as fallback
        const primaryAssessmentType = urlAssessmentType || 'EOT';
        const fallbackTypes = ['BOT', 'MID', 'EOT', 'TEST'].filter(type => type !== primaryAssessmentType);
        const orderedAssessmentTypes = [primaryAssessmentType, ...fallbackTypes];
        
        console.log("Assessment Types Order:", orderedAssessmentTypes);
        
        // Get auth headers once instead of multiple times
        const headers = getAuthHeaders();
        
        // Fetch assigned subjects for this class
        const assignmentsUrl = `${env.BACKEND_API_URL}/api/v1/class-subject-assignments/assignments`;
        const assignmentsResponse = await fetch(assignmentsUrl, { headers });
        
        // Check if the response is okay
        if (!assignmentsResponse.ok) {
          throw new Error(`Assignments fetch failed: ${assignmentsResponse.status}`);
        }

        const assignmentsData = await assignmentsResponse.json();
        
        // Debug logs
        console.log("All assignments:", assignmentsData.data?.assignments);
        console.log("Filtered class assignments:", assignmentsData.data?.assignments?.filter((a: any) => a.classId === classId));
        console.log("Class ID being filtered:", classId);
        console.log("Selected class ID:", searchParams.get('classId'));
        console.log("Selected exam set ID:", searchParams.get('examSetId'));
        console.log("Selected term ID:", searchParams.get('termId'));
        console.log("Selected year ID:", searchParams.get('academicYearId'));
        
        // Extract subject IDs for this specific class
        let classSubjectIds: string[] = [];
        if (assignmentsData.data?.assignments) {
          // First try to find by exact class ID match
          let filteredAssignments = assignmentsData.data.assignments
            .filter((assignment: any) => assignment.classId === classId);
          
          // If no matches, try to find by class name in the URL
          const classNameFromUrl = searchParams.get('class');
          if (filteredAssignments.length === 0 && classNameFromUrl) {
            console.log(`No assignments found for class ID ${classId}, trying to find by class name:`, classNameFromUrl);
            
            // Get all unique class IDs from assignments
            const allClassIds = Array.from(new Set(assignmentsData.data.assignments.map((a: any) => a.classId)));
            console.log('Available class IDs in assignments:', allClassIds);
            
            // For now, just use all subject activity IDs as fallback
            classSubjectIds = Array.from(new Set(assignmentsData.data.assignments
              .map((assignment: any) => assignment.subjectActivityId)));
          } else {
            // Use the filtered assignments by class ID
            classSubjectIds = filteredAssignments
              .map((assignment: any) => assignment.subjectActivityId);
          }
          
          console.log('Final classSubjectIds:', classSubjectIds);
        }
        
        // Fetch subjects details
        const subjectsUrl = `${env.BACKEND_API_URL}/api/v1/subjects/filter?limit=100`;
        const subjectsResponse = await fetch(subjectsUrl, { headers });
        
        // Check if the response is okay
        if (!subjectsResponse.ok) {
          throw new Error(`Subjects fetch failed: ${subjectsResponse.status}`);
        }

        const subjectsData = await subjectsResponse.json();
        
        // Extract and filter subjects
        let assignedSubjects: Subject[] = [];
        const allSubjects = subjectsData.subjects || subjectsData.data?.subjects || [];
        
        assignedSubjects = allSubjects
          .filter((subject: any) => classSubjectIds.includes(subject.id))
          .map((subject: any) => ({
            id: subject.id,
            code: subject.code || subject.name.substring(0, 3).toUpperCase(),
            name: subject.name
          }));
        
        // Fallback if no subjects found
        if (assignedSubjects.length === 0) {
          // Log the warning instead of silently adding fallback subjects
          console.warn("No assigned subjects found for this class. Using fallback subjects.");
          assignedSubjects = [
            { id: 'eng', code: 'ENG', name: 'English' },
            { id: 'math', code: 'MTH', name: 'Mathematics' }
          ];
        }
        
        setSubjects(assignedSubjects);
        
        // Create a data structure to track which assessment types have been used for each student/subject
        const studentsMap = new Map<string, {
          id: string;
          name: string;
          marks: Record<string, number | null>;
          assessmentTypeUsed: Record<string, string | null>; // Track which assessment type was used for each subject
        }>();
        
        // Use Promise.all to fetch marks for all subjects in parallel with fallback strategy
        // This is more efficient than the sequential approach but maintains the priority order
        await Promise.all(assignedSubjects.map(async (subject) => {
          // Create a flag to track if we've found marks for this subject
          let foundMarksForSubject = false;
          
          // Try each assessment type in order
          for (const assessmentType of orderedAssessmentTypes) {
            if (foundMarksForSubject) {
              continue; // Skip if we already found marks for this subject
            }
            
            // Construct the URL with safe parameters
            const url = `${env.BACKEND_API_URL}/api/v1/marks/get?subjectId=${subject.id}&classId=${classId}&termId=${termId}&academicYearId=${academicYearId}&examSetId=${examSetId}&assessmentType=${assessmentType}`;
            
            try {
              // Use AbortController to prevent hanging requests
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
              
              const response = await fetch(url, { 
                headers,
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                console.warn(`Marks fetch failed for ${subject.name} with ${assessmentType}: ${response.status}`);
                continue; // Skip to next assessment type
              }
              
              const data = await response.json();
              
              if (!data || data.status?.returnCode !== "00" || !data.data?.marks) {
                console.warn(`No valid data for ${subject.name} with ${assessmentType}`);
                continue; // Skip to next assessment type
              }
              
              const marks = Array.isArray(data.data.marks) ? data.data.marks : [data.data.marks];
              
              // Count valid (non-null) marks to determine if we've found marks for this subject
              let validMarksCount = 0;
              
              marks.forEach((mark: Mark) => {
                // Make sure studentId is always a string
                const studentId = String(mark.studentId || mark.id || "");
                const studentName = mark.name || "Unknown";
                
                if (!studentsMap.has(studentId)) {
                  studentsMap.set(studentId, {
                    id: studentId,
                    name: studentName,
                    marks: {},
                    assessmentTypeUsed: {}
                  });
                }
                
                const studentRecord = studentsMap.get(studentId);
                if (studentRecord) {
                  const markValue = processMarkValue(mark);
                  
                  // Only store non-null marks
                  if (markValue !== null) {
                    studentRecord.marks[subject.code] = markValue;
                    studentRecord.assessmentTypeUsed[subject.code] = assessmentType;
                    validMarksCount++;
                  } else {
                    // Initialize mark as null if not already set
                    if (!(subject.code in studentRecord.marks)) {
                      studentRecord.marks[subject.code] = null;
                      studentRecord.assessmentTypeUsed[subject.code] = null;
                    }
                  }
                }
              });
              
              // If we found valid marks for this subject with this assessment type, mark as found
              if (validMarksCount > 0) {
                foundMarksForSubject = true;
              }
              
            } catch (error: any) {
              if (error.name === 'AbortError') {
                console.warn(`Request timeout for ${subject.name} with ${assessmentType}`);
              } else {
                console.error(`Error fetching ${subject.name} with ${assessmentType}:`, error);
              }
              // Continue to next assessment type regardless of error
            }
          }
        }));
        
        // Convert the map to our Student array format
        const formattedStudents = Array.from(studentsMap.values()).map((student) => ({
          id: student.id,
          originalId: student.id,
          name: student.name,
          marks: student.marks
        }));
        
        // Sort students alphabetically by name for consistency
        formattedStudents.sort((a, b) => a.name.localeCompare(b.name));
        
        setStudents(formattedStudents);
      } catch (error: any) {
        console.error("Comprehensive Error:", error);
        setError(error.message || "Failed to load student marks. Please try again.");
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [baseUrl, searchParams]); // Only depend on searchParams and baseUrl

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-4xl mx-auto mt-8">
        <p className="font-medium">Error: {error}</p>
        <p className="text-sm mt-2">Please check your connection and try again.</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded-md shadow hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex justify-center items-start min-h-screen pt-4 pb-10">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-6xl">
        <div className="flex flex-col justify-between items-center mb-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Marksheet for {pageInfo.className}
            </h1>
            <h2 className="text-xl font-bold text-gray-800 mt-2">
              {pageInfo.examName}
            </h2>
            <h3 className="text-lg font-bold text-gray-700 mt-1">
              Results for {pageInfo.termName} {pageInfo.yearName}
            </h3>
          </div>
          
          <div className="flex space-x-4 no-print">
            <button 
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              Print
            </button>
            
            <button 
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none"
            >
              Back
            </button>
          </div>
        </div>

        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">#</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Student Name</th>
                  {subjects.map(subject => (
                    <th key={`header-${subject.id}`} className="border border-gray-300 px-4 py-2 text-center">
                      {subject.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={`student-${student.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{student.name}</td>
                    {subjects.map(subject => (
                      <td 
                        key={`mark-${student.id}-${subject.id}`} 
                        className="border border-gray-300 px-4 py-2 text-center"
                      >
                        {student.marks[subject.code] != null && student.marks[subject.code] !== -1 
                          ? student.marks[subject.code] 
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg text-center">
            <p className="text-lg">No student records found for the selected criteria.</p>
            <p className="mt-2">Try selecting a different class or exam type.</p>
          </div>
        )}
        
        <div className="mt-6 flex justify-between items-center">
          <p className="text-gray-700 font-medium">
            Date: {new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-700 font-medium">
            Total Students: {students.length}
          </p>
        </div>
      </div>
    </div>
  );
};

const ViewMarksheetPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading marksheet...</p></div>}>
      <ViewMarksheetPage />
    </Suspense>
  );
};

export default ViewMarksheetPageWrapper;