'use client';
import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import PrintableContent from '@/components/ui/print';
import { env } from '@/env';
import { supabase } from '@/lib/supabaseClient';

// --- INTERFACES ---
interface ContinuousAssessment {
  subject: string;
  subjectId: string;
  cw: number | null;
  hw: number | null;
  org: number | null;
  sp: number | null;
  sm: number | null;
  total: number | null;
  initials?: string;
  isCompulsory?: boolean; 
}

interface RegularAssessment {
  subject: string;
  subjectId: string;
  score: number | null;
  aggregate: number | null;
  remarks: string;
  initials: string;
  isCompulsory?: boolean; 
}

interface IntegratedAssessment {
  subject: string;
  subjectId?: string; 
  ca: number | null;
  mid: number | null;
  eot: number | null;
  total: number | null;
  average: number | null;
  aggregate: number | null;
  remarks: string;
  initials: string;
  isCompulsory: boolean;
}

interface CommentRange {
  startMarks: number;
  endMarks: number;
  comment: string;
}

interface ReportData {
  schoolInfo: { name: string; address: string; tel: string; email: string; website: string; };
  studentInfo: {
    finalGrade: any; fullName: string; gender: string; schoolId: string; term: string; year: string; class: string; photo?: string; 
};
  assessments: { ca: ContinuousAssessment[]; bot: RegularAssessment[]; mid: RegularAssessment[]; eot: RegularAssessment[]; integrated: IntegratedAssessment[]; };
  finalGrade: { aggs: number | null; grade: string; };
  comments: {
    classTeacher: string; 
    headTeacher: string;  
    classTeacherComments?: CommentRange[]; 
    headTeacherComments?: CommentRange[];  
    aggs?: number; 
  };
  dates: { termEnds: string; nextTermBegins: string; };
}

interface StudentWithClass extends Omit<ReportData, 'comments'> {
  id: string;
  first_name?: string; middle_name?: string; last_name?: string; gender?: string; lin_number?: string;
  classInfo?: { name: string; id?: string; };
  class_assigned?: string; classId?: string; academicYearId?: string; termId?: string; examSetId?: string; 
  class?: string; photo?: string; student_photo?: string;
  caExamSetId?: string; botExamSetId?: string; midExamSetId?: string; eotExamSetId?: string;
  comments: ReportData['comments']; 
  [key: string]: any; 
  gradingRows?: GradingRow[]; 
  classAssignments?: any[]; 
}

interface Subject { id: string; code: string; name: string; isCompulsory: boolean; }
interface Mark { id?: string; studentId?: string; name?: string; mark: string | number | null; markId?: string; subjectId?: string; subject?: string; subjectName?: string; subject_code?: string; caComponent?: string; remarks?: string; aggregate?: number; initials?: string; teacherInitials?: string; [key: string]: any; }
export interface GradingRow { endMarks: number; grade: number; comment: string; startMarks?: number; }

// --- UTILITY FUNCTIONS ---
const formatMarkDisplay = (mark: number | string | null | undefined): string => {
  if (mark === -1 || mark === "-1") return "-";
  if (mark === 0 || mark === "0") return "0";
  if (mark === null || mark === undefined || mark === "" || Number.isNaN(mark as number)) return "";
  return String(mark);
};
const normalizeIntegratedMark = (mark: number | string | null | undefined): number | null => {
  if (mark === 0 || mark === "0") return 0;
  if (mark === -1 || mark === "-1") return -1;
  if (mark === null || mark === undefined || mark === "") return null;
  const parsed = Number(mark); return isNaN(parsed) ? null : parsed;
};
const parseMarkValue = (mark: string | number | null): number | null => {
  if (mark === null || mark === undefined || mark === '') return null;
  if (typeof mark === 'number') { if (Number.isNaN(mark)) return null; return mark; }
  const trimmed = String(mark).trim(); if (trimmed === '-1') return -1;
  const parsed = parseInt(trimmed, 10); return isNaN(parsed) ? null : parsed;
};
const getAggregateFromGradingRows = (score: number | null, gradingRows: GradingRow[]): number | null => {
  if (score === null || score === -1 || !gradingRows || gradingRows.length === 0) return null;
  const sorted = [...gradingRows].sort((a, b) => (a.startMarks ?? 0) - (b.startMarks ?? 0)); 
  for (const row of sorted) {
    const start = row.startMarks ?? 0;
    if (score >= start && score <= row.endMarks) return row.grade;
  }
  return null; 
};
const calculateRemarks = (score: number | null, gradingRows: GradingRow[] = [], isCompulsory?: boolean): string => {
  if (isCompulsory === false) return ''; 
  if (score === null || score === -1 || !gradingRows || gradingRows.length === 0) return '';
  const sorted = [...gradingRows].sort((a, b) => (a.startMarks ?? 0) - (b.startMarks ?? 0));
  for (const row of sorted) {
    const start = row.startMarks ?? 0;
    if (score >= start && score <= row.endMarks) return row.comment;
  }
  return '';
};
const getReportTypeFromParams = (searchParams: URLSearchParams | null): string => {
    if (!searchParams) return 'all';
    const reportTypeRaw = searchParams.get('type') || 'all';
    const normalized = reportTypeRaw.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const reportTypeMap: Record<string, string> = { 'continuousassessmentca': 'ca', 'ca': 'ca', 'endoftermeot': 'eot', 'eot': 'eot', 'midterm': 'mid', 'mid': 'mid', 'beginningoftermbot': 'bot', 'bot': 'bot', 'all': 'all', 'integrated': 'integrated'};
    return reportTypeMap[normalized] || 'all';
};
const checkIsLowerPrimary = (className: string | undefined): boolean => {
    if (!className) return false;
    const lcClassName = className.toLowerCase();
    const classNumberMatch = lcClassName.match(/primary\s+(one|two|three|1|2|3)\s*(east|west|south|north|central|blue|green|red|yellow)?/i);
     if (classNumberMatch) { const numberMap: { [key: string]: number } = {'one': 1, 'two': 2, 'three': 3}; const numStr = classNumberMatch[1].toLowerCase(); const number = numberMap[numStr] || parseInt(numStr); return number >= 1 && number <= 3; }
    if (lcClassName.includes('baby') || lcClassName.includes('infant') || lcClassName.includes('nursery') || lcClassName.includes('middle') || lcClassName.includes('pre-unit') || lcClassName.includes('top') || lcClassName.includes('kindergarten') || lcClassName.includes('kg')) return true;
    return lcClassName.includes('p1') || lcClassName.includes('p2') || lcClassName.includes('p3');
};

// --- SUPABASE IMAGE HELPERS ---
const getStudentPhotoUrl = (studentPhotoFilename: string | null): string | null => {
  if (!studentPhotoFilename) return null;
  try {
    const { data } = supabase.storage
      .from('student-photos')
      .getPublicUrl(studentPhotoFilename);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting student photo URL:', error);
    return null;
  }
};

const getSchoolLogoUrl = (logoFilename: string | null): string | null => {
  if (!logoFilename) return null;
  try {
    const { data } = supabase.storage
      .from('schoolsetting-photos')
      .getPublicUrl(logoFilename);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting school logo URL:', error);
    return null;
  }
};

const getHeadMasterSignatureUrl = (signatureFilename: string | null): string | null => {
  if (!signatureFilename) return null;
  try {
    const { data } = supabase.storage
      .from('staff-photos')
      .getPublicUrl(signatureFilename);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting head master signature URL:', error);
    return null;
  }
};

const getHMSignatureUrl = (): string | null => {
  try {
    const { data } = supabase.storage
      .from('staff-photos')
      .getPublicUrl('hmsignature.png');
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting HM signature URL:', error);
    return null;
  }
};

