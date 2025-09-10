"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { env } from '@/env';
import { jsPDF } from 'jspdf';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import { supabase } from '../../../../../lib/supabaseClient';

// --- Interfaces (assuming these are correct) ---
interface StudentInfo {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  school_pay_code?: string;
  student_photo?: string;
  class_assigned?: string;
  lin_number?: string;
  // Add other fields as needed
}

interface ApiPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef?: string;
  receiptNumber?: string;
}

interface StudentFeeStatement {
  id: string;
  termId: string;
  termName: string;
  academicYearId: string;
  academicYear: string;
  totalExpected: number;
  feesPaidThisTerm: number;
  balancePrevTerm: number;
  stationeryAmount?: number;
  tuitionFees?: number;
  payments: ApiPayment[];
  // studentId?: string; // Less critical if we fetch main studentInfo separately
  // studentFirstName?: string;
  // studentLastName?: string;
  // registrationNumber?: string; 
  // className?: string;
}

interface DisplayPayment {
  id: string;
  no: string;
  particulars: string;
  amount: number;
  transactionId?: string;
  originalApiPayment?: ApiPayment;
}

interface TermFinancials {
  paymentsToDisplay: DisplayPayment[];
  totalFeesForTerm: number;
  totalPaidIncludingCarryOver: number;
  creditBalanceCarriedToNext: number;
  debitBalanceForTerm: number;
  progressPercentage: number;
}

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem('accessToken');
  }
  return null;
};

