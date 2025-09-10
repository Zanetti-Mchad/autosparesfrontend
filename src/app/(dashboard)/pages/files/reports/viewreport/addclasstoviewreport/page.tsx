"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// import Image from 'next/image'; // Not used, can be removed if not needed for other parts
import { AlertCircle, Check, Download } from "lucide-react";
import { env } from '@/env';

const API_BASE_URL = env.BACKEND_API_URL;

// --- INTERFACE DEFINITIONS ---
interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
  academicYear?: { id: string; year: string; };
}

interface Class {
  id: string;
  name: string;
  isActive: boolean;
}

interface Student {
  id: string;
  studentId?: string; // Some APIs might use studentId
  name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  isHistorical?: boolean;
  classId?: string; // For historical: the class they were in for THIS report's context
  className?: string; // For historical: name of the class for THIS report's context
  class_assigned?: string; // Potentially current class from student record
  gender?: string;
  schoolId?: string; // LIN / Admission Number
  photo?: string;
  // Store original enrollment details if different (e.g., current class if historical report)
  originalClassId?: string;
  originalClassName?: string;
}

interface ExamSet {
  id?: string;
  examSetId?: string;
  examSetType: string;
  termId?: string;
  classId?: string;
  class?: { id: string; };
  term?: { id: string; };
}

interface LoadingState {
  general: boolean;
  years: boolean;
  terms: boolean;
  classes: boolean;
  students: boolean;
  examSets: boolean;
  generate: boolean;
}

