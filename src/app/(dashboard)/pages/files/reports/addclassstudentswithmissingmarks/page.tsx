"use client";
import React, { FormEvent, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/env';

interface Class {
  id: string;
  name: string;
  section: string; // section might not be used but is in interface
}

interface Term {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string; // This is the display year like "2024"
  terms: Term[];
}

interface ExamSet {
  id: string; // This is the exam_set_assignment_id
  examSetId?: string; // This is the actual exam_set_id (GUID)
  examSetType: string; // e.g., "Mid Term", "End Of Term"
  classId: string;
  termId: string;
}

const MarksheetGenerator: React.FC = () => {
  const router = useRouter();
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]); // Stores full academic year objects
  const [terms, setTerms] = useState<Term[]>([]); // Stores terms for the selected academic year
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [filteredExamTypes, setFilteredExamTypes] = useState<{id: string, label: string, value: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(""); // Stores the display year string e.g., "2024"
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(""); // Stores the ID of the selected academic year
  const [selectedTerm, setSelectedTerm] = useState<string>("");   // Stores the display term name e.g., "Term 1"
  const [selectedTermId, setSelectedTermId] = useState<string>(""); // Stores the ID of the selected term
  const [selectedClass, setSelectedClass] = useState<string>(""); // Stores the display class name
  const [selectedClassId, setSelectedClassId] = useState<string>(""); // Stores the ID of the selected class
  const [selectedExam, setSelectedExam] = useState<string>(""); // Stores the display exam value e.g., "Mid Term"
  const [error, setError] = useState<string>("");

  const examTypes = useMemo(() => [
    { id: 'BOT', label: 'BEGINNING OF TERM', value: 'Beginning Of Term (BOT)' },
    { id: 'MID', label: 'MID TERM', value: 'Mid Term' },
    { id: 'END', label: 'END OF TERM', value: 'End Of Term (EOT)' }, // Changed from 'END' to 'EOT' for consistency
    { id: 'CA', label: 'CONTINUOUS ASSESSMENT', value: 'Continuous Assessment (C.A)' }
  ], []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
        
        const [classesRes, yearsRes] = await Promise.all([
          fetch(`${baseUrl}/classes/filter?limit=100`, { headers }),
          fetch(`${baseUrl}/academic-years/filter?includeTerms=true`, { headers }) // Ensure terms are included
        ]);

        if (!classesRes.ok) throw new Error('Failed to fetch classes');
        if (!yearsRes.ok) throw new Error('Failed to fetch academic years');

        const classesData = await classesRes.json();
        const yearsData = await yearsRes.json();
        
        const fetchedClasses = classesData.classes || classesData.data?.classes || [];
        const fetchedAcademicYears = yearsData.academicYears || yearsData.data?.academicYears || yearsData.years || yearsData.data?.years || [];

        setClasses(fetchedClasses);
        setAcademicYears(fetchedAcademicYears);
        
        if (fetchedAcademicYears.length > 0) {
          const latestYear = fetchedAcademicYears[0]; // Assuming sorted by recency or default
          setSelectedYear(latestYear.year);
          setSelectedAcademicYearId(latestYear.id); // Set academicYearId
          
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
        setError(err.message || "Failed to load initial data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [baseUrl]);

  useEffect(() => {
    const fetchExamSetsForClass = async () => {
      if (!selectedClassId || !selectedTermId || !selectedAcademicYearId) { // Added academicYearId check
        setExamSets([]);
        setFilteredExamTypes([]);
        setSelectedExam("");
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };

        // API endpoint might need academicYearId and termId for more precise filtering
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
          // Further filter exam sets by termId on the client side if API doesn't do it perfectly
          const examSetsForTerm = fetchedExamSets.filter(set => set.termId === selectedTermId);
          setExamSets(examSetsForTerm);
          
          const assignedExamTypeValues = examSetsForTerm.map((set: ExamSet) => set.examSetType.toLowerCase());
          
          const availableExamTypes = examTypes.filter(typeObj => 
            assignedExamTypeValues.includes(typeObj.value.toLowerCase()) || // Exact match for "Mid Term", "End Of Term"
            assignedExamTypeValues.includes(typeObj.id.toLowerCase()) || // Match for "BOT", "MID", "EOT", "CA"
            // More flexible matching if needed:
            assignedExamTypeValues.some(assignedType => typeObj.value.toLowerCase().includes(assignedType)) ||
            assignedExamTypeValues.some(assignedType => typeObj.id.toLowerCase().includes(assignedType))
          );
          
          setFilteredExamTypes(availableExamTypes);
          
          if (availableExamTypes.length > 0) {
            setSelectedExam(availableExamTypes[0].value);
          } else {
            setSelectedExam("");
            // setError("No exam sets are assigned or match the known types for this class and term.");
          }
        } else {
          setExamSets([]);
          setFilteredExamTypes([]);
          setSelectedExam("");
          setError(examSetsData.status?.returnMessage || "No exam sets found for this selection. Please assign exam sets first.");
        }
      } catch (err: any) {
        console.error("Error fetching exam sets:", err);
        setError(err.message || "Failed to load exam sets. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamSetsForClass();
  }, [selectedClassId, selectedTermId, selectedAcademicYearId, baseUrl, examTypes]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yearValue = e.target.value; // This is the display year string
    setSelectedYear(yearValue);
    
    const academicYearObj = academicYears.find(ay => ay.year === yearValue);
    if (academicYearObj) {
      setSelectedAcademicYearId(academicYearObj.id); // Set the ID
      const yearTerms = academicYearObj.terms || [];
      setTerms(yearTerms);
      if (yearTerms.length > 0) {
        setSelectedTerm(yearTerms[0].name);
        setSelectedTermId(yearTerms[0].id);
      } else {
        setSelectedTerm("");
        setSelectedTermId("");
      }
    } else {
      setSelectedAcademicYearId("");
      setTerms([]);
      setSelectedTerm("");
      setSelectedTermId("");
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classNameValue = e.target.value;
    setSelectedClass(classNameValue);
    const classObj = classes.find(c => c.name === classNameValue);
    if (classObj) {
      setSelectedClassId(classObj.id);
    } else {
      setSelectedClassId("");
    }
  };

  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termNameValue = e.target.value;
    setSelectedTerm(termNameValue);
    const termObj = terms.find(t => t.name === termNameValue);
    if (termObj) {
      setSelectedTermId(termObj.id);
    } else {
      setSelectedTermId("");
    }
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedExam(e.target.value);
  };

  const getExamSetApiIdByType = (currentExamSets: ExamSet[], examValue: string, currentTermId: string): string | undefined => {
    if (!examValue || !currentTermId || !currentExamSets) return undefined;
    
    const lowerExamValue = examValue.toLowerCase();
    
    const foundSet = currentExamSets.find(set => {
      if (set.termId !== currentTermId) return false; // Ensure it's for the correct term
      const lowerExamSetType = set.examSetType.toLowerCase();
      
      // Try to match based on the 'value' (e.g., "Mid Term") or 'id' (e.g., "MID")
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
      // Fallback for direct string comparison if not found in examTypes (less likely with dropdown)
      return lowerExamSetType.includes(lowerExamValue);
    });
    
    return foundSet?.examSetId || foundSet?.id; // Prefer examSetId (actual GUID), fallback to assignment ID
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    if (!selectedAcademicYearId) {
        setError("Academic Year ID is missing. Please re-select the year.");
        return;
    }
    if (!selectedTermId) {
        setError("Term ID is missing. Please re-select the term.");
        return;
    }
    if (!selectedClassId) {
        setError("Class ID is missing. Please re-select the class.");
        return;
    }

    const apiExamSetId = getExamSetApiIdByType(examSets, selectedExam, selectedTermId);

    if (!apiExamSetId) {
      setError(`Could not find a matching ExamSet ID for "${selectedExam}" in Term "${selectedTerm}". Please check exam set assignments.`);
      return;
    }

    let assessmentTypeForUrl = '';
    const lowerSelectedExam = selectedExam.toLowerCase();
    if (lowerSelectedExam.includes('continuous') || lowerSelectedExam.includes('c.a')) {
      assessmentTypeForUrl = 'CA';
    } else if (lowerSelectedExam.includes('beginning') || lowerSelectedExam.includes('bot')) {
      assessmentTypeForUrl = 'BOT';
    } else if (lowerSelectedExam.includes('mid')) {
      assessmentTypeForUrl = 'MID';
    } else if (lowerSelectedExam.includes('end') || lowerSelectedExam.includes('eot')) {
      assessmentTypeForUrl = 'EOT'; // Changed from 'END' to 'EOT'
    } else {
      // Fallback or default if exam name doesn't match known patterns
      // This part might need adjustment based on how examSetType strings are formatted
      const selectedExamObj = examTypes.find(et => et.value === selectedExam);
      assessmentTypeForUrl = selectedExamObj?.id || 'EOT'; // Default to EOT if not found
    }
    
    const queryParams = {
      class: encodeURIComponent(selectedClass),
      exam: encodeURIComponent(selectedExam),
      year: encodeURIComponent(selectedYear), // Display year
      term: encodeURIComponent(selectedTerm),   // Display term
      examSetId: apiExamSetId,               // Actual ExamSet ID for API
      assessmentType: assessmentTypeForUrl,
      classId: selectedClassId,              // Actual Class ID for API
      termId: selectedTermId,                // Actual Term ID for API
      academicYearId: selectedAcademicYearId // Actual Academic Year ID for API
    };

    router.push(`/pages/reports/studentswithmissingmarks?${new URLSearchParams(queryParams).toString()}`);
  };

  if (isLoading && academicYears.length === 0) { // Check academicYears for initial load indication
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        <p className="ml-3 text-gray-700">Loading initial data...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex justify-center items-center min-h-screen p-4">
      <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8 w-full max-w-lg">
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
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year
              </label>
              <select 
                id="year"
                value={selectedYear} // This should be the year string like "2024"
                onChange={handleYearChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                required
              >
                <option value="" disabled>Select Year</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.year}> 
                    {ay.year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
                Term
              </label>
              <select 
                id="term"
                value={selectedTerm}
                onChange={handleTermChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                required
                disabled={terms.length === 0 && !isLoading}
              >
                <option value="" disabled>{terms.length === 0 ? "No terms for year" : "Select Term"}</option>
                {terms.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <select 
                id="class"
                value={selectedClass}
                onChange={handleClassChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
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
              <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-1">
                Exam Type
              </label>
              <select 
                id="exam"
                value={selectedExam}
                onChange={handleExamChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                required
                disabled={filteredExamTypes.length === 0 && !isLoading}
              >
                <option value="" disabled>
                  {isLoading && selectedClassId ? "Loading exams..." : 
                   filteredExamTypes.length === 0 ? "No exams for selection" : "Select Exam"}
                </option>
                {filteredExamTypes.map(examTypeOption => (
                  <option key={examTypeOption.id} value={examTypeOption.value}>
                    {examTypeOption.label}
                  </option>
                ))}
              </select>
               {isLoading && selectedClassId && selectedTermId && selectedAcademicYearId && ( // Show loader only when fetching exams
                  <div className="mt-1 text-xs text-gray-500 flex items-center">
                    <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent mr-1"></div>
                    Fetching exams...
                  </div>
                )}
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className={`w-full py-2.5 px-4 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ${
                !selectedYear || !selectedTermId || !selectedClassId || !selectedExam || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
              disabled={!selectedYear || !selectedTermId || !selectedClassId || !selectedExam || isLoading}
            >
              {isLoading && selectedClassId ? 'Processing...' : 'View Missing Marks Report'} »
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarksheetGenerator;