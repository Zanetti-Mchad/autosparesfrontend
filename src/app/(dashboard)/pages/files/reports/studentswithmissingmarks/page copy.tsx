"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { env } from '@/env';

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface Student {
  id: string;
  originalId: string;
  name: string;
  marks: Record<string, number | null>; // Allow null values for marks, -1 for missed paper
}

interface Mark {
  id?: string;
  studentId?: string;
  name?: string;
  mark: string | number | null;
  markId?: string | null;
  [key: string]: any;
}

const PageView = () => {
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
  
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;
  
  const getStringParam = (param: string | null | undefined): string => {
    return param || "";
  };

  const processMarkValue = (mark: Mark): number | null => {
    if (typeof mark.mark === 'number') {
      // Preserve -1 as -1, otherwise return the mark.
      // Null marks are handled by the `else` block if mark.mark is undefined or explicitly null.
      return mark.mark; 
    } 
    else if (mark.mark !== undefined && mark.mark !== null) { // Ensure mark.mark is not null before String()
      const trimmedMark = String(mark.mark).trim();
      if (trimmedMark === "") {
        return null; 
      } 
      if (trimmedMark === "-1") {
        return -1; 
      }
      const parsedMark = parseInt(trimmedMark, 10); // removed "|| 0" to avoid parsing empty string as 0
      // If parsing fails (NaN), or if original was non-numeric that shouldn't be 0, return null.
      // Consider 0 a valid mark if it was explicitly "0".
      return isNaN(parsedMark) ? null : parsedMark; 
    } 
    else { // Handles undefined or null mark.mark
      return null;
    }
  };

  const getAuthHeaders = (): HeadersInit => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found in localStorage.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  useEffect(() => {
    if (!searchParams) return;
    
    const classNameFromParams = decodeURIComponent(searchParams.get('class') || 'Unknown Class');
    const examNameFromParams = decodeURIComponent(searchParams.get('exam') || 'End Of Term (EOT)');
    const termNameFromParams = decodeURIComponent(searchParams.get('term') || 'Unknown Term');
    const yearNameFromParams = decodeURIComponent(searchParams.get('year') || 'Unknown Year');
    
    setPageInfo({
      className: classNameFromParams,
      examName: examNameFromParams,
      termName: termNameFromParams,
      yearName: yearNameFromParams
    });
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const printStyles = `
      @media print {
        .no-print { display: none; }
        body { padding: 20px; font-size: 12pt; }
        table { width: 100%; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { padding: 5px; }
      }
    `;
    
    if (document.getElementById('print-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'print-styles';
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      const styleToRemove = document.getElementById('print-styles');
      if (styleToRemove?.parentNode) {
        styleToRemove.parentNode.removeChild(styleToRemove);
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!searchParams) return;

        const classId = getStringParam(searchParams.get('classId'));
        const termId = getStringParam(searchParams.get('termId'));
        const academicYearId = getStringParam(searchParams.get('academicYearId'));
        const examSetId = getStringParam(searchParams.get('examSetId'));
        const urlAssessmentType = getStringParam(searchParams.get('assessmentType'));
        
        if (!classId || classId === 'defaultClassId') {
          throw new Error('Missing required parameter: classId');
        }
        
        const primaryAssessmentType = urlAssessmentType || 'EOT';
        const fallbackTypes = ['BOT', 'MID', 'EOT', 'TEST'].filter(type => type !== primaryAssessmentType);
        const orderedAssessmentTypes = [primaryAssessmentType, ...fallbackTypes];
        
        const headers = getAuthHeaders();
        
        const assignmentsUrl = `${baseUrl}/class-subject-assignments/assignments`;
        const assignmentsResponse = await fetch(assignmentsUrl, { headers });
        if (!assignmentsResponse.ok) throw new Error(`Assignments fetch failed: ${assignmentsResponse.status}`);
        const assignmentsData = await assignmentsResponse.json();
        
        let classSubjectIds: string[] = [];
        if (assignmentsData.data?.assignments) {
          classSubjectIds = assignmentsData.data.assignments
            .filter((assignment: any) => assignment.classId === classId)
            .map((assignment: any) => assignment.subjectActivityId);
        }
        
        const subjectsUrl = `${baseUrl}/subjects/filter?limit=100`;
        const subjectsResponse = await fetch(subjectsUrl, { headers });
        if (!subjectsResponse.ok) throw new Error(`Subjects fetch failed: ${subjectsResponse.status}`);
        const subjectsData = await subjectsResponse.json();
        
        const allSubjectsApi = subjectsData.subjects || subjectsData.data?.subjects || [];
        let fetchedAssignedSubjects: Subject[] = allSubjectsApi
          .filter((subject: any) => classSubjectIds.includes(subject.id))
          .map((subject: any) => ({
            id: subject.id,
            code: subject.code || subject.name.substring(0, 3).toUpperCase(),
            name: subject.name
          }));
        
        if (fetchedAssignedSubjects.length === 0) {
          console.warn("No assigned subjects found for this class. Marksheet may be incomplete or show no students if filtering for 'no marks'.");
          // No fallback subjects if we are looking for students with no marks in *defined* subjects.
        }
        
        setSubjects(fetchedAssignedSubjects); // Set subjects for table headers
        
        const studentsMap = new Map<string, {
          id: string;
          name: string;
          marks: Record<string, number | null>;
          assessmentTypeUsed: Record<string, string | null>;
        }>();
        
        await Promise.all(fetchedAssignedSubjects.map(async (subject) => {
          let foundMarksForSubject = false;
          for (const assessmentType of orderedAssessmentTypes) {
            if (foundMarksForSubject) continue;
            
            const url = `${baseUrl}/marks/get?subjectId=${subject.id}&classId=${classId}&termId=${termId}&academicYearId=${academicYearId}&examSetId=${examSetId}&assessmentType=${assessmentType}`;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              const response = await fetch(url, { headers, signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                console.warn(`Marks fetch failed for ${subject.name} with ${assessmentType}: ${response.status}`);
                continue;
              }
              
              const data = await response.json();
              if (!data || data.status?.returnCode !== "00" || !data.data?.marks) {
                console.warn(`No valid data for ${subject.name} with ${assessmentType}`);
                continue;
              }
              
              const marksList = Array.isArray(data.data.marks) ? data.data.marks : [data.data.marks];
              let validMarksCount = 0;
              
              marksList.forEach((markEntry: Mark) => {
                const studentId = String(markEntry.studentId || markEntry.id || "");
                if (!studentId) return; // Skip if no studentId
                const studentName = markEntry.name || "Unknown Student";
                
                if (!studentsMap.has(studentId)) {
                  studentsMap.set(studentId, {
                    id: studentId,
                    name: studentName,
                    marks: {},
                    assessmentTypeUsed: {}
                  });
                }
                
                const studentRecord = studentsMap.get(studentId)!;
                const markValue = processMarkValue(markEntry);
                
                // Store mark if it's not null, or if it's null and no other mark was found yet for this subject
                // This prioritizes actual marks over nulls if multiple assessment types have data
                if (markValue !== null) {
                  if (studentRecord.marks[subject.code] === null || studentRecord.marks[subject.code] === undefined) {
                     studentRecord.marks[subject.code] = markValue;
                     studentRecord.assessmentTypeUsed[subject.code] = assessmentType;
                  } else if (markValue !== -1) { // Prioritize actual scores over -1 if -1 was already there
                    studentRecord.marks[subject.code] = markValue;
                    studentRecord.assessmentTypeUsed[subject.code] = assessmentType;
                  }
                  validMarksCount++;
                } else { // markValue is null
                  if (!(subject.code in studentRecord.marks)) { // only set to null if not previously set by any assessment type
                    studentRecord.marks[subject.code] = null;
                    studentRecord.assessmentTypeUsed[subject.code] = null;
                  }
                }
              });
              
              if (validMarksCount > 0) foundMarksForSubject = true;
              
            } catch (error: any) {
              if (error.name === 'AbortError') console.warn(`Request timeout for ${subject.name} with ${assessmentType}`);
              else console.error(`Error fetching ${subject.name} with ${assessmentType}:`, error);
            }
          }
        }));
        
        // Normalize student data and ensure all subjects are present in marks
        let allFetchedStudents = Array.from(studentsMap.values()).map((studentData) => {
          const normalizedMarks: Record<string, number | null> = {};
          fetchedAssignedSubjects.forEach(subject => {
            // Default to null if the mark is not present (undefined) in studentData.marks
            normalizedMarks[subject.code] = studentData.marks[subject.code] === undefined ? null : studentData.marks[subject.code];
          });
          return {
            id: studentData.id,
            originalId: studentData.id,
            name: studentData.name,
            marks: normalizedMarks
          };
        });
        
        // Filter for students with no marks in any subject
        const studentsWithNoMarks = allFetchedStudents.filter(student => {
          if (fetchedAssignedSubjects.length === 0) {
            // If there are no subjects, no student can be said to have "no marks"
            // as there are no subjects to check against.
            return false;
          }
          // A student has "no marks" if *all* their subject marks are null or -1
          return fetchedAssignedSubjects.every(subject => {
            const mark = student.marks[subject.code];
            return mark === null || mark === -1;
          });
        });

        studentsWithNoMarks.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(studentsWithNoMarks);

      } catch (err: any) {
        console.error("Comprehensive Error:", err);
        setError(err.message || "Failed to load student marks. Please try again.");
        setStudents([]);
        setSubjects([]); // Clear subjects on error too
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [baseUrl, searchParams]); 

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-4xl mx-auto mt-8">
        <p className="font-medium">Error: {error}</p>
        <p className="text-sm mt-2">Please check your connection, ensure all parameters are correct, and try again.</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md shadow hover:bg-red-600 focus:ring-2 focus:ring-red-400 focus:outline-none"
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
              Students With No Marks in {pageInfo.className}
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-2">
              {pageInfo.examName} - {pageInfo.termName} {pageInfo.yearName}
            </h2>
          </div>
          
          <div className="flex space-x-4 no-print">
            <button 
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              Print List
            </button>
            <button 
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none"
            >
              Back
            </button>
          </div>
        </div>

        {subjects.length === 0 && students.length === 0 && !isLoading && !error && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-6 rounded-lg text-center">
                <p className="text-lg">No subjects are assigned to this class.</p>
                <p className="mt-2">Therefore, no students can be listed as having &quot;no marks&quot;.</p>
            </div>
        )}

        {subjects.length > 0 && students.length > 0 ? (
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
                        {/* For students with "no marks", all entries will be '-' */}
                        {student.marks[subject.code] === null || student.marks[subject.code] === -1 
                          ? '-' 
                          : student.marks[subject.code]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // This condition will also be met if subjects.length > 0 but students.length === 0
          subjects.length > 0 && students.length === 0 && !isLoading && !error && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg text-center">
              <p className="text-lg">No students found with missing marks for all subjects.</p>
              <p className="mt-2">All students have at least one mark entered for the selected criteria.</p>
            </div>
          )
        )}
        
        <div className="mt-6 flex justify-between items-center">
          <p className="text-gray-700 font-medium">
            Date: {new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-700 font-medium">
            Total Students Displayed: {students.length}
          </p>
        </div>
      </div>
    </div>
  );
};

const StudentsWithMissingMarksPageWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading students with missing marks report...</p></div>}>
      <PageView />
    </Suspense>
  );
};

export default StudentsWithMissingMarksPageWrapper;