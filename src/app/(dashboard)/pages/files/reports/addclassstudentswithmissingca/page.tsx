
"use client";
import React, { FormEvent, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/env';

interface Class {
  id: string;
  name: string;
  section: string;
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
  examSetId?: string; 
  examSetType: string; 
  classId: string;
  termId: string;
}

interface Subject { // Added Subject interface
  id: string;
  name: string;
  code?: string;
}

const MarksheetGenerator: React.FC = () => {
  const router = useRouter();
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]); // State for subjects
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [filteredExamTypes, setFilteredExamTypes] = useState<{id: string, label: string, value: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(true); // General initial loading
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);
  const [isFetchingExams, setIsFetchingExams] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>(""); // State for selected subject name
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(""); // State for selected subject ID
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [error, setError] = useState<string>("");

  const examTypes = useMemo(() => [
    { id: 'BOT', label: 'BEGINNING OF TERM', value: 'Beginning Of Term (BOT)' },
    { id: 'MID', label: 'MID TERM', value: 'Mid Term' },
    { id: 'EOT', label: 'END OF TERM', value: 'End Of Term (EOT)' },
    { id: 'CA', label: 'CONTINUOUS ASSESSMENT', value: 'Continuous Assessment (C.A)' }
  ], []);

  // Effect for initial data (Classes, Academic Years)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
        
        const [classesRes, yearsRes] = await Promise.all([
          fetch(`${baseUrl}/classes/filter?limit=100`, { headers }),
          fetch(`${baseUrl}/academic-years/filter?includeTerms=true`, { headers })
        ]);

        if (!classesRes.ok) throw new Error(`Failed to fetch classes: ${classesRes.status}`);
        if (!yearsRes.ok) throw new Error(`Failed to fetch academic years: ${yearsRes.status}`);

        const classesData = await classesRes.json();
        const yearsData = await yearsRes.json();
        
        const fetchedClasses = classesData.classes || classesData.data?.classes || [];
        const fetchedAcademicYears = yearsData.academicYears || yearsData.data?.academicYears || yearsData.years || yearsData.data?.years || [];

        setClasses(fetchedClasses);
        setAcademicYears(fetchedAcademicYears);
        
        if (fetchedAcademicYears.length > 0) {
          const latestYear = fetchedAcademicYears[0];
          setSelectedYear(latestYear.year);
          setSelectedAcademicYearId(latestYear.id);
          const yearTerms = latestYear.terms || [];
          setTerms(yearTerms);
          if (yearTerms.length > 0) {
            setSelectedTerm(yearTerms[0].name);
            setSelectedTermId(yearTerms[0].id);
          }
        }
        
        if (fetchedClasses.length > 0) {
          const firstClass = fetchedClasses[0];
          setSelectedClass(firstClass.name);
          setSelectedClassId(firstClass.id);
        }
        
      } catch (err: any) {
        console.error("Error fetching initial data:", err);
        setError(err.message || "Failed to load initial data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [baseUrl]);

  // Effect to fetch Subjects when Class changes
  useEffect(() => {
    const fetchSubjectsForClass = async () => {
      if (!selectedClassId) {
        setSubjects([]);
        setSelectedSubject("");
        setSelectedSubjectId("");
        return;
      }
      setIsFetchingSubjects(true);
      setError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
        const response = await fetch(`${baseUrl}/class-subject-assignments/class/${selectedClassId}`, { headers });

        if (!response.ok) {
          let errorDataMessage = `HTTP error ${response.status}`;
          try {
            const errorData = await response.json();
            errorDataMessage = errorData.message || errorData.error || JSON.stringify(errorData) || errorDataMessage;
          } catch (parseError) { /* ignore if error response is not JSON */ }
          throw new Error(`Failed to fetch subjects for class ${selectedClassId}: ${errorDataMessage}`);
        }

        const data = await response.json();
        console.log(`Raw subjects data for class ${selectedClassId}:`, JSON.stringify(data, null, 2));

        let processedSubjects: Subject[] = [];
        // **** THIS IS THE CRITICAL PART TO ADJUST ****
        if (data.status?.returnCode === "00" && data.data?.assignments && Array.isArray(data.data.assignments)) {
          // The backend returns a list of "assignments".
          // Each "assignment" object has a nested "subjectActivity" object which contains the actual subject details.
          processedSubjects = data.data.assignments.map((asn: any) => {
            if (asn.subjectActivity && asn.subjectActivity.id && asn.subjectActivity.name) {
              return {
                id: asn.subjectActivity.id,       // Use the ID from the nested subjectActivity
                name: asn.subjectActivity.name,   // Use the name from the nested subjectActivity
                code: asn.subjectActivity.code    // Optional: use the code if available
              };
            }
            return null; // If subjectActivity is missing or incomplete, mark for filtering
          }).filter((sub: Subject | null): sub is Subject => sub !== null); // Filter out any nulls from invalid assignments

          // Remove duplicates based on the actual subject ID (which is now asn.subjectActivity.id)
          const uniqueSubjectsMap = new Map<string, Subject>();
          processedSubjects.forEach((sub: Subject) => {
            if (sub.id && !uniqueSubjectsMap.has(sub.id)) { // Ensure sub.id is valid
              uniqueSubjectsMap.set(sub.id, sub);
            }
          });
          processedSubjects = Array.from(uniqueSubjectsMap.values());

        } else {
          // This 'else' block means the structure data.status.returnCode or data.data.assignments was not found.
          console.warn("Subjects API response not in the expected structure (expected data.data.assignments array with status.returnCode '00'):", data);
          // You could set an error or info message here if appropriate
          // setError("Could not parse subject data from the server.");
        }

        setSubjects(processedSubjects);
        if (processedSubjects.length > 0) {
          setSelectedSubject(processedSubjects[0].name);
          setSelectedSubjectId(processedSubjects[0].id);
        } else {
          setSelectedSubject("");
          setSelectedSubjectId("");
          // setError("No subjects found or assigned to this class."); // Consider if this is an error or an info message
        }
      } catch (err: any) {
        console.error("Error in fetchSubjectsForClass:", err);
        setError(err.message || "Failed to load subjects for the selected class.");
        setSubjects([]);
        setSelectedSubject("");
        setSelectedSubjectId("");
      } finally {
        setIsFetchingSubjects(false);
      }
    };

    if (selectedClassId) { // Fetch only if a class is selected
        fetchSubjectsForClass();
    } else {
        setSubjects([]); // Clear subjects if no class is selected
        setSelectedSubject("");
        setSelectedSubjectId("");
    }
  }, [selectedClassId, baseUrl]);


  // Effect to fetch Exam Sets
  useEffect(() => {
    const fetchExamSetsForClassAndTerm = async () => {
      if (!selectedClassId || !selectedTermId || !selectedAcademicYearId) {
        setExamSets([]);
        setFilteredExamTypes([]);
        setSelectedExam("");
        return;
      }
      setIsFetchingExams(true);
      setError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
        const examSetsResponse = await fetch(
          `${baseUrl}/exams/class-assignments/${selectedClassId}?academicYearId=${selectedAcademicYearId}&termId=${selectedTermId}`,
          { headers }
        );

        if (!examSetsResponse.ok) {
             const errorData = await examSetsResponse.text();
             throw new Error(`Failed to fetch exam sets: ${examSetsResponse.status} ${errorData}`);
        }
        const examSetsData = await examSetsResponse.json();

        if (examSetsData.status?.returnCode === "00" && examSetsData.data?.examSets) {
          const fetchedExamSets: ExamSet[] = examSetsData.data.examSets;
          const examSetsForTerm = fetchedExamSets.filter(set => set.termId === selectedTermId);
          setExamSets(examSetsForTerm);
          
          const assignedExamTypeStrings = examSetsForTerm.map(set => set.examSetType.toLowerCase());
          
          const availableExamTypes = examTypes.filter(typeObj => 
            assignedExamTypeStrings.some(assignedType => 
                assignedType === typeObj.value.toLowerCase() || 
                assignedType === typeObj.id.toLowerCase() ||
                typeObj.value.toLowerCase().includes(assignedType) ||
                typeObj.id.toLowerCase().includes(assignedType)
            )
          );
          
          setFilteredExamTypes(availableExamTypes);
          if (availableExamTypes.length > 0) {
            setSelectedExam(availableExamTypes[0].value);
          } else {
            setSelectedExam("");
          }
        } else {
          setExamSets([]);
          setFilteredExamTypes([]);
          setSelectedExam("");
          setError(examSetsData.status?.returnMessage || "No exam sets found. Assign exam sets first.");
        }
      } catch (err: any) {
        console.error("Error fetching exam sets:", err);
        setError(err.message || "Failed to load exam sets.");
      } finally {
        setIsFetchingExams(false);
      }
    };
    fetchExamSetsForClassAndTerm();
  }, [selectedClassId, selectedTermId, selectedAcademicYearId, baseUrl, examTypes]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearValue = e.target.value;
    setSelectedYear(yearValue);
    const academicYearObj = academicYears.find(ay => ay.year === yearValue);
    if (academicYearObj) {
      setSelectedAcademicYearId(academicYearObj.id);
      const yearTerms = academicYearObj.terms || [];
      setTerms(yearTerms);
      if (yearTerms.length > 0) {
        setSelectedTerm(yearTerms[0].name);
        setSelectedTermId(yearTerms[0].id);
      } else {
        setSelectedTerm(""); setSelectedTermId("");
      }
    } else {
      setSelectedAcademicYearId(""); setTerms([]); setSelectedTerm(""); setSelectedTermId("");
    }
    // Reset dependent fields
    setSubjects([]); setSelectedSubject(""); setSelectedSubjectId("");
    setExamSets([]); setFilteredExamTypes([]); setSelectedExam("");
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classNameValue = e.target.value;
    setSelectedClass(classNameValue);
    const classObj = classes.find(c => c.name === classNameValue);
    setSelectedClassId(classObj ? classObj.id : "");
    // Reset dependent fields
    setSubjects([]); setSelectedSubject(""); setSelectedSubjectId("");
    setExamSets([]); setFilteredExamTypes([]); setSelectedExam("");
  };

  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termNameValue = e.target.value;
    setSelectedTerm(termNameValue);
    const termObj = terms.find(t => t.name === termNameValue);
    setSelectedTermId(termObj ? termObj.id : "");
    // Reset dependent fields
    setExamSets([]); setFilteredExamTypes([]); setSelectedExam("");
  };
  
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectNameValue = e.target.value;
    setSelectedSubject(subjectNameValue);
    const subjectObj = subjects.find(s => s.name === subjectNameValue);
    setSelectedSubjectId(subjectObj ? subjectObj.id : "");
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedExam(e.target.value);
  };

  const getExamSetApiIdByType = (currentExamSets: ExamSet[], examValue: string, currentTermId: string): string | undefined => {
    if (!examValue || !currentTermId || !currentExamSets || currentExamSets.length === 0) return undefined;
    const lowerExamValue = examValue.toLowerCase();
    const foundSet = currentExamSets.find(set => {
      if (set.termId !== currentTermId) return false;
      const lowerExamSetType = set.examSetType.toLowerCase();
      const selectedExamTypeObject = examTypes.find(et => et.value === examValue || et.id === examValue.toUpperCase());
      if (selectedExamTypeObject) {
        const lowerSelectedValue = selectedExamTypeObject.value.toLowerCase();
        const lowerSelectedId = selectedExamTypeObject.id.toLowerCase();
        return lowerExamSetType === lowerSelectedValue || lowerExamSetType === lowerSelectedId ||
               (lowerSelectedValue.includes("beginning") && lowerExamSetType.includes("beginning")) ||
               (lowerSelectedValue.includes("mid") && lowerExamSetType.includes("mid")) ||
               (lowerSelectedValue.includes("end") && lowerExamSetType.includes("end")) ||
               (lowerSelectedValue.includes("continuous") && lowerExamSetType.includes("continuous"));
      }
      return lowerExamSetType.includes(lowerExamValue);
    });
    return foundSet?.examSetId || foundSet?.id;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const requiredFields = [
      { value: selectedAcademicYearId, name: "Academic Year" },
      { value: selectedTermId, name: "Term" },
      { value: selectedClassId, name: "Class" },
      { value: selectedSubjectId, name: "Subject" }, // Subject ID is now required
      { value: selectedExam, name: "Exam Type" }
    ];

    const missingFields = requiredFields.filter(field => !field.value);
    if (missingFields.length > 0) {
      setError(`Please select: ${missingFields.map(f => f.name).join(', ')}.`);
      return;
    }

    const apiExamSetId = getExamSetApiIdByType(examSets, selectedExam, selectedTermId);
    if (!apiExamSetId) {
      setError(`Could not find a matching Exam Set ID for "${selectedExam}" in Term "${selectedTerm}". Please check exam assignments or ensure the selected exam type is assigned to this class for the term.`);
      return;
    }

    let assessmentTypeForUrl = '';
    const lowerSelectedExam = selectedExam.toLowerCase();

    // Determine assessmentTypeForUrl based on selectedExam's value or ID
    const examTypeObject = examTypes.find(et => et.value === selectedExam);
    if (examTypeObject) {
        assessmentTypeForUrl = examTypeObject.id; // Use the 'id' (e.g., CA, BOT, MID, EOT)
    } else {
        // Fallback if somehow selectedExam is not in examTypes (should not happen with dropdown)
        if (lowerSelectedExam.includes('continuous') || lowerSelectedExam.includes('c.a')) assessmentTypeForUrl = 'CA';
        else if (lowerSelectedExam.includes('beginning') || lowerSelectedExam.includes('bot')) assessmentTypeForUrl = 'BOT';
        else if (lowerSelectedExam.includes('mid')) assessmentTypeForUrl = 'MID';
        else if (lowerSelectedExam.includes('end') || lowerSelectedExam.includes('eot')) assessmentTypeForUrl = 'EOT';
        else assessmentTypeForUrl = 'EOT'; // Default
    }
    
    const queryParams: Record<string, string> = {
      class: encodeURIComponent(selectedClass),
      subject: encodeURIComponent(selectedSubject), // Add subject name
      exam: encodeURIComponent(selectedExam),
      year: encodeURIComponent(selectedYear),
      term: encodeURIComponent(selectedTerm),
      examSetId: apiExamSetId,          
      assessmentType: assessmentTypeForUrl, // This will be 'CA' if C.A is selected
      classId: selectedClassId,         
      subjectId: selectedSubjectId!,      // Add subject ID (non-null assertion due to check above)
      termId: selectedTermId,           
      academicYearId: selectedAcademicYearId 
    };

    // The target URL should be the page that handles showing students with missing marks
    // This page (studentswithmissingmarks) will then use the assessmentType and subjectId
    // to determine if it needs to show missing CA marks or other types of missing marks.
    router.push(`/pages/reports/studentswithmissingca?${new URLSearchParams(queryParams).toString()}`);
  };
  
  const anySubLoading = isLoading || isFetchingSubjects || isFetchingExams;
  const canSubmit = !anySubLoading && selectedYear && selectedTermId && selectedClassId && selectedSubjectId && selectedExam;

  if (isLoading && academicYears.length === 0) { 
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        <p className="ml-3 text-gray-700">Loading initial data...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex justify-center items-center min-h-screen p-4">
      <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8 w-full max-w-2xl">
        <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-6">
          Generate Missing Marks Report
        </h2>

        {error && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-md" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select id="year" value={selectedYear} onChange={handleYearChange} className="form-select" required >
                <option value="" disabled>Select Year</option>
                {academicYears.map(ay => (<option key={ay.id} value={ay.year}>{ay.year}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select id="term" value={selectedTerm} onChange={handleTermChange} className="form-select" required disabled={terms.length === 0 && !isLoading} >
                <option value="" disabled>{terms.length === 0 && !isLoading ? "No terms for year" : "Select Term"}</option>
                {terms.map(t => (<option key={t.id} value={t.name}>{t.name}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select id="class" value={selectedClass} onChange={handleClassChange} className="form-select" required >
                <option value="" disabled>Select Class</option>
                {classes.map(cls => (<option key={cls.id} value={cls.name}>{cls.name}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select 
                id="subject" 
                value={selectedSubject} 
                onChange={handleSubjectChange} 
                className="form-select" 
                required 
                disabled={subjects.length === 0 && !isFetchingSubjects && !!selectedClassId}
              >
                <option value="" disabled>
                  {isFetchingSubjects ? "Loading subjects..." : (subjects.length === 0 && !!selectedClassId) ? "No subjects for class" : "Select Subject"}
                </option>
                {subjects.map(sub => (<option key={sub.id} value={sub.name}>{sub.name}</option>))}
              </select>
              {isFetchingSubjects && (
                  <div className="mt-1 text-xs text-gray-500 flex items-center">
                    <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent mr-1"></div>
                    Fetching subjects...
                  </div>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select 
              id="exam" 
              value={selectedExam} 
              onChange={handleExamChange} 
              className="form-select" 
              required 
              disabled={filteredExamTypes.length === 0 && !isFetchingExams && !!selectedClassId && !!selectedTermId && !!selectedAcademicYearId}
            >
              <option value="" disabled>
                {isFetchingExams ? "Loading exam types..." : (filteredExamTypes.length === 0 && !!selectedClassId && !!selectedTermId) ? "No exam types for selection" : "Select Exam Type"}
              </option>
              {filteredExamTypes.map(examTypeOption => (
                <option key={examTypeOption.id} value={examTypeOption.value}>
                  {examTypeOption.label}
                </option>
              ))}
            </select>
            {isFetchingExams && (
                <div className="mt-1 text-xs text-gray-500 flex items-center">
                  <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent mr-1"></div>
                  Fetching exam types...
                </div>
            )}
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className={`w-full py-2.5 px-4 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ${
                !canSubmit
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
              disabled={!canSubmit}
            >
              {anySubLoading ? 'Processing...' : 'View Missing Marks Report'} »
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .form-select {
          width: 100%;
          border-width: 1px;
          border-color: #d1d5db; /* Tailwind gray-300 */
          border-radius: 0.375rem; /* rounded-md */
          padding: 0.5rem; /* p-2 */
          font-size: 0.875rem; /* text-sm */
          background-color: white;
        }
        .form-select:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
          --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
          box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
          --tw-ring-color: #3b82f6; /* Tailwind blue-500 */
          border-color: #3b82f6;
        }
        .form-select:disabled {
            background-color: #f3f4f6; /* Tailwind gray-100 */
            opacity: 0.7;
            cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MarksheetGenerator;