// --- REPORT COMPONENTS ---
const SchoolHeader = ({ schoolInfo, studentInfo, getReportTitle, student }: any) => (
  <div className="p-3 border-b border-gray-600">
    {schoolInfo.loading ? <div className="text-center py-8 text-gray-500">Loading school info...</div> : 
     schoolInfo.error ? <div className="text-center py-8 text-red-600">{schoolInfo.error}</div> : (
      <div className="flex justify-between items-start gap-2">
        <div className="w-28 h-28 md:w-36 md:h-36 border border-gray-00 relative">
          {schoolInfo.badge ? (
            <Image 
              src={getSchoolLogoUrl(schoolInfo.badge) || `/images/schoolsettings/${schoolInfo.badge}`} 
              alt="School Logo" 
              fill 
              className="object-cover" 
              sizes="(max-width: 768px) 112px, 144px" 
              priority 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : null}
        </div>
        <div className="text-center flex-grow">
          <h1 className="text-xl md:text-3xl font-bold text-[#000080] mb-1 font-serif">{schoolInfo.name}</h1>
          <div className="text-xs">
            <p className="font-bold">{schoolInfo.address}</p> <p className="font-bold">TEL: {schoolInfo.tel}</p>
            <p className="font-bold">Email: {schoolInfo.email}</p> <p className="font-bold">Website: {schoolInfo.website}</p>
            <h2 className="text-sm md:text-base font-bold mt-2 text-red-700 tracking-wider">{getReportTitle()}</h2>
          </div>
        </div>
        <div className="w-28 h-28 md:w-36 md:h-36 border border-gray-0 relative">
          {(() => {
            let studentPhoto = '';
            const photoCandidates = [studentInfo?.photo, studentInfo?.student_photo, student?.photo, student?.student_photo, student?.profilePhoto, student?.avatar, student?.image];
            
            // Debug: Log available photo data
            console.log('=== STUDENT PHOTO DEBUG ===');
            console.log('studentInfo:', studentInfo);
            console.log('student:', student);
            console.log('photoCandidates:', photoCandidates);
            
            // Find the first valid photo candidate
            for (const candidate of photoCandidates) {
              if (candidate && typeof candidate === 'string' && candidate.trim() !== '') {
                studentPhoto = candidate.trim();
                console.log('Selected photo candidate:', studentPhoto);
                break;
              }
            }
            
            // If no valid photo found, show blank (empty div)
            if (!studentPhoto) {
              console.log('No valid student photo found');
              return null;
            }
            
            // Construct the final photo source using Supabase only
            const supabasePhotoUrl = getStudentPhotoUrl(studentPhoto);
            console.log('Supabase photo URL:', supabasePhotoUrl);
            
            // If no Supabase URL generated, don't show image
            if (!supabasePhotoUrl) {
              console.log('No valid Supabase URL generated for photo:', studentPhoto);
              return null;
            }
            
            console.log('Final photo src:', supabasePhotoUrl);
            
              return (
                <Image 
                  src={supabasePhotoUrl}
                  alt="Student Photo" 
                  fill 
                  className="object-cover" 
                  sizes="(max-width: 768px) 224px, 488px" 
                  quality={100}
                  unoptimized 
                  priority 
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    console.error('Student photo failed to load:', supabasePhotoUrl);
                    target.style.display = 'none';
                  }} 
                />
              );
          })()}
        </div>
      </div>
    )}
  </div>
);
const StudentInfoSection = ({ studentInfo }: any) => (
  <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 p-2 border-b border-gray-600 text-xs">
    <span className="font-bold text-[#000080]">NAME: {studentInfo.fullName}</span> <span className="font-bold text-[#000080]">GENDER: {studentInfo.gender}</span>
    <span className="font-bold text-[#000080]">LIN: {studentInfo.schoolId}</span> <span className="font-bold text-[#000080]">TERM: {studentInfo.term}</span>
    <span className="font-bold text-[#000080]">YEAR: {studentInfo.year}</span> <span className="font-bold text-[#000080]">CLASS: {studentInfo.class}</span>
  </div>
);
function getDivisionGrade(aggs: number | null, assessmentArray: any[]): string {
  if (aggs === null || aggs === undefined) return 'N/A';
  const compulsorySubjects = assessmentArray.filter(subj => subj.isCompulsory);
  if (compulsorySubjects.length === 0) return 'N/A'; 
  const hasMissingOrZeroInCompulsory = compulsorySubjects.some(subj => {
      const scoreToCheck = subj.score ?? subj.average; 
      return scoreToCheck === null || scoreToCheck === undefined || String(scoreToCheck) === '-' || Number(scoreToCheck) === 0 || (subj.assessmentType === 'integrated' && (subj.mid === 0 || subj.eot === 0));
  });
  if (hasMissingOrZeroInCompulsory) return 'X';
  if (aggs >= 4 && aggs <= 12) return 'DIV I'; if (aggs >= 13 && aggs <= 24) return 'DIV II';
  if (aggs >= 25 && aggs <= 28) return 'DIV III'; if (aggs >= 29 && aggs <= 32) return 'DIV IV';
  if (aggs >= 33 && aggs <= 36) return 'U'; return 'N/A'; 
}
const AssessmentTables = ({ renderAssessmentTables }: any) => (<>{renderAssessmentTables()}</>);
const PromotionSection = ({ studentInfo, assessmentArray }: { studentInfo: any, assessmentArray: any[] }) => {
    // Only show promotion message in Term 3
    console.log('PromotionSection - studentInfo:', studentInfo);
    console.log('PromotionSection - assessmentArray:', assessmentArray);
    
    const currentTerm = (studentInfo.term || '').toLowerCase().trim();
    console.log('Current term:', currentTerm);
    
    const isTerm3 = currentTerm === 'term 3' || currentTerm === 'term three' || currentTerm === '3' || currentTerm === 'three';
    console.log('Is Term 3:', isTerm3);
    
    if (!isTerm3) {
        console.log('Not showing promotion - not Term 3');
        return null;
    }

    const getNextClass = (currentClass: string): string => {
        if (!currentClass) return 'the next class';
        
        const className = currentClass.trim().toLowerCase();
        
        // Handle nursery classes
        if (className.includes('baby') || className.includes('nursery')) {
            return 'Middle Class';
        }
        if (className.includes('middle')) {
            return 'Top Class';
        }
        if (className.includes('top')) {
            return 'Primary One';
        }
        
        // Handle primary classes (Primary One to Primary Seven)
        const primaryMatch = className.match(/(?:primary|p\.?|std\.?|class\s*)?(one|two|three|four|five|six|seven|1|2|3|4|5|6|7)/i);
        if (primaryMatch) {
            const numberMap: Record<string, string> = {
                'one': 'Primary Two', '1': 'Primary Two',
                'two': 'Primary Three', '2': 'Primary Three',
                'three': 'Primary Four', '3': 'Primary Four',
                'four': 'Primary Five', '4': 'Primary Five',
                'five': 'Primary Six', '5': 'Primary Six',
                'six': 'Primary Seven', '6': 'Primary Seven',
                'seven': 'Completed Primary', '7': 'Completed Primary'
            };
            const numStr = primaryMatch[1].toLowerCase();
            return numberMap[numStr] || 'the next class';
        }
        
        // Default mapping for common variations
        const classMap: Record<string, string> = {
            'baby class': 'Middle Class',
            'middle class': 'Top Class',
            'top class': 'Primary One',
            'p1': 'Primary Two',
            'p2': 'Primary Three',
            'p3': 'Primary Four',
            'p4': 'Primary Five',
            'p5': 'Primary Six',
            'p6': 'Primary Seven',
            'p7': 'Completed Primary',
            'i': 'II',
            'ii': 'III',
            'iii': 'IV',
            'iv': 'V',
            'v': 'VI',
            'vi': 'VII',
            'vii': 'Completed Primary'
        };
        
        return classMap[className] || 'the next class';
    };
    
    // For lower primary, we should show promotion even if assessment data is empty
    const isLowerPrimary = checkIsLowerPrimary(studentInfo.class);
    if (isLowerPrimary) {
        console.log('Lower primary student - showing promotion');
        return (
            <>
                <div className="border-t border-gray-600 my-2"></div>
                <p className="font-bold text-[#000080] text-center italic text-xs px-1">
                    KEY: C/W Class work, H/W Home work, ORG Organisation, S.PART Participation, S.MGT Self Mgt, MID Mid Term, EOT End of Term
                </p>
                <div className="border-t border-gray-600 my-2"></div>
                <p className="font-bold text-[#000080] text-center italic">Promoted to {getNextClass(studentInfo.class)}</p>
            </>
        );
    }
    
    if (!assessmentArray || assessmentArray.length === 0) {
        console.log('Not showing promotion - no assessment data');
        return null;
    }
    
    // Calculate the division grade from the assessment data
    const calculateDivisionGrade = () => {
        const compulsorySubjects = assessmentArray.filter((subj: any) => subj.isCompulsory);
        const totalAggregates = compulsorySubjects.reduce((sum: number, subj: any) => {
            return sum + (typeof subj.aggregate === 'number' ? subj.aggregate : 0);
        }, 0);
        
        // Get the division grade based on the total aggregates
        const divisionGrade = getDivisionGrade(totalAggregates, compulsorySubjects);
        console.log('Calculated division grade:', divisionGrade);
        return divisionGrade;
    };

    const divisionGrade = calculateDivisionGrade();
    const isPassingGrade = ['DIV I', 'DIV II', 'DIV III', 'DIV IV'].includes(divisionGrade);
    
    if (!isPassingGrade) {
        console.log('Not showing promotion - no passing grade. Current grade:', divisionGrade);
        return null;
    }
    
    return (
        <>
            <div className="border-t border-gray-600 my-2"></div>
            <p className="font-bold text-[#000080] text-center italic text-xs px-1">
                KEY: C/W Class work, H/W Home work, ORG Organisation, S.PART Participation, S.MGT Self Mgt, MID Mid Term, EOT End of Term
            </p>
            <div className="border-t border-gray-600 my-2"></div>
            <p className="font-bold text-[#000080] text-center italic">Promoted to {getNextClass(studentInfo.class)}</p>
        </>
    );
};
const AdminCommentsSection = ({ comments }: { comments: ReportData['comments'] }) => (
  <div className="grid grid-cols-2 border-t border-gray-600 mt-2 text-xs">
    <div className="p-2 border-r border-gray-600">
      <h4 className="font-bold text-[#000080]">CLASS TEACHER&apos;S COMMENT</h4>
      <p className="my-2 text-blue-600 min-h-[3em]">
        {(() => {
          const aggs = comments.aggs; const generalComment = comments.classTeacher; const rangeComments = comments.classTeacherComments; let foundComment: string | undefined;
          if (rangeComments && Array.isArray(rangeComments) && rangeComments.length > 0 && typeof aggs === 'number' && !Number.isNaN(aggs)) { const matched = rangeComments.find(r => aggs >= r.startMarks && aggs <= r.endMarks); if (matched) foundComment = matched.comment; }
          if (foundComment) return foundComment; if (generalComment) return generalComment; return "Refer to Class Teacher for overall assessment."; 
        })()}
      </p>
      <div className="border-t border-gray-600 -mx-2 my-1"></div><p className="font-bold text-[#000080] mt-1">SIGNATURE</p><div className="h-10 mt-1"></div> 
    </div>
    <div className="p-2">
      <h4 className="font-bold text-[#000080]">HEAD TEACHER&apos;S COMMENT</h4>
      <p className="my-2 text-blue-600 min-h-[3em]">
        {(() => {
          const aggs = comments.aggs; const generalComment = comments.headTeacher; const rangeComments = comments.headTeacherComments; let foundComment: string | undefined;
          if (rangeComments && Array.isArray(rangeComments) && rangeComments.length > 0 && typeof aggs === 'number' && !Number.isNaN(aggs)) { const matched = rangeComments.find(r => aggs >= r.startMarks && aggs <= r.endMarks); if (matched) foundComment = matched.comment; }
          if (foundComment) return foundComment; if (generalComment) return generalComment; return "Refer to Head Teacher for overall assessment."; 
        })()}
      </p>
      <div className="border-t border-gray-600 -mx-2 my-1"></div><p className="font-bold text-[#000080] mt-1">SIGNATURE</p>
      <div className="flex items-center justify-center h-20 mt-0">
        <Image 
          src={getHMSignatureUrl() || "/images/signature/hmsignature.png"} 
          alt="Head Teacher Signature" 
          width={160} 
          height={65} 
          className="object-contain max-h-10" 
          style={{ width: 'auto', height: 'auto' }}
          priority 
          onError={(e) => { 
            const target = e.target as HTMLImageElement; 
            target.style.display = 'none'; 
            const parent = target.parentElement;
            if (parent) {
              const placeholder = document.createElement('div'); 
              placeholder.className = 'h-9 w-full flex items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded text-xs'; 
              placeholder.innerText = 'Signature image missing'; 
              parent.appendChild(placeholder);
            }
          }} 
        />
      </div>
    </div>
  </div>
);
const FooterSection = ({ dates, formatDate, schoolInfo, gradingRows }: any) => {
  let gradingScaleStr = '';
  if (gradingRows && gradingRows.length > 0) { const sorted = [...gradingRows].sort((a: GradingRow, b: GradingRow) => (b.startMarks ?? 0) - (a.startMarks ?? 0)); gradingScaleStr = sorted.map((row: GradingRow) => `${String(row.startMarks ?? 0).padStart(2, '0')} - ${String(row.endMarks).padStart(2,'0')} = ${row.grade}`).join(' | ');
  } else { gradingScaleStr = 'Grading scale not available for this class.'; }
  return (<><div className="grid grid-cols-2 text-xs border-t border-gray-600"><div className="p-2 border-r border-gray-600"><p><span className="font-bold text-[#000080]">Term Ends: </span>{formatDate(dates.termEnds)}</p><div className="border-t border-gray-600 -mx-2 my-1"></div><p className="mt-1 italic">Invalid without school stamp & Signature.</p></div><div className="p-2"><p><span className="font-bold text-[#000080]">Next Term Starts On: </span>{formatDate(dates.nextTermBegins)}</p><div className="border-t border-gray-600 -mx-2 my-1"></div><div className="mt-1"><p className="font-bold text-[#000080]">Grading Scale (Score = Agg.)</p><p className="text-[0.65rem] leading-tight">{gradingScaleStr}</p></div></div></div><div className="p-2 text-center border-t border-gray-600 font-bold italic text-[#000080] text-xs">{schoolInfo.loading ? '...' : schoolInfo.motto ? `****** ${schoolInfo.motto} ******` : '****** SCHOOL MOTTO ******'}</div></>);
};

