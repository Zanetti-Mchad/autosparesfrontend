'use client'

import React, { useState, FormEvent, ChangeEvent, useEffect, useCallback, Suspense } from 'react';
import { env } from '@/env';
import { useSearchParams } from 'next/navigation';

// Define types for our student data
interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  class_assigned: string;
  cw: number;    // Class Work
  hw: number;    // Home Work
  org: number;   // Organization
  spart: number; // Student Participation
  smgt: number;  // Student Management
}

// Define valid field names for type safety
type FieldName = 'cw' | 'hw' | 'org' | 'spart' | 'smgt';

// Define the payload type for API submission
interface MarksPayload {
  marks: { 
    studentId: string; 
    mark: string;
  }[];
  subjectId: string;
  examSetId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  assessmentType: string;
  caComponent: string; // This should be at the top level and is required for CA
}

interface Mark {
  subjectId: string;
  cw?: number;
  hw?: number;
  org?: number;
  spart?: number;
  smgt?: number;
}

interface CAComponent {
  component: string;
  componentName: string;
  mark: string;
  markId: string | null;
  grade: string;
  remarks: string;
}

interface SubjectMarks {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  caComponents: CAComponent[];
}

interface StudentMarksResponse {
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
    subjects: SubjectMarks[];
    caComponents: {
      code: string;
      name: string;
    }[];
  };
}

