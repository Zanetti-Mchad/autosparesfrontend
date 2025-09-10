"use client";
import React, { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { env } from '@/env';
import { useSearchParams } from 'next/navigation';
import PrintableContent from '@/components/ui/print';

// Define types
type Division = 'I' | 'II' | 'III' | 'IV' | 'U' | 'X';

interface Student {
  id: string;
  originalId: string;
  name: string;
  scores: Record<string, { score: number | null; grade: number | 'X' }>; // Updated grade type
}

interface Mark {
  studentId?: string;
  name?: string;
  mark?: number | string; // Mark from API can be number or string
  grade?: number; // Original grade from API if any, not directly used for our AG
  id?: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface TeacherAssignment {
  id: string;
  userId: string;
  subjectActivityId: string;
  classId: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

const getStringParam = (param: string | null | undefined): string => {
  return param || "";
};

const AnalysisSheetView: React.FC = () => {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [teacherComment, setTeacherComment] = useState<string>("");
  const [isSavingComment, setIsSavingComment] = useState<boolean>(false);
  const [commentSaved, setCommentSaved] = useState<boolean>(false);
  const [classTeacherName, setClassTeacherName] = useState<string>("");
  
  const className = searchParams ? decodeURIComponent(searchParams.get('class') || 'Unknown Class') : 'Unknown Class';
  const examName = searchParams ? decodeURIComponent(searchParams.get('exam') || 'Unknown Exam') : 'Unknown Exam';
  const termName = searchParams ? decodeURIComponent(searchParams.get('term') || 'Unknown Term') : 'Unknown Term';
  const yearName = searchParams ? decodeURIComponent(searchParams.get('year') || 'Unknown Year') : 'Unknown Year';
  
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Process mark values: returns number (0, -1, positive) or null
  const processMarkValue = (inputValue: number | string | undefined | null): number | null => {
    if (inputValue === undefined || inputValue === null) {
        return null;
    }
    if (typeof inputValue === 'number') {
      return inputValue; // Handles 0, -1, and other numbers directly
    }
    // For string marks
    const trimmedMark = inputValue.toString().trim();
    if (trimmedMark === "") {
      return null;
    }
    if (trimmedMark === "-1") {
      return -1; // Explicitly missed
    }
    const parsedMark = parseInt(trimmedMark, 10);
    // If parsing fails (NaN), treat as 0 as per original logic, or null if preferred for "AB" etc.
    // For now, sticking to 0 if NaN, as per prior logic.
    return isNaN(parsedMark) ? 0 : parsedMark;
  };

  // Convert score to grade (AG)
  const convertToGrade = (score: number | null): number | 'X' => {
    if (score === -1) return 'X'; // Missed paper
    if (score === null) return 9; // F9 for null/not entered (but not explicitly -1)
    // For score 0, it will also become F9. This is typical.
    if (score >= 92) return 1; // D1
    if (score >= 80) return 2; // D2
    if (score >= 70) return 3; // C3
    if (score >= 60) return 4; // C4
    if (score >= 55) return 5; // C5
    if (score >= 50) return 6; // C6
    if (score >= 45) return 7; // P7
    if (score >= 40) return 8; // P8
    return 9; // F9 (for scores 0-39)
  };
  
  const fetchComment = useCallback(async (classId: string, examSetId: string, termId: string, academicYearId: string) => {
    try {
      const commentUrl = `${baseUrl}/analysis-comments/get?classId=${classId}&examSetId=${examSetId}&termId=${termId}&academicYearId=${academicYearId}`;
      const response = await fetch(commentUrl, { headers: getAuthHeaders() });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.comment) {
          setTeacherComment(data.data.comment.text || "");
        }
      } else {
        // console.warn("Failed to fetch comment, proceeding without it.");
      }
    } catch (error) {
      // console.error("Error fetching existing comment:", error);
    }
  }, [baseUrl]); // Added baseUrl to dependency array

  const saveComment = async () => {
    if (!searchParams) return;
    
    const classId = getStringParam(searchParams.get('classId'));
    const termId = getStringParam(searchParams.get('termId'));
    const academicYearId = getStringParam(searchParams.get('academicYearId'));
    const examSetId = getStringParam(searchParams.get('examSetId'));
    
    if (!classId || !termId || !academicYearId || !examSetId) {
      console.warn("Missing required parameters for saving comment");
      return;
    }
    
    setIsSavingComment(true);
    
    try {
      const commentUrl = `${baseUrl}/analysis-comments`;
      const response = await fetch(commentUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          classId,
          examSetId,
          termId,
          academicYearId,
          text: teacherComment
        })
      });
      
      if (response.ok) {
        setCommentSaved(true);
        setTimeout(() => setCommentSaved(false), 3000);
      } else {
        console.error("Failed to save comment:", await response.text());
      }
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsSavingComment(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!searchParams) {
          setIsLoading(false);
          return;
        }

        const classId = getStringParam(searchParams.get('classId'));
        const termId = getStringParam(searchParams.get('termId'));
        const academicYearId = getStringParam(searchParams.get('academicYearId'));
        const examSetId = getStringParam(searchParams.get('examSetId'));
        const urlAssessmentType = getStringParam(searchParams.get('assessmentType')) || 'EOT';
        // Normalize assessment type to canonical values expected by the API
        const lowerAT = urlAssessmentType.toLowerCase();
        const normalizedAssessmentType = lowerAT.includes('mid') ? 'MID'
          : (lowerAT.includes('end') || lowerAT.includes('eot')) ? 'EOT'
          : (lowerAT.includes('beg') || lowerAT.includes('bot')) ? 'BOT'
          : lowerAT.includes('test') ? 'TEST'
          : (['MID','EOT','BOT','TEST'].includes(urlAssessmentType.toUpperCase()) ? urlAssessmentType.toUpperCase() : 'EOT');

        if (!classId || !termId || !academicYearId || !examSetId) {
          setError("Missing required parameters in URL.");
          setIsLoading(false);
          return;
        }

        await fetchComment(classId, examSetId, termId, academicYearId);

        // Fetch subjects assigned to this class directly and map nested subjectActivity
        const classSubjectsUrl = `${baseUrl}/class-subject-assignments/class/${classId}`;
        const classSubRes = await fetch(classSubjectsUrl, { headers: getAuthHeaders() });
        if (!classSubRes.ok) throw new Error(`Subjects for class fetch failed: ${classSubRes.status}`);
        const classSubData = await classSubRes.json();
        let assignedSubjects: Subject[] = [];
        if (classSubData.status?.returnCode === '00' && Array.isArray(classSubData.data?.assignments)) {
          const rawSubjects = classSubData.data.assignments
            .map((a: any) => a.subjectActivity)
            .filter((sa: any) => sa && sa.id && sa.name);
          const unique = new Map<string, Subject>();
          rawSubjects.forEach((sa: any) => {
            const s: Subject = { id: sa.id, code: sa.code || sa.name.substring(0,3).toUpperCase(), name: sa.name };
            if (!unique.has(s.id)) unique.set(s.id, s);
          });
          assignedSubjects = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
        }
        setSubjects(assignedSubjects);

        const studentsMap = new Map<string, Student>();

        for (const subject of assignedSubjects) {
          const url = `${baseUrl}/marks/get?subjectId=${subject.id}&classId=${classId}&termId=${termId}&academicYearId=${academicYearId}&examSetId=${examSetId}&assessmentType=${normalizedAssessmentType}`;
          
          try {
            const marksResponse = await fetch(url, { headers: getAuthHeaders() });
            if (!marksResponse.ok) {
              console.warn(`Marks fetch failed for ${subject.name}: ${marksResponse.status}`);
              continue;
            }

            const marksData = await marksResponse.json();
            if (marksData.data?.marks) {
              const marks = Array.isArray(marksData.data.marks) ? marksData.data.marks : [marksData.data.marks];

              marks.forEach((markEntry: Mark) => { // Renamed `mark` to `markEntry` to avoid conflict
                const studentId = String(markEntry.studentId || markEntry.id || "");
                const studentName = markEntry.name || "Unknown Student";

                if (!studentsMap.has(studentId)) {
                  studentsMap.set(studentId, {
                    id: studentId,
                    originalId: studentId, // Assuming originalId is same as id here
                    name: studentName,
                    scores: {}
                  });
                }

                const student = studentsMap.get(studentId);
                if (student) {
                  const processedScore = processMarkValue(markEntry.mark); // Use markEntry.mark
                  const grade = convertToGrade(processedScore);
                  
                  student.scores[subject.code] = {
                    score: processedScore, // Store the processed score (can be null, -1, 0, etc.)
                    grade: grade
                  };
                }
              });
            }
          } catch (error) {
            console.error(`Error processing marks for ${subject.name}:`, error);
          }
        }
        setStudents(Array.from(studentsMap.values()));

        if (classId) {
          try {
            // Fetch teacher subject assignments
            const teacherAssignmentsUrl = `${baseUrl}/teacher-subject-assignments/assignments?classId=${classId}`;
            const teacherAssignmentsResponse = await fetch(teacherAssignmentsUrl, { headers: getAuthHeaders() });
            
            if (teacherAssignmentsResponse.ok) {
              const teacherAssignmentsData = await teacherAssignmentsResponse.json();
              let assignments = [];
              if (teacherAssignmentsData?.data?.assignments) assignments = teacherAssignmentsData.data.assignments;
              else if (teacherAssignmentsData?.assignments) assignments = teacherAssignmentsData.assignments;
              else if (Array.isArray(teacherAssignmentsData)) assignments = teacherAssignmentsData;
              setTeacherAssignments(assignments);
            }
            
            // Fetch class teacher assignments
            try {
              const classTeacherUrl = `${baseUrl}/class-teachers/create?page=1&pageSize=100`;
              const classTeacherResponse = await fetch(classTeacherUrl, { headers: getAuthHeaders() });
              
              if (classTeacherResponse.ok) {
                const assignmentsData = await classTeacherResponse.json();
                console.log("Class teacher assignments data:", assignmentsData);
                
                // Try to extract assignments from different possible response formats
                let assignmentsList = [];
                if (assignmentsData?.data?.assignments && Array.isArray(assignmentsData.data.assignments)) {
                  assignmentsList = assignmentsData.data.assignments;
                } else if (assignmentsData?.assignments && Array.isArray(assignmentsData.assignments)) {
                  assignmentsList = assignmentsData.assignments;
                } else if (Array.isArray(assignmentsData)) {
                  assignmentsList = assignmentsData;
                } else if (assignmentsData?.data && Array.isArray(assignmentsData.data)) {
                  assignmentsList = assignmentsData.data;
                } else if (assignmentsData?.classTeacherAssignments && Array.isArray(assignmentsData.classTeacherAssignments)) {
                  assignmentsList = assignmentsData.classTeacherAssignments;
                } else if (assignmentsData?.data?.classTeacherAssignments && Array.isArray(assignmentsData.data.classTeacherAssignments)) {
                  assignmentsList = assignmentsData.data.classTeacherAssignments;
                }
                
                console.log("Processed assignments list:", assignmentsList);
                
                // Find the main class teacher for this class
                const mainTeacher = assignmentsList.find((assignment: any) => 
                  assignment.classId === classId && 
                  assignment.isMainTeacher === true
                );
                
                // If no main teacher, get any teacher for this class
                const anyTeacher = !mainTeacher ? assignmentsList.find((assignment: any) => 
                  assignment.classId === classId
                ) : null;
                
                const assignment = mainTeacher || anyTeacher;
                
                if (assignment) {
                  console.log("Found class teacher assignment:", assignment);
                  
                  // Extract teacher info from the assignment
                  let teacher = null;
                  if (assignment.user) {
                    teacher = assignment.user;
                  } else if (assignment.teacher) {
                    teacher = assignment.teacher;
                  }
                  
                  if (teacher) {
                    const teacherName = teacher.first_name && teacher.last_name 
                      ? `${teacher.first_name} ${teacher.last_name}`
                      : teacher.name || (teacher.email ? teacher.email.split('@')[0] : "Unknown Teacher");
                    
                    setClassTeacherName(teacherName);
                    console.log("Class teacher found:", teacherName);
                  } else if (assignment.userId) {
                    // If we have a userId but no user object, try to fetch the teacher directly
                    try {
                      const teacherUrl = `${baseUrl}/integration/users/${assignment.userId}`;
                      const teacherResponse = await fetch(teacherUrl, { headers: getAuthHeaders() });
                      
                      if (teacherResponse.ok) {
                        const teacherData = await teacherResponse.json();
                        console.log("Teacher data:", teacherData);
                        
                        const teacherInfo = teacherData?.user || teacherData?.data?.user || teacherData;
                        if (teacherInfo) {
                          const teacherName = teacherInfo.first_name && teacherInfo.last_name 
                            ? `${teacherInfo.first_name} ${teacherInfo.last_name}`
                            : teacherInfo.name || (teacherInfo.email ? teacherInfo.email.split('@')[0] : "Unknown Teacher");
                          
                          setClassTeacherName(teacherName);
                          console.log("Class teacher found from user API:", teacherName);
                        }
                      }
                    } catch (error) {
                      console.error("Error fetching teacher by ID:", error);
                    }
                  }
                } else {
                  console.log("No class teacher assignment found for this class");
                  
                  // Fallback to checking the class data directly
                  try {
                    const classUrl = `${baseUrl}/classes/${classId}`;
                    const classResponse = await fetch(classUrl, { headers: getAuthHeaders() });
                    
                    if (classResponse.ok) {
                      const classData = await classResponse.json();
                      console.log("Class data:", classData);
                      
                      // Try to find class teacher in different possible response formats
                      let teacher = null;
                      
                      if (classData.data?.class?.classTeacher) {
                        teacher = classData.data.class.classTeacher;
                      } else if (classData.class?.classTeacher) {
                        teacher = classData.class.classTeacher;
                      } else if (classData.classTeacher) {
                        teacher = classData.classTeacher;
                      }
                      
                      if (teacher) {
                        const teacherName = teacher.first_name && teacher.last_name 
                          ? `${teacher.first_name} ${teacher.last_name}`
                          : teacher.name || "Unknown Teacher";
                        setClassTeacherName(teacherName);
                        console.log("Class teacher found from class data:", teacherName);
                      }
                    }
                  } catch (error) {
                    console.error("Error fetching class data:", error);
                  }
                }
              }
            } catch (error) {
              console.error("Error fetching class teacher assignments:", error);
            }
          } catch (error) {
            // console.error("Error fetching teacher assignments:", error);
          }
        }
      } catch (err: any) {
        console.error("Comprehensive Error:", err);
        setError(err.message || "Failed to load student marks. Please try again.");
        setStudents([]);
        setSubjects([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams, fetchComment, baseUrl]); // Added baseUrl to dependency array

  const studentsWithTotals = useMemo(() => {
    return students.map(student => {
      let numericTotalAggregate = 0;
      let subjectsAttemptedCount = 0;
      let hasAnyMissedPaper = false;
      let hasAnyScore = false;

      subjects.forEach(subject => {
        const subjectScoreData = student.scores[subject.code];
        if (subjectScoreData) {
          hasAnyScore = true;
          if (subjectScoreData.grade === 'X') {
            hasAnyMissedPaper = true;
          } else if (typeof subjectScoreData.grade === 'number') {
            numericTotalAggregate += subjectScoreData.grade;
            subjectsAttemptedCount++;
          }
        }
      });

      let division: Division = 'U';
      let totalAggregateForDisplay: string | number = '-';

      if (subjectsAttemptedCount > 0) {
        totalAggregateForDisplay = numericTotalAggregate;
        if (numericTotalAggregate <= 12) division = 'I';
        else if (numericTotalAggregate <= 24) division = 'II';
        else if (numericTotalAggregate <= 36) division = 'III';
        else division = 'IV';
        if (hasAnyMissedPaper) division = 'X';
      } else if (hasAnyMissedPaper && subjectsAttemptedCount === 0) {
        totalAggregateForDisplay = 'X';
        division = 'X';
      } else if (!hasAnyScore) {
        totalAggregateForDisplay = '-';
        division = 'U';
      }
      // else: all subjects exist but all grades are null (ungraded), keep default '-'/U

      return {
        ...student,
        totalAggregate: totalAggregateForDisplay,
        division,
      };
    });
  }, [students, subjects]);

  const aggregateAnalysis = useMemo(() => {
    const analysis: Record<number, number> = {};
    for (let i = 4; i <= 36; i++) { // Assuming aggregate totals range up to 36 for this table
      analysis[i] = 0;
    }

    studentsWithTotals.forEach(student => {
      // Only count numeric totals for this specific aggregate distribution table
      if (typeof student.totalAggregate === 'number' && student.totalAggregate > 0) {
        analysis[student.totalAggregate] = (analysis[student.totalAggregate] || 0) + 1;
      }
    });
    return analysis;
  }, [studentsWithTotals]);

  const subjectAnalysis = useMemo(() => {
    const analysis: Record<string, any> = {};
    const subjectTeacherMap: Record<string, string> = {};
    
    teacherAssignments.forEach(assignment => {
      const subject = subjects.find(s => s.id === assignment.subjectActivityId);
      if (subject && assignment.user) {
        const teacherName = `${assignment.user.first_name} ${assignment.user.last_name}`;
        subjectTeacherMap[subject.code] = teacherName;
      }
    });
    
    subjects.forEach(subject => {
      const gradesCount = { D1: 0, D2: 0, C3: 0, C4: 0, C5: 0, C6: 0, P7: 0, P8: 0, F9: 0 };
      let studentsWithNumericGrade = 0;

      students.forEach(student => {
        const grade = student.scores[subject.code]?.grade;
        if (typeof grade === 'number') { // Only count numeric grades (1-9)
          studentsWithNumericGrade++;
          if (grade === 1) gradesCount.D1++;
          else if (grade === 2) gradesCount.D2++;
          else if (grade === 3) gradesCount.C3++;
          else if (grade === 4) gradesCount.C4++;
          else if (grade === 5) gradesCount.C5++;
          else if (grade === 6) gradesCount.C6++;
          else if (grade === 7) gradesCount.P7++;
          else if (grade === 8) gradesCount.P8++;
          else if (grade === 9) gradesCount.F9++;
        }
      });

      const div1Percent = studentsWithNumericGrade > 0 ? (gradesCount.D1 / studentsWithNumericGrade * 100).toFixed(1) : '0.0';
      
      const defaultTeachers: Record<string, string> = { ENG: "N/A", MTC: "N/A", SCI: "N/A", SST: "N/A" };
      const teacherName = subjectTeacherMap[subject.code] || defaultTeachers[subject.code] || "N/A";
      
      analysis[subject.code] = {
        ...gradesCount,
        total: studentsWithNumericGrade, // Total of students with D1-F9 for this subject
        div1Percent,
        teacher: teacherName
      };
    });
    return analysis;
  }, [students, subjects, teacherAssignments]);

  const divisionAnalysis = useMemo(() => {
    const divisionsCount: Record<Division, number> = { I: 0, II: 0, III: 0, IV: 0, U: 0, X: 0 };
    studentsWithTotals.forEach(student => {
      divisionsCount[student.division as Division]++;
    });

    const totalStudents = studentsWithTotals.length;
    // Div 1% can be based on total students, or total students excluding 'X' if preferred
    const div1Percent = totalStudents > 0 ? (divisionsCount.I / totalStudents * 100).toFixed(1) : '0.0';

    return { divisions: divisionsCount, total: totalStudents, div1Percent };
  }, [studentsWithTotals]);

  const user = useMemo(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (e) {
          console.error('Error parsing user data from localStorage:', e);
        }
      }
    }
    return {};
  }, []);
  const userName = user && user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 
                   user && user.name ? user.name : 
                   user && user.email ? user.email.split('@')[0] : 'Unknown User';

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };
  const currentDate = formatDate(new Date());

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="ml-3 text-gray-700">Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-4xl mx-auto mt-8 text-center">
        <p className="font-medium">Error: {error}</p>
        <p className="text-sm mt-2">Please check the URL parameters or your connection and try again.</p>
      </div>
    );
  }
  
  if (students.length === 0 && !isLoading) {
    return (
      <div className="text-center p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">RICH DAD JUNIOR SCHOOL-ENTEBBE ROAD NAJJANANKUMBI</h1>
        <h2 className="text-xl font-bold mb-4">ANALYSIS SHEET</h2>
        <h3 className="text-lg font-bold">EXAM/TEST: {examName} CLASS: {className} TERM: {termName} YEAR: {yearName}</h3>
        <p className="text-gray-600 mt-6 text-lg">No student data found for this selection.</p>
        <p className="text-gray-500 mt-2">Please verify the selected class, exam, term, and year, or check if marks have been entered.</p>
      </div>
    );
  }


  return (
    <PrintableContent title="" className="p-4 sm:p-6 max-w-7xl mx-auto bg-white shadow-lg rounded-md print:shadow-none print:bg-transparent">
      <div className="text-center mb-6 print:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 print:text-lg">RICH DAD JUNIOR SCHOOL-ENTEBBE ROAD NAJJANANKUMBI</h1>
        <h2 className="text-lg sm:text-xl font-bold mb-2 print:text-base">ANALYSIS SHEET</h2>
        <h3 className="text-base sm:text-lg font-semibold print:text-sm">EXAM/TEST: {examName} CLASS: {className} TERM: {termName} YEAR: {yearName}</h3>
      </div>

      <div className="mb-6 print:mb-3">
        <h3 className="text-md sm:text-lg font-bold mb-2 print:text-base border-b pb-1 border-gray-300">SUBJECT ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border p-1 sm:p-2 border-gray-400">SUBJECT</th>
                <th className="border p-1 sm:p-2 border-gray-400">TARGET</th>
                <th className="border p-1 sm:p-2 border-gray-400">D1</th>
                <th className="border p-1 sm:p-2 border-gray-400">D2</th>
                <th className="border p-1 sm:p-2 border-gray-400">C3</th>
                <th className="border p-1 sm:p-2 border-gray-400">C4</th>
                <th className="border p-1 sm:p-2 border-gray-400">C5</th>
                <th className="border p-1 sm:p-2 border-gray-400">C6</th>
                <th className="border p-1 sm:p-2 border-gray-400">P7</th>
                <th className="border p-1 sm:p-2 border-gray-400">P8</th>
                <th className="border p-1 sm:p-2 border-gray-400">F9</th>
                <th className="border p-1 sm:p-2 border-gray-400">TOT.</th>
                <th className="border p-1 sm:p-2 border-gray-400">NAME OF TR.</th>
                <th className="border p-1 sm:p-2 border-gray-400">DIV 1%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(subjectAnalysis).map(([subjectCode, analysisData]) => (
                <tr key={subjectCode}>
                  <td className="border p-1 sm:p-2 font-bold border-gray-400">{subjectCode.toUpperCase()}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">100%</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.D1}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.D2}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.C3}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.C4}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.C5}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.C6}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.P7}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.P8}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.F9}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.total}</td>
                  <td className="border p-1 sm:p-2 border-gray-400">{analysisData.teacher}</td>
                  <td className="border p-1 sm:p-2 border-gray-400 text-center">{analysisData.div1Percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 print:mb-3">
        <h3 className="text-md sm:text-lg font-bold mb-2 print:text-base border-b pb-1 border-gray-300">AGGREGATE ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 mb-2 text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border p-1 sm:p-2 border-gray-400">AGG.</th>
                {Array.from({ length: 16 }, (_, i) => i + 4).map(num => (
                  <th key={num} className="border p-1 sm:p-2 border-gray-400">{num}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-1 sm:p-2 font-bold border-gray-400">NO.</td>
                {Array.from({ length: 16 }, (_, i) => i + 4).map(num => (
                  <td key={num} className="border p-1 sm:p-2 border-gray-400 text-center">{aggregateAnalysis[num] || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                {/* AGG. header for the second row can be implicit or added if needed */}
                {Array.from({ length: 17 }, (_, i) => i + 20).map(num => ( // Starts from 20 up to 36
                  <th key={num} className="border p-1 sm:p-2 border-gray-400">{num}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Array.from({ length: 17 }, (_, i) => i + 20).map(num => (
                  <td key={num} className="border p-1 sm:p-2 border-gray-400 text-center">{aggregateAnalysis[num] || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 print:mb-3">
        <h3 className="text-md sm:text-lg font-bold mb-2 print:text-base border-b pb-1 border-gray-300">DIVISION ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border p-1 sm:p-2 border-gray-400">DIVISION</th>
                <th className="border p-1 sm:p-2 border-gray-400">I</th>
                <th className="border p-1 sm:p-2 border-gray-400">II</th>
                <th className="border p-1 sm:p-2 border-gray-400">III</th>
                <th className="border p-1 sm:p-2 border-gray-400">IV</th>
                <th className="border p-1 sm:p-2 border-gray-400">U</th>
                <th className="border p-1 sm:p-2 border-gray-400">X</th>
                <th className="border p-1 sm:p-2 border-gray-400">TOTAL</th>
                <th className="border p-1 sm:p-2 border-gray-400">DIV.1 %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-1 sm:p-2 font-bold border-gray-400">NO.</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.divisions.I}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.divisions.II}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.divisions.III}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.divisions.IV}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.divisions.U}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.divisions.X}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.total}</td>
                <td className="border p-1 sm:p-2 border-gray-400 text-center">{divisionAnalysis.div1Percent}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 print:mb-3">
        <h3 className="text-md sm:text-lg font-bold mb-2 print:text-base border-b pb-1 border-gray-300">STUDENT PERFORMANCE DETAILS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border p-1 sm:p-2 border-gray-400">NO</th>
                <th className="border p-1 sm:p-2 border-gray-400 text-left">NAME</th>
                {subjects.map(subject => (
                  <React.Fragment key={subject.code}>
                    <th className="border p-1 sm:p-2 border-gray-400">{subject.code.toUpperCase()}</th>
                    <th className="border p-1 sm:p-2 border-gray-400">AG</th>
                  </React.Fragment>
                ))}
                <th className="border p-1 sm:p-2 border-gray-400">TOT</th>
                <th className="border p-1 sm:p-2 border-gray-400">DIV</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithTotals.map((student, index) => {
                return (
                  <tr key={student.id} className={index % 2 === 0 ? 'bg-gray-50 print:bg-transparent' : 'bg-white print:bg-transparent'}>
                    <td className="border p-1 sm:p-2 border-gray-400 text-center">{index + 1}</td>
                    <td className="border p-1 sm:p-2 border-gray-400 text-left">{student.name}</td>
                    {subjects.map(subject => {
                      const scoreData = student.scores[subject.code];
                      let displayScore: string = '-';
                      if (scoreData) { // Check if scoreData exists for the subject
                          if (scoreData.score === 0) displayScore = '0';
                          else if (scoreData.score === -1) displayScore = '-';
                          else if (scoreData.score !== null && scoreData.score !== undefined) displayScore = String(scoreData.score);
                          // If scoreData.score is null (and not 0 or -1), displayScore remains '-'
                      }
                      const displayGrade: string | number = scoreData ? scoreData.grade : '-';

                      return (
                        <React.Fragment key={`${student.id}-${subject.code}`}>
                          <td className="border p-1 sm:p-2 border-gray-400 text-center">
                            {displayScore}
                          </td>
                          <td className="border p-1 sm:p-2 border-gray-400 text-center">
                            {displayGrade}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border p-1 sm:p-2 font-bold border-gray-400 text-center">{student.totalAggregate}</td>
                    <td className="border p-1 sm:p-2 font-bold border-gray-400 text-center">{student.division}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 print:hidden">
        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <p className="font-bold text-md sm:text-lg">CLASS TEACHER&apos;S COMMENT:</p>
            <div className="border p-3 bg-gray-50 rounded">
              <textarea
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="Enter your comment after reviewing the results..."
              ></textarea>
              <div className="flex justify-end mt-2">
                <button
                  onClick={saveComment}
                  disabled={isSavingComment || teacherComment.trim() === ""}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm ${
                    isSavingComment || teacherComment.trim() === ""
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isSavingComment ? "Saving..." : "Save Comment"}
                </button>
              </div>
              {commentSaved && (
                <div className="mt-2 text-green-600 font-medium text-xs sm:text-sm">
                  Comment saved successfully!
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 font-bold text-xs sm:text-sm">
            <span>CLASS TEACHER: {classTeacherName || "Not Assigned"}</span>
            <span>SIGNATURE: ...................................</span>
            <span>DATE: {currentDate}</span>
          </div>
        </div>
      </div>
      
      {/* Comment section for printing - only if teacherComment has value */}
      {teacherComment.trim() !== "" && (
        <div className="mt-4 print:mt-2 hidden print:block">
          <div className="space-y-1">
            <p className="font-bold text-xs">CLASS TEACHER&apos;S COMMENT:</p>
            <p className="text-xs border border-gray-300 p-2 whitespace-pre-wrap">{teacherComment}</p>
          </div>
           <div className="flex items-center gap-4 font-bold text-xs mt-2">
            <span>CLASS TEACHER: {classTeacherName || "Not Assigned"}</span>
            <span>SIGNATURE: ...................................</span>
            <span>DATE: {currentDate}</span>
          </div>
        </div>
      )}

    </PrintableContent>
  );
};

const MarksheetAnalysisPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading marksheet analysis...</p></div>}>
      <AnalysisSheetView />
    </Suspense>
  );
};

export default MarksheetAnalysisPageWrapper;