// --- UI COMPONENTS ---
const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 border rounded ${className}`}>{children}</div>
);

// --- MAIN COMPONENT ---
const ReportGenerator = () => {
  const router = useRouter();

  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState<LoadingState>({
    general: true, years: false, terms: false, classes: false,
    students: false, examSets: false, generate: false
  });
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedExamSet, setSelectedExamSet] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isHistoricalView, setIsHistoricalView] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'current' | 'historical'>('current');

  // --- UTILITY FUNCTIONS ---
  const getReportTypeCode = useCallback((examSetType: string | undefined): string => {
    if (!examSetType) return 'ALL';
    if (examSetType === 'all') return 'ALL'; // Handle the consolidated report case
    const type = examSetType.toLowerCase();
    if (type.includes('beginning') || type.includes('bot')) return 'BOT';
    if (type.includes('mid')) return 'MID';
    if (type.includes('end') || type.includes('eot')) return 'EOT';
    if (type.includes('continuous') || type.includes('c.a')) return 'CA';
    return 'ALL';
  }, []);

  const getExamSetIdByType = useCallback((examSets: ExamSet[], typeCode: string): string | null => {
    // Find the exam set that matches the type code
    const examSetMatch = examSets.find(set => {
      const type = set.examSetType.toLowerCase();
      
      if (typeCode === 'BOT' && (type.includes('beginning') || type.includes('bot'))) return true;
      if (typeCode === 'MID' && type.includes('mid')) return true;
      if (typeCode === 'EOT' && (type.includes('end') || type.includes('eot'))) return true;
      if (typeCode === 'CA' && (type.includes('continuous') || type.includes('c.a'))) return true;
      
      return false;
    });
    
    return examSetMatch ? (examSetMatch.examSetId || examSetMatch.id || null) : null;
  }, []);

  // --- FETCH FUNCTIONS ---
  const fetchYears = useCallback(async (): Promise<void> => {
    if (!accessToken) return;
    setLoading((prev: LoadingState) => ({ ...prev, years: true }));
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/academic-years/filter`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.years)) {
        const academicYears: AcademicYear[] = data.years.map((year: any) => ({
          id: year.id, year: year.year, isActive: year.isActive
        }));
        setYears(academicYears);
        const activeYear = academicYears.find((y: AcademicYear) => y.isActive);
        if (activeYear) setSelectedYear(activeYear.id);
        else if (academicYears.length > 0) setSelectedYear(academicYears[0].id);
      } else {
        throw new Error(data.message || "Failed to load academic years");
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching years:", error);
      setError(`Failed to load academic years: ${error.message}`);
    } finally {
      setLoading((prev: LoadingState) => ({ ...prev, years: false }));
    }
  }, [accessToken]);

  const fetchTerms = useCallback(async (): Promise<void> => {
    if (!selectedYear || !accessToken) return;
    setLoading((prev: LoadingState) => ({ ...prev, terms: true }));
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/term/filter?academicYearId=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.terms)) {
        setTerms(data.terms);
      } else {
        throw new Error(data.message || "Failed to load terms");
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching terms:", error);
      setError(`Failed to load terms: ${error.message}`);
    } finally {
      setLoading((prev: LoadingState) => ({ ...prev, terms: false }));
    }
  }, [selectedYear, accessToken]);

  const fetchClasses = useCallback(async (): Promise<void> => {
    if (!selectedTerm || !accessToken) return;
    setLoading((prev: LoadingState) => ({ ...prev, classes: true }));
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/classes/filter?termId=${selectedTerm}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.classes)) {
        setClasses(data.classes);
      } else {
        throw new Error(data.message || "Failed to load classes");
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching classes:", error);
      setError(`Failed to load classes: ${error.message}`);
    } finally {
      setLoading((prev: LoadingState) => ({ ...prev, classes: false }));
    }
  }, [selectedTerm, accessToken]);

  const fetchCurrentStudents = useCallback(async (): Promise<boolean> => {
    if (!selectedClass || !accessToken) {
      console.error('Missing required parameters: selectedClass or accessToken');
      return false;
    }
    
    setLoading((prev: LoadingState) => ({ ...prev, students: true }));
    setError('');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/students/filter?classId=${selectedClass}&status=active&pageSize=1000`, 
        {
          headers: { 
            'Authorization': `Bearer ${accessToken}`, 
            'Content-Type': 'application/json' 
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Current students API response:", result);
      
      if (result.status?.returnCode === "00" && Array.isArray(result.data?.students)) {
        const studentsInClass = result.data.students.filter((student: any) =>
          student.classId === selectedClass || 
          student.class_assigned === selectedClass || 
          student.class?.id === selectedClass
        );
        
        console.log(`Found ${studentsInClass.length} current students for class ${selectedClass}`);
        
        // Debug: Log the first student object to see its structure
        if (studentsInClass.length > 0) {
          console.log('Sample current student object from API:', studentsInClass[0]);
          console.log('Available properties:', Object.keys(studentsInClass[0]));
        }
        
        const formattedStudents: Student[] = studentsInClass.map((student: any) => {
          const studentName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim() || 
                            student.name || 'Unnamed Student';
          const classId = student.classId || selectedClass;
          const className = classes.find(c => c.id === classId)?.name || 'Unknown Class';
          
          // Handle different possible ID property names from the API
          const studentId = student.id || student.studentId || student.student_id || student.userId || student.user_id || `temp-${Math.random().toString(36).substr(2, 9)}`;
          
          return {
            id: studentId,
            studentId: student.studentId || studentId,
            name: studentName,
            first_name: student.first_name,
            middle_name: student.middle_name,
            last_name: student.last_name,
            isHistorical: false,
            classId: classId,
            className: className,
            class_assigned: student.class_assigned,
            gender: (student.gender || student.Gender || student.sex || student.Sex || '').toString(),
            schoolId: (student.schoolId || student.school_id || student.lin_number || '').toString(),
            photo: student.student_photo || student.photo || student.profilePhoto || student.avatar || student.image || '',
          };
        });
        
        setStudents(formattedStudents);
        setSelectedStudents(formattedStudents.map((s: Student) => s.id));
        return formattedStudents.length > 0;
      } else {
        throw new Error(result.message || 'No students data returned from API');
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error in fetchCurrentStudents:", error);
      setError(`Failed to load students: ${error.message}`);
      setStudents([]);
      return false;
    } finally {
      setLoading((prev: LoadingState) => ({ ...prev, students: false }));
    }
  }, [selectedClass, accessToken, classes]);

  const fetchHistoricalStudentsWithMarks = useCallback(async (): Promise<boolean> => {
    if (!selectedClass || !selectedTerm || !selectedYear || !accessToken) {
      const errorMsg = 'Missing required parameters for historical students fetch';
      console.error(errorMsg, { selectedClass, selectedTerm, selectedYear, hasToken: !!accessToken });
      setError('Please ensure all required filters are selected');
      return false;
    }
    
    setLoading((prev: LoadingState) => ({ ...prev, students: true }));
    setError('');
    
    try {
      console.log(`Fetching historical students for Class: ${selectedClass}, Term: ${selectedTerm}, Year: ${selectedYear}`);
      
      // First, get available exam sets to determine the examSetId and assessmentType
      const examSetsUrl = `${API_BASE_URL}/api/v1/exams/class-assignments/${selectedClass}?termId=${selectedTerm}`;
      console.log('Fetching exam sets from:', examSetsUrl);
      
      const examSetsResponse = await fetch(examSetsUrl, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (!examSetsResponse.ok) {
        const errorText = await examSetsResponse.text();
        const errorMsg = `Failed to fetch exam sets: HTTP ${examSetsResponse.status} - ${errorText}`;
        console.error(errorMsg);
        setError('Could not load exam data. Please try again.');
        return false;
      }
      
      const examSetsData = await examSetsResponse.json();
      console.log('Exam sets response:', examSetsData);
      
      const availableExamSets: ExamSet[] = Array.isArray(examSetsData.data?.examSets) 
        ? examSetsData.data.examSets 
        : [];
      
      if (availableExamSets.length === 0) {
        const errorMsg = 'No exam sets found for the selected class and term';
        console.warn(errorMsg);
        setError('No exam data available for the selected filters. Please try different criteria.');
        return false;
      }

      // Use the first available exam set ID and its type
      const examSet = availableExamSets[0];
      const examSetId = examSet?.id || examSet?.examSetId || '';
      const assessmentType = examSet?.examSetType || 'ALL';

      if (!examSetId) {
        const errorMsg = 'No valid exam set ID found in the response';
        console.error(errorMsg, { examSet });
        setError('Invalid exam data received. Please try again.');
        return false;
      }

      console.log('Using exam set:', { examSetId, assessmentType, examSet });

      // Build the students API URL with query parameters
      const params = new URLSearchParams({
        classId: selectedClass,
        termId: selectedTerm,
        academicYearId: selectedYear,
        examSetId: examSetId,
        assessmentType: assessmentType
      });
      
      const studentsUrl = `${API_BASE_URL}/api/v1/marks/class-students?${params.toString()}`;
      console.log('Fetching students from:', studentsUrl);

      const studentsResponse = await fetch(studentsUrl, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'Content-Type': 'application/json' 
        }
      });

      if (!studentsResponse.ok) {
        const errorText = await studentsResponse.text();
        const errorMsg = `HTTP error ${studentsResponse.status} fetching students: ${errorText}`;
        console.error(errorMsg);
        setError('Failed to load student data. Please try again.');
        return false;
      }

      const responseData = await studentsResponse.json();
      console.log("Historical students with marks response:", responseData);
      
      if (responseData.status?.returnCode === "00") {
        const students = responseData.data?.students || [];
        const className = classes.find((c: Class) => c.id === selectedClass)?.name || 'Unknown Class';
        
        console.log(`Found ${students.length} students in response`);
        
        const historicalData: Student[] = students
          .filter((student: any) => {
            const isValid = student && (student.id || student.studentId);
            if (!isValid) {
              console.warn('Skipping invalid student record:', student);
            }
            return isValid;
          })
          .map((student: any): Student => ({
            id: student.studentId || student.id || `student-${Math.random().toString(36).substr(2, 9)}`,
            studentId: student.studentId || student.id || '',
            name: student.name || `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim() || 'Unnamed Student',
            first_name: student.first_name || '',
            middle_name: student.middle_name || '',
            last_name: student.last_name || '',
            isHistorical: true,
            classId: selectedClass,
            className: className,
            class_assigned: student.class_assigned || selectedClass,
            originalClassId: student.classId || selectedClass,
            originalClassName: student.className || className,
            gender: (student.gender || '').toString(),
            schoolId: (student.admissionNumber || student.schoolId || student.lin_number || '').toString(),
            photo: student.student_photo || student.photo || student.profilePhoto || student.avatar || student.image || '',
          }));
        
        console.log(`Processed ${historicalData.length} valid student records`);
        
        if (historicalData.length > 0) {
          setStudents(historicalData);
          setSelectedStudents(historicalData.map((s: Student) => s.id));
          return true;
        } else {
          const noStudentsMsg = 'No student records found for the selected criteria';
          console.warn(noStudentsMsg, { 
            classId: selectedClass, 
            termId: selectedTerm, 
            academicYearId: selectedYear,
            examSetId,
            assessmentType
          });
          setError('No student records found. Please try different filters.');
          return false;
        }
      } else {
        const errorMsg = responseData.status?.returnMessage || 'Unexpected response format from server';
        console.error('Invalid response format:', responseData);
        setError('Could not process student data. Please try again.');
        return false;
      }
    } catch (err) {
      const error = err as Error;
      console.error("Unexpected error in fetchHistoricalStudentsWithMarks:", error);
      setError('An unexpected error occurred. Please try again later.');
      return false;
    } finally {
      setLoading((prev: LoadingState) => ({ ...prev, students: false }));
    }
  }, [selectedClass, selectedTerm, selectedYear, accessToken, classes]);

  const fetchStudentsData = useCallback(async (): Promise<void> => {
    if (!selectedClass || !accessToken) {
      setStudents([]);
      setSelectedStudents([]);
      return;
    }

    setLoading(prev => ({ ...prev, students: true }));
    setError('');

    try {
      if (viewMode === 'current') {
        // Fetch current students in class
        const response = await fetch(
          `${API_BASE_URL}/api/v1/students/filter?classId=${selectedClass}&academicYearId=${selectedYear}&status=active&pageSize=1000`, 
          {
            headers: { 
              'Authorization': `Bearer ${accessToken}`, 
              'Content-Type': 'application/json' 
            }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log("Current students API response:", result);
        
        if (result.status?.returnCode === "00" && Array.isArray(result.data?.students)) {
          const studentsInClass = result.data.students.filter((student: any) =>
            student.classId === selectedClass || 
            student.class_assigned === selectedClass || 
            student.class?.id === selectedClass
          );
          
          console.log(`Found ${studentsInClass.length} current students for class ${selectedClass}`);
          
          // Debug: Log the first student object to see its structure
          if (studentsInClass.length > 0) {
            console.log('Sample current student object from API:', studentsInClass[0]);
            console.log('Available properties:', Object.keys(studentsInClass[0]));
          }
          
          const formattedStudents: Student[] = studentsInClass.map((student: any) => {
            const studentName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim() || 
                              student.name || 'Unnamed Student';
            const classId = student.classId || selectedClass;
            const className = classes.find(c => c.id === classId)?.name || 'Unknown Class';
            
            // Handle different possible ID property names from the API
            const studentId = student.id || student.studentId || student.student_id || student.userId || student.user_id || `temp-${Math.random().toString(36).substr(2, 9)}`;
            
            return {
              id: studentId,
              studentId: student.studentId || studentId,
              name: studentName,
              first_name: student.first_name,
              middle_name: student.middle_name,
              last_name: student.last_name,
              isHistorical: false,
              classId: classId,
              className: className,
              class_assigned: student.class_assigned,
              gender: (student.gender || student.Gender || student.sex || student.Sex || '').toString(),
              schoolId: (student.schoolId || student.school_id || student.lin_number || '').toString(),
              photo: student.student_photo || student.photo || student.profilePhoto || student.avatar || student.image || '',
            };
          });
          
          setStudents(formattedStudents);
          setSelectedStudents(formattedStudents.map((s: Student) => s.id));
        } else {
          throw new Error(result.message || 'No students data returned from API');
        }
      } else {
        // Historical view - fetch students with marks
        if (!selectedTerm || !selectedYear || !selectedExamSet) {
          setError('Please select term, year, and exam set to view historical data');
          return;
        }

        // First verify the exam set exists for this term and year
        const examSetResponse = await fetch(
          `${API_BASE_URL}/api/v1/exams/class-assignments/${selectedClass}?termId=${selectedTerm}`,
          {
            headers: { 
              'Authorization': `Bearer ${accessToken}`, 
              'Content-Type': 'application/json' 
            }
          }
        );

        if (!examSetResponse.ok) {
          const errorText = await examSetResponse.text();
          throw new Error(`HTTP error ${examSetResponse.status}: ${errorText}`);
        }

        const examSetData = await examSetResponse.json();
        console.log('Exam sets response:', examSetData);

        if (examSetData.status?.returnCode === "00" && Array.isArray(examSetData.data?.examSets)) {
          // Find the exam set that matches both the ID and type
          const selectedExamSetObj = examSets.find(set => set.id === selectedExamSet || set.examSetId === selectedExamSet);
          if (!selectedExamSetObj) {
            setError('Selected exam set not found');
            return;
          }

          const validExamSet = examSetData.data.examSets.find((set: any) => 
            set.term?.id === selectedTerm &&
            set.term?.academicYear?.id === selectedYear &&
            set.examSetType === selectedExamSetObj.examSetType
          );

          if (!validExamSet) {
            setError(`No valid exam set found for ${selectedExamSetObj.examSetType} in the selected term and year`);
            return;
          }

          // Use the examSetId from the assignment record
          const examSetId = validExamSet.examSetId;
          const assessmentType = getReportTypeCode(validExamSet.examSetType);
          
          console.log('Using exam set:', {
            assignmentId: validExamSet.id,
            examSetId: examSetId,
            type: validExamSet.examSetType,
            assessmentType
          });

          // Now fetch students with marks using the correct exam set ID
          const params = new URLSearchParams({
            classId: selectedClass,
            termId: selectedTerm,
            academicYearId: selectedYear,
            includeHistorical: 'true',
            examSetId: examSetId,
            assessmentType: assessmentType
          });

          console.log('Fetching students with marks for:', {
            classId: selectedClass,
            termId: selectedTerm,
            academicYearId: selectedYear,
            examSetId,
            assessmentType,
            includeHistorical: 'true'
          });

          const response = await fetch(
            `${API_BASE_URL}/api/v1/marks/class-students?${params.toString()}`,
            {
              headers: { 
                'Authorization': `Bearer ${accessToken}`, 
                'Content-Type': 'application/json' 
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          console.log('Historical students response:', result);

          if (result.status?.returnCode === "00") {
            const students = result.data?.students || [];
            console.log(`Found ${students.length} students with marks`);
            
            // Debug: Log the first student object to see its structure
            if (students.length > 0) {
              console.log('Sample student object from API:', students[0]);
              console.log('Available properties:', Object.keys(students[0]));
            }

            if (students.length > 0) {
              const historicalStudents: Student[] = students.map((student: any) => {
                const studentName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim() || 
                                  student.name || 'Unnamed Student';
                const classId = student.classId || selectedClass;
                const className = classes.find(c => c.id === classId)?.name || 'Unknown Class';

                // Handle different possible ID property names from the API
                const studentId = student.id || student.studentId || student.student_id || student.userId || student.user_id || `temp-${Math.random().toString(36).substr(2, 9)}`;

                return {
                  id: studentId,
                  studentId: student.studentId || studentId,
                  name: studentName,
                  first_name: student.first_name,
                  middle_name: student.middle_name,
                  last_name: student.last_name,
                  isHistorical: true,
                  classId: classId,
                  className: className,
                  originalClassId: student.originalClassId || student.classId || selectedClass,
                  originalClassName: student.originalClassName || student.className || className,
                  gender: (student.gender || '').toString(),
                  schoolId: (student.admissionNumber || student.schoolId || student.lin_number || '').toString(),
                  photo: student.student_photo || student.photo || student.profilePhoto || student.avatar || student.image || '',
                  marks: student.marks || []
                };
              });

              setStudents(historicalStudents);
              setSelectedStudents(historicalStudents.map(s => s.id));
            } else {
              throw new Error('No students found with marks for the selected criteria');
            }
          } else {
            throw new Error(result.message || 'Failed to fetch historical data');
          }
        } else {
          throw new Error('Failed to verify exam set validity');
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error in fetchStudentsData:", error);
      setError(`Failed to load student data: ${error.message}`);
      setStudents([]);
      setSelectedStudents([]);
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  }, [selectedClass, selectedTerm, selectedYear, selectedExamSet, accessToken, viewMode, classes, examSets, getReportTypeCode]);

  const fetchExamSets = useCallback(async (): Promise<void> => {
    if (!selectedTerm || !selectedClass || !accessToken) return;
    
    setLoading((prev: LoadingState) => ({ ...prev, examSets: true }));
    setError('');
    setSelectedExamSet('');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/exams/class-assignments/${selectedClass}?termId=${selectedTerm}`,
        { 
          headers: { 
            'Authorization': `Bearer ${accessToken}`, 
            'Content-Type': 'application/json' 
          } 
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Exam sets API response:", data);
      
      if (data.status?.returnCode === "00" && Array.isArray(data.data?.examSets)) {
        const filteredExamSets: ExamSet[] = data.data.examSets.filter((examSet: ExamSet) =>
          (examSet.classId === selectedClass || examSet.class?.id === selectedClass) &&
          (examSet.termId === selectedTerm || examSet.term?.id === selectedTerm)
        );
        
        setExamSets(filteredExamSets);
        
        if (filteredExamSets.length === 0) {
          setError("No exam sets found matching class and term filters.");
        }
      } else {
        setExamSets([]);
        setError(data.message || "No exam sets found for this class and term");
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching exam sets:", error);
      setError(`Failed to load exam sets: ${error.message}`);
    } finally {
      setLoading((prev: LoadingState) => ({ ...prev, examSets: false }));
    }
  }, [selectedTerm, selectedClass, accessToken]);

  // --- EFFECT HOOKS ---
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading((prev: LoadingState) => ({ ...prev, general: false }));
      // router.push('/sign-in'); // Consider uncommenting if immediate redirect is desired
      return;
    }
    setAccessToken(token);

    const fetchInitialSettings = async (): Promise<void> => {
      if (!token) return;
      try {
        // Only fetch academic years initially
        // Terms and classes will be fetched by useEffect hooks when dependencies are ready
        await fetchYears();
      } catch (err) {
        const error = err as Error;
        console.error("Error in fetchInitialSettings:", error);
        setError(`Failed to load initial settings: ${error.message}`);
      } finally {
        setLoading((prev: LoadingState) => ({ ...prev, general: false }));
      }
    };

    fetchInitialSettings();
  }, [accessToken, fetchYears]);

  useEffect(() => { if (accessToken && selectedYear) fetchTerms(); }, [accessToken, selectedYear, fetchTerms]);
  useEffect(() => { if (accessToken && selectedTerm) fetchClasses(); }, [accessToken, selectedTerm, fetchClasses]);
  useEffect(() => { if (accessToken && selectedClass && selectedTerm) fetchExamSets(); }, [accessToken, selectedClass, selectedTerm, fetchExamSets]);
  useEffect(() => { 
    if (selectedClass) {
      fetchStudentsData(); 
    } else { 
      setStudents([]); 
      setSelectedStudents([]);
    }
  }, [selectedClass, fetchStudentsData, viewMode]);

  useEffect(() => {
    if (error) { const timer = setTimeout(() => setError(''), 5000); return () => clearTimeout(timer); }
  }, [error]);
  useEffect(() => {
    if (success) { const timer = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(timer); }
  }, [success]);

  // --- EVENT HANDLERS ---
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) setSelectedStudents(students.map(student => student.id));
    else setSelectedStudents([]);
  };

  const handleGenerate = async () => {
    if (!selectedYear || !selectedTerm || !selectedClass || selectedStudents.length === 0 || !selectedExamSet) {
      setError('Please ensure all fields are selected and at least one student is chosen.'); 
      return;
    }
    
    setLoading(prev => ({ ...prev, generate: true })); 
    setError(''); 
    setSuccess('');
    
    try {
      const isConsolidated = selectedExamSet === 'all';
      const caExamSetId = getExamSetIdByType(examSets, 'CA') || (isConsolidated ? null : selectedExamSet);
      const botExamSetId = getExamSetIdByType(examSets, 'BOT') || (isConsolidated ? null : selectedExamSet);
      const midExamSetId = getExamSetIdByType(examSets, 'MID') || (isConsolidated ? null : selectedExamSet);
      const eotExamSetId = getExamSetIdByType(examSets, 'EOT') || (isConsolidated ? null : selectedExamSet);
      
      let typeParam = 'ALL'; 
      let selectedExamSetObj = null;

      if (!isConsolidated) {
        selectedExamSetObj = examSets.find(set => set.id === selectedExamSet || set.examSetId === selectedExamSet);
        if (!selectedExamSetObj) {
          setError("Selected exam set details not found."); 
          setLoading(prev => ({ ...prev, generate: false })); 
          return;
        }
        typeParam = getReportTypeCode(selectedExamSetObj.examSetType);
      }

      const classObj = classes.find(c => c.id === selectedClass);
      const studentObjectsForSession = students
        .filter(student => selectedStudents.includes(student.id))
        .map(student => ({
          id: student.id,
          name: student.name || `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.trim(),
          first_name: student.first_name, 
          middle_name: student.middle_name, 
          last_name: student.last_name,
          gender: student.gender, 
          photo: student.photo, 
          schoolId: student.schoolId,
          academicYearId: selectedYear, 
          termId: selectedTerm,
          classId: selectedClass, 
          className: classObj?.name || 'Unknown Class',
          examSetId: isConsolidated ? 'all' : selectedExamSet,
          caExamSetId, 
          botExamSetId, 
          midExamSetId, 
          eotExamSetId,
          isHistorical: student.isHistorical || false,
          originalClassId: student.isHistorical ? student.originalClassId : selectedClass,
          originalClassName: student.isHistorical ? student.originalClassName : classObj?.name,
          classInfo: classObj,
        }));

      const yearObj = years.find(y => y.id === selectedYear);
      const termObj = terms.find(t => t.id === selectedTerm);
      const filtersForSession = {
        selectedYear: { id: selectedYear, name: yearObj?.year || '' },
        selectedTerm: { id: selectedTerm, name: termObj?.name || '' },
        selectedClass: { id: selectedClass, name: classObj?.name || '' },
        selectedExamSet: { id: selectedExamSet, name: isConsolidated ? 'All Exam Sets (Consolidated)' : selectedExamSetObj?.examSetType || '' },
        typeParam, 
        caExamSetId, 
        botExamSetId, 
        midExamSetId, 
        eotExamSetId,
        isHistorical: studentObjectsForSession.some(s => s.isHistorical), 
        isConsolidated
      };

      sessionStorage.setItem('report_students', JSON.stringify(studentObjectsForSession));
      sessionStorage.setItem('report_filters', JSON.stringify(filtersForSession));
      setSuccess("Generating report...");

      const queryParams = new URLSearchParams({
        classId: selectedClass, 
        termId: selectedTerm, 
        academicYearId: selectedYear,
        type: typeParam, 
        examSetId: selectedExamSet,
        caExamSetId: caExamSetId || '', 
        botExamSetId: botExamSetId || '',
        midExamSetId: midExamSetId || '', 
        eotExamSetId: eotExamSetId || '',
        consolidated: isConsolidated ? 'true' : 'false',
        historical: studentObjectsForSession.some(s => s.isHistorical) ? 'true' : 'false'
      });
      
      router.push(`/pages/reports/viewreport/combined?${queryParams.toString()}`);
    } catch (err) {
      console.error("Error generating report:", err); 
      setError("Failed to generate report. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, generate: false }));
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-teal-600 text-white p-4 rounded-lg mb-6 text-center">
          <h2 className="text-xl font-semibold">Student Report Card Generator</h2>
        </div>

        {error && (
          <Alert className="mb-6 border-red-400 text-red-600 bg-red-50">
            <div className="flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-400 text-green-600 bg-green-50">
            <div className="flex items-center"><Check className="h-5 w-5 mr-2" />{success}</div>
          </Alert>
        )}

        {/* View Mode Toggle */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">View Mode</label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setViewMode('current')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'current'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Current Year
            </button>
            <button
              type="button"
              onClick={() => setViewMode('historical')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'historical'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Historical Data
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {viewMode === 'current'
              ? 'Viewing students currently in this class'
              : 'Viewing all students with marks for the selected criteria'}
          </p>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">Academic Year</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={loading.years}>
              <option value="">-- Select Year --</option>
              {years.map((year) => (<option key={year.id} value={year.id}>{year.year}</option>))}
            </select>
            {loading.years && <div className="mt-1 text-sm text-gray-500">Loading years...</div>}
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Term</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} disabled={loading.terms || !selectedYear}>
              <option value="">-- Select Term --</option>
              {terms.map((term) => (<option key={term.id} value={term.id}>{term.name}</option>))}
            </select>
            {loading.terms && <div className="mt-1 text-sm text-gray-500">Loading terms...</div>}
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Class</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={loading.classes || !selectedTerm}>
              <option value="">-- Select Class --</option>
              {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
            </select>
            {loading.classes && <div className="mt-1 text-sm text-gray-500">Loading classes...</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">Examination Set</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg" value={selectedExamSet} onChange={(e) => setSelectedExamSet(e.target.value)} disabled={loading.examSets || !selectedClass || !selectedTerm}>
              <option value="">-- Select Exam Set --</option>
              {examSets.map((es) => (<option key={es.id || es.examSetId} value={es.id || es.examSetId || ''}>{es.examSetType}</option>))}
              {examSets.length > 0 && <option value="all">All Exam Sets (Consolidated Report)</option>}
            </select>
            {loading.examSets && <div className="mt-1 text-sm text-gray-500">Loading exam sets...</div>}
            {examSets.length === 0 && selectedClass && selectedTerm && !loading.examSets && !error.includes("exam sets") && (
              <div className="mt-1 text-sm text-yellow-500">No exam sets found. Ensure they are set up for this class and term.</div>
            )}
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Students</label>
            <div className="relative">
              <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center" disabled={loading.students || !selectedClass}>
                <span>
                  {loading.students ? "Loading students..." :
                   selectedStudents.length > 0 ? `${selectedStudents.length} student(s) selected` :
                   students.length === 0 && selectedClass ? "No students for criteria" : "Select students"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 bg-white border border-gray-300 rounded-lg w-full mt-1 max-h-60 overflow-y-auto">
                  {students.length > 0 && (
                    <label className="flex items-center p-2 hover:bg-gray-100">
                      <input type="checkbox" checked={selectedStudents.length === students.length} onChange={handleSelectAll} className="mr-2" />
                      <span className="font-medium">Select All</span>
                    </label>
                  )}
                  <div className="border-t border-gray-200"></div>
                  {students.length === 0 ? (
                    <div className="p-2 text-gray-500 text-center">{loading.students ? "Loading..." : "No students for current filters."}</div>
                  ) : (
                    students.map((student) => (
                      <label key={student.id} className={`flex items-center p-2 hover:bg-gray-100 ${student.isHistorical ? 'opacity-75' : ''}`} title={student.isHistorical ? `Historical (Original class: ${student.originalClassName || 'N/A'})` : 'Current'}>
                        <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleStudentSelect(student.id)} className="mr-2" />
                        <span>
                          {student.name || `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.trim() || 'Unknown'}
                          {student.isHistorical && (<span className="ml-2 text-xs text-gray-500">(Historical)</span>)}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            {loading.students && <div className="mt-1 text-sm text-gray-500">Loading students...</div>}
            {students.length === 0 && selectedClass && !loading.students && (
              <div className="mt-1 text-sm text-blue-600">
                {viewMode === 'current'
                  ? 'No current students found in this class.'
                  : 'No historical records found for the selected criteria.'}
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button onClick={handleGenerate} disabled={loading.generate || !selectedYear || !selectedTerm || !selectedClass || selectedStudents.length === 0 || !selectedExamSet} className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading.generate ? (<><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>Generating...</>) : (<><Download className="h-5 w-5" />Generate Report Card</>)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;