function CAMarksSubmissionFormView() {
  const searchParams = useSearchParams();
  const API_BASE_URL = env.BACKEND_API_URL;
  const baseUrl = `${API_BASE_URL}/api/v1`;

  // Maximum mark allowed for any field
  const MAX_MARK = 20;

  // URL parameters
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [term, setTerm] = useState<string | null>(null);

  // API IDs needed for submission
  const [classId, setClassId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [examSetId, setExamSetId] = useState<string>('');
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');

  // Students and marks state
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidInputs, setInvalidInputs] = useState<{studentId: string, field: FieldName}[]>([]);
  const [submissionProgress, setSubmissionProgress] = useState<string>('');

  // Get auth token from localStorage
  const getAuthHeaders = useCallback(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {
        'Content-Type': 'application/json'
      };
    }
    
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    return headers;
  }, []);

  // Fetch class ID based on class name
  const fetchClassId = useCallback(async (className: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${baseUrl}/classes/filter?limit=100`, { headers });
      const data = await response.json();
      
      if (data.classes) {
        const classObj = data.classes.find((cls: any) => cls.name === className);
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
      const response = await fetch(`${baseUrl}/subjects/filter?limit=100`, { headers });
      const data = await response.json();
      
      if (data.subjects) {
        const subjectObj = data.subjects.find((subj: any) => subj.name === subjectName);
        if (subjectObj) {
          setSubjectId(subjectObj.id);
          return subjectObj.id;
        }
      }
      throw new Error("Subject not found");
    } catch (error) {
      console.error("Error fetching subject ID:", error);
      setError("Failed to fetch subject information");
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
        const yearObj = data.years.find((y: any) => y.year === yearText);
        if (yearObj) {
          setAcademicYearId(yearObj.id);
          
          // Now fetch terms for this academic year
          const termsResponse = await fetch(
            `${baseUrl}/term/filter?academicYearId=${yearObj.id}`,
            { headers }
          );
          const termsData = await termsResponse.json();
          
          if (termsData.terms) {
            const termObj = termsData.terms.find((t: any) => t.name === termText);
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
        // Try to find an exact match first
        let examSet = data.data.examSets.find(
          (set: any) => set.examSetType === examType && set.termId === termId
        );
        
        // If no exact match, try to find a partial match
        if (!examSet) {
          examSet = data.data.examSets.find(
            (set: any) => set.examSetType.includes(examType) || examType.includes(set.examSetType)
          );
        }
        
        if (examSet) {
          // Use the actual examSetId instead of the assignment id
          setExamSetId(examSet.examSetId);
          // Update URL with the exam set ID
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('examSetId', examSet.examSetId);
          window.history.replaceState({}, '', newUrl.toString());
          return examSet.examSetId;
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

      if (data.status?.returnCode === "00" && data.data?.students) {
        let fetchedStudents = data.data.students;
        
        // Additional filtering to ensure exact class match
        fetchedStudents = fetchedStudents.filter(
          (student: any) => student.class_assigned.trim() === classParam.trim()
        );

        // Initialize CA fields for each student
        const studentsWithCAFields = fetchedStudents.map((student: any) => ({
          ...student,
          cw: 0,
          hw: 0,
          org: 0,
          spart: 0,
          smgt: 0
        }));

        setStudents(studentsWithCAFields);

        if (studentsWithCAFields.length === 0) {
          setError("No students found for the selected class");
        }
        
        return studentsWithCAFields;
      } else {
        throw new Error("Failed to fetch students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("An error occurred while fetching students");
      
      // For demo or development purposes, create mock students
      const mockStudents = [
        { id: "s1", first_name: "John", last_name: "Doe", class_assigned: classParam, cw: 0, hw: 0, org: 0, spart: 0, smgt: 0 },
        { id: "s2", first_name: "Jane", last_name: "Smith", class_assigned: classParam, cw: 0, hw: 0, org: 0, spart: 0, smgt: 0 },
      ];
      setStudents(mockStudents);
      return mockStudents;
    }
  }, [baseUrl, getAuthHeaders]);

  // Fetch existing marks for a student
  const fetchExistingMarks = useCallback(async (studentId: string) => {
    if (!examSetId || !termId || !academicYearId) {
      console.error("Missing required parameters for fetching marks:", {
        examSetId,
        termId,
        academicYearId
      });
      return null;
    }

    try {
      const headers = getAuthHeaders();
      const url = `${baseUrl}/marks/student-ca?studentId=${studentId}&termId=${termId}&academicYearId=${academicYearId}&examSetId=${examSetId}`;
      
      console.log("Fetching marks from:", url);
      
      const response = await fetch(url, { headers });
      const data: StudentMarksResponse = await response.json();
      
      if (data.status?.returnCode === "00" && data.data?.subjects) {
        // Find the marks for the selected subject
        const subjectMarks = data.data.subjects.find(subject => subject.subjectId === subjectId);
        
        if (subjectMarks) {
          console.log("Found marks for subject:", subjectMarks);
          return subjectMarks.caComponents;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching existing marks:", error);
      return null;
    }
  }, [baseUrl, getAuthHeaders, examSetId, termId, academicYearId, subjectId]);

  // Fetch existing marks for all students
  const fetchAllExistingMarks = useCallback(async (studentsList: Student[]) => {
    const marksMap = new Map<string, { [key: string]: number }>();
    
    console.log("Starting to fetch marks for", studentsList.length, "students");
    
    // To avoid making too many requests at once, process in batches
    for (const student of studentsList) {
      try {
        const studentMarks = await fetchExistingMarks(student.id);
        
        if (studentMarks) {
          console.log(`Found marks for student ${student.id}:`, studentMarks);
          
          // Map the component codes to our field names
          const componentMap: { [key: string]: string } = {
            'CW': 'cw',
            'HW': 'hw',
            'ORG': 'org',
            'S.PART': 'spart',
            'S.MGT': 'smgt',
            'SPART': 'spart',
            'SMGT': 'smgt'
          };
          
          // Create marks object with default values
          const marks: { [key: string]: number } = {
            cw: 0,
            hw: 0,
            org: 0,
            spart: 0,
            smgt: 0
          };
          
          // Update marks from the response
          studentMarks.forEach(component => {
            const fieldName = componentMap[component.component];
            if (fieldName && component.mark) {
              marks[fieldName] = parseInt(component.mark) || 0;
            }
          });
          
          marksMap.set(student.id, marks);
        } else {
          console.log(`No marks found for student ${student.id}`);
        }
      } catch (error) {
        console.error(`Error fetching marks for student ${student.id}:`, error);
      }
    }
    
    console.log("Completed fetching marks, found marks for", marksMap.size, "students");
    return marksMap;
  }, [fetchExistingMarks]);

  // Update the loadData function to fetch existing marks
  useEffect(() => {
    const loadData = async () => {
      if (!searchParams) return;

      try {
        setIsLoading(true);
        setError(null);

        const classParam = searchParams.get('class');
        const subjectParam = searchParams.get('subject');
        const examParam = searchParams.get('exam');
        const yearParam = searchParams.get('year');
        const termParam = searchParams.get('term');

        // Set state for parameters
        setSelectedClass(classParam);
        setSelectedSubject(subjectParam);
        setSelectedExam(examParam);
        setYear(yearParam);
        setTerm(termParam);

        // Check if all parameters exist
        if (!classParam || !subjectParam || !examParam || !yearParam || !termParam) {
          setError("Missing required parameters");
          setIsLoading(false);
          return;
        }

        // Fetch all required IDs for API submission
        const fetchedClassId = await fetchClassId(classParam);
        if (!fetchedClassId) {
          setIsLoading(false);
          return;
        }

        // Fetch year and term IDs
        const yearTermIds = await fetchYearAndTermIds(yearParam, termParam);
        if (!yearTermIds) {
          setIsLoading(false);
          return;
        }

        // Fetch subject ID
        const fetchedSubjectId = await fetchSubjectId(subjectParam);
        if (!fetchedSubjectId) {
          setIsLoading(false);
          return;
        }

        // Fetch exam set ID
        const fetchedExamSetId = await fetchExamSetId(examParam, fetchedClassId, yearTermIds.termId);
        if (!fetchedExamSetId) {
          setIsLoading(false);
          return;
        }

        // Fetch students
        const fetchedStudents = await fetchStudents(classParam);
        
        // Fetch existing marks for all students
        const existingMarks = await fetchAllExistingMarks(fetchedStudents);
        
        // Update students with existing marks
        setStudents(prevStudents => 
          prevStudents.map(student => {
            const studentMarks = existingMarks.get(student.id);
            if (studentMarks) {
              return {
                ...student,
                cw: studentMarks.cw,
                hw: studentMarks.hw,
                org: studentMarks.org,
                spart: studentMarks.spart,
                smgt: studentMarks.smgt
              };
            }
            return student;
          })
        );
      } catch (error) {
        console.error("Error initializing data:", error);
        setError("Failed to initialize data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    searchParams, 
    fetchClassId, 
    fetchYearAndTermIds, 
    fetchSubjectId, 
    fetchExamSetId, 
    fetchStudents,
    fetchAllExistingMarks
  ]);

  const handleInputChange = (studentId: string, field: FieldName, value: string): void => {
    // Convert input to number and validate (0-20)
    const numValue = parseInt(value) || 0;
    const validValue = Math.min(Math.max(numValue, 0), MAX_MARK);

    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.id === studentId ? { ...student, [field]: validValue } : student
      )
    );

    // Remove from invalid inputs if now valid
    if (validValue >= 0 && validValue <= MAX_MARK) {
      setInvalidInputs(prev => prev.filter(item => !(item.studentId === studentId && item.field === field)));
    }
  };

  const validateInputs = (): boolean => {
    const invalid: {studentId: string, field: FieldName}[] = [];

    students.forEach(student => {
      (['cw', 'hw', 'org', 'spart', 'smgt'] as FieldName[]).forEach(field => {
        const value = student[field];
        if (value < 0 || value > MAX_MARK) {
          invalid.push({ studentId: student.id, field });
        }
      });
    });

    setInvalidInputs(invalid);
    return invalid.length === 0;
  };

  // Submit marks to API
  const submitMarksToAPI = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Define the CA component mappings
      const componentMappings = {
        'cw': 'CW',      // Class Work
        'hw': 'HW',      // Home Work 
        'org': 'ORG',    // Organization
        'spart': 'SPART', // Student Participation
        'smgt': 'SMGT'   // Student Management
      };
      
      const componentLabels = {
        'cw': 'Class Work',
        'hw': 'Home Work',
        'org': 'Organization',
        'spart': 'Student Participation',
        'smgt': 'Student Management'
      };

      // Filter out components with non-zero values
      const componentsToSubmit = Object.keys(componentMappings).filter(component => 
        students.some(student => student[component as FieldName] > 0)
      );

      // If no components have marks, show a message and return
      if (componentsToSubmit.length === 0) {
        setError("No marks to submit. Please enter marks for at least one component.");
        setIsSubmitting(false);
        return;
      }
      
      setSubmissionProgress(`Processing ${componentsToSubmit.length} components...`);
      
      const successfulComponents: string[] = [];
      const failedComponents: string[] = [];
      
      // Process each component sequentially
      for (const component of componentsToSubmit) {
        try {
          setSubmissionProgress(`Processing: ${componentLabels[component as keyof typeof componentLabels]}...`);
          
          // Get all students with non-zero marks for this component
          const studentsWithMarks = students.filter(student => 
            student[component as FieldName] > 0
          );
          
          // Format marks for submission
          const formattedMarks = studentsWithMarks.map(student => ({
            studentId: student.id,
            mark: student[component as FieldName].toString()
          }));
          
          // Prepare the payload
          const payload: MarksPayload = {
            marks: formattedMarks,
            subjectId,
            examSetId,
            academicYearId,
            termId,
            classId,
            assessmentType: 'CA',
            caComponent: componentMappings[component as keyof typeof componentMappings]
          };
          
          // Submit the marks
          const response = await fetch(`${baseUrl}/marks/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
          });
          
          const data = await response.json();
          
          if (data.status?.returnCode === "00") {
            successfulComponents.push(component);
          } else {
            // Try once more if the first attempt failed
            setSubmissionProgress(`Retrying: ${componentLabels[component as keyof typeof componentLabels]}...`);
            
            // Add a small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const retryResponse = await fetch(`${baseUrl}/marks/submit`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload)
            });
            
            const retryData = await retryResponse.json();
            
            if (retryData.status?.returnCode === "00") {
              successfulComponents.push(component);
            } else {
              failedComponents.push(component);
              console.error(`Failed to submit ${component} after retry:`, retryData.status?.returnMessage);
            }
          }
        } catch (error) {
          failedComponents.push(component);
          console.error(`Error submitting ${component}:`, error);
        }
      }
      
      // Final status report
      if (failedComponents.length === 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        // Format the failed components
        const failedComponentLabels = failedComponents.map(
          comp => componentLabels[comp as keyof typeof componentLabels]
        ).join(', ');
        
        throw new Error(
          `Successfully submitted ${successfulComponents.length} components. ` + 
          `Failed to submit: ${failedComponentLabels}`
        );
      }
    } catch (error) {
      console.error("Error submitting marks:", error);
      setError((error as Error).message || "An error occurred while submitting marks");
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress('');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateInputs()) {
      await submitMarksToAPI();
    } else {
      setError(`Please ensure all fields have marks between 0 and ${MAX_MARK}.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
      </div>
    );
  }

  if (!selectedClass || !selectedSubject || !year || !term) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-4xl mx-auto mt-8">
        <p>Missing required parameters. Please return to the previous page and try again.</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-4xl mx-auto mt-8">
        <p>No students found for the selected class.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-indigo-900 text-white p-4 mb-6 rounded-t-lg">
        <h1 className="text-xl font-bold text-center">
          Add Marks {selectedClass} CA {year} {term} {selectedSubject}
        </h1>
        <p className="text-center text-sm mt-1">Continuous Assessment Marks Entry Form</p>
      </div>
      
      <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded mb-4">
        <p className="font-medium">Note: Maximum mark for each component is {MAX_MARK} points.</p>
      </div>
      
      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Marks submitted successfully!
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {submissionProgress && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
          <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-blue-700 rounded-full"></div>
          {submissionProgress}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 w-12">S#</th>
                <th className="border px-4 py-2 text-left">Student Name</th>
                <th className="border px-4 py-2 w-20" title="Class Work Subject">C/W</th>
                <th className="border px-4 py-2 w-20" title="Home Work Subject">H/W</th>
                <th className="border px-4 py-2 w-20" title="Organization Subject">ORG</th>
                <th className="border px-4 py-2 w-20" title="Student Participation">S.PART</th>
                <th className="border px-4 py-2 w-20" title="Student Management">S.MGT</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 text-center">{index + 1}</td>
                  <td className="border px-4 py-2 text-blue-700 font-medium">
                    {`${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim()}
                  </td>
                  {(['cw', 'hw', 'org', 'spart', 'smgt'] as FieldName[]).map((field) => (
                    <td key={`${student.id}-${field}`} className="border px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        max={MAX_MARK}
                        value={student[field]}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(student.id, field, e.target.value)}
                        className={`w-full p-2 border rounded text-center ${
                          invalidInputs.some(item => item.studentId === student.id && item.field === field) 
                            ? 'border-red-500' 
                            : ''
                        }`}
                      />
                      {student[field] > MAX_MARK && (
                        <p className="text-red-500 text-xs mt-1">Max {MAX_MARK}</p>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Total Students Remark */}
        <div className="bg-gray-100 p-3 my-4 rounded border text-right">
          <span className="font-semibold">Total Students: {students.length}</span>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                Submitting...
              </span>
            ) : 'Submit Marks'}
          </button>
        </div>
      </form>
    </div>
  );
}

const CAMarksPageWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading CA marks form...</p></div>}>
      <CAMarksSubmissionFormView />
    </Suspense>
  );
};

export default CAMarksPageWrapper;