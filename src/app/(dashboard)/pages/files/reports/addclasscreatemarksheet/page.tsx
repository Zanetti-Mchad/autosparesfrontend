"use client";
import React, { FormEvent, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { env } from '@/env';

interface Class {
  id: string;
  name: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Term {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string;
  terms: Term[];
}

interface ExamSet {
  id: string;
  examSetType: string;
  classId: string;
  termId: string;
}

const MarksheetGeneratorView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API_BASE_URL = env.BACKEND_API_URL;
  const baseUrl = `${API_BASE_URL}/api/v1`;
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [examTypes, setExamTypes] = useState<{id: string, label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [filteredExamTypes, setFilteredExamTypes] = useState<{id: string, label: string, value: string}[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [error, setError] = useState<string>("");
  const [teacherAssignedSubjects, setTeacherAssignedSubjects] = useState<Subject[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);

  // Fetch user data and teacher's subjects
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (user.role === 'teacher' && user.id) {
          setIsTeacher(true);
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
          
          const response = await fetch(
            `${baseUrl}/teacher-subject-assignments/assignments?userId=${user.id}`,
            { headers }
          );
          
          const data = await response.json();
          if (data.status?.returnCode === "00" && Array.isArray(data.data?.assignments)) {
            const subjectsMap = new Map();
            data.data.assignments.forEach((assignment: any) => {
              if (assignment.subjectActivity) {
                subjectsMap.set(assignment.subjectActivity.id, assignment.subjectActivity);
              }
            });
            setTeacherAssignedSubjects(Array.from(subjectsMap.values()));
          }
        }
      } catch (error) {
        console.error("Error fetching teacher's subjects:", error);
      }
    };

    fetchUserData();
  }, [baseUrl]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
        
        const [classesResponse, subjectsResponse, yearsResponse] = await Promise.all([
          fetch(`${baseUrl}/classes/filter?limit=100`, { headers }),
          fetch(`${baseUrl}/subjects/filter?limit=100`, { headers }),
          fetch(`${baseUrl}/academic-years/filter`, { headers })
        ]);
        
        const classesData = await classesResponse.json();
        const subjectsData = await subjectsResponse.json();
        const yearsData = await yearsResponse.json();
        
        const defaultExamTypes = [
          { id: 'MID', label: 'MID TERM', value: 'Mid Term' },
          { id: 'END', label: 'END OF TERM', value: 'End Of Term (EOT)' },
          { id: 'CA', label: 'CONTINUOUS ASSESSMENT', value: 'Continuous Assessment (C.A)' },
          { id: 'BOT', label: 'BEGINNING OF TERM', value: 'Beginning Of Term (BOT)' }
        ];
        
        setExamTypes(defaultExamTypes);
        setClasses(classesData.classes || []);
        setAllSubjects(subjectsData.subjects || []);
        setAcademicYears(yearsData.years || []);
        
        if (yearsData.years?.length > 0) {
          const latestYear = yearsData.years[0];
          setSelectedYear(latestYear.year);
          
          if (latestYear.terms?.length > 0) {
            setTerms(latestYear.terms);
            setSelectedTerm(latestYear.terms[0].name);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [baseUrl]);

  // Fetch subjects when class is selected
  useEffect(() => {
    const fetchClassSubjects = async () => {
      if (!selectedClass) {
        setClassSubjects([]);
        return;
      }

      setIsLoadingSubjects(true);
      setError('');

      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };

        const selectedClassObj = classes.find(cls => cls.name === selectedClass);
        if (!selectedClassObj) {
          setClassSubjects([]);
          setIsLoadingSubjects(false);
          return;
        }

        const assignmentsResponse = await fetch(
          `${baseUrl}/class-subject-assignments/assignments?classId=${selectedClassObj.id}`, 
          { headers }
        );
        
        const assignmentsData = await assignmentsResponse.json();
        let assignments = [];
        
        if (assignmentsData?.data?.assignments) {
          assignments = assignmentsData.data.assignments;
        } else if (assignmentsData?.assignments) {
          assignments = assignmentsData.assignments;
        } else if (Array.isArray(assignmentsData)) {
          assignments = assignmentsData;
        } else if (assignmentsData?.data) {
          assignments = assignmentsData.data;
        }

        if (assignments.length > 0) {
          const subjectIds = assignments.map((a: any) => a.subjectActivityId);
          let filteredSubjects = allSubjects.filter(s => subjectIds.includes(s.id));
          
          if (isTeacher && teacherAssignedSubjects.length > 0) {
            const teacherSubjectIds = new Set(teacherAssignedSubjects.map(s => s.id));
            filteredSubjects = filteredSubjects.filter(s => teacherSubjectIds.has(s.id));
          }
          
          setClassSubjects(filteredSubjects);
        } else {
          setClassSubjects([]);
          setError(`No subjects have been assigned to ${selectedClass} yet.`);
        }
      } catch (error) {
        console.error("Error fetching class subjects:", error);
        setError("Error loading subjects. Please try again.");
        setClassSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchClassSubjects();
  }, [selectedClass, classes, baseUrl, allSubjects, isTeacher, teacherAssignedSubjects]);

  // Fetch exam sets when class, year, or term changes
  useEffect(() => {
    const fetchExamSets = async () => {
      if (!selectedClass || !selectedYear || !selectedTerm) return;

      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };

        const selectedClassObj = classes.find(cls => cls.name === selectedClass);
        if (!selectedClassObj) return;

        const examSetsResponse = await fetch(
          `${baseUrl}/exams/class-assignments/${selectedClassObj.id}`, 
          { headers }
        );
        const examSetsData = await examSetsResponse.json();

        if (examSetsData.status?.returnCode === "00" && examSetsData.data?.examSets) {
          setExamSets(examSetsData.data.examSets);
          
          const assignedExamTypes = examSetsData.data.examSets.map((set: ExamSet) => set.examSetType);
          const filteredTypes = examTypes.filter(type => 
            assignedExamTypes.includes(type.value)
          );
          setFilteredExamTypes(filteredTypes);
        } else {
          setExamSets([]);
          setFilteredExamTypes([]);
        }
      } catch (error) {
        console.error("Error fetching exam sets:", error);
      }
    };

    fetchExamSets();
  }, [selectedClass, selectedYear, selectedTerm, classes, baseUrl, examTypes]);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
  };

  const getExamSetIdByType = (examSets: any[], examValue: string, termId: string | undefined) => {
    if (!examValue || !termId) return undefined;
    const value = examValue.toLowerCase();
    const found = examSets.find(set => {
      const type = set.examSetType.toLowerCase();
      return (
        set.termId === termId && (
          (value.includes('beginning') || value.includes('bot')) && (type.includes('beginning') || type.includes('bot')) ||
          (value.includes('mid')) && type.includes('mid') ||
          (value.includes('end') || value.includes('eot')) && (type.includes('end') || type.includes('eot')) ||
          (value.includes('continuous') || value.includes('c.a')) && (type.includes('continuous') || type.includes('c.a'))
        )
      );
    });
    return found?.examSetId || found?.id;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const classValue = (form.elements.namedItem('class') as HTMLSelectElement).value;
    const subjectValue = (form.elements.namedItem('subject') as HTMLSelectElement).value;
    const examValue = (form.elements.namedItem('exam') as HTMLSelectElement).value;
    const yearValue = (form.elements.namedItem('year') as HTMLInputElement).value;
    const termValue = (form.elements.namedItem('term') as HTMLInputElement).value;

    const selectedTermObj = terms.find(term => term.name === termValue);
    const selectedTermId = selectedTermObj?.id;

    if (examValue === "Continuous Assessment (C.A)") {
      router.push(`/pages/reports/marksheet/ca?class=${encodeURIComponent(classValue)}&subject=${encodeURIComponent(subjectValue)}&exam=${encodeURIComponent(examValue)}&year=${encodeURIComponent(yearValue)}&term=${encodeURIComponent(termValue)}`);
    } else {
      const examSetId = getExamSetIdByType(examSets, examValue, selectedTermId);
      router.push(`/pages/reports/marksheet/createmarksheet?class=${encodeURIComponent(classValue)}&subject=${encodeURIComponent(subjectValue)}&exam=${encodeURIComponent(examValue)}&year=${encodeURIComponent(yearValue)}&term=${encodeURIComponent(termValue)}&examSetId=${examSetId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen pt-8">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-center text-gray-800 mb-4">
          Add Options to Generate Marksheet
        </h2>
        <div className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input 
                  type="text"
                  id="year" 
                  name="year"
                  value={selectedYear}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-600 cursor-not-allowed text-center"
                />
              </div>
              <div>
                <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
                  Term
                </label>
                <input 
                  type="text"
                  id="term" 
                  name="term"
                  value={selectedTerm}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-600 cursor-not-allowed text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select 
                  id="class" 
                  name="class"
                  value={selectedClass}
                  onChange={handleClassChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                  required
                >
                  <option value="" disabled>Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select 
                  id="subject" 
                  name="subject"
                  defaultValue=""
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                  required
                  disabled={isLoadingSubjects || !selectedClass || classSubjects.length === 0}
                >
                  <option value="" disabled>
                    {isLoadingSubjects 
                      ? "Loading subjects..." 
                      : !selectedClass 
                        ? "Select a class first" 
                        : classSubjects.length === 0 
                          ? "No subjects available" 
                          : "Select Subject"
                    }
                  </option>
                  {classSubjects.map(subject => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {isLoadingSubjects && (
                  <div className="mt-1 flex justify-center">
                    <div className="animate-spin h-4 w-4 border-2 border-green-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded shadow-md">
                <p>{error}</p>
                {error.includes("No subjects") && (
                  <div className="mt-2">
                    <a 
                      href="/pages/classroommanagement/assignsubjecttoclass" 
                      className="text-sm font-medium text-green-600 hover:text-green-500"
                    >
                      Go to Assign Subjects →
                    </a>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-1">
                Exam
              </label>
              <select 
                id="exam" 
                name="exam"
                defaultValue=""
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                required
                disabled={filteredExamTypes.length === 0 || !selectedClass}
              >
                <option value="" disabled>
                  {!selectedClass 
                    ? "Select a class first"
                    : filteredExamTypes.length === 0 
                      ? "No exam sets assigned" 
                      : "Select Exam Type"
                  }
                </option>
                {filteredExamTypes.map(exam => (
                  <option key={exam.id} value={exam.value}>
                    {exam.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={filteredExamTypes.length === 0 || classSubjects.length === 0 || !selectedClass}
                className={`w-full py-2 rounded-md shadow ${
                  filteredExamTypes.length === 0 || classSubjects.length === 0 || !selectedClass
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500'
                }`}
              >
                Proceed &raquo;
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AddClassCreateMarksheetPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading marksheet generator...</p></div>}>
      <MarksheetGeneratorView />
    </Suspense>
  );
};

export default AddClassCreateMarksheetPageWrapper;