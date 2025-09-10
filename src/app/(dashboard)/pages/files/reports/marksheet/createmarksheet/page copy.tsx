"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { env } from '@/env';
import { useSearchParams, useRouter } from 'next/navigation';

// Interfaces
interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  class_assigned: string;
}

interface StudentMark {
  id: string;
  mark: string;
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ExamSet {
  id: string;
  examSetType: string;
  classId: string;
  termId: string;
}

interface Term {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string;
}

interface SavedMark {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  mark: string;
  markId: string;
  grade: string;
  remarks: string;
  assessmentType: string;
}

interface SavedMarksResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    student: {
      id: string;
      name: string;
      classId: string;
    };
    marks: SavedMark[];
  };
}

// Define the payload type
interface MarksPayload {
  marks: { studentId: string; mark: any }[]; 
  subjectId: string;
  examSetId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  assessmentType: string;
  caComponent?: string; 
}

const MarksInputView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const API_BASE_URL = env.BACKEND_API_URL;
  const baseUrl = `${API_BASE_URL}/api/v1`;

  // State for form parameters
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [term, setTerm] = useState<string | null>(null);

  // State for IDs (needed for API submission)
  const [classId, setClassId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [examSetId, setExamSetId] = useState<string>('');
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<string>('');
  const [caComponent, setCaComponent] = useState<string | null>(null);

  // State for students and marks
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [existingMarks, setExistingMarks] = useState<Map<string, string>>(new Map());

  // State for UI and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invalidInputs, setInvalidInputs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);

  // Get auth token from localStorage
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    return headers;
  }, []);

  // Fetch existing marks for a student
  const fetchExistingMarks = useCallback(async (studentId: string) => {
    if (!examSetId || !termId || !academicYearId || !assessmentType) {
      console.error("Missing required parameters for fetching marks:", {
        examSetId,
        termId,
        academicYearId,
        assessmentType
      });
      return null;
    }

    try {
      const headers = getAuthHeaders();
      const url = `${baseUrl}/marks/student?studentId=${studentId}&termId=${termId}&academicYearId=${academicYearId}&examSetId=${examSetId}&assessmentType=${assessmentType}&classId=${classId}`;
      
      console.log("Fetching marks from:", url);
      
      const response = await fetch(url, { headers });
      const data: SavedMarksResponse = await response.json();
      
      if (data.status?.returnCode === "00" && data.data?.marks) {
        return data.data.marks;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching existing marks:", error);
      return null;
    }
  }, [baseUrl, getAuthHeaders, examSetId, termId, academicYearId, assessmentType, classId]);

  // Fetch existing marks for all students
  const fetchAllExistingMarks = useCallback(async (studentsList: Student[]) => {
    const marksMap = new Map<string, string>();
    
    console.log("Starting to fetch marks for", studentsList.length, "students");
    
    // To avoid making too many requests at once, process in batches
    for (const student of studentsList) {
      try {
        const studentMarks = await fetchExistingMarks(student.id);
        
        if (studentMarks) {
          // Find the mark for the selected subject
          const subjectMark = studentMarks.find(mark => mark.subjectId === subjectId);
          
          if (subjectMark) {
            console.log(`Found mark for student ${student.id} and subject ${subjectId}:`, subjectMark);
            
            // Handle -1 as 'm' for missing
            const displayMark = subjectMark.mark === "-1" ? "m" : subjectMark.mark;
            marksMap.set(student.id, displayMark);
          } else {
            console.log(`No mark found for student ${student.id} and subject ${subjectId}`);
          }
        } else {
          console.log(`No marks found for student ${student.id}`);
        }
      } catch (error) {
        console.error(`Error fetching marks for student ${student.id}:`, error);
      }
    }
    
    console.log("Completed fetching marks, found marks for", marksMap.size, "students");
    return marksMap;
  }, [fetchExistingMarks, subjectId]);

  // Fetch class ID based on class name
  const fetchClassId = useCallback(async (className: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${baseUrl}/classes/filter?limit=100`, { headers });
      const data = await response.json();
      
      if (data.classes) {
        const classObj = data.classes.find((cls: Class) => cls.name === className);
        if (classObj) {
          setClassId(classObj.id);
          return classObj.id;
        }
      }
      throw new Error("Class not found");
    } catch (error) {
      console.error("Error fetching class ID:", error);
      setError("Failed to fetch class information");
      return null;
    }
  }, [baseUrl, getAuthHeaders]);

  // Fetch subject ID based on subject name
  const fetchSubjectId = useCallback(async (subjectName: string) => {
    try {
      const headers = getAuthHeaders();
      
      // First, fetch the subject ID
      const response = await fetch(`${baseUrl}/subjects/filter?limit=100`, { headers });
      const data = await response.json();
      
      if (!data.subjects || data.subjects.length === 0) {
        throw new Error("No subjects found");
      }
      
      // Debug subject data
      console.log("Subjects data:", data.subjects);
      
      // Find the subject by name
      const subjectObj = data.subjects.find((subj: Subject) => subj.name === subjectName);
      if (!subjectObj) {
        throw new Error(`Subject "${subjectName}" not found`);
      }
      
      setSubjectId(subjectObj.id);
      
      // For debugging
      console.log("Found subject:", subjectObj);
      
      return subjectObj.id;
      
    } catch (error) {
      console.error("Error fetching subject ID:", error);
      setError("Failed to fetch subject information");
      // For debugging
      setDebug(error);
      return null;
    }
  }, [baseUrl, getAuthHeaders]);

  // Fetch year and term IDs
  const fetchYearAndTermIds = useCallback(async (yearText: string, termText: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${baseUrl}/academic-years/filter`, { headers });
      const data = await response.json();
      
      if (data.years) {
        const yearObj = data.years.find((y: AcademicYear) => y.year === yearText);
        if (yearObj) {
          setAcademicYearId(yearObj.id);
          
          // Now fetch terms for this academic year
          const termsResponse = await fetch(
            `${baseUrl}/term/filter?academicYearId=${yearObj.id}`,
            { headers }
          );
          const termsData = await termsResponse.json();
          
          if (termsData.terms) {
            const termObj = termsData.terms.find((t: Term) => t.name === termText);
            if (termObj) {
              setTermId(termObj.id);
              return { yearId: yearObj.id, termId: termObj.id };
            }
          }
        }
      }
      throw new Error("Year or term not found");
    } catch (error) {
      console.error("Error fetching year and term IDs:", error);
      setError("Failed to fetch academic year information");
      return null;
    }
  }, [baseUrl, getAuthHeaders]);

  // Utility function to map exam types to assessment types
  const mapExamTypeToAssessmentType = (examType: string): string => {
    const examTypeMap: { [key: string]: string } = {
      'Beginning Of Term (BOT)': 'BOT',
      'Continuous Assessment (CA)': 'CA',
      'Continuous Assessment (C.A)': 'CA',
      'Mid Term': 'MID',
      'End Of Term (EOT)': 'EOT'
    };

    // Try exact match first
    if (examTypeMap[examType]) {
      return examTypeMap[examType];
    }
    
    // If no exact match, try case-insensitive partial match
    const lowerExamType = examType.toLowerCase();
    if (lowerExamType.includes('mid')) return 'MID';
    if (lowerExamType.includes('bot') || lowerExamType.includes('beginning')) return 'BOT';
    if (lowerExamType.includes('ca') || lowerExamType.includes('continuous') || lowerExamType.includes('c.a')) return 'CA';
    if (lowerExamType.includes('eot') || lowerExamType.includes('end')) return 'EOT';

    // Default fallback
    return '';
  };

  // Fetch exam set ID based on exam type and class ID
  const fetchExamSetId = useCallback(async (examType: string, classId: string, termId: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${baseUrl}/exams/class-assignments/${classId}`,
        { headers }
      );
      const data = await response.json();
      
      if (data.status?.returnCode === "00" && data.data?.examSets) {
        // For debugging
        console.log("Exam sets:", data.data.examSets);
        console.log("Looking for exam type:", examType);
        console.log("Using term ID:", termId);
        
        // Try to find an exact match first
        let examSet = data.data.examSets.find(
          (set: ExamSet) => set.examSetType === examType && set.termId === termId
        );
        
        // If no exact match, try to find a partial match
        if (!examSet) {
          examSet = data.data.examSets.find(
            (set: ExamSet) => set.examSetType.includes(examType) || examType.includes(set.examSetType)
          );
        }
        
        // If still no match, just use the first exam set as a fallback
        if (!examSet && data.data.examSets.length > 0) {
          examSet = data.data.examSets[0];
          console.log("Using fallback exam set:", examSet);
        }
        
        if (examSet) {
          // Use the actual examSetId from the assignment
          setExamSetId(examSet.id);
          
          // Map assessment type
          const assessmentType = mapExamTypeToAssessmentType(examType);
          setAssessmentType(assessmentType);
          
          // Update URL with the correct examSetId
          const url = new URL(window.location.href);
          url.searchParams.set('examSetId', examSet.id);
          window.history.replaceState({}, '', url.toString());
          console.log("Updated URL with correct examSetId:", examSet.id);
          
          return { examSetId: examSet.id, assessmentType };
        }
      }
      throw new Error("Exam set not found");
    } catch (error) {
      console.error("Error fetching exam set ID:", error);
      setError("Failed to fetch exam information");
      return null;
    }
  }, [baseUrl, getAuthHeaders]);

  // Fetch students based on class
  const fetchStudents = useCallback(async (classParam: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${baseUrl}/students/filter?page=1&pageSize=10000&class_assigned=${encodeURIComponent(classParam)}`, 
        { headers }
      );

      const data = await response.json();
      
      // For debugging
      console.log("Students response:", data);

      if (data.status?.returnCode === "00" && data.data?.students) {
        const fetchedStudents: Student[] = data.data.students;
        
        // Additional filtering to ensure exact class match
        const classFilteredStudents = fetchedStudents.filter(
          student => student.class_assigned.trim() === classParam.trim()
        );

        setStudents(classFilteredStudents);

        // Initialize marks array with fetched students (will be updated with existing marks later)
        const initialMarks = classFilteredStudents.map(student => ({
          id: student.id,
          mark: ''
        }));
        setMarks(initialMarks);

        if (classFilteredStudents.length === 0) {
          setError("No students found for the selected class");
        }
        
        return classFilteredStudents;
      } else {
        // Try an alternative method for testing
        console.log("Falling back to test student data");
        const testStudent = {
          id: "test-student-id",
          first_name: "Test",
          last_name: "Student",
          class_assigned: classParam
        };
        
        setStudents([testStudent]);
        setMarks([{ id: testStudent.id, mark: '' }]);
        
        return [testStudent];
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("An error occurred while fetching students");
      return [];
    }
  }, [baseUrl, getAuthHeaders]);

  // Extract and set parameters from URL on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!searchParams) return;

      try {
        setIsLoading(true);
        setError(null);

        // Extract all parameters from URL
        const classParam = searchParams.get('class');
        const subjectParam = searchParams.get('subject');
        const examParam = searchParams.get('exam');
        const yearParam = searchParams.get('year');
        const termParam = searchParams.get('term');
        const directExamSetId = searchParams.get('examSetId');
        const directTermId = searchParams.get('termId'); // Try to get termId directly from URL

        // Set state for parameters
        setSelectedClass(classParam);
        setSelectedSubject(subjectParam);
        setSelectedExam(examParam);
        setYear(yearParam);
        setTerm(termParam);
        
        // If examSetId is directly provided in URL, use it
        if (directExamSetId) {
          setExamSetId(directExamSetId);
          
          // Set assessment type based on exam name
          const mappedAssessmentType = mapExamTypeToAssessmentType(examParam || '');
          setAssessmentType(mappedAssessmentType);
          
          console.log("Using direct examSetId from URL:", directExamSetId);
          console.log("Mapped assessment type:", mappedAssessmentType);
        }
        
        // If termId is directly provided in URL, use it
        if (directTermId) {
          setTermId(directTermId);
          console.log("Using direct termId from URL:", directTermId);
        }

        // Check if all parameters exist
        if (!classParam || !subjectParam || !examParam || !yearParam || !termParam) {
          setError("Missing required parameters");
          setIsLoading(false);
          return;
        }

        // For debugging
        console.log("URL Parameters:", { 
          classParam, 
          subjectParam, 
          examParam, 
          yearParam, 
          termParam,
          directExamSetId 
        });

        // Use a Promise.all to fetch all the necessary IDs in parallel
        const [fetchedClassId, yearTermIds, fetchedSubjectId] = await Promise.all([
          fetchClassId(classParam || ''),
          fetchYearAndTermIds(yearParam || '', termParam || ''),
          fetchSubjectId(subjectParam || '')
        ]);

        // If examSetId was not in URL, fetch it
        if (!directExamSetId && fetchedClassId && yearTermIds?.termId) {
          const examInfo = await fetchExamSetId(examParam || '', fetchedClassId, yearTermIds.termId);
        }

        // Fetch students
        const fetchedStudents = await fetchStudents(classParam || '');
        
        // Create a function to check and fetch marks once all parameters are available
        const checkAndFetchMarks = async () => {
          // Check if we have all required parameters to fetch marks
          if (fetchedStudents.length > 0 && 
              subjectId && 
              examSetId && 
              academicYearId && 
              termId && 
              assessmentType) {
            
            console.log("All parameters available! Fetching existing marks with params:", {
              examSetId, 
              termId, 
              academicYearId, 
              assessmentType,
              subjectId,
              studentsLength: fetchedStudents.length
            });
            
            try {
              // Fetch existing marks for all students
              const existingMarksMap = await fetchAllExistingMarks(fetchedStudents);
              
              console.log("Existing marks fetched:", existingMarksMap);
              
              setExistingMarks(existingMarksMap);
              
              // Update marks state with existing values
              const updatedMarks = fetchedStudents.map(student => ({
                id: student.id,
                mark: existingMarksMap.get(student.id) || ''
              }));
              
              setMarks(updatedMarks);
              return true;
            } catch (error) {
              console.error("Error fetching existing marks:", error);
              return false;
            }
          } else {
            console.log("Not all parameters are available for fetching marks:", {
              studentsLength: fetchedStudents.length,
              examSetId,
              termId,
              academicYearId,
              assessmentType,
              subjectId
            });
            return false;
          }
        };
        
        // Try fetching marks immediately and then after a delay if needed
        const immediate = await checkAndFetchMarks();
        if (!immediate) {
          // Try again after a delay to ensure state updates have completed
          setTimeout(async () => {
            await checkAndFetchMarks();
          }, 1000);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        setError("Failed to initialize data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [searchParams, fetchClassId, fetchYearAndTermIds, fetchSubjectId, fetchExamSetId, fetchStudents, fetchAllExistingMarks, subjectId, examSetId, academicYearId, termId, assessmentType]);

  // Function to format marks for display
  const formatMarkForDisplay = (mark: any) => {
    // If the mark is our special -1 value, display it as "m"
    if (mark === -1) {
      return 'm';
    }
    // Otherwise, display it as is
    return mark;
  };

  // Handle mark input changes with support for 'm' to indicate missing
  const handleMarkChange = (studentId: string, value: string) => {
    // Check if the value is 'm' for missing
    if (value.toLowerCase() === 'm') {
      setMarks(prevMarks => 
        prevMarks.map(mark => 
          mark.id === studentId ? { ...mark, mark: 'm' } : mark
        )
      );
      
      // Remove from invalid inputs
      setInvalidInputs(prev => prev.filter(id => id !== studentId));
      return;
    }
    
    // Handle empty input
    if (value === '') {
      setMarks(prevMarks => 
        prevMarks.map(mark => 
          mark.id === studentId ? { ...mark, mark: '' } : mark
        )
      );
      return;
    }
    
    // Check if input is a valid number
    const numRegex = /^[0-9]+$/;
    if (!numRegex.test(value)) {
      // Invalid input - keep existing value but mark as invalid
      setInvalidInputs(prev => 
        prev.includes(studentId) ? prev : [...prev, studentId]
      );
      return;
    }
    
    // Valid number - limit to 0-100 range
    const numValue = Math.min(Math.max(parseInt(value), 0), 100).toString();
    
    setMarks(prevMarks => 
      prevMarks.map(mark => 
        mark.id === studentId ? { ...mark, mark: numValue } : mark
      )
    );
    
    // Remove from invalid inputs
    setInvalidInputs(prev => prev.filter(id => id !== studentId));
  };

  // Submit marks to API with support for 'm' as missing
  const submitMarksToAPI = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Format the marks data for API - Keep 'm' as 'm' for missing marks
      const formattedMarks = marks.map(mark => ({
        studentId: mark.id,
        mark: mark.mark.toLowerCase() === 'm' ? 'm' : Number(mark.mark) // Keep 'm' as 'm' for missing marks
      }));
      
      console.log("Formatted marks for submission:", formattedMarks);
      
      // Prepare the request payload - Include all marks, even missing ones
      const payload: MarksPayload = {
        marks: formattedMarks, // Include all marks
        subjectId: subjectId,
        examSetId,
        academicYearId,
        termId,
        classId,
        assessmentType
      };
      
      // Add caComponent if assessment type is CA
      if (assessmentType === "CA" && caComponent) {
        payload.caComponent = caComponent;
      }
      
      console.log("Submitting payload:", payload);
      
      // Make API request
      const response = await fetch(`${baseUrl}/marks/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.status?.returnCode === "00") {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Update existingMarks map with the newly submitted marks
        const newExistingMarks = new Map(existingMarks);
        marks.forEach(mark => {
          newExistingMarks.set(mark.id, mark.mark);
        });
        setExistingMarks(newExistingMarks);
      } else {
        setError(data.status?.returnMessage || "Failed to submit marks");
      }
    } catch (error) {
      console.error("Error submitting marks:", error);
      setError("An error occurred while submitting marks");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit marks validation and submission
  const handleSubmit = () => {
    const invalid: string[] = [];

    // Validate marks - now allowing 'm' as valid
    marks.forEach(mark => {
      if (!isValidMark(mark.mark)) {
        invalid.push(mark.id);
      }
    });

    setInvalidInputs(invalid);

    if (invalid.length === 0) {
      submitMarksToAPI();
    } else {
      setError('Please ensure all fields are filled with marks between 0 and 100, or use "m" for missing.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  // Validation for missing parameters
  if (!selectedClass || !selectedSubject || !selectedExam || !year || !term) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Missing required parameters. Please return to the previous page and try again.</p>
        </div>
      </div>
    );
  }

  // No students found - but we'll show an alternative view for testing
  if (students.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>{error || "No students found for the selected class."}</p>
        </div>
      </div>
    );
  }

  // Function to determine cell class based on mark value
  const getMarkCellClass = (mark: string) => {
    if (mark.toLowerCase() === 'm') {
      return 'bg-gray-200 italic'; // Gray background for missing
    } else if (mark === '0') {
      return 'bg-red-100'; // Light red background for zero scores
    }
    return '';
  };
  
  // Validate if a mark input is valid
  const isValidMark = (value: string): boolean => {
    // Empty is invalid
    if (value === '') return false;
    
    // 'm' is valid for missing
    if (value.toLowerCase() === 'm') return true;
    
    // Check if it's a valid number between 0-100
    const numValue = Number(value);
    return !isNaN(numValue) && numValue >= 0 && numValue <= 100;
  };

  // Main render
  return (
    <div className="bg-gray-100 min-h-screen pt-2">
      <div className="w-full max-w-4xl mx-auto bg-white shadow-md rounded-md">
        <div className="bg-green-800 text-white text-center py-4 rounded-t-md">
          <h1 className="text-xl font-bold">
            Add Marks for {selectedClass} - {selectedSubject} ({selectedExam}) {year} {term}
          </h1>
        </div>
        
        <div className="p-4 bg-blue-50 border-b">
          <p className="text-sm"><strong>Tip:</strong> Use M to indicate missing marks for students who didnt take the test. Enter 0 for students who scored zero.</p>
        </div>
        
        {error && !isSubmitting && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
            <p>{error}</p>
          </div>
        )}
        
        <table className="table-auto w-full border-collapse border-gray-300">
          <thead className="bg-gray-200 border-gray-300">
            <tr>
              <th className="border px-4 py-2 border-gray-300">#</th>
              <th className="border px-4 py-2 border-gray-300">Student Name</th>
              <th className="border px-4 py-2 border-gray-300">{selectedSubject}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {students.map((student, index) => {
              const studentMark = marks.find(m => m.id === student.id)?.mark || '';
              return (
                <tr key={student.id}>
                  <td className="border px-4 py-2 text-center border-gray-300">{index + 1}</td>
                  <td className="border px-4 py-2 border-gray-300">
                    {`${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim()}
                  </td>
                  <td className={`border px-4 py-2 text-center border-gray-300 ${getMarkCellClass(studentMark)}`}>
                    <div className="relative">
                      <input
                        type="text" // Changed from "number" to allow "m" input
                        value={studentMark}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                        className={`w-16 p-1 border rounded ${
                          invalidInputs.includes(student.id) ? 'border-red-600' : ''
                        }`}
                        placeholder="0-100 or m"
                      />
                      {invalidInputs.includes(student.id) && (
                        <div className="absolute w-full text-xs text-red-600 mt-1">
                          Only 0-100 or m
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-4 text-center">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-6 py-2 rounded ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-800 text-white hover:bg-green-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                Submitting...
              </span>
            ) : 'Submit'}
          </button>
          
          {showSuccess && (
            <div className="mt-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
              <p>Marks submitted successfully!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateMarksheetPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading marks input form...</p></div>}>
      <MarksInputView />
    </Suspense>
  );
};

export default CreateMarksheetPageWrapper;