const StudentFinancialBreakdownView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdFromUrl = useMemo(() => searchParams?.get('studentId') || null, [searchParams]);

  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [allFeeStatements, setAllFeeStatements] = useState<StudentFeeStatement[]>([]);
  const [availableTerms, setAvailableTerms] = useState<{ id: string; label: string }[]>([]);
  const [selectedFeeStatementId, setSelectedFeeStatementId] = useState<string>('');
  const [currentTermFinancials, setCurrentTermFinancials] = useState<TermFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [selectedDisplayPayment, setSelectedDisplayPayment] = useState<DisplayPayment | null>(null);
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);

  // Student photo component
  const StudentPhoto = ({ studentInfo }: { studentInfo: StudentInfo | null }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const getSignedUrl = async () => {
        if (!studentInfo?.student_photo) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(studentInfo.student_photo, 3600);
        
        if (error) {
          console.error("Error creating signed URL for financial statement page:", error);
          setIsLoading(false);
          return;
        }

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
        
        setIsLoading(false);
      };
      
      getSignedUrl();
    }, [studentInfo?.student_photo]);

    // Show a loading shimmer while fetching the URL
    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-gray-300"></div>
        </div>
      );
    }
    
    // If we have a valid URL, show the image
    if (imageUrl) {
      return (
        <Image 
          src={imageUrl}
          alt="Student Profile"
          width={80}
          height={80}
          className="h-full w-full object-cover"
          unoptimized // Important for external URLs like those from Supabase
        />
      );
    }

    // Otherwise, show the fallback icon
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-500">
        <UserIcon className="h-12 w-12" />
      </div>
    );
  };

  useEffect(() => {
    const accessToken = getAuthToken();
    if (!accessToken) {
      console.log('No access token found, redirecting to login');
      router.push('/sign-in');
      return;
    }

    if (!studentIdFromUrl) {
      console.log('No studentId in URL. Clearing data and showing error.');
      setStudentInfo(null);
      setAllFeeStatements([]);
      setAvailableTerms([]);
      setSelectedFeeStatementId('');
      setCurrentTermFinancials(null);
      setLoading(false);
      setError("Student ID is missing in the URL.");
      return;
    }

    console.log(`Student ID from URL: ${studentIdFromUrl}. Resetting states and preparing to fetch data.`);
    
    setStudentInfo(null); 
    setAllFeeStatements([]);
    setAvailableTerms([]);
    setSelectedFeeStatementId('');
    setCurrentTermFinancials(null);
    setLoading(true);
    setError(null);

    const commonFetchHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      // 'Cache-Control': 'no-cache, no-store, must-revalidate', // Extra cache control
      // 'Pragma': 'no-cache',
      // 'Expires': '0'
    };

    const fetchDataForStudent = async (currentStudentId: string) => {
      let newStudentInfo: StudentInfo | null = null;
      let newAllFeeStatements: StudentFeeStatement[] = [];
      let newAvailableTerms: { id: string; label: string }[] = [];
      let newSelectedFeeStatementId: string = '';
      let fetchErrorAccumulator: string | null = null;

      try {
        // --- Step 1: Fetch all active students first to find the matching one ---
        console.log(`Fetching all active students to find matching ID: ${currentStudentId}`);
        const allStudentsUrl = `${API_BASE_URL}/students/filter?page=1&pageSize=10000&status=active`;
        const allStudentsResponse = await fetch(allStudentsUrl, { headers: commonFetchHeaders, cache: 'no-store' });

        console.log(`Response status from ${allStudentsUrl}: ${allStudentsResponse.status}`);

        if (!allStudentsResponse.ok) {
          const errorBody = await allStudentsResponse.text().catch(() => "Could not read error body");
          console.error(`All students fetch from ${allStudentsUrl} FAILED. Status: ${allStudentsResponse.status}. Body: ${errorBody}`);
          throw new Error(`Failed to fetch all students: ${errorBody}`);
        }

        const allStudentsJson = await allStudentsResponse.json();
        console.log("Raw response from all students:", JSON.stringify(allStudentsJson, null, 2));

        // Extract the array of students from the response
        let allStudents: any[] = [];
        if (allStudentsJson?.data?.students && Array.isArray(allStudentsJson.data.students)) {
          allStudents = allStudentsJson.data.students;
        } else if (allStudentsJson?.data && Array.isArray(allStudentsJson.data)) {
          allStudents = allStudentsJson.data;
        } else if (Array.isArray(allStudentsJson)) {
          allStudents = allStudentsJson;
        }

        // Find the student that matches the ID from the URL
        const matchingStudent = allStudents.find((student: any) => student.id === currentStudentId);

        if (!matchingStudent) {
          console.warn(`Student with ID ${currentStudentId} not found in the list of all students.`);
          throw new Error(`Student with ID ${currentStudentId} not found in the database.`);
        }

        console.log("Found matching student:", JSON.stringify(matchingStudent, null, 2));
        
        // Create the student info object from the matching student
        newStudentInfo = {
          id: matchingStudent.id,
          first_name: (matchingStudent.first_name || matchingStudent.firstName || '').trim(),
          middle_name: (matchingStudent.middle_name || matchingStudent.middleName || '').trim(),
          last_name: (matchingStudent.last_name || matchingStudent.lastName || '').trim(),
          school_pay_code: matchingStudent.school_pay_code || matchingStudent.registrationNumber || matchingStudent.registration_number || matchingStudent.studentId || currentStudentId || 'N/A',
          student_photo: matchingStudent.student_photo || '',
          class_assigned: matchingStudent.class_assigned || matchingStudent.className || matchingStudent.class_name || matchingStudent.class?.name || 'N/A',
          lin_number: matchingStudent.lin_number || ''
        };
        
        // --- Step 2: Fetch Student Fee Statements ---
        console.log('Fetching fee statements for student:', currentStudentId);
        const statementsEndpoint = `${API_BASE_URL}/fees/student-statements?studentId=${currentStudentId}`;
        const statementsRes = await fetch(statementsEndpoint, { headers: commonFetchHeaders, cache: 'no-store' });
        if (!statementsRes.ok) {
          const errData = await statementsRes.json().catch(() => ({ message: "Statement fetch failed, error unparsable." }));
          throw new Error(errData.message || 'Failed to fetch fee statements');
        }
        const statementsApiResponse = await statementsRes.json();
        console.log("Fee statements API response:", statementsApiResponse);
        const statementsDataArray = statementsApiResponse?.data?.data;
        console.log("Extracted statementsDataArray:", statementsDataArray);
        
        if (statementsDataArray && Array.isArray(statementsDataArray)) {
          newAllFeeStatements = statementsDataArray.map((item: any) => ({
            id: item.id || `stmt-${Math.random()}`, // Ensure ID for key
            termId: item.termId || '',
            termName: item.termName || 'N/A',
            academicYearId: item.academicYearId || '',
            academicYear: item.academicYear || 'N/A',
            totalExpected: Number(item.totalExpected) || 0,
            feesPaidThisTerm: Number(item.feesPaidThisTerm) || 0,
            balancePrevTerm: Number(item.balancePrevTerm) || 0,
            stationeryAmount: item.stationeryAmount ? Number(item.stationeryAmount) : undefined,
            tuitionFees: item.tuitionFees ? Number(item.tuitionFees) : undefined,
            payments: (item.payments || []).map((p: any) => ({ ...p, id: p.id || `pay-${Math.random()}`})), // Ensure payment IDs
          }));
        }
        
        newAvailableTerms = newAllFeeStatements.map(statement => ({
          id: statement.id,
          label: `${statement.termName} ${statement.academicYear}`
        }));
        
        if (newAllFeeStatements.length > 0) {
          newSelectedFeeStatementId = newAllFeeStatements[0].id;
        } else {
          console.warn("No fee statements found for this student.");
          fetchErrorAccumulator = (fetchErrorAccumulator ? fetchErrorAccumulator + " | " : "") + "No fee statements found.";
        }
      
        
        if (newStudentInfo) {
            if (!newStudentInfo.first_name && !newStudentInfo.last_name) {
                newStudentInfo.first_name = "Student"; newStudentInfo.last_name = "Details Missing";
            } else {
                if (!newStudentInfo.first_name) newStudentInfo.first_name = "[No FN]"; // Shorter placeholders
                if (!newStudentInfo.last_name) newStudentInfo.last_name = "[No LN]";
            }
            console.log("Processed student info for header:", newStudentInfo);
            
            // IMPORTANT: Make sure we're using the correct student ID
            if (newStudentInfo.id !== currentStudentId) {
                console.warn("Student ID mismatch! API returned ID:", newStudentInfo.id, "but URL has ID:", currentStudentId);
                // Force the correct ID from the URL
                newStudentInfo.id = currentStudentId;
            }
        } else {
            throw new Error("Critical error: Student information could not be constructed after fetch attempts.");
        }
        
        newAvailableTerms = newAllFeeStatements.map(statement => ({
          id: statement.id,
          label: `${statement.termName} ${statement.academicYear}`
        }));
        
        if (newAllFeeStatements.length > 0) {
          newSelectedFeeStatementId = newAllFeeStatements[0].id;
        } else {
          console.warn("No fee statements found for this student.");
          fetchErrorAccumulator = (fetchErrorAccumulator ? fetchErrorAccumulator + " | " : "") + "No fee statements found.";
        }

      } catch (fetchError: any) {
        console.error('Error during fetchDataForStudent:', fetchError.message, fetchError.stack);
        fetchErrorAccumulator = (fetchErrorAccumulator ? fetchErrorAccumulator + " | " : "") + (fetchError.message || "An unexpected error occurred during fetch.");
        if (!newStudentInfo) { // If student info fetch failed catastrophically
            newStudentInfo = {
                id: currentStudentId,
                first_name: 'Error', last_name: 'Loading Data',
                school_pay_code: currentStudentId, class_assigned: 'N/A',
                student_photo: ''
            };
        }
      } finally {
        // Clear any previous student data first to avoid showing stale data
        setStudentInfo(null);
        // Small delay to ensure the UI updates before setting the new data
        setTimeout(() => {
          // Set the new student data
          setStudentInfo(newStudentInfo); // THIS IS THE KEY UPDATE FOR THE HEADER
          setAllFeeStatements(newAllFeeStatements);
          setAvailableTerms(newAvailableTerms);
          setSelectedFeeStatementId(newSelectedFeeStatementId);
          if (fetchErrorAccumulator) {
              setError(fetchErrorAccumulator);
          } else {
              setError(null); 
          }
          setLoading(false);
          console.log("--- Fetch cycle ended ---");
          console.log("Final studentInfo state for header:", newStudentInfo);
          console.log("Error state:", fetchErrorAccumulator);
        }, 50); // Small delay to ensure UI refresh
      }
    };

    fetchDataForStudent(studentIdFromUrl);

  }, [studentIdFromUrl, router]); 

  // Effect to calculate term financials (should be fine)
  useEffect(() => {
    if (!selectedFeeStatementId || allFeeStatements.length === 0) {
      setCurrentTermFinancials(null);
      return;
    }
    const currentStatement = allFeeStatements.find(s => s.id === selectedFeeStatementId);
    console.log("Current statement:", currentStatement);
    if (!currentStatement) {
      setCurrentTermFinancials(null);
      return;
    }
    console.log("Payments in current statement:", currentStatement?.payments);
    // ... (financial calculation logic - assuming this is correct) ...
    let effectiveBalancePrevTerm = currentStatement.balancePrevTerm || 0;
    const paymentsToDisplay: DisplayPayment[] = [];
    if (effectiveBalancePrevTerm !== 0) { 
      paymentsToDisplay.push({
        id: `carryover-${currentStatement.id}`,
        no: "Carry Over",
        particulars: `Balance B/F: ${formatCurrency(effectiveBalancePrevTerm)}`,
        amount: effectiveBalancePrevTerm, 
      });
    }

    if (currentStatement.payments && Array.isArray(currentStatement.payments)) {
      currentStatement.payments.forEach((p: ApiPayment) => {
        paymentsToDisplay.push({
          id: p.id,
          no: p.receiptNumber || `TRX-${p.id.substring(0,6)}`,
          particulars: `Payment via ${p.paymentMethod || 'unknown'} on ${new Date(p.paymentDate).toLocaleDateString()}`,
          amount: p.amount,
          transactionId: p.transactionRef || 'N/A',
          originalApiPayment: p
        });
      });
    }
    
    const totalPaidForThisStatementCycle = effectiveBalancePrevTerm + currentStatement.feesPaidThisTerm;
    const totalFeesForTerm = currentStatement.totalExpected;

    const creditBalanceCarriedToNext = Math.max(0, totalPaidForThisStatementCycle - totalFeesForTerm);
    const debitBalanceForTerm = Math.max(0, totalFeesForTerm - totalPaidForThisStatementCycle);
    const progressPercentage = totalFeesForTerm > 0 ? Math.min((totalPaidForThisStatementCycle / totalFeesForTerm) * 100, 100) : (totalPaidForThisStatementCycle > 0 ? 100 : 0);
    
    setCurrentTermFinancials({
      paymentsToDisplay,
      totalFeesForTerm,
      totalPaidIncludingCarryOver: totalPaidForThisStatementCycle,
      creditBalanceCarriedToNext,
      debitBalanceForTerm,
      progressPercentage,
    });

  }, [selectedFeeStatementId, allFeeStatements]);

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return 'UGX 0';
    return `UGX ${amount.toLocaleString()}`;
  };

  const showDetails = (payment: DisplayPayment) => {
    console.log("Viewing payment details:", payment);
    setSelectedDisplayPayment(payment);
    setShowDetailsModal(true);
  };
  const getSelectedStatementDetails = () => allFeeStatements.find(s => s.id === selectedFeeStatementId);
  const downloadPDF = (payment: DisplayPayment) => { /* ... PDF logic ... */ };

  // --- Render Logic ---
  if (loading && !studentInfo) { // Show full page loading if initial load and no studentInfo yet
    return <div className="flex justify-center items-center min-h-screen">Loading student financials...</div>;
  }

  // If critical error and no studentInfo after loading, show full error.
  if (error && !studentInfo && !loading) { 
     return <div className="text-red-500 text-center p-8">Error: {error} <br/>Could not load essential student data.</div>;
  }
  
  // If studentInfo is loaded but financials are missing/error, we can still render header
  // If no currentTermFinancials after loading and no overriding error for studentInfo:
  if (!currentTermFinancials && !loading && studentInfo && (!error || !error.toLowerCase().includes("student"))) {
    // This implies student loaded, but financial part failed or is empty
  }


  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg p-6 space-y-6">
        {/* Student Header - Using URL Student ID */}
        <div className="mb-6 border-b pb-4">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200">
              <StudentPhoto studentInfo={studentInfo} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {studentInfo ? `${studentInfo.first_name} ${studentInfo.middle_name ? studentInfo.middle_name + ' ' : ''}${studentInfo.last_name}` : 'Loading student data...'}
              </h1>
              <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-600">
                {studentInfo && (
                  <>
                    <p><span className="font-medium">Class:</span> {studentInfo.class_assigned || 'N/A'}</p>
                    <p><span className="font-medium">Reg No:</span> {studentInfo.school_pay_code || 'N/A'}</p>
                    {studentInfo.lin_number && <p><span className="font-medium">LIN:</span> {studentInfo.lin_number}</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Display error messages if any, but not critical ones already handled */}
        {error && <div className="p-2 my-2 text-sm text-red-700 bg-red-100 rounded-md">Notice: {error}</div>}

        {/* Payments Section and Table - Render conditionally based on currentTermFinancials */}
        {currentTermFinancials ? (
          <>
            <div className="space-y-4"> {/* Payments Overview */}
              <h2 className="text-lg font-semibold text-gray-700">Payments</h2>
              <p className="text-sm text-gray-500">Billing Statement: <span className="font-medium text-gray-700">{availableTerms.find(t => t.id === selectedFeeStatementId)?.label || (loading ? 'Loading...' : 'Select Statement')}</span></p>
              {/* ... Grid for Total Fees, Paid, Balance, Progress ... */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md shadow text-center">
                    <p className="text-gray-500 text-sm">Total Fees Payable</p>
                    <p className="text-xl font-semibold text-gray-800">{formatCurrency(currentTermFinancials.totalFeesForTerm)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md shadow text-center">
                    <p className="text-gray-500 text-sm">Paid (incl. B/F)</p>
                    <p className="text-xl font-semibold text-green-600">{formatCurrency(currentTermFinancials.totalPaidIncludingCarryOver)}</p>
                    {currentTermFinancials.creditBalanceCarriedToNext > 0 && (
                        <p className="text-sm text-gray-500">Credit C/F: {formatCurrency(currentTermFinancials.creditBalanceCarriedToNext)}</p>
                    )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md shadow text-center">
                    <p className="text-gray-500 text-sm">Balance Due</p>
                    <p className="text-xl font-semibold text-red-500">{currentTermFinancials.debitBalanceForTerm > 0 ? formatCurrency(currentTermFinancials.debitBalanceForTerm) : '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md shadow text-center flex flex-col items-center">
                    <p className="text-gray-500 text-sm">Paid Progress</p>
                    <div className="relative w-16 h-16">
                        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray={`${currentTermFinancials.progressPercentage.toFixed(0)}, 100`} strokeLinecap="round"/>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-700">{Math.round(currentTermFinancials.progressPercentage)}%</span>
                    </div>
                    </div>
                </div>
            </div>
            <div> {/* How fees calculated link */}
              <p className="text-sm text-gray-600">Click <a href="#" onClick={(e) => { e.preventDefault(); setShowCalculationModal(true);}} className="text-blue-500 underline">here</a> to see how fees payable was calculated.</p>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4"> {/* Actions */}
              <div> {/* Contact Info */}
                <p className="text-sm text-gray-600">
                  For any Fees inquiries, contact the bursar at
                  <a href="tel:+256759996141" className="text-blue-500 underline"> +256 759 996 141</a> or
                  <a href="mailto:richdadjuniorschool2017@gmail.com" className="text-blue-500 underline"> richdadjuniorschool2017@gmail.com</a>.
                </p>
              </div>
              <div className="flex flex-wrap gap-2"> {/* Statement Selector & Make Payment */}
                <select
                  className="px-4 py-2 bg-gray-200 text-gray-600 rounded-md shadow"
                  value={selectedFeeStatementId}
                  onChange={(e) => setSelectedFeeStatementId(e.target.value)}
                  disabled={availableTerms.length === 0 || loading}
                >
                  <option value="" disabled>{loading ? "Loading..." : (availableTerms.length === 0 ? "No Statements" : "Select Statement")}</option>
                  {availableTerms.map(termOpt => (
                    <option key={termOpt.id} value={termOpt.id}>{termOpt.label}</option>
                  ))}
                </select>

              </div>
            </div>
            <div className="overflow-x-auto"> {/* Payments Table */}
              <table className="min-w-full text-left text-sm">
                {/* ... Table Head ... */}
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-2 font-medium text-gray-600">#</th>
                        <th className="px-4 py-2 font-medium text-gray-600">No.</th>
                        <th className="px-4 py-2 font-medium text-gray-600">Particulars</th>
                        <th className="px-4 py-2 font-medium text-gray-600 text-right">Amount (UGX)</th>
                        <th className="px-4 py-2 font-medium text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                  {currentTermFinancials.paymentsToDisplay.length > 0 ? (
                    currentTermFinancials.paymentsToDisplay.map((payment, index) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        {/* ... Table Row Data ... */}
                        <td className="px-4 py-2 text-gray-600">{index + 1}</td>
                        <td className="px-4 py-2 text-gray-600">{payment.no}</td>
                        <td className="px-4 py-2 text-gray-600">{payment.particulars}</td>
                        <td className="px-4 py-2 text-gray-600 text-right">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-2 text-gray-600">
                        {payment.originalApiPayment && (
                            <button onClick={() => showDetails(payment)} className="text-blue-500 hover:text-blue-700" title="View Details">
                            <Eye size={18} />
                            </button>
                        )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center py-4 text-gray-500">No payments or balances recorded for this statement period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          // Show if financials are still loading or failed but studentInfo is present
          <div className="text-center p-8">
            {loading ? "Loading financial details..." : (error && error.includes("statement") ? "Could not load financial details. Please try again." : "No financial statement selected or available.")}
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedDisplayPayment && selectedDisplayPayment.originalApiPayment && (
        <>
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Payment Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="border-t border-b py-4 space-y-3">
                {Object.entries(selectedDisplayPayment.originalApiPayment).map(([key, value]) => (
                  <div className="flex justify-between" key={key}>
                    <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                    <span className="font-medium">{
                      key === 'amount' ? formatCurrency(value as number) :
                      key.toLowerCase().includes('date') && value ? new Date(value as string).toLocaleDateString() :
                      value !== undefined && value !== null && value !== '' ? String(value) : 'N/A'
                    }</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    // Optional: Add download functionality here
                    // downloadPDF(selectedDisplayPayment);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fee Calculation Modal */}
      {showCalculationModal && getSelectedStatementDetails() && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Fee Calculation</h3>
              <button onClick={() => setShowCalculationModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border-t border-b py-4 space-y-3">
              {getSelectedStatementDetails()?.tuitionFees !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tuition Fees:</span>
                  <span className="font-medium">{formatCurrency(getSelectedStatementDetails()?.tuitionFees)}</span>
                </div>
              )}
              
              {getSelectedStatementDetails()?.stationeryAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Stationery Amount:</span>
                  <span className="font-medium">{formatCurrency(getSelectedStatementDetails()?.stationeryAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span className="text-gray-800">Total Fees Payable:</span>
                <span className="text-gray-800">{formatCurrency(getSelectedStatementDetails()?.totalExpected)}</span>
              </div>
              
              <div className="flex justify-between text-sm italic pt-2">
                <span className="text-gray-600">Previous Term Balance:</span>
                <span className="text-gray-600">{formatCurrency(getSelectedStatementDetails()?.balancePrevTerm)}</span>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>Note: The total fees payable includes tuition fees, stationery, and any other applicable charges for the current term.</p>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCalculationModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// A simple UserIcon for placeholder
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </svg>
);


const StudentFinancialBreakdownPage = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading student financial statement...</p></div>}>
      <StudentFinancialBreakdownView />
    </Suspense>
  );
};

export default StudentFinancialBreakdownPage;