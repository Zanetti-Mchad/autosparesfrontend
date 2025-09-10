"use client";
import React, { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/env';

// Interfaces for type safety
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
  examSetType: string;
  classId: string;
  termId: string;
  examSetId?: string;
}

const MarksheetGenerator: React.FC = () => {
  const router = useRouter();
  const API_BASE_URL = env.BACKEND_API_URL;
  const baseUrl = `${API_BASE_URL}/api/v1`;
  
  // State variables
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [examTypes, setExamTypes] = useState<{id: string, label: string, value: string}[]>([]);
  
  // Loading and selection states
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [filteredExamTypes, setFilteredExamTypes] = useState<{id: string, label: string, value: string}[]>([]);

  // Event handlers
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
    // Reset exam selection when class changes
    setSelectedExam("");
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedExam(e.target.value);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setSelectedYear(year);
    
    // Update terms based on selected year
    const selectedYearObj = academicYears.find(y => y.year === year);
    if (selectedYearObj && selectedYearObj.terms) {
      setTerms(selectedYearObj.terms);
      setSelectedTerm(selectedYearObj.terms[0]?.name || "");
    }
  };

  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTerm(e.target.value);
  };

  // Form submission handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted");
    
    // Get form elements
    const form = e.currentTarget;
    const classValue = (form.elements.namedItem('class') as HTMLSelectElement).value;
    const examValue = (form.elements.namedItem('exam') as HTMLSelectElement).value;
    const yearValue = (form.elements.namedItem('year') as HTMLSelectElement).value;
    const termValue = (form.elements.namedItem('term') as HTMLSelectElement).value;
    
    // Find selected objects
    const selectedClassObj = classes.find(cls => cls.name === classValue);
    // Find the exam set that matches the selected exam type
    const selectedExamObj = examSets.find(set => set.examSetType === examValue);
    const selectedTermObj = terms.find(term => term.name === termValue);
    const selectedYearObj = academicYears.find(year => year.year === yearValue);
    
    console.log("Selected exam object:", selectedExamObj);
    
    if (!selectedExamObj?.id) {
      console.error("Selected exam ID is undefined.");
      return; // Handle the error as needed
    }

    // Use the actual examSetId if available, otherwise fall back to the assignment ID
    const actualExamSetId = selectedExamObj.examSetId || selectedExamObj.id;
    console.log("Using exam set ID:", actualExamSetId);
    
    // Prepare query parameters for the analysis page
    const queryParams = new URLSearchParams();
    
    // Add display names
    queryParams.append('class', encodeURIComponent(classValue));
    queryParams.append('exam', encodeURIComponent(examValue));
    queryParams.append('year', encodeURIComponent(yearValue));
    queryParams.append('term', encodeURIComponent(termValue));
    
    // Add IDs for API calls
    if (selectedClassObj?.id) queryParams.append('classId', selectedClassObj.id);
    if (actualExamSetId) queryParams.append('examSetId', actualExamSetId);
    if (selectedTermObj?.id) queryParams.append('termId', selectedTermObj.id);
    if (selectedYearObj?.id) queryParams.append('academicYearId', selectedYearObj.id);
    
    // Get assessment type from the exam name (for API compatibility)
    let assessmentType = 'EOT'; // Default
    if (examValue.includes('BOT')) assessmentType = 'BOT';
    else if (examValue.includes('Mid')) assessmentType = 'MID';
    else if (examValue.includes('C.A')) assessmentType = 'CA';
    
    queryParams.append('assessmentType', assessmentType);
    
    // Navigate to the analysis page with all parameters
    router.push(`/pages/reports/marksheetanalysis?${queryParams.toString()}`);
  };

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Prepare authentication headers
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
        
        // Fetch classes
        const classesResponse = await fetch(`${baseUrl}/classes/filter?limit=100`, { headers });
        const classesData = await classesResponse.json();
        
        // Fetch academic years
        const yearsResponse = await fetch(`${baseUrl}/academic-years/filter`, { headers });
        const yearsData = await yearsResponse.json();
        
        // Default exam types
        const defaultExamTypes = [
          { id: 'MID', label: 'MID TERM', value: 'Mid Term' },
          { id: 'END', label: 'END OF TERM', value: 'End Of Term (EOT)' },
          { id: 'CA', label: 'CONTINUOUS ASSESSMENT', value: 'Continuous Assessment (C.A)' },
          { id: 'BOT', label: 'BEGINNING OF TERM', value: 'Beginning Of Term (BOT)' }
        ];
        
        // Update state
        setExamTypes(defaultExamTypes);
        setClasses(classesData.classes || []);
        setAcademicYears(yearsData.years || []);
        
        // Set default academic year and term
        if (yearsData.years && yearsData.years.length > 0) {
          const latestYear = yearsData.years[0];
          setSelectedYear(latestYear.year);
          
          if (latestYear.terms && latestYear.terms.length > 0) {
            setTerms(latestYear.terms);
            setSelectedTerm(latestYear.terms[0]?.name || "");
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [baseUrl]);

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

        // Find the selected class ID
        const selectedClassObj = classes.find(cls => cls.name === selectedClass);
        if (!selectedClassObj) return;

        // Fetch exam sets for the selected class
        const examSetsResponse = await fetch(
          `${baseUrl}/exams/class-assignments/${selectedClassObj.id}`, 
          { headers }
        );
        const examSetsData = await examSetsResponse.json();

        console.log("Exam sets data:", JSON.stringify(examSetsData.data?.examSets, null, 2));

        if (examSetsData.status?.returnCode === "00" && examSetsData.data?.examSets) {
          // Store both the assignment ID and examSetId for each exam set
          const examSetsWithActualIds = await Promise.all(
            examSetsData.data.examSets.map(async (set: ExamSet) => {
              // Fetch the actual examSetId for each assignment
              try {
                const detailResponse = await fetch(
                  `${baseUrl}/exams/assignment/${set.id}`,
                  { headers }
                );
                const detailData = await detailResponse.json();
                
                // If we successfully get the examSetId, add it to the set object
                if (detailData.status?.returnCode === "00" && detailData.data?.examSetId) {
                  return {
                    ...set,
                    examSetId: detailData.data.examSetId
                  };
                }
                return set;
              } catch (error) {
                console.error(`Error fetching details for exam set ${set.id}:`, error);
                return set;
              }
            })
          );
          
          setExamSets(examSetsWithActualIds);
          
          // Filter exam types based on assigned exam sets
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  // Render the form
  return (
    <div className="bg-gray-100 flex justify-center items-center min-h-screen">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
         
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
                <select 
                  id="year" 
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>Select Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.year}>
                      {year.year}
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
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>Select Term</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.name}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select 
                  id="class" 
                  value={selectedClass}
                  onChange={handleClassChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  Exam
                </label>
                <select 
                  id="exam" 
                  value={selectedExam}
                  onChange={handleExamChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  disabled={filteredExamTypes.length === 0}
                >
                  <option value="" disabled>
                    {filteredExamTypes.length === 0 
                      ? "No exam sets assigned for this class" 
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
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={filteredExamTypes.length === 0 || !selectedExam}
                className={`w-full py-2 rounded-md shadow ${
                  (filteredExamTypes.length === 0 || !selectedExam)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none'
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

export default MarksheetGenerator;