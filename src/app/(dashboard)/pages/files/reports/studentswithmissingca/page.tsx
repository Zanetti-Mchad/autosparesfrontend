"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { env } from '@/env';

interface Student {
  apiId: string; // Original ID from API
  displayIndex: number;
  name: string;
  cw: number;    // Class Work
  hw: number;    // Home Work
  org: number;   // Organization
  spart: number; // Student Participation
  smgt: number;  // Student Management
  // 'mark' field is not strictly needed if we only show CA, but can be kept for interface consistency
  mark?: number; 
}

interface Mark { // API Mark structure
  id: string; // Can be student ID or mark entry ID
  name: string;
  mark: string | number | null;
  markId?: string;
  studentId?: string; // Explicit student ID from API
  [key: string]: any;
}

const StudentsMissingCAMarksDisplayView = () => { // Renamed component for clarity
  const searchParams = useSearchParams();
  const router = useRouter(); // For back button
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null); // For non-error messages
  // currentAssessmentType will always be 'CA' for fetching, but pageInfo.examType can reflect URL
  // const [currentAssessmentType, setCurrentAssessmentType] = useState<string>('CA'); 
  const [pageInfo, setPageInfo] = useState({
    className: '',
    subject: '',
    examType: 'Continuous Assessment (C.A)', // Default to CA, can be updated by URL's exam name
    term: '',
    year: ''
  });
  
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;

  const decodeParam = (param: string | null): string => {
    if (!param) return '';
    try {
      return decodeURIComponent(param);
    } catch (e) {
      console.error("Error decoding parameter:", param, e);
      return param;
    }
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };
  
  const parseMarkValue = (mark: string | number | null): number => {
    if (mark === null || mark === undefined) return 0;
    if (typeof mark === 'number') return mark < 0 ? 0 : mark;
    
    const trimmedMark = String(mark).trim();
    if (trimmedMark === "" || trimmedMark.toLowerCase() === "abs" || trimmedMark.toLowerCase() === "ab") return 0;
    
    const parsedMark = parseInt(trimmedMark, 10);
    return isNaN(parsedMark) ? 0 : (parsedMark < 0 ? 0 : parsedMark);
  };
  
  const logDebug = (message: string, data?: any) => {
    console.log(`[StudentsMissingCAMarksDisplay] ${message}`, data !== undefined ? data : '');
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!searchParams) return;
      
      setIsLoading(true);
      setError(null);
      setInfoMessage(null);
      setStudents([]);
      
      try {
        const classIdParam = searchParams.get('classId');
        const subjectIdParam = searchParams.get('subjectId');
        const examIdParam = searchParams.get('examSetId');
        const yearIdParam = searchParams.get('academicYearId');
        const termIdParam = searchParams.get('termId');
        
        // assessmentType from URL is for display, but we'll fetch 'CA'
        const assessmentTypeFromUrlForDisplay = searchParams.get('assessmentType'); 
        const examNameFromUrl = searchParams.get('exam');


        setPageInfo({
          className: decodeParam(searchParams.get('class')) || 'Selected Class',
          subject: decodeParam(searchParams.get('subject')) || 'Selected Subject',
          examType: decodeParam(examNameFromUrl) || 'Continuous Assessment (C.A)', // Use exam name from URL or default
          term: decodeParam(searchParams.get('term')) || 'Current Term',
          year: decodeParam(searchParams.get('year')) || new Date().getFullYear().toString()
        });
        
        const missingParams: string[] = [];
        if (!classIdParam) missingParams.push("classId");
        if (!subjectIdParam) missingParams.push("subjectId");
        if (!examIdParam) missingParams.push("examSetId");
        if (!yearIdParam) missingParams.push("academicYearId");
        if (!termIdParam) missingParams.push("termId");

        if (missingParams.length > 0) {
          setError(`Missing required URL parameter(s): ${missingParams.join(', ')}. Please ensure the URL is correct.`);
          setIsLoading(false);
          return;
        }
        // Use non-null asserted params from here
        const classId = classIdParam!;
        const subjectId = subjectIdParam!;
        const examId = examIdParam!;
        const yearId = yearIdParam!;
        const termId = termIdParam!;
        
        const caComponents = ['CW', 'HW', 'ORG', 'SPART', 'SMGT'];
        const headers = getAuthHeaders();
        const studentsMap = new Map<string, { apiId: string; name: string; marks: Record<string, number>; }>();
        
        // Always fetch CA components for this page
        const fixedAssessmentTypeForFetch = 'CA';

        const componentPromises = caComponents.map(async (component) => {
          const componentUrl = `${baseUrl}/marks/get?subjectId=${subjectId}&classId=${classId}&termId=${termId}&academicYearId=${yearId}&examSetId=${examId}&assessmentType=${fixedAssessmentTypeForFetch}&caComponent=${component}`;
          logDebug(`Fetching CA component ${component} from: ${componentUrl}`);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(componentUrl, { headers, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
              logDebug(`HTTP error ${response.status} fetching ${component}. URL: ${componentUrl}`);
              return; // Don't throw, allow others to load, mark will be 0
            }
            const data = await response.json();
            if (data.status?.returnCode === "00" && data.data?.marks) {
              const marksList: Mark[] = Array.isArray(data.data.marks) ? data.data.marks : [data.data.marks];
              marksList.forEach((markEntry) => {
                const studentApiId = String(markEntry.studentId || markEntry.id || "");
                if (!studentApiId) return;
                const studentName = markEntry.name || "Unknown Student";
                if (!studentsMap.has(studentApiId)) {
                  studentsMap.set(studentApiId, { apiId: studentApiId, name: studentName, marks: {} });
                }
                studentsMap.get(studentApiId)!.marks[component] = parseMarkValue(markEntry.mark);
              });
            } else {
              logDebug(`No valid marks data for CA component ${component}`, data);
            }
          } catch (error: any) {
            logDebug(`Error fetching CA component ${component}`, error);
          }
        });
        
        await Promise.allSettled(componentPromises);
        
        const allFetchedStudentsProvisional = Array.from(studentsMap.values())
          .map((studentData): Student => ({ // displayIndex set after filtering
            apiId: studentData.apiId,
            displayIndex: 0, // Placeholder
            name: studentData.name,
            cw: studentData.marks.CW ?? 0,
            hw: studentData.marks.HW ?? 0,
            org: studentData.marks.ORG ?? 0,
            spart: studentData.marks.SPART ?? 0,
            smgt: studentData.marks.SMGT ?? 0,
          }));
        
        if (allFetchedStudentsProvisional.length === 0) {
            setInfoMessage("No student CA mark records were returned from the API for the selected criteria. Cannot determine missing marks.");
            setIsLoading(false);
            return;
        }

        // Filter for students missing ALL CA marks
        const studentsMissingAllCAMarks = allFetchedStudentsProvisional.filter(student => 
          student.cw === 0 &&
          student.hw === 0 &&
          student.org === 0 &&
          student.spart === 0 &&
          student.smgt === 0
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((student, index) => ({ ...student, displayIndex: index + 1 }));
        
        logDebug('Students missing all CA marks:', studentsMissingAllCAMarks);
        setStudents(studentsMissingAllCAMarks);
        
        if (studentsMissingAllCAMarks.length === 0) {
          setInfoMessage(`All ${allFetchedStudentsProvisional.length} student(s) have at least one CA mark component entered. No students found missing all CA marks.`);
        }

      } catch (err: any) {
        logDebug("Error in fetchData process:", err);
        setError(`Failed to load student CA marks: ${err.message}. Check console for details.`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams, baseUrl]); // Dependency on searchParams to refetch if URL changes

  const handlePrint = () => window.print();
  const handleBack = () => router.back(); // Use router for back navigation

  useEffect(() => {
    const styleId = 'print-styles-missing-ca'; // Unique ID
    if (document.getElementById(styleId)) return;

    const printStyles = `
      @media print {
        .no-print { display: none !important; }
        body { padding: 20px; font-size: 10pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
        th { background-color: #f0f0f0; text-align: center; }
        td.text-center { text-align: center; }
        h1, h2, h3 { margin-bottom: 0.5rem; }
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) styleToRemove.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex justify-center items-start min-h-screen p-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-4xl"> {/* Increased max-width for CA columns */}
        <div className="flex flex-col justify-between items-center mb-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Students Missing All CA Marks - {pageInfo.className}
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-1">
              {pageInfo.subject} - {pageInfo.examType} {/* examType here shows what was in URL or default CA */}
            </h2>
            <h3 className="text-lg text-gray-600 mt-1">
              {pageInfo.term}, {pageInfo.year}
            </h3>
          </div>
          
          <div className="flex space-x-4 no-print mb-4">
            <button 
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none"
            >
              Print List
            </button>
            <button 
              onClick={handleBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700 focus:outline-none"
            >
              Back
            </button>
          </div>
            
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 w-full mb-4" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          {!error && infoMessage && students.length === 0 && (
             <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 w-full mb-4" role="alert">
               <p className="font-bold">Information</p>
               <p>{infoMessage}</p>
             </div>
          )}
        </div>

        {!error && students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">#</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Student Name</th>
                  {/* Always show CA component columns */}
                  <th className="border border-gray-300 px-4 py-2 text-center">CW</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">HW</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">ORG</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">SPART</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">SMGT</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.apiId} className="hover:bg-gray-50 even:bg-white odd:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{student.displayIndex}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{student.name}</td>
                    {/* All these values will be 0 for the displayed students */}
                    <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{student.cw}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{student.hw}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{student.org}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{student.spart}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{student.smgt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !isLoading && !error && !infoMessage && students.length === 0 && (
             <div className="bg-gray-50 border-l-4 border-gray-500 text-gray-700 p-4 w-full mb-4" role="status">
               <p>No students to display. This could be due to an issue fetching data or no students meeting the &apos;missing all CA marks&apos; criteria.</p>
             </div>
          )
        )}
        
        <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Students Missing All CA Marks: {students.length}</p>
        </div>
      </div>
    </div>
  );
};

const StudentsMissingCAMarksDisplayPage = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading students with missing CA marks...</p></div>}>
      <StudentsMissingCAMarksDisplayView />
    </Suspense>
  );
};

export default StudentsMissingCAMarksDisplayPage;