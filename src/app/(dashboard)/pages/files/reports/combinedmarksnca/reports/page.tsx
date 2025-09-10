"use client";
import React, { useState, useEffect, ChangeEvent, useCallback, FormEvent, useMemo, Suspense } from 'react';
import { env } from '@/env';
import { useRouter, useSearchParams } from 'next/navigation';

// --- Interfaces for Generator Part ---
interface GenClass { id: string; name: string; section: string; }
interface GenTerm { id: string; name: string; }
interface GenAcademicYear { id: string; year: string; terms: GenTerm[]; }
interface GenExamSet { id: string; examSetId?: string; examSetType: string; classId: string; termId: string; }
interface GenSubject { id: string; name: string; code?: string; }

// --- Interfaces for Report Part ---
interface ReportStudent {
  apiId: string;      // Actual student ID from backend
  displayIndex: number;
  name: string;
  // For CA Report
  cw?: number;
  hw?: number;
  org?: number;
  spart?: number;
  smgt?: number;
  // For General Report (marks per subject code)
  marks?: Record<string, number | null>; // null means no entry, -1 means absent/missed, 0 is a valid mark (but treated as no mark for "missing" filter)
}
interface ReportMarkFromAPI { // Structure of mark data from /marks/get endpoint
  id?: string;          // Can be mark entry ID or student ID if studentId field is not present
  studentId?: string;   // Explicit student ID from API (preferred)
  name?: string;        // Student Name from Mark Record
  mark: string | number | null;
  markId?: string | null;
  [key: string]: any;
}
interface ReportSubjectHeader { // For general report table headers
  id: string;   // Actual Subject ID (GUID)
  code: string; // Subject Code (e.g., ENG, MTH) - must be unique per class for student.marks keying
  name: string; // Subject Name
}