const StudentReport = ({ student, gradingRows }: { student: StudentWithClass, gradingRows: GradingRow[] }) => {
  const searchParams = useSearchParams();
  const reportType = useMemo(() => getReportTypeFromParams(searchParams), [searchParams]);
  const [schoolInfo, setSchoolInfo] = useState<{name: string; address: string; tel: string; email: string; website: string; motto: string; badge: string; loading: boolean; error: string | null;}>({ name: '', address: '', tel: '', email: '', website: '', motto: '', badge: '', loading: true, error: null });
  useEffect(() => { const fetchSchoolInfo = async () => { setSchoolInfo(prev => ({ ...prev, loading: true, error: null })); try { const accessToken = localStorage.getItem('accessToken'); if (!accessToken) throw new Error('Auth token missing.'); const res = await fetch(`${env.BACKEND_API_URL}/api/v1/settings/view`, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }}); if (!res.ok) { const errData = await res.json().catch(()=>({})); throw new Error(errData?.status?.returnMessage || `Network error: ${res.status}`);} const data = await res.json(); if (data?.status?.returnCode === '00' && data?.data) { setSchoolInfo({name:data.data.schoolName||'', address:data.data.schoolAddress||'', tel:data.data.phoneNumber||'', email:data.data.email||'', website:data.data.website||'', motto:data.data.schoolMotto||'', badge:data.data.schoolBadge||'', loading:false, error:null}); } else { throw new Error(data?.status?.returnMessage || 'Failed to parse school info');}} catch (err: any) { setSchoolInfo(prev => ({ ...prev, loading:false, error: err.message || 'Error school info'}));}}; fetchSchoolInfo();}, []);
  const studentInfo = student.studentInfo; const realAssessments = student.assessments; const comments = student.comments; const dates = student.dates;
  const normalizedIntegratedData = useMemo(() => (realAssessments.integrated || []).map((s: IntegratedAssessment) => ({...s, ca:normalizeIntegratedMark(s.ca), mid:normalizeIntegratedMark(s.mid), eot:normalizeIntegratedMark(s.eot), total:normalizeIntegratedMark(s.total), average:normalizeIntegratedMark(s.average), aggregate: s.aggregate??null})), [realAssessments.integrated]);
  const isLower = useMemo(() => checkIsLowerPrimary(studentInfo.class), [studentInfo.class]);
  const formatDate = (dateString: string) => { if (!dateString) return 'N/A'; try { const date = new Date(dateString); if (isNaN(date.getTime())) return 'N/A'; return date.toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});} catch (e) {return 'N/A';}};
  const getReportTitle = useCallback(() => { const level = isLower ? "LOWER" : "UPPER"; if (reportType === 'integrated' || (reportType === 'all' && isLower)) return `${level} PRIMARY INTEGRATED TERMLY ASSESSMENT REPORT`; if (reportType === 'all' && !isLower) return `${level} PRIMARY TERMLY PROGRESS REPORT`; const map:Record<string,string> = {'bot':'BEGINNING OF TERM', 'mid':'MID TERM', 'eot':'END OF TERM', 'ca':'CONTINUOUS ASSESSMENT'}; return `${level} PRIMARY ${map[reportType]||'TERMLY'} REPORT`; }, [reportType, isLower]);
  const getAssessmentDataForPromotion = useCallback(() => { 
    const reportTypeFromUrl = searchParams?.get('type')?.toUpperCase() || 'ALL';
    console.log('getAssessmentDataForPromotion - reportType from URL:', reportTypeFromUrl);
    
    let data;
    if (isLower) {
        // For lower primary, we should use integrated data if available, otherwise fall back to EOT
        data = realAssessments.integrated?.length > 0 ? realAssessments.integrated : realAssessments.eot;
        console.log('Lower primary assessment data:', data);
    } else {
        if (reportTypeFromUrl === 'ALL' || reportTypeFromUrl === 'INTEGRATED') {
            data = realAssessments.integrated || [];
        } else if (reportTypeFromUrl === 'EOT') {
            data = realAssessments.eot || [];
        } else if (reportTypeFromUrl === 'MID') {
            data = realAssessments.mid || [];
        } else if (reportTypeFromUrl === 'BOT') {
            data = realAssessments.bot || [];
        } else {
            data = realAssessments.integrated || realAssessments.eot || [];
        }
    }
    
    console.log('getAssessmentDataForPromotion - selected data:', data);
    return data || [];
  }, [realAssessments, searchParams, isLower]);
  const sortSubjectsByCompulsory = <T extends { isCompulsory?: boolean; subject: string }>(subjects: T[]): T[] => [...subjects].sort((a,b) => {if(a.isCompulsory && !b.isCompulsory) return -1; if(!a.isCompulsory && b.isCompulsory) return 1; return a.subject.localeCompare(b.subject);});
  const computeTableAGGS = (assessmentArray: (RegularAssessment | IntegratedAssessment)[]) => { if (!assessmentArray || assessmentArray.length === 0) return null; const compAggs = assessmentArray.filter(s => s.isCompulsory && typeof s.aggregate === 'number').map(s => s.aggregate as number); if (compAggs.length === 0) return null; return compAggs.reduce((sum, agg) => sum + agg, 0);};
  const renderSingleAssessmentTable = (title: string, assessmentArray: RegularAssessment[]) => { const sortedData = sortSubjectsByCompulsory(assessmentArray); const tableAggs = computeTableAGGS(sortedData); const divisionGrade = getDivisionGrade(tableAggs, sortedData); return (<><table className="w-full border-collapse border border-gray-600 text-xs mt-2"><thead><tr><th colSpan={5} className="border border-gray-600 bg-gray-100 px-2 py-1 text-left font-bold text-[#000080]">{title}</th></tr><tr className="bg-gray-100"><th className="border border-gray-600 px-2 py-1">SUBJECT</th><th className="border border-gray-600 px-1 py-1 text-center">Score</th><th className="border border-gray-600 px-1 py-1 text-center">Agg.</th><th className="border border-gray-600 px-2 py-1">REMARKS</th><th className="border border-gray-600 px-1 py-1 text-center">Init.</th></tr></thead><tbody>{sortedData.length === 0 ? (<tr><td colSpan={5} className="border border-gray-600 px-2 py-3 text-center text-gray-500">No data available</td></tr>) : (sortedData.map((s, i) => (<tr key={`${s.subjectId}-${i}`}><td className="border border-gray-600 px-2 py-1 font-bold">{s.subject}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.score)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.aggregate)}</td><td className="border border-gray-600 px-2 py-1 text-blue-600">{s.remarks}</td><td className="border border-gray-600 px-1 py-1 text-center">{s.initials}</td></tr>)))}</tbody></table><div className="text-center mt-1"><span className="font-bold text-xs">AGGREGATES: {tableAggs ?? 'N/A'} | GRADE: {divisionGrade}</span></div></>);};
  const renderIntegratedTable = () => { const sortedData = sortSubjectsByCompulsory(normalizedIntegratedData); const tableAggs = computeTableAGGS(sortedData); const divisionGrade = getDivisionGrade(tableAggs, sortedData); return (<><table className="w-full border-collapse border border-gray-600 text-xs mt-2"><thead><tr><th colSpan={9} className="border border-gray-600 bg-gray-100 px-2 py-1 text-center font-bold text-[#000080]">FINAL ASSESSMENT</th></tr><tr className="bg-gray-100"><th className="border border-gray-600 px-2 py-1">SUBJECT</th><th className="border border-gray-600 px-1 py-1 text-center">C.A</th><th className="border border-gray-600 px-1 py-1 text-center">MID</th><th className="border border-gray-600 px-1 py-1 text-center">EOT</th><th className="border border-gray-600 px-1 py-1 text-center">TOTAL</th><th className="border border-gray-600 px-1 py-1 text-center">AVG</th><th className="border border-gray-600 px-1 py-1 text-center">Agg.</th><th className="border border-gray-600 px-2 py-1">REMARKS</th><th className="border border-gray-600 px-1 py-1 text-center">Init.</th></tr></thead><tbody>{sortedData.length === 0 ? (<tr><td colSpan={9} className="border border-gray-600 px-2 py-3 text-center text-gray-500">No data</td></tr>) : (sortedData.map((s, i) => (<tr key={`${s.subjectId}-${i}`}><td className="border border-gray-600 px-2 py-1 font-bold">{s.subject}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.ca)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.mid)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.eot)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.total)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.average)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.aggregate)}</td><td className="border border-gray-600 px-2 py-1 text-blue-600">{s.remarks}</td><td className="border border-gray-600 px-1 py-1 text-center">{s.initials||''}</td></tr>)))}</tbody></table><div className="text-center mt-1"><span className="font-bold text-xs">AGGREGATES: {tableAggs ?? 'N/A'} | GRADE: {divisionGrade}</span></div></>);};
  const renderCATable = () => { const caData = realAssessments.ca || []; const sortedData = sortSubjectsByCompulsory(caData); return (<table className="w-full border-collapse border border-gray-600 text-xs mt-2"><thead><tr><th colSpan={8} className="border border-gray-600 bg-gray-100 px-2 py-1 text-center font-bold text-[#000080]">CONTINUOUS ASSESSMENT (C.A) SCORES</th></tr><tr className="bg-gray-100"><th className="border border-gray-600 px-2 py-1">SUBJECT</th><th className="border border-gray-600 px-1 py-1 text-center">C/W</th><th className="border border-gray-600 px-1 py-1 text-center">H/W</th><th className="border border-gray-600 px-1 py-1 text-center">ORG</th><th className="border border-gray-600 px-1 py-1 text-center">S.PART</th><th className="border border-gray-600 px-1 py-1 text-center">S.MGT</th><th className="border border-gray-600 px-1 py-1 text-center">TOTAL</th><th className="border border-gray-600 px-1 py-1 text-center">Init.</th></tr></thead><tbody>{sortedData.length === 0 ? (<tr><td colSpan={8} className="border border-gray-600 px-2 py-3 text-center text-gray-500">No data</td></tr>) : (sortedData.map((s, i) => (<tr key={`${s.subjectId}-${i}`}><td className="border border-gray-600 px-2 py-1 font-bold">{s.subject}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.cw)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.hw)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.org)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.sp)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.sm)}</td><td className="border border-gray-600 px-1 py-1 text-center">{formatMarkDisplay(s.total)}</td><td className="border border-gray-600 px-1 py-1 text-center">{s.initials||''}</td></tr>)))}</tbody></table>);};
  const renderAssessmentTables = () => { 
    const p2 = "p-2"; 
    const reportTypeFromUrl = searchParams?.get('type')?.toUpperCase() || 'ALL';
    console.log('renderAssessmentTables - reportType from URL:', reportTypeFromUrl);
    
    // Check if this is historical data by examining the URL
    const isHistoricalView = window.location.href.includes('historical');
    console.log('Is historical view:', isHistoricalView);
    
    // Use the same rendering logic for both current year and historical data
    if (isLower) { 
        switch (reportTypeFromUrl) { 
            case 'CA': return <div className={p2}>{renderCATable()}</div>; 
            case 'BOT': return <div className={p2}>{renderSingleAssessmentTable('BEGINNING OF TERM', realAssessments.bot)}</div>; 
            case 'MID': return <div className={p2}>{renderSingleAssessmentTable('MID TERM', realAssessments.mid)}</div>; 
            case 'EOT': return <div className={p2}>{renderSingleAssessmentTable('END OF TERM', realAssessments.eot)}</div>; 
            case 'ALL': 
            case 'INTEGRATED': return (<><div className={p2}>{renderCATable()}</div><div className={p2}>{renderIntegratedTable()}</div></>); 
            default: return <div className={`${p2} text-center text-gray-500 text-xs`}>Report type not configured for Lower Primary.</div>; 
        }
    } else { 
        switch (reportTypeFromUrl) { 
            case 'BOT': return <div className={p2}>{renderSingleAssessmentTable('BEGINNING OF TERM', realAssessments.bot)}</div>; 
            case 'MID': return <div className={p2}>{renderSingleAssessmentTable('MID TERM', realAssessments.mid)}</div>; 
            case 'EOT': return <div className={p2}>{renderSingleAssessmentTable('END OF TERM', realAssessments.eot)}</div>; 
            case 'ALL': return (<><div className={p2}>{renderSingleAssessmentTable('MID TERM RESULTS', realAssessments.mid)}</div><div className={p2}>{renderSingleAssessmentTable('END OF TERM RESULTS', realAssessments.eot)}</div></>); 
            case 'INTEGRATED': return <div className={p2}>{renderSingleAssessmentTable('END OF TERM (FINAL)', realAssessments.eot)}</div>; 
            default: return <div className={`${p2} text-center text-gray-500 text-xs`}>Report type not configured for Upper Primary.</div>; 
        }
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 p-2 print:p-0">
      <div className="max-w-4xl mx-auto bg-white border-2 border-gray-600 text-sm print:border-2 print:border-gray-600">
        <SchoolHeader 
          schoolInfo={schoolInfo} 
          studentInfo={studentInfo} 
          getReportTitle={getReportTitle} 
          student={student} 
        />
        <div className="p-4 print:p-0">
          <StudentInfoSection studentInfo={studentInfo} />
          {renderAssessmentTables()}
          {(() => {
            const promoData = getAssessmentDataForPromotion();
            console.log('Rendering PromotionSection with:', { 
              studentInfo, 
              grade: studentInfo.finalGrade?.grade,
              assessmentArray: promoData 
            });
            return (
              <PromotionSection 
                studentInfo={studentInfo} 
                assessmentArray={promoData} 
              />
            );
          })()}
          <AdminCommentsSection comments={comments} />
          <FooterSection 
            dates={dates} 
            formatDate={formatDate} 
            schoolInfo={schoolInfo} 
            gradingRows={gradingRows} 
          />
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const ReportsPageContent = () => {
  const searchParams = useSearchParams();
  const [studentsWithReports, setStudentsWithReports] = useState<StudentWithClass[]>([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setError('Authentication required. Please sign in.');
      setLoading(false);
      return;
    }
  }, []);

  const reportTypeForFetching = useMemo(() => getReportTypeFromParams(searchParams), [searchParams]);
  const getAuthHeaders = useCallback(() => { 
    const token = localStorage.getItem('accessToken'); 
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  const fetchClassTeacherCommentRanges = useCallback(async (classId?: string, termId?: string, academicYearId?: string): Promise<CommentRange[]> => {
    if (!classId || !termId || !academicYearId) return [];
    try {
      const res = await fetch(`${env.BACKEND_API_URL}/api/v1/classteacherscomments/comments?academicYearId=${academicYearId}&termId=${termId}&classId=${classId}`, { headers: getAuthHeaders() });
      if (!res.ok) { console.warn(`CT Comment Ranges fetch failed: ${res.status} ${res.statusText}`); return []; }
      const data = await res.json(); return data.data?.comments || data.comments || [];
    } catch (e) { console.error("Error fetching CT comment ranges:", e); return []; }
  }, [getAuthHeaders]);

  const fetchHeadTeacherCommentRanges = useCallback(async (classId?: string, termId?: string, academicYearId?: string): Promise<CommentRange[]> => {
    if (!classId || !termId || !academicYearId) return [];
    try {
      const res = await fetch(`${env.BACKEND_API_URL}/api/v1/headteacherscomments/comments?academicYearId=${academicYearId}&termId=${termId}&classId=${classId}`, { headers: getAuthHeaders() });
      if (!res.ok) { console.warn(`HT Comment Ranges fetch failed: ${res.status} ${res.statusText}`); return []; }
      const data = await res.json(); return data.data?.comments || data.comments || [];
    } catch (e) { console.error("Error fetching HT comment ranges:", e); return []; }
  }, [getAuthHeaders]);
  
  const fetchCAMarks = useCallback(async (
    studentId: string, termId: string, academicYearId: string, 
    studentCaExamSetId?: string, generalExamSetId?: string, 
    subjectTeacherMap?: Map<string, string>, allSubjects?: Subject[]
  ): Promise<ContinuousAssessment[]> => {
    try {
      const effectiveCaExamSetId = studentCaExamSetId || generalExamSetId;
      if (!effectiveCaExamSetId) {
        console.warn(`No CA ExamSetID for ${studentId}`);
        return [];
      }
      const res = await fetch( `${env.BACKEND_API_URL}/api/v1/marks/student-ca?studentId=${studentId}&termId=${termId}&academicYearId=${academicYearId}&examSetId=${effectiveCaExamSetId}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        console.error(`CA fetch failed for ${studentId}: ${res.statusText}`);
        return [];
      }
      const rawData = await res.json();
      return (rawData.data?.subjects||[]).map((s:any) => {
        let cw=null,hw=null,org=null,sp=null,sm=null;
        if(s.caComponents&&Array.isArray(s.caComponents)){
          const f=(n:string)=>parseMarkValue(s.caComponents.find((c:any)=>c.component===n)?.mark);
          cw=f('CW');hw=f('HW');org=f('ORG');sp=f('SPART');sm=f('SMGT');
        }
        const vC=[cw,hw,org,sp,sm].filter(m=>m!==null&&m!==-1)as number[];
        const total=vC.length>0?vC.reduce((sum,m)=>sum+m,0):null;
        const sD=allSubjects?.find(sub=>sub.id===s.subjectId);
        return{subject:s.subjectName,subjectId:s.subjectId,cw,hw,org,sp,sm,total,initials:subjectTeacherMap?.get(s.subjectId)||"N/A",isCompulsory:sD?.isCompulsory??false};
      });
    } catch (e) { 
      console.error("Error CA marks:", e); 
      return []; 
    }
  }, [getAuthHeaders]);

  const fetchTeacherAssignments = useCallback(async (classId?: string, termId?: string, academicYearId?: string): Promise<Map<string, string>> => {
    const map = new Map<string,string>();
    if(!classId) return map;
    try {
      // Build the URL with optional termId and academicYearId parameters
      let url = `${env.BACKEND_API_URL}/api/v1/teacher-subject-assignments/assignments?classId=${classId}`;
      if(termId) url += `&termId=${termId}`;
      if(academicYearId) url += `&academicYearId=${academicYearId}`;
      
      const res = await fetch(url, {headers:getAuthHeaders()});
      if(!res.ok){ console.warn('Teacher assignments fetch failed'); return map; }
      const data=await res.json();
      if(data?.data?.assignments){
        data.data.assignments.forEach((a:any)=>{
          if(a.subjectActivityId&&a.user?.first_name&&a.user?.last_name){
            const fI=a.user.first_name[0]?.toUpperCase()||'';
            const lI=a.user.last_name[0]?.toUpperCase()||'';
            map.set(a.subjectActivityId,`${fI}.${lI}`.replace("..",""));
          }
        });
      }
    } catch(e) { console.error('Error teacher assignments:',e); }
    return map;
  },[getAuthHeaders]);

  const fetchTermDates = useCallback(async (classId?: string) => {
    if(!classId) return {termEnds:'',nextTermBegins:''};
    try {
      const res = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`,{headers:getAuthHeaders()});
      if(!res.ok) throw new Error('Failed active term fetch');
      const termData=await res.json();
      if(!termData.success||!termData.term?.classTermSchedules) return{termEnds:'',nextTermBegins:''};
      const schedule=termData.term.classTermSchedules.find((s:any)=>s.class?.id===classId||s.class===classId);
      // Ensure the API field for next term begins is correctly referenced.
      // Common names: nextTermBeginsDate, next_term_begins_date, nextTermStartDate, or even current term's startDate for next term's beginning
      return schedule ? {termEnds:schedule.endDate, nextTermBegins: schedule.nextTermBeginsDate || schedule.startDate } : {termEnds:'',nextTermBegins:''};
    } catch(e) {
      console.error('Error term dates:',e);
      return {termEnds:'',nextTermBegins:''};
    }
  },[getAuthHeaders]);

  const fetchGradingScale = useCallback(async (classId?:string, academicYearId?:string, termId?:string): Promise<GradingRow[]> => {
    if(!classId||!academicYearId||!termId) return [];
    try {
      const url=`${env.BACKEND_API_URL}/api/v1/grading-scales?classId=${classId}&academicYearId=${academicYearId}&termId=${termId}`;
      const res = await fetch(url,{headers:getAuthHeaders()});
      if(!res.ok){ console.warn('Grading scale fetch failed'); return []; }
      const data=await res.json();
      let rows=data.data?.gradingScale?.gradingRows||(Array.isArray(data.data?.gradingScales)&&data.data.gradingScales[0]?.gradingRows)||(Array.isArray(data.data)&&data.data[0]?.gradingRows)||[];
      return rows.map((r:any,i:number,arr:any[])=>{
        const sA=[...arr].sort((a,b)=>a.endMarks-b.endMarks);
        // Assuming rows have a unique 'id' property for findIndex
        const cSI=sA.findIndex(item=>item.id===r.id || (item.grade === r.grade && item.endMarks === r.endMarks)); // Fallback if no ID
        return{...r,startMarks:r.startMarks??(cSI>0?sA[cSI-1].endMarks+1:0)};
      }).sort((a:GradingRow,b:GradingRow)=>(a.startMarks??0)-(b.startMarks??0));
    } catch(e) {
      console.error('Error grading scale:',e);
      return [];
    }
  },[getAuthHeaders]);

  // Optimized function to fetch all student marks in parallel
  const fetchAllStudentMarks = useCallback(async (
    students: StudentWithClass[], 
    examSetIds: { ca?: string, bot?: string, mid?: string, eot?: string },
    termId: string,
    academicYearId: string,
    classId: string,
    isHistorical: boolean,
    subjectTeacherMap: Map<string, string>,
    allSubjects: Subject[]
  ) => {
    console.log('Fetching marks for all students in parallel...');
    
    // Create all API calls for all students at once
    const allApiCalls = students.flatMap(student => {
      const studentTermId = student?.termId || termId;
      const studentAcademicYearId = student?.academicYearId || academicYearId;
      
      const calls = [];
      
      // CA marks call
      if (examSetIds.ca) {
        calls.push({
          type: 'CA',
          studentId: student.id,
          promise: fetchCAMarks(
            student.id, 
            studentTermId, 
            studentAcademicYearId, 
            examSetIds.ca, 
            undefined, 
            subjectTeacherMap, 
            allSubjects
          )
        });
      }
      
      // Assessment marks calls (BOT, MID, EOT)
      const assessmentTypes = [
        { type: 'BOT', examSetId: examSetIds.bot },
        { type: 'MID', examSetId: examSetIds.mid },
        { type: 'EOT', examSetId: examSetIds.eot }
      ];
      
      assessmentTypes.forEach(({ type, examSetId }) => {
        if (examSetId) {
          const url = `${env.BACKEND_API_URL}/api/v1/marks/student?studentId=${student.id}&termId=${studentTermId}&academicYearId=${studentAcademicYearId}&examSetId=${examSetId}&assessmentType=${type}&classId=${classId}${isHistorical ? '&includeHistorical=true' : ''}`;
          
          calls.push({
            type,
            studentId: student.id,
            promise: fetch(url, { headers: getAuthHeaders() })
              .then(res => res.ok ? res.json() : { data: { marks: [] } })
              .then(data => data.data?.marks || [])
              .catch(err => {
                console.error(`Error fetching ${type} marks for ${student.id}:`, err);
                return [];
              })
          });
        }
      });
      
      return calls;
    });
    
    console.log(`Making ${allApiCalls.length} API calls in parallel...`);
    
    // Execute all API calls in parallel
    const results = await Promise.allSettled(allApiCalls.map(call => 
      call.promise.then(result => ({ ...call, result }))
    ));
    
    // Organize results by student and assessment type
    const studentResults = new Map();
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { type, studentId, result: data } = result.value;
        
        if (!studentResults.has(studentId)) {
          studentResults.set(studentId, { ca: [], bot: [], mid: [], eot: [] });
        }
        
        const studentData = studentResults.get(studentId);
        
        if (type === 'CA') {
          studentData.ca = data;
        } else {
          // Process regular assessment marks
          const regAss = data.map((m: any) => {
            const sD = allSubjects.find(s => s.id === m.subjectId);
            const score = parseMarkValue(m.mark);
            const isC = sD?.isCompulsory || false;
            const agg = isC ? getAggregateFromGradingRows(score, []) : null; // Will be updated later with grading system
            const rem = isC ? calculateRemarks(score, [], isC) : '';
            return {
              subject: sD?.name || m.subjectName || 'Unknown',
              subjectId: m.subjectId!,
              score,
              aggregate: agg,
              remarks: rem,
              initials: subjectTeacherMap.get(m.subjectId!) || '',
              isCompulsory: isC
            };
          });
          
          studentData[type.toLowerCase() as 'bot' | 'mid' | 'eot'] = regAss;
        }
      } else {
        console.error('API call failed:', result.reason);
      }
    });
    
    return studentResults;
  }, [getAuthHeaders, fetchCAMarks]);

  // Optimized function to fetch historical student data in batch
  const fetchHistoricalStudentsData = useCallback(async (historicalStudents: StudentWithClass[]) => {
    if (historicalStudents.length === 0) return new Map();
    
    console.log(`Fetching data for ${historicalStudents.length} historical students...`);
    
    // Group students by identifier type to minimize API calls
    const studentsByIdentifier = new Map<string, StudentWithClass[]>();
    
    historicalStudents.forEach(student => {
      const identifiers = [
        { param: 'id', value: student.id },
        { param: 'schoolId', value: student.schoolId },
        { param: 'lin_number', value: student.lin_number }
      ].filter(item => item.value && item.value.trim() !== '');
      
      // Use the first available identifier
      if (identifiers.length > 0) {
        const key = `${identifiers[0].param}=${identifiers[0].value}`;
        if (!studentsByIdentifier.has(key)) {
          studentsByIdentifier.set(key, []);
        }
        studentsByIdentifier.get(key)!.push(student);
      }
    });
    
    // Make API calls for unique identifiers
    const apiCalls = Array.from(studentsByIdentifier.keys()).map(async (identifierKey) => {
      try {
        const res = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?${identifierKey}`, {
          headers: getAuthHeaders()
        });
            
        if (!res.ok) return { identifierKey, data: null };
        
        const data = await res.json();
        return { identifierKey, data: data?.data?.students || [] };
      } catch (e) {
        console.error(`Error fetching students for ${identifierKey}:`, e);
        return { identifierKey, data: null };
      }
    });
    
    const results = await Promise.allSettled(apiCalls);
    const studentDataMap = new Map();
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        const { identifierKey, data } = result.value;
        const studentsForThisKey = studentsByIdentifier.get(identifierKey) || [];
        
        studentsForThisKey.forEach(student => {
          // Find matching student in API response
          const matchedStudent = data.find((s: any) => {
            return s.id === student.id || 
                   s.lin_number === student.schoolId || 
                   s.lin_number === student.lin_number ||
                   (s.first_name === student.first_name && s.last_name === student.last_name);
          });
          
          if (matchedStudent) {
            studentDataMap.set(student.id, {
              photo: matchedStudent.student_photo || matchedStudent.photo || '',
              gender: matchedStudent.gender || ''
            });
          }
        });
      }
    });
    
    return studentDataMap;
  }, [getAuthHeaders]);

  const fetchAllMarks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let students: StudentWithClass[] = JSON.parse(sessionStorage.getItem('report_students') || '[]');
      
      console.log("Initial students from session storage:", students);

      if (!students.length) {
        setError('No students for reports.'); setStudentsWithReports([]); setLoading(false); return; }
      
      // Get filters from session storage
      const filters = JSON.parse(sessionStorage.getItem('report_filters') || '{}');
      const isHistorical = filters.isHistorical || students.some(s => s.isHistorical);
      const isConsolidated = filters.isConsolidated || false;
      
      // Get report type from URL params
      const reportTypeFromUrl = searchParams?.get('type')?.toUpperCase() || 'ALL';
      console.log('Report type from URL:', reportTypeFromUrl);

      const headers = getAuthHeaders();
      
      const firstStudent = students[0];
      const classId = firstStudent?.classId || firstStudent?.classInfo?.id || (firstStudent as any)?.class_assigned_to_class?.id;
      const academicYearId = firstStudent?.academicYearId; 
      const termId = firstStudent?.termId;
      const generalExamSetIdFromUrl = searchParams?.get('examSetId') || undefined;

      // For historical data, ensure we use the correct exam set IDs from URL params
      const caExamSetId = searchParams?.get('caExamSetId') || (isHistorical ? filters.caExamSetId : (firstStudent?.caExamSetId || generalExamSetIdFromUrl));
      const botExamSetId = searchParams?.get('botExamSetId') || (isHistorical ? filters.botExamSetId : (firstStudent?.botExamSetId || generalExamSetIdFromUrl));
      const midExamSetId = searchParams?.get('midExamSetId') || (isHistorical ? filters.midExamSetId : (firstStudent?.midExamSetId || generalExamSetIdFromUrl));
      const eotExamSetId = searchParams?.get('eotExamSetId') || (isHistorical ? filters.eotExamSetId : (firstStudent?.eotExamSetId || generalExamSetIdFromUrl));

      console.log('Using exam set IDs:', {
        caExamSetId,
        botExamSetId,
        midExamSetId,
        eotExamSetId,
        isHistorical,
        isConsolidated
      });

      // Fetch all common data in parallel (7 API calls total)
      console.log('Fetching common data in parallel...');
      const [
        subjectsData,
        subjectTeacherMap, 
        termDatesData, 
        gradingSystem, 
        headTeacherCommentRangesRaw, 
        classTeacherCommentRangesRaw
      ] = await Promise.all([
        fetch(`${env.BACKEND_API_URL}/api/v1/subjects/filter?limit=200`, { headers }).then(res => res.json()),
        fetchTeacherAssignments(classId, termId, academicYearId), 
        fetchTermDates(classId), 
        fetchGradingScale(classId, academicYearId, termId),
        fetchHeadTeacherCommentRanges(classId, termId, academicYearId),
        fetchClassTeacherCommentRanges(classId, termId, academicYearId)
      ]);
      
      const allSubjects: Subject[] = (subjectsData.subjects||subjectsData.data?.subjects||[]).map((s:any)=>({id:s.id,code:s.code||'',name:s.name,isCompulsory:s.isCompulsory||false}));

      // Identify historical students that need additional data
      const historicalStudents = students.filter(s => 
        s.isHistorical && (
          (!s.photo && !s.student_photo) || 
          (!s.gender || s.gender.trim() === '')
        )
      );

      // Fetch historical student data in parallel (reduced API calls)
      const historicalStudentDataMap = await fetchHistoricalStudentsData(historicalStudents);

      // Fetch all student marks in parallel (N×4 API calls, but all in parallel)
      const examSetIds = {
        ca: caExamSetId,
        bot: botExamSetId,
        mid: midExamSetId,
        eot: eotExamSetId
      };
      
      const studentMarksMap = await fetchAllStudentMarks(
        students,
        examSetIds,
        termId!,
        academicYearId!,
        classId!,
        isHistorical,
        subjectTeacherMap,
        allSubjects
      );

      // Process all students with the fetched data
      const processedStudents: StudentWithClass[] = [];
      
      for (const student of students) {
        const studentFilters = JSON.parse(sessionStorage.getItem('report_filters') || '{}');
        
        // Get student data
        const studentName = `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.trim() || student.name || 'Unknown Student';
        const studentClass = student.isHistorical ? student.originalClassName : (student.classInfo?.name || student.class_assigned || student.class || '');
        const studentId = student.lin_number || student.schoolId || student.admissionNumber || 'N/A';

        // Get photo and gender data
        let studentPhoto = student.photo || student.student_photo || '';
        let studentGender = student.gender || '';
        
        // Use fetched historical data if available
        const historicalData = historicalStudentDataMap.get(student.id);
        if (historicalData) {
          if (!studentPhoto || studentPhoto.trim() === '') {
            studentPhoto = historicalData.photo;
          }
          if (!studentGender || studentGender.trim() === '') {
            studentGender = historicalData.gender;
          }
        }

        const finalGender = studentGender || 'N/A';

        // Get marks data
        const marksData = studentMarksMap.get(student.id) || { ca: [], bot: [], mid: [], eot: [] };

        // Update aggregates and remarks with proper grading system
        ['bot', 'mid', 'eot'].forEach(type => {
          marksData[type as 'bot' | 'mid' | 'eot'].forEach((assessment: any) => {
            if (assessment.isCompulsory) {
              assessment.aggregate = getAggregateFromGradingRows(assessment.score, gradingSystem);
              assessment.remarks = calculateRemarks(assessment.score, gradingSystem, assessment.isCompulsory);
            }
          });
        });

        const currentStudent: StudentWithClass = { 
          ...student, 
          assessments: marksData, 
          finalGrade: { aggs: null, grade: 'N/A' },
          comments: { 
            classTeacher: '', // Could be optimized further if needed
            headTeacher: student.comments?.headTeacher || '',
            aggs: undefined, 
            headTeacherComments: headTeacherCommentRangesRaw, 
            classTeacherComments: classTeacherCommentRangesRaw 
          },
          dates: { termEnds: termDatesData?.termEnds || '', nextTermBegins: termDatesData?.nextTermBegins || '' },
          studentInfo: { 
            fullName: studentName,
            gender: finalGender,
            schoolId: studentId,
            term: studentFilters.selectedTerm?.name || student.term || '', 
            year: studentFilters.selectedYear?.name || student.year || '', 
            class: studentClass,
            photo: studentPhoto,
            finalGrade: student.finalGrade || { aggs: null, grade: 'N/A' }
          },
          gradingRows: gradingSystem, 
        };

        // Generate integrated assessments
        const uniqueSubjectIds = new Set<string>(); 
        [...currentStudent.assessments.ca, ...currentStudent.assessments.bot, ...currentStudent.assessments.mid, ...currentStudent.assessments.eot].forEach(a => a.subjectId && uniqueSubjectIds.add(a.subjectId));
        
        currentStudent.assessments.integrated = Array.from(uniqueSubjectIds).map(subjectId => { 
          const sD = allSubjects.find(s => s.id === subjectId); 
          const caI = currentStudent.assessments.ca.find(a => a.subjectId === subjectId); 
          const midI = currentStudent.assessments.mid.find(a => a.subjectId === subjectId); 
          const eotI = currentStudent.assessments.eot.find(a => a.subjectId === subjectId); 
          const caS = caI?.total; const midS = midI?.score; const eotS = eotI?.score; 
          const validS = [caS, midS, eotS].filter(s => s != null && s !== -1) as number[]; 
          let total: number|null = null, avg: number|null = null; 
          if (validS.length > 0) { 
            total = validS.reduce((sum, s) => sum + s, 0); 
            const sForAvg = [caS, midS, eotS].map(s => s === -1 ? 0 : s).filter(s => s != null) as number[]; 
            if (sForAvg.length > 0) avg = Math.round(sForAvg.reduce((sum, s) => sum + s, 0) / sForAvg.length); 
          } 
          const isC = sD?.isCompulsory || false; 
          const agg = isC && avg !== null ? getAggregateFromGradingRows(avg, gradingSystem) : null; 
          const rem = isC && avg !== null ? calculateRemarks(avg, gradingSystem, isC) : ''; 
          return { subject:sD?.name||'Unknown', subjectId, ca:caS??null, mid:midS??null, eot:eotS??null, total, average:avg, aggregate:agg, remarks:rem, initials:subjectTeacherMap.get(subjectId)||'', isCompulsory:isC }; 
        });
        
        // Calculate final grades
        let finalAggsForReport: number|null = null; 
        let relevantAssessments: (RegularAssessment | IntegratedAssessment)[] = []; 
        const isLower = checkIsLowerPrimary(currentStudent.studentInfo.class);
        if (reportTypeForFetching === 'all' || reportTypeForFetching === 'integrated') { 
          relevantAssessments = isLower ? currentStudent.assessments.integrated : currentStudent.assessments.eot; 
        } else if (['bot', 'mid', 'eot'].includes(reportTypeForFetching)) { 
          relevantAssessments = currentStudent.assessments[reportTypeForFetching as 'bot'|'mid'|'eot']; 
        }
        const compFinalAggs = relevantAssessments.filter(s => s.isCompulsory && typeof s.aggregate === 'number').map(s => s.aggregate as number); 
        if (compFinalAggs.length > 0) finalAggsForReport = compFinalAggs.reduce((sum, agg) => sum + agg, 0);
        
        currentStudent.finalGrade = { 
          aggs: finalAggsForReport, 
          grade: getDivisionGrade(finalAggsForReport, relevantAssessments) 
        };
        currentStudent.comments.aggs = finalAggsForReport ?? undefined;
        processedStudents.push(currentStudent);
      }

      console.log("Processed students before setting state:", processedStudents);
      setStudentsWithReports(processedStudents);
    } catch (err: any) { 
      console.error('Error in fetchAllMarks:', err); 
      setError(`Processing error: ${err.message}`);
    } finally { setLoading(false); }
  }, [ 
      reportTypeForFetching, getAuthHeaders, fetchTeacherAssignments, fetchTermDates, fetchGradingScale, 
      searchParams, fetchHeadTeacherCommentRanges, fetchClassTeacherCommentRanges,
      fetchAllStudentMarks, fetchHistoricalStudentsData
  ]);

  useEffect(() => { fetchAllMarks(); }, [fetchAllMarks]);
  
  // Handle back button click
  const handleBack = () => { window.history.back(); };
  
  // We don't need the custom print styles anymore since PrintableContent handles this
  useEffect(() => { 
    if(typeof window==='undefined'||typeof document==='undefined')return;
    const styles=`
      /* Page breaks */
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
      
      /* Paper size */
      @page {
        size: A4;
        margin: 1cm;
      }
    `; 
    const el=document.createElement('style');el.id='print-styles';el.innerHTML=styles;document.head.appendChild(el);
    return()=>{const remEl=document.getElementById('print-styles');if(remEl)remEl.remove();};
  },[]);

  if (loading) return ( <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div><p className="ml-4 text-lg text-gray-700">Generating reports...</p></div> );
  if (error) return <div className="text-center p-8 text-red-600">Error: {error} <button onClick={handleBack} className="ml-4 bg-blue-500 text-white px-3 py-1 rounded">Back</button></div>;

  return (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
      <div className="bg-gray-100 min-h-screen pb-10 print:bg-white">
        <PrintableContent
          title=""
          printButtonLabel="Print All Reports"
          className="max-w-6xl mx-auto p-4 print:p-0"
        >
          <div className="flex justify-end mb-6 no-print">
            <button onClick={handleBack} className="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700">Back</button>
          </div>
          {studentsWithReports.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
              <p className="text-lg text-gray-700">No reports to display.</p>
              {!error&&<p className="mt-2 text-gray-500">Ensure students selected & data available.</p>}
              <button onClick={handleBack} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700">Back</button>
            </div>
          ) : (
            studentsWithReports.map((student, idx) => (
              <div key={student.id||idx} className={`mb-12 pb-10 print:mb-0 print:pb-0 ${idx<studentsWithReports.length-1?'page-break':''}`}>
                <StudentReport student={student} gradingRows={student.gradingRows||[]} />
              </div>
            ))
          )}
        </PrintableContent>
      </div>
    </Suspense>
  );
};

const ReportsPage = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div><p className="ml-4 text-lg text-gray-700">Loading reports...</p></div>}>
      <ReportsPageContent />
    </Suspense>
  );
};
export default ReportsPage;