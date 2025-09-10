"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { env } from '@/env';
import { useSearchParams } from 'next/navigation';

interface Student {
  id: number;
  name: string;
  cw: number;    // Class Work
  hw: number;    // Home Work
  org: number;   // Organization
  spart: number; // Student Participation
  smgt: number;  // Student Management
  mark?: number; // For non-CA assessment types
}

interface Mark {
  id: string;
  name: string;
  mark: string | number | null;
  markId?: string;
  [key: string]: any;
}

const MarksheetDisplayView: React.FC = () => {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAssessmentType, setCurrentAssessmentType] = useState<string>('CA');
  const [pageInfo, setPageInfo] = useState({
    className: '',
    subject: '',
    examType: '',
    term: '',
    year: ''
  });
  
  const API_BASE_URL = env.BACKEND_API_URL + '/api/v1';

  // Helper function to decode URL parameters
  const decodeParam = (param: string | null): string => {
    if (!param) return '';
    try {
      return decodeURIComponent(param);
    } catch (e) {
      console.error("Error decoding parameter:", e);
      return param;
    }
  };

  // Get auth token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    return headers;
  };
  
  // Helper function to safely parse mark values
  const parseMarkValue = (mark: string | number | null): number => {
    if (mark === null || mark === undefined || mark === '') return 0;
    
    if (typeof mark === 'number') {
      return mark < 0 ? 0 : mark; // Convert negative values to 0
    }
    
    // Try to parse string marks
    const trimmedMark = String(mark).trim();
    if (!trimmedMark) return 0;
    
    const parsedMark = parseInt(trimmedMark, 10);
    return isNaN(parsedMark) ? 0 : (parsedMark < 0 ? 0 : parsedMark);
  };
  
  // Debug function for logging
  const logDebug = (message: string, data?: any) => {
    console.log(`[MarksheetDisplay] ${message}`);
    if (data !== undefined) console.log(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!searchParams) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Get URL parameters (supporting both old and new format)
        const classParam = searchParams.get('class');
        const classId = searchParams.get('classId');
        const subjectParam = searchParams.get('subject');
        const subjectId = searchParams.get('subjectId');
        const examParam = searchParams.get('exam');
        const examId = searchParams.get('examSetId');
        const yearParam = searchParams.get('year');
        const yearId = searchParams.get('academicYearId');
        const termParam = searchParams.get('term');
        const termId = searchParams.get('termId');
        const assessmentType = searchParams.get('assessmentType') || 'CA';
        
        // Debugging information
        logDebug('URL Parameters', {
          classParam, classId,
          subjectParam, subjectId,
          examParam, examId,
          yearParam, yearId,
          termParam, termId,
          assessmentType
        });
        
        // Set current assessment type for use in rendering
        setCurrentAssessmentType(assessmentType);
        
        // Set page information with properly decoded parameters
        setPageInfo({
          className: decodeParam(classParam) || 'Selected Class',
          subject: decodeParam(subjectParam) || '',
          examType: decodeParam(examParam) || assessmentType,
          term: decodeParam(termParam) || 'Current',
          year: decodeParam(yearParam) || new Date().getFullYear().toString()
        });
        
        // Check if essential parameters exist
        if ((!classId) || (!examId) || (!yearId) || (!termId) || (!subjectId)) {
          setError("Missing required parameters for mark retrieval");
          setIsLoading(false);
          return;
        }
        
        // Set up API endpoint with the parameters provided
        const apiUrl = `${API_BASE_URL}/marks/get?subjectId=${subjectId}&classId=${classId}&termId=${termId}&academicYearId=${yearId}&examSetId=${examId}&assessmentType=${assessmentType}`;
        
        logDebug(`API URL: ${apiUrl}`);
        
        // Define components for CA
        const caComponents = ['CW', 'HW', 'ORG', 'SPART', 'SMGT'];
        
        // Get auth headers
        const headers = getAuthHeaders();
        
        // Map to store student data
        const studentsMap = new Map<string, {
          id: string;
          name: string;
          marks: Record<string, number>;
        }>();
          
        if (assessmentType === 'CA') {
          // For CA, we need to fetch each component separately
          const componentPromises = caComponents.map(async (component) => {
            const componentUrl = `${API_BASE_URL}/marks/get?subjectId=${subjectId}&classId=${classId}&termId=${termId}&academicYearId=${yearId}&examSetId=${examId}&assessmentType=${assessmentType}&caComponent=${component}`;
            
            logDebug(`Fetching ${component} with URL: ${componentUrl}`);
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
              
              const response = await fetch(componentUrl, { 
                headers,
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                logDebug(`HTTP error ${response.status} fetching ${component}`);
                return;
              }
              
              const data = await response.json();
              logDebug(`API response for ${component}:`, data);
              
              if (data.status?.returnCode === "00" && data.data?.marks) {
                // Handle both array and single object responses
                const marks = Array.isArray(data.data.marks) ? data.data.marks : [data.data.marks];
                
                // Process student marks for this component
                marks.forEach((mark: Mark) => {
                  const studentId = String(mark.studentId || mark.id || "");
                  const studentName = mark.name || "Unknown";
                  
                  if (!studentsMap.has(studentId)) {
                    studentsMap.set(studentId, {
                      id: studentId,
                      name: studentName,
                      marks: {}
                    });
                  }
                  
                  // Extract mark value and parse it correctly
                  const markValue = parseMarkValue(mark.mark);
                  studentsMap.get(studentId)!.marks[component] = markValue;
                  
                  logDebug(`Set ${component} mark for ${studentName} to ${markValue}`);
                });
              }
            } catch (error: any) {
              console.error(`Error fetching ${component}:`, error);
              // Continue with other components even if one fails
            }
          });
          
          // Wait for all component fetches to complete
          await Promise.allSettled(componentPromises);
          
        } else {
          // For non-CA assessments, fetch the single mark
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
            
            const response = await fetch(apiUrl, { 
              headers,
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            logDebug(`API response for ${assessmentType}:`, data);
            
            if (data.status?.returnCode === "00" && data.data?.marks) {
              // Handle both array and single object responses
              const marks = Array.isArray(data.data.marks) ? data.data.marks : [data.data.marks];
              
              // Process student marks
              marks.forEach((mark: Mark) => {
                const studentId = String(mark.studentId || mark.id || "");
                const studentName = mark.name || "Unknown";
                
                if (!studentsMap.has(studentId)) {
                  studentsMap.set(studentId, {
                    id: studentId,
                    name: studentName,
                    marks: {}
                  });
                }
                
                // Extract mark value and parse it correctly
                const markValue = parseMarkValue(mark.mark);
                studentsMap.get(studentId)!.marks[assessmentType] = markValue;
              });
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              setError("Request timed out. Please try again.");
            } else {
              console.error(`Error fetching ${assessmentType}:`, error);
              setError(`Failed to load marks: ${error.message}`);
            }
          }
        }
        
        // Convert the map to our Student array format and sort by name
        const formattedStudents = Array.from(studentsMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((student, index) => {
            if (assessmentType === 'CA') {
              return {
                id: index + 1,
                name: student.name,
                cw: student.marks.CW ?? 0,
                hw: student.marks.HW ?? 0,
                org: student.marks.ORG ?? 0,
                spart: student.marks.SPART ?? 0,
                smgt: student.marks.SMGT ?? 0
              };
            } else {
              return {
                id: index + 1,
                name: student.name,
                cw: 0,
                hw: 0,
                org: 0,
                spart: 0,
                smgt: 0,
                mark: student.marks[assessmentType] ?? 0
              };
            }
          });
        
        logDebug('Formatted students:', formattedStudents);
        
        setStudents(formattedStudents);
        
        if (formattedStudents.length === 0) {
          setError("No student marks found for the selected criteria.");
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(`Failed to load student marks: ${error.message}`);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [API_BASE_URL, searchParams]);

  // Calculate total score for CA assessment
  const getTotalScore = (student: Student): number => {
    if (currentAssessmentType !== 'CA') return student.mark || 0;
    return student.cw + student.hw + student.org + student.spart + student.smgt;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.history.back();
  };

  // Add print styles
  useEffect(() => {
    const printStyles = `
      @media print {
        .no-print {
          display: none;
        }
        body {
          padding: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        th {
          background-color: #f2f2f2;
        }
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'print-styles';
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      const styleToRemove = document.getElementById('print-styles');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-4xl mx-auto mt-8">
        <p className="font-medium">Error: {error}</p>
        <p className="text-sm mt-2">Please check your connection and try again.</p>
        <button 
          onClick={handleBack}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex justify-center items-start min-h-screen p-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-6xl">
        <div className="flex flex-col justify-between items-center mb-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Marksheet for {pageInfo.className}
            </h1>
            <h2 className="text-xl font-bold text-gray-800 mt-1">
              {pageInfo.subject && `${pageInfo.subject} `}{pageInfo.examType}
            </h2>
            <h3 className="text-lg font-bold text-gray-700 mt-1">
              Results for {pageInfo.term} {pageInfo.year}
            </h3>
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
              <p>{error}</p>
            </div>
          )}
          <div className="flex space-x-4 no-print">
            <button 
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none"
            >
              Print
            </button>
            <button 
              onClick={handleBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700 focus:outline-none"
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
                  
                  {currentAssessmentType === 'CA' ? (
                    // Show all CA component columns for CA assessment type
                    <>
                      <th className="border border-gray-300 px-4 py-2 text-center">CW</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">HW</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">ORG</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">SPART</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">SMGT</th>
                    </>
                  ) : (
                    // For other assessment types, just show a single mark column
                    <th className="border border-gray-300 px-4 py-2 text-center">Mark</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{student.id}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{student.name}</td>
                    
                    {currentAssessmentType === 'CA' ? (
                      // Show all CA component columns for CA assessment type
                      <>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.cw}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.hw}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.org}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.spart}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.smgt}</td>
                      </>
                    ) : (
                      // For other assessment types, just show a single mark column
                      <td className="border border-gray-300 px-4 py-2 text-center">{student.mark}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg text-center">
            <p className="text-lg">No student marks found for the selected criteria.</p>
            <p className="mt-2">Please check your selections or try a different class or subject.</p>
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

const ViewCAPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading CA marksheet...</p></div>}>
      <MarksheetDisplayView />
    </Suspense>
  );
};

export default ViewCAPageWrapper;