const UnifiedMissingMarksPageView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`; // Adjusted baseUrl for report part

  // --- Mode Detection & Report Type ---
  const classIdFromUrl = searchParams?.get('classId') ?? '';
  const examSetIdFromUrl = searchParams?.get('examSetId') ?? '';
  const assessmentTypeFromUrl = searchParams?.get('assessmentType') ?? '';
  const subjectIdFromUrl = searchParams?.get('subjectId') ?? ''; // Used by CA report, and optionally by general report

  const initialIsReportMode = !!(classIdFromUrl && examSetIdFromUrl && assessmentTypeFromUrl);
  const [isReportMode, setIsReportMode] = useState(initialIsReportMode);
  const [reportType, setReportType] = useState<'ca' | 'general' | null>(null);


  // --- State for Generator Form Part ---
  const [genClasses, setGenClasses] = useState<GenClass[]>([]);
  const [genAcademicYears, setGenAcademicYears] = useState<GenAcademicYear[]>([]);
  const [genTerms, setGenTerms] = useState<GenTerm[]>([]);
  const [genSubjects, setGenSubjects] = useState<GenSubject[]>([]);
  const [genExamSets, setGenExamSets] = useState<GenExamSet[]>([]);
  const [genFilteredExamTypes, setGenFilteredExamTypes] = useState<{id: string, label: string, value: string}[]>([]);
  const [genIsLoading, setGenIsLoading] = useState(!initialIsReportMode);
  const [genIsFetchingSubjects, setGenIsFetchingSubjects] = useState(false);
  const [genIsFetchingExams, setGenIsFetchingExams] = useState(false);
  const [genSelectedYear, setGenSelectedYear] = useState<string>("");
  const [genSelectedAcademicYearId, setGenSelectedAcademicYearId] = useState<string>("");
  const [genSelectedTerm, setGenSelectedTerm] = useState<string>("");
  const [genSelectedTermId, setGenSelectedTermId] = useState<string>("");
  const [genSelectedClass, setGenSelectedClass] = useState<string>("");
  const [genSelectedClassId, setGenSelectedClassId] = useState<string>("");
  const [genSelectedSubject, setGenSelectedSubject] = useState<string>(""); // Name
  const [genSelectedSubjectId, setGenSelectedSubjectId] = useState<string>(""); // ID
  const [genSelectedExam, setGenSelectedExam] = useState<string>("");
  const [genError, setGenError] = useState<string>("");

  // --- State for Report Display Part ---
  const [reportStudents, setReportStudents] = useState<ReportStudent[]>([]);
  const [reportSubjectHeaders, setReportSubjectHeaders] = useState<ReportSubjectHeader[]>([]);
  const [reportIsLoading, setReportIsLoading] = useState(initialIsReportMode);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportInfoMessage, setReportInfoMessage] = useState<string | null>(null);
  const [reportPageInfo, setReportPageInfo] = useState({ className: '', subject: '', examType: '', term: '', year: '' });

  const examTypes = useMemo(() => [
    { id: 'BOT', label: 'BEGINNING OF TERM', value: 'Beginning Of Term (BOT)' },
    { id: 'MID', label: 'MID TERM', value: 'Mid Term' },
    { id: 'EOT', label: 'END OF TERM', value: 'End Of Term (EOT)' },
    { id: 'CA', label: 'CONTINUOUS ASSESSMENT', value: 'Continuous Assessment (C.A)' }
  ], []);

  // --- Helper Functions ---
  const decodeParam = (param: string | null): string => {
    if (!param) return '';
    try { return decodeURIComponent(param); } catch (e) { console.error("Error decoding param:", param, e); return param; }
  };
  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
  };

  // For CA components: null, undefined, "", "abs", "ab", negative -> 0. Others parsed or 0.
  const parseForCAMarkValue = (mark: string | number | null): number => {
    if (mark === null || mark === undefined) return 0;
    if (typeof mark === 'number') return mark < 0 ? 0 : mark;
    const trimmedMark = String(mark).trim().toLowerCase();
    if (trimmedMark === "" || trimmedMark === "abs" || trimmedMark === "ab") return 0;
    const parsedMark = parseInt(trimmedMark, 10);
    return isNaN(parsedMark) ? 0 : (parsedMark < 0 ? 0 : parsedMark);
  };

  // For General report marks: null/undefined -> null. "" -> null. "-1", "abs", "ab" -> -1. Others parsed or original number.
  const processGeneralMarkValue = (markInput: ReportMarkFromAPI): number | null => {
    if (markInput.mark === null || markInput.mark === undefined) return null;
    if (typeof markInput.mark === 'number') {
      return markInput.mark; // Keep numbers as is (0, -1, or positive)
    }
    const trimmedMark = String(markInput.mark).trim().toLowerCase();
    if (trimmedMark === "") return null;
    if (trimmedMark === "-1" || trimmedMark === "abs" || trimmedMark === "ab") return -1;
    const parsedMark = parseInt(trimmedMark, 10);
    return isNaN(parsedMark) ? null : parsedMark; // If NaN, it's an invalid entry, treat as null
  };

  const logDebug = (context: string, message: string, data?: any) => {
    console.log(`[UnifiedMissingMarksPage-${context}] ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
  };

  // --- Mode Detection and Initial Page Info Setup ---
  useEffect(() => {
    const currentClassId = searchParams?.get('classId') ?? '';
    const currentExamSetId = searchParams?.get('examSetId') ?? '';
    const currentAssessmentType = searchParams?.get('assessmentType') ?? '';
    const currentSubjectId = searchParams?.get('subjectId') ?? ''; // Used by CA and optionally by General

    const activateReportMode = !!(currentClassId && currentExamSetId && currentAssessmentType);
    
    setIsReportMode(activateReportMode);
    
    if (activateReportMode) {
      setReportIsLoading(true); 
      setGenIsLoading(false); 
      
      if (currentAssessmentType === 'CA' && currentSubjectId) { // CA report requires a subjectId
        setReportType('ca');
      } else {
        setReportType('general'); // All other cases, including CA without specific subjectId (though generator sends it for CA)
      }
      setReportPageInfo({
        className: decodeParam(searchParams?.get('class') ?? ''),
        subject: decodeParam(searchParams?.get('subject') ?? ''), // Will be present if subjectId was in URL
        examType: decodeParam(searchParams?.get('exam') ?? '') || currentAssessmentType || '',
        term: decodeParam(searchParams?.get('term') ?? ''),
        year: decodeParam(searchParams?.get('year') ?? '')
      });
    } else {
      setReportIsLoading(false); // Not in report mode, so not loading report
      setGenIsLoading(true); // Will trigger generator data load
    }
  }, [searchParams]); // Re-evaluate when URL params change


  // --- useEffects for Generator Form Data Fetching (only run if !isReportMode) ---
  useEffect(() => {
    if (isReportMode || !genIsLoading) return; 
    const fetchGenInitialData = async () => {
      setGenError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers = getAuthHeaders();
        const [classesRes, yearsRes] = await Promise.all([
          fetch(`${baseUrl}/classes/filter?limit=200`, { headers }),
          fetch(`${baseUrl}/academic-years/filter?includeTerms=true&limit=50`, { headers })
        ]);
        if (!classesRes.ok) throw new Error(`Gen: Classes fetch failed: ${classesRes.status}`);
        if (!yearsRes.ok) throw new Error(`Gen: Years fetch failed: ${yearsRes.status}`);
        const classesData = await classesRes.json();
        const yearsData = await yearsRes.json();
        
        const fetchedClasses: GenClass[] = (classesData.classes || classesData.data?.classes || []).sort((a:GenClass,b:GenClass)=>a.name.localeCompare(b.name));
        const fetchedAcademicYears: GenAcademicYear[] = (yearsData.academicYears || yearsData.data?.academicYears || yearsData.years || yearsData.data?.years || []).sort((a: GenAcademicYear,b: GenAcademicYear) => parseInt(b.year) - parseInt(a.year));

        setGenClasses(fetchedClasses);
        setGenAcademicYears(fetchedAcademicYears);
        
        if (fetchedAcademicYears.length > 0) {
          const latestYear = fetchedAcademicYears[0];
          setGenSelectedYear(latestYear.year); setGenSelectedAcademicYearId(latestYear.id);
          const yearTerms = (latestYear.terms || []).sort((a:GenTerm,b:GenTerm)=>a.name.localeCompare(b.name));
          setGenTerms(yearTerms);
          if (yearTerms.length > 0) { setGenSelectedTerm(yearTerms[0].name); setGenSelectedTermId(yearTerms[0].id); }
        }
        if (fetchedClasses.length > 0) {
          setGenSelectedClass(fetchedClasses[0].name); setGenSelectedClassId(fetchedClasses[0].id);
        }
      } catch (err: any) { console.error("Error fetching initial generator data:", err); setGenError(err.message || "Failed to load form data.");
      } finally { setGenIsLoading(false); }
    };
    fetchGenInitialData();
  }, [baseUrl, isReportMode, genIsLoading]);

  useEffect(() => {
    if (isReportMode || !genSelectedClassId) {
      setGenSubjects([]); setGenSelectedSubject(""); setGenSelectedSubjectId(""); return;
    }
    const fetchGenSubjects = async () => {
        setGenIsFetchingSubjects(true); setGenError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers = getAuthHeaders();
        const response = await fetch(`${baseUrl}/class-subject-assignments/class/${genSelectedClassId}`, { headers });
        if(!response.ok){let eMsg=`HTTP ${response.status}`;try{const eD=await response.json(); eMsg=eD.message||eD.error||eD.returnMessage||JSON.stringify(eD)||eMsg;}catch(e){}throw new Error(eMsg);}
        const data = await response.json();
        logDebug('Generator', `Raw subjects for class ${genSelectedClassId}`, data);
        let pS: GenSubject[] = [];
        if (data.status?.returnCode === "00" && data.data?.assignments && Array.isArray(data.data.assignments)) {
          pS = data.data.assignments.map((asn: any) => (asn.subjectActivity?.id && asn.subjectActivity.name ? { id: asn.subjectActivity.id, name: asn.subjectActivity.name, code: asn.subjectActivity.code } : null)).filter((s:any): s is GenSubject => s !== null);
          const uM = new Map<string,GenSubject>(); pS.forEach(s => {if(s.id && !uM.has(s.id)) uM.set(s.id,s);}); pS = Array.from(uM.values()).sort((a,b)=>a.name.localeCompare(b.name));
        } else { console.warn("Gen: Subjects API response not expected", data); if(data.status?.returnMessage && data.status.returnCode !== "00") setGenError(data.status.returnMessage);}
        setGenSubjects(pS);
        if (pS.length > 0) { setGenSelectedSubject(pS[0].name); setGenSelectedSubjectId(pS[0].id); } 
        else { setGenSelectedSubject(""); setGenSelectedSubjectId(""); if(!data.status?.returnMessage || data.status.returnCode === "00") setGenError("No subjects assigned to this class.");}
      } catch (err: any) { console.error("Error fetchGenSubjects:", err); setGenError(err.message||"Failed to load subjects."); setGenSubjects([]); setGenSelectedSubject(""); setGenSelectedSubjectId("");
      } finally { setGenIsFetchingSubjects(false); }
    };
    fetchGenSubjects();
  }, [genSelectedClassId, baseUrl, isReportMode]);

  useEffect(() => {
    if (isReportMode || !genSelectedClassId || !genSelectedTermId || !genSelectedAcademicYearId) {
      setGenExamSets([]); setGenFilteredExamTypes([]); setGenSelectedExam(""); return;
    }
    const fetchGenExamSets = async () => {
        setGenIsFetchingExams(true); setGenError("");
      try {
        const token = localStorage.getItem('accessToken');
        const headers = getAuthHeaders();
        const response = await fetch(`${baseUrl}/exams/class-assignments/${genSelectedClassId}?academicYearId=${genSelectedAcademicYearId}&termId=${genSelectedTermId}`,{headers});
        if(!response.ok){let eMsg=`HTTP ${response.status}`;try{const eD=await response.json();eMsg=eD.message||eD.error||eD.returnMessage||JSON.stringify(eD)||eMsg;}catch(e){}throw new Error(eMsg);}
        const data = await response.json();
        logDebug('Generator', `Exam sets for classId ${genSelectedClassId}`, data);
        if(data.status?.returnCode === "00" && data.data?.examSets && Array.isArray(data.data.examSets)){
          const fes: GenExamSet[] = data.data.examSets;
          const esft = fes.filter(s => s.termId === genSelectedTermId);
          setGenExamSets(esft);
          const aetS = esft.map(s => s.examSetType.toLowerCase());
          const avet = examTypes.filter(t => aetS.some(as => as === t.value.toLowerCase() || as === t.id.toLowerCase() || t.value.toLowerCase().includes(as) || t.id.toLowerCase().includes(as))).sort((a,b)=>a.label.localeCompare(b.label));
          setGenFilteredExamTypes(avet);
          if(avet.length > 0) setGenSelectedExam(avet[0].value); else {setGenSelectedExam(""); setGenError("No matching exam types assigned for this selection.");}
        } else { setGenExamSets([]); setGenFilteredExamTypes([]); setGenSelectedExam(""); setGenError(data.status?.returnMessage || "No exam sets found for this selection.");}
      } catch (err: any) { console.error("Error fetchGenExamSets:", err); setGenError(err.message || "Failed to load exam types.");
      } finally { setGenIsFetchingExams(false); }
    };
    fetchGenExamSets();
  }, [genSelectedClassId, genSelectedTermId, genSelectedAcademicYearId, baseUrl, examTypes, isReportMode]);


  // --- useEffect for Report Data Fetching ---
  useEffect(() => {
    if (!isReportMode || !searchParams || !reportType || !reportIsLoading) return;

    const fetchReportData = async () => {
      setReportError(null); setReportInfoMessage(null); setReportStudents([]); setReportSubjectHeaders([]);

      const classId = searchParams?.get('classId') ?? '';
      const currentSubjectId = searchParams?.get('subjectId'); // Used by CA, and optionally by General if user selected one
      const examId = searchParams?.get('examSetId') ?? '';
      const yearId = searchParams?.get('academicYearId') ?? '';
      const termId = searchParams?.get('termId') ?? '';
      const assessmentType = searchParams?.get('assessmentType') ?? '';
      const headers = getAuthHeaders();

      try {
        if (reportType === 'ca') {
          logDebug('Report-CA', "Fetching CA data...", {classId, currentSubjectId, examId, yearId, termId});
          if (!currentSubjectId) { // CA report absolutely needs a subjectId
            setReportError("A specific Subject ID is required to generate the CA Missing Marks report.");
            setReportIsLoading(false); return;
          }
          const caComponents = ['CW', 'HW', 'ORG', 'SPART', 'SMGT'];
          const studentsMarkDataMap = new Map<string, { apiId: string; name: string; marks: Record<string, number>; }>();
          
          const componentPromises = caComponents.map(async (component: string) => {
            const componentUrl = `${baseUrl}/marks/get?subjectId=${currentSubjectId}&classId=${classId}&termId=${termId}&academicYearId=${yearId}&examSetId=${examId}&assessmentType=CA&caComponent=${component}`;
            logDebug('Report-CA', `Fetching component ${component}`, {url: componentUrl});
            const response = await fetch(componentUrl, { headers });
            if (!response.ok) {
              let eMsg = `HTTP ${response.status}`;
              try {
                const eD = await response.json();
                eMsg = eD.message || eD.error || eD.returnMessage || JSON.stringify(eD) || eMsg;
              } catch (e) {}
              throw new Error(eMsg);
            }
            const data = await response.json();
            return data; // Return the data for Promise.all
          });

          const results = await Promise.all(componentPromises);
          const studentsData = results
            .filter(result => result?.data?.marks)
            .map(result => {
              const marks = result.data.marks;
              const apiId = marks.studentId || marks.id;
              if (!apiId) return null;
              
              return {
                apiId,
                displayIndex: 0, // Will be set later
                name: marks.name || '',
                cw: marks.cw,
                hw: marks.hw,
                org: marks.org,
                spart: marks.spart,
                smgt: marks.smgt
              } as ReportStudent;
            })
            .filter((student): student is ReportStudent => student !== null);

          // Set display indices
          studentsData.forEach((student, index) => {
            student.displayIndex = index + 1;
          });

          setReportStudents(studentsData);
          
          // Create subject headers from the marks data
          const subjectHeaders = Object.entries(studentsMarkDataMap).map(([id, data]) => ({
            id,
            code: data.marks?.code || '',
            name: data.marks?.name || ''
          }));

          setReportSubjectHeaders(subjectHeaders);

          if (studentsData.length > 0) {
            setReportInfoMessage(`${studentsData.length} students found matching the "missing marks" criteria for this selection.`);
          } else {
            setReportInfoMessage("No students found matching the \"missing marks\" criteria for this selection.");
          }
        }
      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setReportError(err.message || "Failed to load report data.");
      }
    };
    fetchReportData();
  }, [isReportMode, searchParams, reportType, reportIsLoading, baseUrl]);

  // --- Generator Form Event Handlers ---
  const handleGenYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yv = e.target.value;
    setGenSelectedYear(yv);
    const ayo = genAcademicYears.find(ay => ay.year === yv);
    if (ayo) {
      setGenSelectedAcademicYearId(ayo.id);
      const yts = ayo.terms || [];
      setGenTerms(yts);
      if (yts.length > 0) {
        const ft = yts.sort((a: GenTerm, b: GenTerm) => a.name.localeCompare(b.name))[0];
        setGenSelectedTerm(ft.name);
        setGenSelectedTermId(ft.id);
      } else {
        setGenSelectedTerm("");
        setGenSelectedTermId("");
      }
    } else {
      setGenSelectedAcademicYearId("");
      setGenTerms([]);
      setGenSelectedTerm("");
      setGenSelectedTermId("");
    }
    setGenSubjects([]);
    setGenSelectedSubject("");
    setGenSelectedSubjectId("");
    setGenExamSets([]);
    setGenFilteredExamTypes([]);
    setGenSelectedExam("");
  };
  const handleGenClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cnv = e.target.value;
    setGenSelectedClass(cnv);
    const co = genClasses.find(c => c.name === cnv);
    setGenSelectedClassId(co ? co.id : "");
    setGenSubjects([]);
    setGenSelectedSubject("");
    setGenSelectedSubjectId("");
    setGenExamSets([]);
    setGenFilteredExamTypes([]);
    setGenSelectedExam("");
  };
  const handleGenTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tnv = e.target.value;
    setGenSelectedTerm(tnv);
    const to = genTerms.find(t => t.name === tnv);
    setGenSelectedTermId(to ? to.id : "");
    setGenExamSets([]);
    setGenFilteredExamTypes([]);
    setGenSelectedExam("");
  };
  const handleGenSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const snv = e.target.value;
    setGenSelectedSubject(snv);
    const so = genSubjects.find(s => s.name === snv);
    setGenSelectedSubjectId(so ? so.id : "");
  };
  const handleGenExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => setGenSelectedExam(e.target.value);
  const handleGenSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGenError("");
    const rf = [
      { v: genSelectedAcademicYearId, n: "Academic Year" },
      { v: genSelectedTermId, n: "Term" },
      { v: genSelectedClassId, n: "Class" },
      { v: genSelectedSubjectId, n: "Subject" },
      { v: genSelectedExam, n: "Exam Type" }
    ];
    const mf = rf.filter(f => !f.v);
    if (mf.length > 0) {
      setGenError(`Please select: ${mf.map(f => f.n).join(', ')}.`);
      return;
    }
    // Find the exam set ID for the selected exam type
    const apiESI = getGenExamSetApiIdByType();
    if (!apiESI) {
      setGenError(`Could not find matching ExamSet ID for "${genSelectedExam}" in Term "${genSelectedTerm}".`);
      return;
    }
    // Determine assessment type
    let atfu = "EOT";
    const lse = genSelectedExam.toLowerCase();
    if (lse.includes('cont')) atfu = 'CA';
    else if (lse.includes('beg')) atfu = 'BOT';
    else if (lse.includes('mid')) atfu = 'MID';
    else if (lse.includes('end')) atfu = 'EOT';
    // Build query params
    const qp: Record<string, string> = {
      class: encodeURIComponent(genSelectedClass),
      subject: encodeURIComponent(genSelectedSubject),
      exam: encodeURIComponent(genSelectedExam),
      year: encodeURIComponent(genSelectedYear),
      term: encodeURIComponent(genSelectedTerm),
      examSetId: apiESI,
      assessmentType: atfu,
      classId: genSelectedClassId,
      subjectId: genSelectedSubjectId!,
      termId: genSelectedTermId,
      academicYearId: genSelectedAcademicYearId
    };
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?${new URLSearchParams(qp).toString()}`);
  };

  const getGenExamSetApiIdByType = (): string | undefined => {
    // Find the exam set for the selected exam type and term
    const selectedExamType = genSelectedExam.toLowerCase();
    const fs = genExamSets.find(es => {
      const lev = es.examSetType.toLowerCase();
      return lev === selectedExamType || selectedExamType.includes(lev) || lev.includes(selectedExamType);
    });
    return fs?.examSetId || fs?.id;
  };

  // --- Event Handlers for Report ---
  const handleReportPrint = () => window.print();
  const handleReportBack = () => { 
    const currentPath = window.location.pathname;
    router.push(currentPath); 
  };


  // --- JSX Rendering ---
  if (!isReportMode) {
    const anyGenSubLoading = genIsLoading || genIsFetchingSubjects || genIsFetchingExams;
    const canGenSubmit = !anyGenSubLoading && genSelectedYear && genSelectedTermId && genSelectedClassId && genSelectedSubjectId && genSelectedExam;
    if (genIsLoading && genAcademicYears.length === 0) { 
      return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div><p className="ml-3">Loading form...</p></div>;
    }
    return (
      <div className="bg-gray-100 flex justify-center items-center min-h-screen p-4">
        <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8 w-full max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-6">Generate Missing Marks Report</h2>
          {genError && <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded" role="alert"><p className="font-bold">Error</p><p>{genError}</p></div>}
          <form onSubmit={handleGenSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label htmlFor="gen-year" className="form-label">Academic Year</label><select id="gen-year" value={genSelectedYear} onChange={handleGenYearChange} className="form-select" required><option value="" disabled>Select Year</option>{genAcademicYears.map(ay=>(<option key={ay.id} value={ay.year}>{ay.year}</option>))}</select></div>
                <div><label htmlFor="gen-term" className="form-label">Term</label><select id="gen-term" value={genSelectedTerm} onChange={handleGenTermChange} className="form-select" required disabled={genTerms.length===0&&!genIsLoading}><option value="" disabled>{genIsLoading?"Loading...":(genTerms.length===0?"No terms for year":"Select Term")}</option>{genTerms.map(t=>(<option key={t.id} value={t.name}>{t.name}</option>))}</select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label htmlFor="gen-class" className="form-label">Class</label><select id="gen-class" value={genSelectedClass} onChange={handleGenClassChange} className="form-select" required><option value="" disabled>Select Class</option>{genClasses.map(cls=>(<option key={cls.id} value={cls.name}>{cls.name}</option>))}</select></div>
                <div><label htmlFor="gen-subject" className="form-label">Subject</label><select id="gen-subject" value={genSelectedSubject} onChange={handleGenSubjectChange} className="form-select" required disabled={(genSubjects.length===0 && !!genSelectedClassId) || genIsFetchingSubjects}><option value="" disabled>{genIsFetchingSubjects?"Loading subjects...":((genSubjects.length===0&&!!genSelectedClassId)?"No subjects assigned":"Select Subject")}</option>{genSubjects.map(s=>(<option key={s.id} value={s.name}>{s.name}</option>))}</select>{genIsFetchingSubjects&&<div className="form-loading-text"><div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent mr-1"></div>Fetching subjects...</div>}</div>
            </div>
            <div><label htmlFor="gen-exam" className="form-label">Exam Type</label><select id="gen-exam" value={genSelectedExam} onChange={handleGenExamChange} className="form-select" required disabled={(genFilteredExamTypes.length===0 && !!genSelectedClassId && !!genSelectedTermId) || genIsFetchingExams}><option value="" disabled>{genIsFetchingExams?"Loading exam types...":((genFilteredExamTypes.length===0&&!!genSelectedClassId&&!!genSelectedTermId)?"No exam types assigned":"Select Exam Type")}</option>{genFilteredExamTypes.map(et=>(<option key={et.id} value={et.value}>{et.label}</option>))}</select>{genIsFetchingExams&&<div className="form-loading-text"><div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent mr-1"></div>Fetching exam types...</div>}</div>
            <div className="pt-4"><button type="submit" className={`form-submit-button ${!canGenSubmit?'form-submit-button-disabled':''}`} disabled={!canGenSubmit}>{anyGenSubLoading?'Processing...':'View Missing Marks Report'} »</button></div>
          </form>
        </div>
        <style jsx>{`
            .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
            .form-select { width: 100%; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem; font-size: 0.875rem; background-color: white; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
            .form-select:focus { outline: 2px solid transparent; outline-offset: 2px; box-shadow: 0 0 0 2px #3b82f6; border-color: #3b82f6; }
            .form-select:disabled { background-color: #f3f4f6; opacity: 0.7; cursor: not-allowed; }
            .form-loading-text { margin-top: 0.25rem; font-size: 0.75rem; color: #6b7280; display: flex; align-items: center; }
            .form-submit-button { width: 100%; padding-top: 0.625rem; padding-bottom: 0.625rem; padding-left: 1rem; padding-right: 1rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); transition-property: background-color; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms; background-color: #2563eb; color: white; }
            .form-submit-button:hover:not(:disabled) { background-color: #1d4ed8; }
            .form-submit-button-disabled { background-color: #9ca3af; color: #e5e7eb; cursor: not-allowed; }
        `}</style>
      </div>
    );
  } else { // --- RENDER REPORT VIEW ---
    if (reportIsLoading) {
      return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div><p className="ml-3">Loading report...</p></div>;
    }
    return (
      <div className="bg-gray-100 flex justify-center items-start min-h-screen p-4">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-5xl"> {/* max-w-5xl for wider tables */}
          <div className="flex flex-col justify-between items-center mb-4">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">
                Students Missing Marks - {reportPageInfo.className}
                {(reportType === 'ca' && reportPageInfo.subject) && ` (${reportPageInfo.subject})`}
              </h1>
              <h2 className="text-xl font-semibold text-gray-700 mt-1">{reportPageInfo.examType}</h2>
              <h3 className="text-lg text-gray-600 mt-1">{reportPageInfo.term}, {reportPageInfo.year}</h3>
            </div>
            <div className="flex space-x-4 no-print mb-4">
              <button onClick={handleReportPrint} className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none">Print</button>
              <button onClick={handleReportBack} className="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700 focus:outline-none">Back to Form</button>
            </div>
            {reportError && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 w-full mb-4" role="alert"><p className="font-bold">Error</p><p>{reportError}</p></div>}
            {!reportError && reportInfoMessage && reportStudents.length === 0 && <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 w-full mb-4" role="alert"><p className="font-bold">Information</p><p>{reportInfoMessage}</p></div>}
          </div>

          {!reportError && reportStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="table-th">#</th><th className="table-th text-left">Student Name</th>
                    {reportType === 'ca' && (<> <th className="table-th">CW</th><th className="table-th">HW</th><th className="table-th">ORG</th><th className="table-th">SPART</th><th className="table-th">SMGT</th> </>)}
                    {reportType === 'general' && reportSubjectHeaders.map(subj => (<th key={subj.id} className="table-th">{subj.name} ({subj.code})</th> ))}
                  </tr>
                </thead>
                <tbody>
                  {reportStudents.map((student) => (
                    <tr key={student.apiId} className="hover:bg-gray-50 even:bg-white odd:bg-gray-50">
                      <td className="table-td text-center">{student.displayIndex}</td>
                      <td className="table-td text-left font-medium">{student.name}</td>
                      {reportType === 'ca' && (<>
                          <td className="table-td text-center text-red-600">{student.cw}</td><td className="table-td text-center text-red-600">{student.hw}</td>
                          <td className="table-td text-center text-red-600">{student.org}</td><td className="table-td text-center text-red-600">{student.spart}</td>
                          <td className="table-td text-center text-red-600">{student.smgt}</td>
                      </>)}
                      {reportType === 'general' && reportSubjectHeaders.map(subj => (
                        <td key={`${student.apiId}-${subj.id}`} className="table-td text-center">
                          {(student.marks?.[subj.code] === null || student.marks?.[subj.code] === -1)
                            ? <span className="text-red-600">-</span> 
                            : student.marks?.[subj.code] === 0 
                              ? <span className="text-orange-600">0</span> // Distinguish actual 0 from missing
                              : student.marks?.[subj.code]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             !reportIsLoading && !reportError && !reportInfoMessage && reportStudents.length === 0 &&
             <div className="bg-yellow-50 border-l-4 border-yellow-200 text-yellow-700 p-4 w-full mb-4" role="status"><p>No students found matching the &quot;missing marks&quot; criteria for this selection.</p></div>
          )}
          
          <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Students Displayed: {reportStudents.length}</p>
          </div>
        </div>
        <style jsx>{`
            .table-th { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: center; font-weight: 500; color: #374151; white-space: nowrap; }
            .table-td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; }
            /* Ensure no-print is handled by global or specific print styles */
            @media print { .no-print { display: none !important; } }
        `}</style>
      </div>
    );
  }
};

const UnifiedMissingMarksPageWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading combined marks report...</p></div>}>
      <UnifiedMissingMarksPageView />
    </Suspense>
  );
};

export default UnifiedMissingMarksPageWrapper;